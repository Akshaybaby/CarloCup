import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'admin' | 'captain' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string | null;
  isAnonymous?: boolean;
}

const LOCAL_USER_KEY = '@carlo_cup_local_user';



let authStateListeners: ((user: UserProfile | null) => void)[] = [];
let currentUser: UserProfile | null = null;

// Notify listeners of user state changes
function notifyListeners() {
  authStateListeners.forEach(cb => cb(currentUser));
}

// Initial session check
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    supabase.from('profiles').select('*').eq('id', session.user.id).single()
      .then(({ data, error }) => {
        if (!error && data) {
          currentUser = {
            uid: session.user.id,
            email: session.user.email || '',
            name: data.name,
            role: (data.role ? data.role.toLowerCase() : 'viewer') as UserRole,
            teamId: data.team_id,
          };
          notifyListeners();
        }
      });
  }
});

export const authService = {
  getCurrentUser: (): UserProfile | null => {
    return currentUser;
  },

  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => {
    authStateListeners.push(callback);
    
    // Call initial
    callback(currentUser);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        try {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (!error && data) {
            currentUser = {
              uid: session.user.id,
              email: session.user.email || '',
              name: data.name,
              role: (data.role ? data.role.toLowerCase() : 'viewer') as UserRole,
              teamId: data.team_id,
            };
          } else {
            currentUser = {
              uid: session.user.id,
              email: session.user.email || '',
              name: session.user.user_metadata?.name || 'User',
              role: 'viewer',
              teamId: null,
            };
          }
          notifyListeners();
        } catch (error) {
          currentUser = null;
          notifyListeners();
        }
      } else {
        if (!currentUser?.isAnonymous) {
          currentUser = null;
          notifyListeners();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      authStateListeners = authStateListeners.filter(cb => cb !== callback);
    };
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.user) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileErr || !profile) {
        throw new Error('User profile record not found in Supabase. Please sign up or contact admin.');
      }

      currentUser = {
        uid: data.user.id,
        email: data.user.email || '',
        name: profile.name,
        role: (profile.role ? profile.role.toLowerCase() : 'viewer') as UserRole,
        teamId: profile.team_id,
      };
      notifyListeners();
      return currentUser;
    }
    throw new Error('Auth session could not be established.');
  },

  signup: async (
    email: string, 
    password: string, 
    name: string, 
    role: UserRole, 
    roleCode?: string, 
    teamId?: string
  ): Promise<UserProfile> => {
    let assignedTeamId: string | null = null;
    let matchedTeam: any = null;

    // Validate role codes
    if (role === 'admin') {
      throw new Error('Admin registration is not allowed publicly. Please contact another administrator.');
    }

    if (role === 'captain') {
      if (!roleCode) {
        throw new Error('Team Captain Code is required.');
      }
      const { dbService } = require('./db');
      const teams = await dbService.getTeams();
      matchedTeam = teams.find(
        (t: any) => t.captainCode.toUpperCase() === roleCode.trim().toUpperCase()
      );
      if (!matchedTeam) {
        throw new Error(`No team found matching Captain Code "${roleCode}". Please check the code or contact the admin.`);
      }
      assignedTeamId = matchedTeam.id;
    }

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;

    if (data.user) {
      // Create profile record in Supabase profiles table
      const { error: profileErr } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          email,
          name,
          role,
          team_id: assignedTeamId,
        }
      ]);
      if (profileErr) throw profileErr;

      // Update the team document with the captain's info in Supabase
      if (role === 'captain' && assignedTeamId && matchedTeam) {
        const { dbService } = require('./db');
        await dbService.updateTeam(assignedTeamId, matchedTeam.name, matchedTeam.logoUrl, data.user.id, name);
      }

      currentUser = {
        uid: data.user.id,
        email: data.user.email || '',
        name,
        role,
        teamId: assignedTeamId,
      };
      notifyListeners();
      return currentUser;
    }
    throw new Error('Signup failed.');
  },

  logout: async () => {
    await supabase.auth.signOut();
    currentUser = null;
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    notifyListeners();
  },

  continueAsViewer: () => {
    currentUser = {
      uid: 'anonymous-viewer',
      email: 'viewer@carlo.com',
      name: 'Guest Viewer',
      role: 'viewer',
      teamId: null,
      isAnonymous: true,
    };
    notifyListeners();
  },

  createAdminUser: async (email: string, password: string, name: string): Promise<void> => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    
    const { createClient } = require('@supabase/supabase-js');
    
    // Initialize a secondary Supabase client that does not persist the session
    // to prevent logging out the current admin user on signup.
    const secondaryClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const { data, error } = await secondaryClient.auth.signUp({ 
      email, 
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;

    if (data.user) {
      // Create user profile in profiles table
      const { error: profileErr } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          email,
          name,
          role: 'admin',
          team_id: null,
        }
      ]);
      if (profileErr) throw profileErr;
    }
  }
};
