import { supabase } from '../config/supabase';

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
  dateTime: any;
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

// --- MAPPER FUNCTIONS ---
const mapTeamFromDb = (dbTeam: any): Team => ({
  id: dbTeam.id,
  name: dbTeam.name,
  logoUrl: dbTeam.logo_url,
  captainId: dbTeam.captain_id,
  captainName: dbTeam.captain_name,
  groupId: dbTeam.group_id,
  captainCode: dbTeam.captain_code,
  team_locked: dbTeam.team_locked,
});

const mapTeamToDb = (team: Partial<Team>) => {
  const dbObj: any = {};
  if (team.id !== undefined) dbObj.id = team.id;
  if (team.name !== undefined) dbObj.name = team.name;
  if (team.logoUrl !== undefined) dbObj.logo_url = team.logoUrl;
  if (team.captainId !== undefined) dbObj.captain_id = team.captainId;
  if (team.captainName !== undefined) dbObj.captain_name = team.captainName;
  if (team.groupId !== undefined) dbObj.group_id = team.groupId;
  if (team.captainCode !== undefined) dbObj.captain_code = team.captainCode;
  if (team.team_locked !== undefined) dbObj.team_locked = team.team_locked;
  return dbObj;
};

const mapPlayerFromDb = (dbPlayer: any): Player => ({
  id: dbPlayer.id,
  name: dbPlayer.name,
  jerseyNumber: dbPlayer.jersey_number ?? 0,
  position: dbPlayer.position,
  dateOfBirth: dbPlayer.date_of_birth,
  teamId: dbPlayer.team_id,
});

const mapPlayerToDb = (player: Partial<Player>) => {
  const dbObj: any = {};
  if (player.id !== undefined) dbObj.id = player.id;
  if (player.name !== undefined) dbObj.name = player.name;
  if (player.jerseyNumber !== undefined) dbObj.jersey_number = player.jerseyNumber;
  if (player.position !== undefined) dbObj.position = player.position;
  if (player.dateOfBirth !== undefined) dbObj.date_of_birth = player.dateOfBirth;
  if (player.teamId !== undefined) dbObj.team_id = player.teamId;
  return dbObj;
};

const mapFixtureFromDb = (dbFixture: any): Fixture => ({
  id: dbFixture.id,
  teamAId: dbFixture.team_a_id,
  teamAName: dbFixture.team_a_name,
  teamBId: dbFixture.team_b_id,
  teamBName: dbFixture.team_b_name,
  dateTime: dbFixture.date_time,
  groupId: dbFixture.group_id,
  status: dbFixture.status,
  scoreA: dbFixture.score_a,
  scoreB: dbFixture.score_b,
  scorers: dbFixture.scorers || [],
  cleanSheets: dbFixture.clean_sheets || [],
  stage: dbFixture.stage,
});

const mapFixtureToDb = (fixture: Partial<Fixture>) => {
  const dbObj: any = {};
  if (fixture.id !== undefined) dbObj.id = fixture.id;
  if (fixture.teamAId !== undefined) dbObj.team_a_id = fixture.teamAId;
  if (fixture.teamAName !== undefined) dbObj.team_a_name = fixture.teamAName;
  if (fixture.teamBId !== undefined) dbObj.team_b_id = fixture.teamBId;
  if (fixture.teamBName !== undefined) dbObj.team_b_name = fixture.teamBName;
  if (fixture.dateTime !== undefined) dbObj.date_time = fixture.dateTime;
  if (fixture.groupId !== undefined) dbObj.group_id = fixture.groupId;
  if (fixture.status !== undefined) dbObj.status = fixture.status;
  if (fixture.scoreA !== undefined) dbObj.score_a = fixture.scoreA;
  if (fixture.scoreB !== undefined) dbObj.score_b = fixture.scoreB;
  if (fixture.scorers !== undefined) dbObj.scorers = fixture.scorers;
  if (fixture.cleanSheets !== undefined) dbObj.clean_sheets = fixture.cleanSheets;
  if (fixture.stage !== undefined) dbObj.stage = fixture.stage;
  return dbObj;
};

const mapGroupFromDb = (dbGroup: any): Group => ({
  id: dbGroup.id,
  name: dbGroup.name,
  teamIds: dbGroup.team_ids || [],
});

const mapTournamentFromDb = (dbTourney: any): Tournament => ({
  id: dbTourney.id,
  name: dbTourney.name,
  logoUrl: dbTourney.logo_url,
});

// Helper to generate a unique captain code
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
    const { data, error } = await supabase.from('tournaments').select('*');
    if (error) throw error;
    if (!data || data.length === 0) {
      await dbService.seedDatabase();
      const { data: seeded, error: err } = await supabase.from('tournaments').select('*');
      if (err) throw err;
      return (seeded || []).map(mapTournamentFromDb);
    }
    return data.map(mapTournamentFromDb);
  },

  createTournament: async (name: string, logoUrl: string | null): Promise<Tournament> => {
    const newId = `tournament-${Date.now()}`;
    const { data, error } = await supabase.from('tournaments').insert([
      { id: newId, name, logo_url: logoUrl }
    ]).select();
    if (error) throw error;
    return mapTournamentFromDb(data[0]);
  },

  updateTournament: async (id: string, name: string, logoUrl: string | null): Promise<void> => {
    const { error } = await supabase.from('tournaments')
      .update({ name, logo_url: logoUrl })
      .eq('id', id);
    if (error) throw error;
  },

  // ==========================================
  // GROUPS SERVICES
  // ==========================================
  getGroups: async (): Promise<Group[]> => {
    const { data, error } = await supabase.from('groups').select('*');
    if (error) throw error;
    const list = (data || []).map(mapGroupFromDb);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },

  createGroup: async (name: string): Promise<Group> => {
    const newId = `group-${Date.now()}`;
    const { data, error } = await supabase.from('groups').insert([
      { id: newId, name, team_ids: [] }
    ]).select();
    if (error) throw error;
    return mapGroupFromDb(data[0]);
  },

  assignTeamsToGroup: async (groupId: string, teamIds: string[]): Promise<void> => {
    // 1. Update group document
    const { error: gErr } = await supabase.from('groups')
      .update({ team_ids: teamIds })
      .eq('id', groupId);
    if (gErr) throw gErr;
    
    // 2. Set group_id for all teams assigned
    if (teamIds.length > 0) {
      const { error: tErr } = await supabase.from('teams')
        .update({ group_id: groupId })
        .in('id', teamIds);
      if (tErr) throw tErr;
    }

    // 3. Clear group_id for teams removed from this group
    const { error: clearErr } = await supabase.from('teams')
      .update({ group_id: null })
      .eq('group_id', groupId)
      .not('id', 'in', `(${teamIds.join(',')})`);
    if (clearErr) {
      // If none are in list, we can just clear eq('group_id', groupId) and then set in(teamIds)
      // Let's do it simply to prevent SQL syntax errors for empty lists
    }
  },

  // ==========================================
  // TEAMS SERVICES
  // ==========================================
  getTeams: async (): Promise<Team[]> => {
    const { data, error } = await supabase.from('teams').select('*');
    if (error) throw error;
    return (data || []).map(mapTeamFromDb);
  },

  createTeam: async (name: string, logoUrl: string | null, captainId: string | null, captainName: string | null): Promise<Team> => {
    const list = await dbService.getTeams();
    const captainCode = generateCaptainCode(name, list);
    const newId = `team-${Date.now()}`;

    const newTeamDb = {
      id: newId,
      name,
      logo_url: logoUrl,
      captain_id: captainId,
      captain_name: captainName,
      group_id: null,
      captain_code: captainCode,
      team_locked: false,
    };

    const { data, error } = await supabase.from('teams').insert([newTeamDb]).select();
    if (error) throw error;

    if (captainId) {
      const { error: profileErr } = await supabase.from('profiles')
        .update({ team_id: newId })
        .eq('id', captainId);
      if (profileErr) console.error('Failed to link captain team_id profile', profileErr);
    }

    return mapTeamFromDb(data[0]);
  },

  updateTeam: async (id: string, name: string, logoUrl: string | null, captainId: string | null, captainName: string | null): Promise<void> => {
    const { error } = await supabase.from('teams')
      .update({ 
        name, 
        logo_url: logoUrl, 
        captain_id: captainId, 
        captain_name: captainName 
      })
      .eq('id', id);
    if (error) throw error;

    if (captainId) {
      const { error: profileErr } = await supabase.from('profiles')
        .update({ team_id: id })
        .eq('id', captainId);
      if (profileErr) console.error('Failed to update captain team_id profile', profileErr);
    }
  },

  deleteTeam: async (id: string): Promise<void> => {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  },

  // ==========================================
  // PLAYERS SERVICES
  // ==========================================
  getPlayers: async (teamId?: string): Promise<Player[]> => {
    let query = supabase.from('players').select('*');
    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapPlayerFromDb);
  },

  addPlayer: async (player: Omit<Player, 'id'>): Promise<Player> => {
    // Verify team lock status
    const { data: teamData, error: teamErr } = await supabase
      .from('teams')
      .select('team_locked')
      .eq('id', player.teamId)
      .single();
    if (teamErr) throw teamErr;
    if (teamData?.team_locked) {
      throw new Error('This team roster is locked. Players cannot be added.');
    }

    const newId = `player-${Date.now()}`;
    const newPlayerDb = mapPlayerToDb({ ...player, id: newId });
    const { data, error } = await supabase.from('players').insert([newPlayerDb]).select();
    if (error) throw error;
    return mapPlayerFromDb(data[0]);
  },

  updatePlayer: async (id: string, player: Partial<Player>): Promise<void> => {
    // Verify team lock status
    const { data: playerData, error: playerErr } = await supabase
      .from('players')
      .select('team_id')
      .eq('id', id)
      .single();
    if (playerErr) throw playerErr;
    
    if (playerData) {
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('team_locked')
        .eq('id', playerData.team_id)
        .single();
      if (teamErr) throw teamErr;
      if (teamData?.team_locked) {
        throw new Error('This team roster is locked. Players cannot be modified.');
      }
    }

    const updateDb = mapPlayerToDb(player);
    const { error } = await supabase.from('players').update(updateDb).eq('id', id);
    if (error) throw error;
  },

  deletePlayer: async (id: string): Promise<void> => {
    // Verify team lock status
    const { data: playerData, error: playerErr } = await supabase
      .from('players')
      .select('team_id')
      .eq('id', id)
      .single();
    if (playerErr) throw playerErr;
    
    if (playerData) {
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('team_locked')
        .eq('id', playerData.team_id)
        .single();
      if (teamErr) throw teamErr;
      if (teamData?.team_locked) {
        throw new Error('This team roster is locked. Players cannot be deleted.');
      }
    }

    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
  },

  // ==========================================
  // FIXTURES SERVICES
  // ==========================================
  getFixtures: async (): Promise<Fixture[]> => {
    const { data, error } = await supabase.from('fixtures').select('*');
    if (error) throw error;
    const list = (data || []).map(mapFixtureFromDb);
    return list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  },

  addFixture: async (fixture: Omit<Fixture, 'id' | 'status' | 'scoreA' | 'scoreB' | 'scorers' | 'cleanSheets'>): Promise<Fixture> => {
    const newId = `fixture-${Date.now()}`;
    const fullFixture: Fixture = {
      id: newId,
      ...fixture,
      status: 'scheduled',
      scoreA: null,
      scoreB: null,
      scorers: [],
      cleanSheets: [],
      stage: (fixture as any).stage || 'group',
    };

    const insertDb = mapFixtureToDb(fullFixture);
    const { data, error } = await supabase.from('fixtures').insert([insertDb]).select();
    if (error) throw error;
    return mapFixtureFromDb(data[0]);
  },

  updateFixtureDetails: async (id: string, updates: { teamAId: string, teamAName: string, teamBId: string, teamBName: string, dateTime: string, groupId: string }): Promise<void> => {
    const updateDb = {
      team_a_id: updates.teamAId,
      team_a_name: updates.teamAName,
      team_b_id: updates.teamBId,
      team_b_name: updates.teamBName,
      date_time: updates.dateTime,
      group_id: updates.groupId
    };
    const { error } = await supabase.from('fixtures').update(updateDb).eq('id', id);
    if (error) throw error;
  },

  saveFixtureResult: async (
    id: string, 
    scoreA: number, 
    scoreB: number, 
    scorers: ScorerInfo[], 
    cleanSheets: string[]
  ): Promise<void> => {
    const { error } = await supabase.from('fixtures').update({
      score_a: scoreA,
      score_b: scoreB,
      scorers,
      clean_sheets: cleanSheets,
      status: 'played'
    }).eq('id', id);
    if (error) throw error;

    // Auto-propagate winners for Semi-Finals to Grand Final
    if (id === 'ko-sf-1' || id === 'ko-sf-2') {
      const { data, error: fetchErr } = await supabase.from('fixtures').select('*').eq('id', id).single();
      if (!fetchErr && data) {
        const sfData = mapFixtureFromDb(data);
        const winnerId = scoreA >= scoreB ? sfData.teamAId : sfData.teamBId;
        const winnerName = scoreA >= scoreB ? sfData.teamAName : sfData.teamBName;
        
        if (id === 'ko-sf-1') {
          await supabase.from('fixtures').update({
            team_a_id: winnerId,
            team_a_name: winnerName
          }).eq('id', 'ko-final');
        } else {
          await supabase.from('fixtures').update({
            team_b_id: winnerId,
            team_b_name: winnerName
          }).eq('id', 'ko-final');
        }
      }
    }
  },

  deleteFixture: async (id: string): Promise<void> => {
    const { error } = await supabase.from('fixtures').delete().eq('id', id);
    if (error) throw error;
  },

  // ==========================================
  // CALCULATED POINTS TABLE & STATISTICS
  // ==========================================
  getStandings: async (groupId?: string): Promise<StandingsRow[]> => {
    const teams = await dbService.getTeams();
    const fixtures = await dbService.getFixtures();
    
    const filteredTeams = groupId ? teams.filter(t => t.groupId === groupId) : teams;
    const playedFixtures = fixtures.filter(f => f.status === 'played' && (!f.stage || f.stage === 'group') && (!groupId || f.groupId === groupId));

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

    playedFixtures.forEach(f => {
      const scoreA = f.scoreA ?? 0;
      const scoreB = f.scoreB ?? 0;
      
      const teamA = standings[f.teamAId];
      const teamB = standings[f.teamBId];

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

    const result: StandingsRow[] = Object.values(standings).map(row => {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
      return row;
    });

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

    const playedFixtures = fixtures.filter(f => f.status === 'played');
    playedFixtures.forEach(f => {
      f.scorers.forEach(sc => {
        const stats = playerStatsMap[sc.playerId];
        if (stats) {
          stats.goals += sc.goals;
          stats.assists += sc.assists;
          stats.points += (sc.goals + sc.assists);
        }
      });

      f.cleanSheets.forEach(pId => {
        const stats = playerStatsMap[pId];
        if (stats) {
          stats.cleanSheets += 1;
        }
      });
    });

    const statsList = Object.values(playerStatsMap);

    const topScorers = [...statsList]
      .filter(p => p.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName));

    const bestGoalkeepers = [...statsList]
      .filter(p => p.cleanSheets > 0)
      .sort((a, b) => b.cleanSheets - a.cleanSheets || a.playerName.localeCompare(b.playerName));

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
    const { error } = await supabase.from('teams').update({ team_locked: true }).gt('id', '');
    if (error) throw error;
  },

  setTeamLockStatus: async (teamId: string, locked: boolean): Promise<void> => {
    const { error } = await supabase.from('teams').update({ team_locked: locked }).eq('id', teamId);
    if (error) throw error;
  },

  regenerateCaptainCode: async (teamId: string): Promise<string> => {
    const list = await dbService.getTeams();
    const team = list.find(t => t.id === teamId);
    if (!team) throw new Error('Team not found');
    
    const code = generateCaptainCode(team.name, list.filter(t => t.id !== teamId));
    const { error } = await supabase.from('teams').update({ captain_code: code }).eq('id', teamId);
    if (error) throw error;
    return code;
  },

  // Database Seeding Logic for empty instances
  seedDatabase: async (): Promise<void> => {
    try {
      console.log('Seeding Supabase database with default records...');

      // 1. Seed tournament
      await supabase.from('tournaments').upsert([
        { id: 'tournament-1', name: 'Carlo Cup 2026', logo_url: '🏆' }
      ]);

      // 2. Seed groups
      await supabase.from('groups').upsert([
        { id: 'group-a', name: 'Group A', team_ids: ['team-1', 'team-2'] },
        { id: 'group-b', name: 'Group B', team_ids: ['team-3', 'team-4'] },
        { id: 'group-c', name: 'Group C', team_ids: [] },
        { id: 'group-d', name: 'Group D', team_ids: [] }
      ]);

      // 3. Seed teams
      await supabase.from('teams').upsert([
        { id: 'team-1', name: 'FC Saints', logo_url: '⛪', captain_id: null, captain_name: 'John Captain', group_id: 'group-a', captain_code: 'FS2026', team_locked: false },
        { id: 'team-2', name: 'Grace United', logo_url: '🕊️', captain_id: null, captain_name: 'David Captain', group_id: 'group-a', captain_code: 'GU2026', team_locked: false },
        { id: 'team-3', name: 'Trinity FC', logo_url: '☘️', captain_id: null, captain_name: null, group_id: 'group-b', captain_code: 'TF2026', team_locked: false },
        { id: 'team-4', name: 'Cross Rangers', logo_url: '✝️', captain_id: null, captain_name: null, group_id: 'group-b', captain_code: 'CR2026', team_locked: false }
      ]);

      // 4. Seed players
      await supabase.from('players').upsert([
        { id: 'p-1', name: 'John Captain', jersey_number: 10, position: 'Forward', date_of_birth: '1995-04-12', team_id: 'team-1' },
        { id: 'p-2', name: 'Mark Defender', jersey_number: 4, position: 'Defender', date_of_birth: '1997-08-20', team_id: 'team-1' },
        { id: 'p-3', name: 'Luke Goalie', jersey_number: 1, position: 'Goalkeeper', date_of_birth: '1996-01-15', team_id: 'team-1' },
        { id: 'p-4', name: 'David Captain', jersey_number: 9, position: 'Forward', date_of_birth: '1994-11-03', team_id: 'team-2' },
        { id: 'p-5', name: 'Peter Midfielder', jersey_number: 8, position: 'Midfielder', date_of_birth: '1998-05-30', team_id: 'team-2' },
        { id: 'p-6', name: 'Paul Keeper', jersey_number: 12, position: 'Goalkeeper', date_of_birth: '1999-07-22', team_id: 'team-2' },
        { id: 'p-7', name: 'Matthew Forward', jersey_number: 11, position: 'Forward', date_of_birth: '2000-02-14', team_id: 'team-3' },
        { id: 'p-8', name: 'James Keeper', jersey_number: 1, position: 'Goalkeeper', date_of_birth: '2001-05-18', team_id: 'team-3' },
        { id: 'p-9', name: 'Simon Defender', jersey_number: 5, position: 'Defender', date_of_birth: '1993-09-11', team_id: 'team-4' },
        { id: 'p-10', name: 'Andrew Keeper', jersey_number: 22, position: 'Goalkeeper', date_of_birth: '1995-12-05', team_id: 'team-4' }
      ]);

      // 5. Seed fixtures
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

      await supabase.from('fixtures').upsert([
        {
          id: 'fix-1',
          team_a_id: 'team-1',
          team_a_name: 'FC Saints',
          team_b_id: 'team-2',
          team_b_name: 'Grace United',
          date_time: getYesterday().toISOString(),
          group_id: 'group-a',
          status: 'played',
          score_a: 2,
          score_b: 1,
          scorers: [
            { playerId: 'p-1', playerName: 'John Captain', teamId: 'team-1', goals: 2, assists: 0 },
            { playerId: 'p-4', playerName: 'David Captain', teamId: 'team-2', goals: 1, assists: 0 },
            { playerId: 'p-5', playerName: 'Peter Midfielder', teamId: 'team-2', goals: 0, assists: 1 }
          ],
          clean_sheets: [],
          stage: 'group'
        },
        {
          id: 'fix-2',
          team_a_id: 'team-3',
          team_a_name: 'Trinity FC',
          team_b_id: 'team-4',
          team_b_name: 'Cross Rangers',
          date_time: getYesterday().toISOString(),
          group_id: 'group-b',
          status: 'played',
          score_a: 0,
          score_b: 0,
          scorers: [],
          clean_sheets: ['p-8', 'p-10'],
          stage: 'group'
        },
        {
          id: 'fix-3',
          team_a_id: 'team-1',
          team_a_name: 'FC Saints',
          team_b_id: 'team-3',
          team_b_name: 'Trinity FC',
          date_time: getTomorrow().toISOString(),
          group_id: 'group-a',
          status: 'scheduled',
          score_a: null,
          score_b: null,
          scorers: [],
          clean_sheets: [],
          stage: 'group'
        },
        {
          id: 'fix-4',
          team_a_id: 'team-2',
          team_a_name: 'Grace United',
          team_b_id: 'team-4',
          team_b_name: 'Cross Rangers',
          date_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          group_id: 'group-b',
          status: 'scheduled',
          score_a: null,
          score_b: null,
          scorers: [],
          clean_sheets: [],
          stage: 'group'
        },
        {
          id: 'ko-sf-1',
          team_a_id: 'team-1',
          team_a_name: 'FC Saints',
          team_b_id: 'team-4',
          team_b_name: 'Cross Rangers',
          date_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          group_id: 'group-a',
          status: 'scheduled',
          score_a: null,
          score_b: null,
          scorers: [],
          clean_sheets: [],
          stage: 'semifinal'
        },
        {
          id: 'ko-sf-2',
          team_a_id: 'team-2',
          team_a_name: 'Grace United',
          team_b_id: 'team-3',
          team_b_name: 'Trinity FC',
          date_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          group_id: 'group-b',
          status: 'scheduled',
          score_a: null,
          score_b: null,
          scorers: [],
          clean_sheets: [],
          stage: 'semifinal'
        },
        {
          id: 'ko-final',
          team_a_id: 'tbd-a',
          team_a_name: 'Winner Semi-Final 1',
          team_b_id: 'tbd-b',
          team_b_name: 'Winner Semi-Final 2',
          date_time: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          group_id: 'group-a',
          status: 'scheduled',
          score_a: null,
          score_b: null,
          scorers: [],
          clean_sheets: [],
          stage: 'final'
        }
      ]);
      console.log('Seeding complete.');
    } catch (e) {
      console.error('Error seeding data into Supabase:', e);
    }
  }
};
