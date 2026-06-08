import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../config/firebase';
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
const LOCAL_USERS_DB_KEY = '@carlo_cup_local_users_db';

// Roles registration access codes
export const CODES = {
  ADMIN: 'CARLO_ADMIN_2026',
  CAPTAIN: 'CARLO_CAPTAIN_2026',
};

// Simulated mock database of users when Firebase is not connected
const DEFAULT_MOCK_USERS: UserProfile[] = [
  {
    uid: 'admin-mock',
    email: 'admin@carlo.com',
    name: 'Tournament Admin',
    role: 'admin',
    teamId: null,
  },
  {
    uid: 'captain-mock-1',
    email: 'captain1@carlo.com',
    name: 'John Captain',
    role: 'captain',
    teamId: 'team-1',
  },
  {
    uid: 'captain-mock-2',
    email: 'captain2@carlo.com',
    name: 'David Captain',
    role: 'captain',
    teamId: 'team-2',
  }
];

let authStateListeners: ((user: UserProfile | null) => void)[] = [];
let currentUser: UserProfile | null = null;

// Initialize local user database
const initLocalUsers = async () => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_USERS_DB_KEY);
    if (!stored) {
      await AsyncStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(DEFAULT_MOCK_USERS));
    }
  } catch (e) {
    console.error('Failed to init local users', e);
  }
};

if (!isFirebaseConfigured) {
  initLocalUsers();
  // Check if there's a saved session in local storage
  AsyncStorage.getItem(LOCAL_USER_KEY).then((data) => {
    if (data) {
      currentUser = JSON.parse(data);
      notifyListeners();
    }
  });
}

function notifyListeners() {
  authStateListeners.forEach(cb => cb(currentUser));
}

export const authService = {
  getCurrentUser: (): UserProfile | null => {
    return currentUser;
  },

  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => {
    authStateListeners.push(callback);
    
    // Call initial
    callback(currentUser);

    if (isFirebaseConfigured && auth) {
      const unsub = firebaseOnAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          try {
            // Get user role profile from Firestore
            const docRef = doc(db, 'users', firebaseUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              currentUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: data.name || 'User',
                role: data.role || 'viewer',
                teamId: data.teamId || null,
              };
            } else {
              // Create a default viewer profile if it doesn't exist
              const profile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: 'Anonymous Player',
                role: 'viewer',
                teamId: null,
              };
              await setDoc(docRef, {
                name: profile.name,
                email: profile.email,
                role: profile.role,
                teamId: profile.teamId,
                createdAt: new Date(),
              });
              currentUser = profile;
            }
            notifyListeners();
          } catch (error) {
            console.error('Error fetching user profile:', error);
            currentUser = null;
            notifyListeners();
          }
        } else {
          // If Firestore is set up but no authenticated Firebase user (excluding viewer bypass)
          if (!currentUser?.isAnonymous) {
            currentUser = null;
            notifyListeners();
          }
        }
      });

      return () => {
        unsub();
        authStateListeners = authStateListeners.filter(cb => cb !== callback);
      };
    }

    return () => {
      authStateListeners = authStateListeners.filter(cb => cb !== callback);
    };
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    if (isFirebaseConfigured && auth) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Fetch profile from firestore
      const docSnap = await getDoc(doc(db, 'users', cred.user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        currentUser = {
          uid: cred.user.uid,
          email: cred.user.email || '',
          name: data.name,
          role: data.role,
          teamId: data.teamId || null,
        };
      } else {
        throw new Error('User profile record not found in Firestore.');
      }
      notifyListeners();
      return currentUser;
    } else {
      // Mock Authentication
      const usersStr = await AsyncStorage.getItem(LOCAL_USERS_DB_KEY);
      const users: UserProfile[] = usersStr ? JSON.parse(usersStr) : DEFAULT_MOCK_USERS;
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && password === 'password'); // all mock use password: 'password'
      
      // Let's also support any password for ease of test
      const foundAnyPw = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (foundAnyPw) {
        currentUser = foundAnyPw;
        await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(currentUser));
        notifyListeners();
        return currentUser;
      } else {
        throw new Error('Invalid email or password. Hint: In mock mode, use admin@carlo.com, captain1@carlo.com, or captain2@carlo.com with any password.');
      }
    }
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
    if (role === 'admin' && roleCode !== CODES.ADMIN) {
      throw new Error('Invalid Admin Access Code.');
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

    if (isFirebaseConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        name,
        role,
        teamId: assignedTeamId,
      };

      // Create profile in firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        role,
        teamId: assignedTeamId,
        createdAt: new Date(),
      });

      // Update the team document with the captain's info
      if (role === 'captain' && assignedTeamId && matchedTeam) {
        const { dbService } = require('./db');
        await dbService.updateTeam(assignedTeamId, matchedTeam.name, matchedTeam.logoUrl, cred.user.uid, name);
      }

      currentUser = profile;
      notifyListeners();
      return currentUser;
    } else {
      // Save user to Mock DB in AsyncStorage
      const usersStr = await AsyncStorage.getItem(LOCAL_USERS_DB_KEY);
      const users: UserProfile[] = usersStr ? JSON.parse(usersStr) : DEFAULT_MOCK_USERS;

      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Email is already registered in local database.');
      }

      const newUser: UserProfile = {
        uid: `user-mock-${Date.now()}`,
        email,
        name,
        role,
        teamId: assignedTeamId,
      };

      users.push(newUser);
      await AsyncStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(users));

      // Update the team document with the captain's info in mock DB
      if (role === 'captain' && assignedTeamId && matchedTeam) {
        const { dbService } = require('./db');
        await dbService.updateTeam(assignedTeamId, matchedTeam.name, matchedTeam.logoUrl, newUser.uid, name);
      }
      
      currentUser = newUser;
      await AsyncStorage.setItem(LOCAL_USER_KEY, JSON.stringify(currentUser));
      notifyListeners();
      return currentUser;
    }
  },

  logout: async () => {
    if (isFirebaseConfigured && auth) {
      await firebaseSignOut(auth);
    }
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
    if (isFirebaseConfigured && db && auth) {
      const { initializeApp } = require('firebase/app');
      const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
      const { firebaseConfig } = require('../config/firebase');
      
      // Initialize a secondary app so we don't log out the current admin
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuthApp');
      const secondaryAuth = getAuth(secondaryApp);
      
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name,
          email,
          role: 'admin',
          teamId: null,
          createdAt: new Date(),
        });
      } finally {
        await secondaryAuth.app.delete();
      }
    } else {
      // Mock Mode: Write to AsyncStorage
      const usersStr = await AsyncStorage.getItem(LOCAL_USERS_DB_KEY);
      const users: UserProfile[] = usersStr ? JSON.parse(usersStr) : DEFAULT_MOCK_USERS;
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Email is already registered.');
      }
      const newUser: UserProfile = {
        uid: `admin-mock-${Date.now()}`,
        email,
        name,
        role: 'admin',
        teamId: null,
      };
      users.push(newUser);
      await AsyncStorage.setItem(LOCAL_USERS_DB_KEY, JSON.stringify(users));
    }
  }
};
