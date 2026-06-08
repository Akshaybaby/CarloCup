import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  Alert 
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { 
  Trophy, 
  Shield, 
  Grid, 
  Calendar, 
  Settings, 
  TrendingUp, 
  Sparkles 
} from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { dbService, Tournament } from '../services/db';
import { authService, UserProfile } from '../services/auth';
import { BibleVerse } from '../components/BibleVerse';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  // State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  
  // Stats
  const [teamCount, setTeamCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [fixtureCount, setFixtureCount] = useState(0);
  const [playedCount, setPlayedCount] = useState(0);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isFocused) {
      setCurrentUser(authService.getCurrentUser());
    }
  }, [isFocused]);

  const isAdmin = currentUser?.role === 'admin';

  const loadData = async () => {
    try {
      setLoading(true);
      const tourneys = await dbService.getTournaments();
      
      let currentTourney = tourneys[0];
      if (!currentTourney) {
        // Create initial default tournament if none exists
        currentTourney = await dbService.createTournament('Carlo Cup 2026', '🏆');
      }
      setTournament(currentTourney);
      setEditName(currentTourney.name);
      setEditLogo(currentTourney.logoUrl || '🏆');

      const [teams, groups, fixtures] = await Promise.all([
        dbService.getTeams(),
        dbService.getGroups(),
        dbService.getFixtures(),
      ]);

      setTeamCount(teams.length);
      setGroupCount(groups.length);
      setFixtureCount(fixtures.length);
      setPlayedCount(fixtures.filter(f => f.status === 'played').length);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const handleUpdateTournament = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Tournament name cannot be empty.');
      return;
    }

    if (!tournament) return;

    try {
      setSaving(true);
      await dbService.updateTournament(tournament.id, editName.trim(), editLogo.trim() || '⚽');
      setShowEditModal(false);
      Alert.alert('Success', 'Tournament details updated!');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update tournament.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !tournament) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Dashboard" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Tournament Hero Card */}
        <Card style={styles.heroCard} accent>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLogo}>{tournament?.logoUrl || '⚽'}</Text>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroTitle}>{tournament?.name}</Text>
              <Text style={styles.heroSubtitle}>Active Tournament</Text>
            </View>
            {isAdmin && (
              <Button
                title=""
                variant="outline"
                size="sm"
                style={styles.settingsBtn}
                onPress={() => navigation.navigate('AdminControls')}
                icon={<Settings color={COLORS.primary} size={18} />}
              />
            )}
          </View>
        </Card>

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Tournament Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Shield color={COLORS.primary} size={24} />
            <Text style={styles.statValue}>{teamCount}</Text>
            <Text style={styles.statLabel}>Teams</Text>
          </View>
          <View style={styles.statBox}>
            <Grid color={COLORS.primary} size={24} />
            <Text style={styles.statValue}>{groupCount}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statBox}>
            <Calendar color={COLORS.primary} size={24} />
            <Text style={styles.statValue}>
              {playedCount} / {fixtureCount}
            </Text>
            <Text style={styles.statLabel}>Matches Played</Text>
          </View>
        </View>

        {/* Shortcuts */}
        <Text style={styles.sectionTitle}>Quick Shortcuts</Text>
        <View style={styles.shortcutRow}>
          <Card 
            style={styles.shortcutCard} 
            onPress={() => navigation.navigate('Standings')}
          >
            <Trophy color={COLORS.win} size={24} />
            <Text style={styles.shortcutLabel}>View Standings</Text>
          </Card>
          <Card 
            style={styles.shortcutCard} 
            onPress={() => navigation.navigate('Statistics')}
          >
            <TrendingUp color={COLORS.primary} size={24} />
            <Text style={styles.shortcutLabel}>Top Scorers & Stats</Text>
          </Card>
        </View>
        
        <View style={styles.shortcutRow}>
          <Card 
            style={styles.shortcutCard} 
            onPress={() => navigation.navigate('Fixtures')}
          >
            <Calendar color={COLORS.text} size={24} />
            <Text style={styles.shortcutLabel}>Match Fixtures</Text>
          </Card>
          <Card 
            style={styles.shortcutCard} 
            onPress={() => navigation.navigate('Teams')}
          >
            <Shield color={COLORS.primaryLight} size={24} />
            <Text style={styles.shortcutLabel}>Team Rosters</Text>
          </Card>
        </View>

        {/* Welcome message / details */}
        <Card style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <Sparkles color={COLORS.primary} size={20} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.welcomeTitle}>{tournament?.name || 'Carlo Cup'} Organizer</Text>
          </View>
          <Text style={styles.welcomeText}>
            Welcome to the {tournament?.name} official app! Keep track of all scores, schedules, groups, and player stats in real time. 
          </Text>
          <Text style={styles.welcomeRoleTip}>
            {isAdmin 
              ? '👑 You are logged in as Admin. You have full edit rights across groups, teams, fixtures, and scores.' 
              : currentUser?.role === 'captain' 
                ? '⚽ You are logged in as Team Captain. You can add or edit players specifically for your team.' 
                : '👀 You are viewing in Public mode. Select standings or statistics to view real-time data.'}
          </Text>
        </Card>
        
        {/* Bible Verse Banner */}
        <BibleVerse />
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  heroCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLogo: {
    fontSize: 40,
    marginRight: SPACING.md,
  },
  heroTitleContainer: {
    flex: 1,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 4,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
  },
  shortcutCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    paddingVertical: SPACING.lg,
  },
  shortcutLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  welcomeCard: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  welcomeTitle: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  welcomeText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  welcomeRoleTip: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '600',
    marginTop: SPACING.sm,
    backgroundColor: '#0F2C20',
    padding: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
});
