import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface Tournament {
  id: string;
  name: string;
  logoUrl: string | null;
  createdAt?: any;
}

export interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  captainId: string | null;
  captainName: string | null;
  groupId: string | null;
  captainCode: string;
  team_locked: boolean;
}

export interface Group {
  id: string;
  name: string;
  teamIds: string[];
}

export interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward';
  dateOfBirth: string; // YYYY-MM-DD
  teamId: string;
}

export interface ScorerInfo {
  playerId: string;
  playerName: string;
  teamId: string;
  goals: number;
  assists: number;
}

export interface Fixture {
  id: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  dateTime: any; // Date or Timestamp
  groupId: string;
  status: 'scheduled' | 'played';
  scoreA: number | null;
  scoreB: number | null;
  scorers: ScorerInfo[];
  cleanSheets: string[]; // playerIds of goalkeepers
  stage?: 'group' | 'semifinal' | 'final';
}

export interface StandingsRow {
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  teamName: string;
  goals: number;
  assists: number;
  cleanSheets: number;
  points: number; // goals + assists
}

// Storage Keys
const TOURNAMENTS_KEY = '@carlo_tournaments';
const TEAMS_KEY = '@carlo_teams';
const GROUPS_KEY = '@carlo_groups';
const PLAYERS_KEY = '@carlo_players';
const FIXTURES_KEY = '@carlo_fixtures';

// --- MOCK SEED DATA ---
const DEFAULT_TOURNAMENT: Tournament = {
  id: 'tournament-1',
  name: 'Carlo Cup 2026',
  logoUrl: '🏆',
};

const DEFAULT_GROUPS: Group[] = [
  { id: 'group-a', name: 'Group A', teamIds: ['team-1', 'team-2'] },
  { id: 'group-b', name: 'Group B', teamIds: ['team-3', 'team-4'] },
  { id: 'group-c', name: 'Group C', teamIds: [] },
  { id: 'group-d', name: 'Group D', teamIds: [] },
];

const DEFAULT_TEAMS: Team[] = [
  { id: 'team-1', name: 'FC Saints', logoUrl: '⛪', captainId: 'captain-mock-1', captainName: 'John Captain', groupId: 'group-a', captainCode: 'FS2026', team_locked: false },
  { id: 'team-2', name: 'Grace United', logoUrl: '🕊️', captainId: 'captain-mock-2', captainName: 'David Captain', groupId: 'group-a', captainCode: 'GU2026', team_locked: false },
  { id: 'team-3', name: 'Trinity FC', logoUrl: '☘️', captainId: null, captainName: null, groupId: 'group-b', captainCode: 'TF2026', team_locked: false },
  { id: 'team-4', name: 'Cross Rangers', logoUrl: '✝️', captainId: null, captainName: null, groupId: 'group-b', captainCode: 'CR2026', team_locked: false },
];

const DEFAULT_PLAYERS: Player[] = [
  // FC Saints
  { id: 'p-1', name: 'John Captain', jerseyNumber: 10, position: 'Forward', dateOfBirth: '1995-04-12', teamId: 'team-1' },
  { id: 'p-2', name: 'Mark Defender', jerseyNumber: 4, position: 'Defender', dateOfBirth: '1997-08-20', teamId: 'team-1' },
  { id: 'p-3', name: 'Luke Goalie', jerseyNumber: 1, position: 'Goalkeeper', dateOfBirth: '1996-01-15', teamId: 'team-1' },
  // Grace United
  { id: 'p-4', name: 'David Captain', jerseyNumber: 9, position: 'Forward', dateOfBirth: '1994-11-03', teamId: 'team-2' },
  { id: 'p-5', name: 'Peter Midfielder', jerseyNumber: 8, position: 'Midfielder', dateOfBirth: '1998-05-30', teamId: 'team-2' },
  { id: 'p-6', name: 'Paul Keeper', jerseyNumber: 12, position: 'Goalkeeper', dateOfBirth: '1999-07-22', teamId: 'team-2' },
  // Trinity FC
  { id: 'p-7', name: 'Matthew Forward', jerseyNumber: 11, position: 'Forward', dateOfBirth: '2000-02-14', teamId: 'team-3' },
  { id: 'p-8', name: 'James Keeper', jerseyNumber: 1, position: 'Goalkeeper', dateOfBirth: '2001-05-18', teamId: 'team-3' },
  // Cross Rangers
  { id: 'p-9', name: 'Simon Defender', jerseyNumber: 5, position: 'Defender', dateOfBirth: '1993-09-11', teamId: 'team-4' },
  { id: 'p-10', name: 'Andrew Keeper', jerseyNumber: 22, position: 'Goalkeeper', dateOfBirth: '1995-12-05', teamId: 'team-4' },
];

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
};

const getTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
};

const DEFAULT_FIXTURES: Fixture[] = [
  {
    id: 'fix-1',
    teamAId: 'team-1',
    teamAName: 'FC Saints',
    teamBId: 'team-2',
    teamBName: 'Grace United',
    dateTime: getYesterday().toISOString(),
    groupId: 'group-a',
    status: 'played',
    scoreA: 2,
    scoreB: 1,
    scorers: [
      { playerId: 'p-1', playerName: 'John Captain', teamId: 'team-1', goals: 2, assists: 0 },
      { playerId: 'p-4', playerName: 'David Captain', teamId: 'team-2', goals: 1, assists: 0 },
      { playerId: 'p-5', playerName: 'Peter Midfielder', teamId: 'team-2', goals: 0, assists: 1 },
    ],
    cleanSheets: []
  },
  {
    id: 'fix-2',
    teamAId: 'team-3',
    teamAName: 'Trinity FC',
    teamBId: 'team-4',
    teamBName: 'Cross Rangers',
    dateTime: getYesterday().toISOString(),
    groupId: 'group-b',
    status: 'played',
    scoreA: 0,
    scoreB: 0,
    scorers: [],
    cleanSheets: ['p-8', 'p-10'] // both GK clean sheet
  },
  {
    id: 'fix-3',
    teamAId: 'team-1',
    teamAName: 'FC Saints',
    teamBId: 'team-3',
    teamBName: 'Trinity FC',
    dateTime: getTomorrow().toISOString(),
    groupId: 'group-a',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    scorers: [],
    cleanSheets: [],
    stage: 'group'
  },
  {
    id: 'fix-4',
    teamAId: 'team-2',
    teamAName: 'Grace United',
    teamBId: 'team-4',
    teamBName: 'Cross Rangers',
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    groupId: 'group-b',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    scorers: [],
    cleanSheets: [],
    stage: 'group'
  },
  {
    id: 'ko-sf-1',
    teamAId: 'team-1',
    teamAName: 'FC Saints',
    teamBId: 'team-4',
    teamBName: 'Cross Rangers',
    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    groupId: 'group-a',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    scorers: [],
    cleanSheets: [],
    stage: 'semifinal'
  },
  {
    id: 'ko-sf-2',
    teamAId: 'team-2',
    teamAName: 'Grace United',
    teamBId: 'team-3',
    teamBName: 'Trinity FC',
    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    groupId: 'group-b',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    scorers: [],
    cleanSheets: [],
    stage: 'semifinal'
  },
  {
    id: 'ko-final',
    teamAId: 'tbd-a',
    teamAName: 'Winner Semi-Final 1',
    teamBId: 'tbd-b',
    teamBName: 'Winner Semi-Final 2',
    dateTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    groupId: 'group-a',
    status: 'scheduled',
    scoreA: null,
    scoreB: null,
    scorers: [],
    cleanSheets: [],
    stage: 'final'
  }
];

// Helper to seed local mock db
const initMockDB = async () => {
  try {
    const t = await AsyncStorage.getItem(TOURNAMENTS_KEY);
    if (!t) {
      await AsyncStorage.setItem(TOURNAMENTS_KEY, JSON.stringify([DEFAULT_TOURNAMENT]));
      await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(DEFAULT_GROUPS));
      await AsyncStorage.setItem(TEAMS_KEY, JSON.stringify(DEFAULT_TEAMS));
      await AsyncStorage.setItem(PLAYERS_KEY, JSON.stringify(DEFAULT_PLAYERS));
      await AsyncStorage.setItem(FIXTURES_KEY, JSON.stringify(DEFAULT_FIXTURES));
    }
  } catch (e) {
    console.error('Error seeding mock DB', e);
  }
};

if (!isFirebaseConfigured) {
  initMockDB();
}

// Database helper
const getLocalData = async <T>(key: string): Promise<T[]> => {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveLocalData = async <T>(key: string, data: T[]): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

export const generateCaptainCode = (teamName: string, existingTeams: Team[]): string => {
  const cleanName = teamName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = cleanName.split(/\s+/);
  let initials = '';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    initials = words[0].substring(0, 2).toUpperCase();
  } else {
    initials = 'TM';
  }
  const year = new Date().getFullYear();
  const baseCode = `${initials}${year}`;
  
  let uniqueCode = baseCode;
  let counter = 1;
  while (existingTeams.some(t => t.captainCode === uniqueCode)) {
    uniqueCode = `${baseCode}-${counter}`;
    counter++;
  }
  return uniqueCode;
};

export const dbService = {
  // ==========================================
  // TOURNAMENT SERVICES
  // ==========================================
  getTournaments: async (): Promise<Tournament[]> => {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'tournaments'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
    } else {
      return getLocalData<Tournament>(TOURNAMENTS_KEY);
    }
  },

  createTournament: async (name: string, logoUrl: string | null): Promise<Tournament> => {
    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, 'tournaments'), {
        name,
        logoUrl,
        createdAt: new Date(),
      });
      return { id: docRef.id, name, logoUrl };
    } else {
      const list = await getLocalData<Tournament>(TOURNAMENTS_KEY);
      const newT: Tournament = { id: `tournament-${Date.now()}`, name, logoUrl };
      list.push(newT);
      await saveLocalData(TOURNAMENTS_KEY, list);
      return newT;
    }
  },

  updateTournament: async (id: string, name: string, logoUrl: string | null): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'tournaments', id), { name, logoUrl });
    } else {
      const list = await getLocalData<Tournament>(TOURNAMENTS_KEY);
      const idx = list.findIndex(t => t.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], name, logoUrl };
        await saveLocalData(TOURNAMENTS_KEY, list);
      }
    }
  },

  // ==========================================
  // GROUPS SERVICES
  // ==========================================
  getGroups: async (): Promise<Group[]> => {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'groups'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      // Ensure we sort alphabetically
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const list = await getLocalData<Group>(GROUPS_KEY);
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  },

  createGroup: async (name: string): Promise<Group> => {
    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, 'groups'), {
        name,
        teamIds: [],
        createdAt: new Date(),
      });
      return { id: docRef.id, name, teamIds: [] };
    } else {
      const list = await getLocalData<Group>(GROUPS_KEY);
      const newG: Group = { id: `group-${Date.now()}`, name, teamIds: [] };
      list.push(newG);
      await saveLocalData(GROUPS_KEY, list);
      return newG;
    }
  },

  assignTeamsToGroup: async (groupId: string, teamIds: string[]): Promise<void> => {
    if (isFirebaseConfigured && db) {
      // Step 1: Update group document
      await updateDoc(doc(db, 'groups', groupId), { teamIds });
      
      // Step 2: Update each team's groupId in parallel
      for (const teamId of teamIds) {
        await updateDoc(doc(db, 'teams', teamId), { groupId });
      }
    } else {
      // Local Database Update
      const groups = await getLocalData<Group>(GROUPS_KEY);
      const gIdx = groups.findIndex(g => g.id === groupId);
      if (gIdx !== -1) {
        groups[gIdx].teamIds = teamIds;
        await saveLocalData(GROUPS_KEY, groups);
      }
      
      const teams = await getLocalData<Team>(TEAMS_KEY);
      const updatedTeams = teams.map(t => {
        if (teamIds.includes(t.id)) {
          return { ...t, groupId };
        } else if (t.groupId === groupId) {
          // If it was in this group but is no longer in teamIds, remove group association
          return { ...t, groupId: null };
        }
        return t;
      });
      await saveLocalData(TEAMS_KEY, updatedTeams);
    }
  },

  // ==========================================
  // TEAMS SERVICES
  // ==========================================
  getTeams: async (): Promise<Team[]> => {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'teams'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
    } else {
      return getLocalData<Team>(TEAMS_KEY);
    }
  },

  createTeam: async (name: string, logoUrl: string | null, captainId: string | null, captainName: string | null): Promise<Team> => {
    const list = await dbService.getTeams();
    const captainCode = generateCaptainCode(name, list);

    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, 'teams'), {
        name,
        logoUrl,
        captainId,
        captainName,
        groupId: null,
        captainCode,
        team_locked: false,
        createdAt: new Date(),
      });
      
      // If a captain is designated, update their user record to link this team
      if (captainId) {
        await updateDoc(doc(db, 'users', captainId), { teamId: docRef.id });
      }

      return { id: docRef.id, name, logoUrl, captainId, captainName, groupId: null, captainCode, team_locked: false };
    } else {
      const newT: Team = { 
        id: `team-${Date.now()}`, 
        name, 
        logoUrl, 
        captainId, 
        captainName, 
        groupId: null,
        captainCode,
        team_locked: false
      };
      list.push(newT);
      await saveLocalData(TEAMS_KEY, list);

      // Simulate updating captain's teamId in mock DB
      if (captainId) {
        const usersStr = await AsyncStorage.getItem('@carlo_cup_local_users_db');
        if (usersStr) {
          const users = JSON.parse(usersStr);
          const uIdx = users.findIndex((u: any) => u.uid === captainId);
          if (uIdx !== -1) {
            users[uIdx].teamId = newT.id;
            await AsyncStorage.setItem('@carlo_cup_local_users_db', JSON.stringify(users));
          }
        }
      }

      return newT;
    }
  },

  updateTeam: async (id: string, name: string, logoUrl: string | null, captainId: string | null, captainName: string | null): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'teams', id), { name, logoUrl, captainId, captainName });
      if (captainId) {
        await updateDoc(doc(db, 'users', captainId), { teamId: id });
      }
    } else {
      const list = await getLocalData<Team>(TEAMS_KEY);
      const idx = list.findIndex(t => t.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], name, logoUrl, captainId, captainName };
        await saveLocalData(TEAMS_KEY, list);
        
        // Sim update captain's user in local DB
        if (captainId) {
          const usersStr = await AsyncStorage.getItem('@carlo_cup_local_users_db');
          if (usersStr) {
            const users = JSON.parse(usersStr);
            const uIdx = users.findIndex((u: any) => u.uid === captainId);
            if (uIdx !== -1) {
              users[uIdx].teamId = id;
              await AsyncStorage.setItem('@carlo_cup_local_users_db', JSON.stringify(users));
            }
          }
        }
      }
    }
  },

  // ==========================================
  // PLAYERS SERVICES
  // ==========================================
  getPlayers: async (teamId?: string): Promise<Player[]> => {
    if (isFirebaseConfigured && db) {
      let q;
      if (teamId) {
        q = query(collection(db, 'players'), where('teamId', '==', teamId));
      } else {
        q = collection(db, 'players');
      }
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
    } else {
      const list = await getLocalData<Player>(PLAYERS_KEY);
      return teamId ? list.filter(p => p.teamId === teamId) : list;
    }
  },

  addPlayer: async (player: Omit<Player, 'id'>): Promise<Player> => {
    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, 'players'), player);
      return { id: docRef.id, ...player };
    } else {
      const list = await getLocalData<Player>(PLAYERS_KEY);
      const newP: Player = { id: `player-${Date.now()}`, ...player };
      list.push(newP);
      await saveLocalData(PLAYERS_KEY, list);
      return newP;
    }
  },

  updatePlayer: async (id: string, player: Partial<Player>): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'players', id), player);
    } else {
      const list = await getLocalData<Player>(PLAYERS_KEY);
      const idx = list.findIndex(p => p.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...player } as Player;
        await saveLocalData(PLAYERS_KEY, list);
      }
    }
  },

  deletePlayer: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'players', id));
    } else {
      const list = await getLocalData<Player>(PLAYERS_KEY);
      const filtered = list.filter(p => p.id !== id);
      await saveLocalData(PLAYERS_KEY, filtered);
    }
  },

  // ==========================================
  // FIXTURES SERVICES
  // ==========================================
  getFixtures: async (): Promise<Fixture[]> => {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'fixtures'));
      return snap.docs.map(d => {
        const data = d.data();
        // Handle conversion of firebase Timestamp to JS Date or string
        let dt = data.dateTime;
        if (dt && typeof dt.toDate === 'function') {
          dt = dt.toDate().toISOString();
        }
        return { 
          id: d.id, 
          ...data,
          dateTime: dt
        } as Fixture;
      }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    } else {
      let list = await getLocalData<Fixture>(FIXTURES_KEY);
      // Ensure knockout fixtures are seeded if missing from AsyncStorage
      const hasKnockouts = list.some(f => f.stage === 'semifinal' || f.stage === 'final');
      if (!hasKnockouts && list.length > 0) {
        const knockoutFixtures = DEFAULT_FIXTURES.filter(f => f.stage === 'semifinal' || f.stage === 'final');
        list = [...list, ...knockoutFixtures];
        await saveLocalData(FIXTURES_KEY, list);
      }
      return list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    }
  },

  addFixture: async (fixture: Omit<Fixture, 'id' | 'status' | 'scoreA' | 'scoreB' | 'scorers' | 'cleanSheets'>): Promise<Fixture> => {
    const fullFixture: Omit<Fixture, 'id'> = {
      ...fixture,
      status: 'scheduled',
      scoreA: null,
      scoreB: null,
      scorers: [],
      cleanSheets: [],
      stage: (fixture as any).stage || 'group',
    };

    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, 'fixtures'), {
        ...fullFixture,
        dateTime: Timestamp.fromDate(new Date(fixture.dateTime)),
      });
      return { id: docRef.id, ...fullFixture };
    } else {
      const list = await getLocalData<Fixture>(FIXTURES_KEY);
      const newF: Fixture = { id: `fixture-${Date.now()}`, ...fullFixture };
      list.push(newF);
      await saveLocalData(FIXTURES_KEY, list);
      return newF;
    }
  },

  updateFixtureDetails: async (id: string, updates: { teamAId: string, teamAName: string, teamBId: string, teamBName: string, dateTime: string, groupId: string }): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'fixtures', id), {
        ...updates,
        dateTime: Timestamp.fromDate(new Date(updates.dateTime)),
      });
    } else {
      const list = await getLocalData<Fixture>(FIXTURES_KEY);
      const idx = list.findIndex(f => f.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        await saveLocalData(FIXTURES_KEY, list);
      }
    }
  },

  saveFixtureResult: async (
    id: string, 
    scoreA: number, 
    scoreB: number, 
    scorers: ScorerInfo[], 
    cleanSheets: string[]
  ): Promise<void> => {
    if (isFirebaseConfigured && db) {
      // Save current match results
      await updateDoc(doc(db, 'fixtures', id), {
        scoreA,
        scoreB,
        scorers,
        cleanSheets,
        status: 'played',
      });

      // Auto-propagate winners for Semi-Finals to Grand Final
      if (id === 'ko-sf-1' || id === 'ko-sf-2') {
        const sfSnap = await getDoc(doc(db, 'fixtures', id));
        if (sfSnap.exists()) {
          const sfData = sfSnap.data();
          const winnerId = scoreA >= scoreB ? sfData.teamAId : sfData.teamBId;
          const winnerName = scoreA >= scoreB ? sfData.teamAName : sfData.teamBName;
          
          if (id === 'ko-sf-1') {
            await updateDoc(doc(db, 'fixtures', 'ko-final'), {
              teamAId: winnerId,
              teamAName: winnerName
            });
          } else {
            await updateDoc(doc(db, 'fixtures', 'ko-final'), {
              teamBId: winnerId,
              teamBName: winnerName
            });
          }
        }
      }
    } else {
      const list = await getLocalData<Fixture>(FIXTURES_KEY);
      const idx = list.findIndex(f => f.id === id);
      if (idx !== -1) {
        list[idx] = { 
          ...list[idx], 
          scoreA, 
          scoreB, 
          scorers, 
          cleanSheets, 
          status: 'played' 
        };

        // Auto-propagate winners for Semi-Finals to Grand Final in mock DB
        if (id === 'ko-sf-1' || id === 'ko-sf-2') {
          const sfFix = list[idx];
          const winnerId = scoreA >= scoreB ? sfFix.teamAId : sfFix.teamBId;
          const winnerName = scoreA >= scoreB ? sfFix.teamAName : sfFix.teamBName;
          
          const finalIdx = list.findIndex(f => f.id === 'ko-final');
          if (finalIdx !== -1) {
            if (id === 'ko-sf-1') {
              list[finalIdx].teamAId = winnerId;
              list[finalIdx].teamAName = winnerName;
            } else {
              list[finalIdx].teamBId = winnerId;
              list[finalIdx].teamBName = winnerName;
            }
          }
        }

        await saveLocalData(FIXTURES_KEY, list);
      }
    }
  },

  deleteFixture: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'fixtures', id));
    } else {
      const list = await getLocalData<Fixture>(FIXTURES_KEY);
      const filtered = list.filter(f => f.id !== id);
      await saveLocalData(FIXTURES_KEY, filtered);
    }
  },

  // ==========================================
  // CALCULATED POINTS TABLE & STATISTICS
  // ==========================================
  getStandings: async (groupId?: string): Promise<StandingsRow[]> => {
    const teams = await dbService.getTeams();
    const fixtures = await dbService.getFixtures();
    
    // Filter teams by group if requested
    const filteredTeams = groupId ? teams.filter(t => t.groupId === groupId) : teams;
    const playedFixtures = fixtures.filter(f => f.status === 'played' && (!f.stage || f.stage === 'group') && (!groupId || f.groupId === groupId));

    // Initialize map
    const standings: { [teamId: string]: StandingsRow } = {};
    filteredTeams.forEach(t => {
      standings[t.id] = {
        teamId: t.id,
        teamName: t.name,
        teamLogoUrl: t.logoUrl,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    });

    // Compute stats
    playedFixtures.forEach(f => {
      const scoreA = f.scoreA ?? 0;
      const scoreB = f.scoreB ?? 0;
      
      const teamA = standings[f.teamAId];
      const teamB = standings[f.teamBId];

      // Guard in case team is not in selected group
      if (teamA) {
        teamA.played += 1;
        teamA.goalsFor += scoreA;
        teamA.goalsAgainst += scoreB;
        if (scoreA > scoreB) {
          teamA.won += 1;
          teamA.points += 3;
        } else if (scoreA === scoreB) {
          teamA.draw += 1;
          teamA.points += 1;
        } else {
          teamA.lost += 1;
        }
      }

      if (teamB) {
        teamB.played += 1;
        teamB.goalsFor += scoreB;
        teamB.goalsAgainst += scoreA;
        if (scoreB > scoreA) {
          teamB.won += 1;
          teamB.points += 3;
        } else if (scoreA === scoreB) {
          teamB.draw += 1;
          teamB.points += 1;
        } else {
          teamB.lost += 1;
        }
      }
    });

    // Compute GD and convert to array
    const result: StandingsRow[] = Object.values(standings).map(row => {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
      return row;
    });

    // Sort: Points DESC, GoalDiff DESC, GoalsFor DESC, TeamName ASC
    return result.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.teamName.localeCompare(b.teamName);
    });
  },

  getStatistics: async (): Promise<{ topScorers: PlayerStats[], bestGoalkeepers: PlayerStats[], bestPlayers: PlayerStats[] }> => {
    const players = await dbService.getPlayers();
    const fixtures = await dbService.getFixtures();
    const teams = await dbService.getTeams();

    const teamNameMap = teams.reduce((acc, t) => {
      acc[t.id] = t.name;
      return acc;
    }, {} as { [key: string]: string });

    const playerStatsMap: { [playerId: string]: PlayerStats } = {};

    players.forEach(p => {
      playerStatsMap[p.id] = {
        playerId: p.id,
        playerName: p.name,
        teamName: teamNameMap[p.teamId] || 'Unknown Team',
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        points: 0,
      };
    });

    // Compile goals and assists
    const playedFixtures = fixtures.filter(f => f.status === 'played');
    playedFixtures.forEach(f => {
      // Aggregate goals + assists
      f.scorers.forEach(sc => {
        const stats = playerStatsMap[sc.playerId];
        if (stats) {
          stats.goals += sc.goals;
          stats.assists += sc.assists;
          stats.points += (sc.goals + sc.assists);
        }
      });

      // Aggregate clean sheets
      f.cleanSheets.forEach(pId => {
        const stats = playerStatsMap[pId];
        if (stats) {
          stats.cleanSheets += 1;
        }
      });
    });

    const statsList = Object.values(playerStatsMap);

    // 1. Top Scorers: Filter players who have scored at least 1 goal, sort by goals desc
    const topScorers = [...statsList]
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName));

    // 2. Best Goalkeeper (most clean sheets): Filter goalkeepers (or cleanSheets > 0), sort by clean sheets desc
    const bestGoalkeepers = [...statsList]
      .filter(p => p.cleanSheets > 0)
      .sort((a, b) => b.cleanSheets - a.cleanSheets || a.playerName.localeCompare(b.playerName));

    // 3. Player of the Tournament (most goals + assists): Sort by points (goals + assists) desc
    const bestPlayers = [...statsList]
      .filter(p => p.points > 0)
      .sort((a, b) => b.points - a.points || b.goals - a.goals || a.playerName.localeCompare(b.playerName));

    return {
      topScorers,
      bestGoalkeepers,
      bestPlayers
    };
  },

  lockAllTeams: async (): Promise<void> => {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'teams'));
      const batchPromises = snap.docs.map(teamDoc => 
        updateDoc(doc(db, 'teams', teamDoc.id), { team_locked: true })
      );
      await Promise.all(batchPromises);
    } else {
      const list = await getLocalData<Team>(TEAMS_KEY);
      const updated = list.map(t => ({ ...t, team_locked: true }));
      await saveLocalData(TEAMS_KEY, updated);
    }
  },

  setTeamLockStatus: async (teamId: string, locked: boolean): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'teams', teamId), { team_locked: locked });
    } else {
      const list = await getLocalData<Team>(TEAMS_KEY);
      const idx = list.findIndex(t => t.id === teamId);
      if (idx !== -1) {
        list[idx].team_locked = locked;
        await saveLocalData(TEAMS_KEY, list);
      }
    }
  },

  regenerateCaptainCode: async (teamId: string): Promise<string> => {
    if (isFirebaseConfigured && db) {
      const snap = await getDocs(collection(db, 'teams'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      const team = list.find(t => t.id === teamId);
      if (!team) throw new Error('Team not found');
      
      const code = generateCaptainCode(team.name, list.filter(t => t.id !== teamId));
      await updateDoc(doc(db, 'teams', teamId), { captainCode: code });
      return code;
    } else {
      const list = await getLocalData<Team>(TEAMS_KEY);
      const team = list.find(t => t.id === teamId);
      if (!team) throw new Error('Team not found');
      
      const code = generateCaptainCode(team.name, list.filter(t => t.id !== teamId));
      team.captainCode = code;
      await saveLocalData(TEAMS_KEY, list);
      return code;
    }
  }
};
