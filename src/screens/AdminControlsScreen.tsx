import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Lock, Unlock, Settings, Trophy, ShieldAlert, Check, User, Mail, RefreshCw } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { dbService, Team, Tournament } from '../services/db';
import { authService } from '../services/auth';

export const AdminControlsScreen: React.FC = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  // State
  const [loading, setLoading] = useState(true);
  const [savingTournament, setSavingTournament] = useState(false);
  const [lockingAll, setLockingAll] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);

  // Form
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentLogo, setTournamentLogo] = useState('');

  // Form Admin creation
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tourneys, teamList] = await Promise.all([
        dbService.getTournaments(),
        dbService.getTeams()
      ]);
      
      const active = tourneys[0];
      if (active) {
        setTournament(active);
        setTournamentName(active.name);
        setTournamentLogo(active.logoUrl || '🏆');
      }

      setTeams(teamList);
    } catch (err) {
      console.error('Failed to load admin controls data', err);
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
    if (!tournamentName.trim()) {
      Alert.alert('Error', 'Tournament name is required.');
      return;
    }
    if (!tournament) return;

    try {
      setSavingTournament(true);
      await dbService.updateTournament(
        tournament.id,
        tournamentName.trim(),
        tournamentLogo.trim() || '🏆'
      );
      Alert.alert('Success', 'Tournament details updated!');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update tournament.');
    } finally {
      setSavingTournament(false);
    }
  };

  const handleLockAllTeams = () => {
    Alert.alert(
      'Lock All Teams',
      'Are you sure you want to freeze and lock the rosters of all teams? Captains will no longer be able to add or edit players.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLockingAll(true);
              await dbService.lockAllTeams();
              Alert.alert('Success', 'All team rosters have been locked!');
              loadData();
            } catch (err) {
              Alert.alert('Error', 'Failed to lock all teams.');
            } finally {
              setLockingAll(false);
            }
          }
        }
      ]
    );
  };

  const handleToggleTeamLock = async (team: Team) => {
    const nextLockState = !team.team_locked;
    try {
      await dbService.setTeamLockStatus(team.id, nextLockState);
      
      // Update local state directly for fast visual feedback
      setTeams(prevTeams => 
        prevTeams.map(t => t.id === team.id ? { ...t, team_locked: nextLockState } : t)
      );

      Alert.alert(
        'Roster Lock Updated', 
        `Roster for ${team.name} is now ${nextLockState ? 'LOCKED 🔒' : 'UNLOCKED 🔓'}.`
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to update team lock status.');
    }
  };

  const handleCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
      Alert.alert('Error', 'Please fill in all admin fields.');
      return;
    }
    if (newAdminPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }

    try {
      setCreatingAdmin(true);
      await authService.createAdminUser(
        newAdminEmail.trim(),
        newAdminPassword.trim(),
        newAdminName.trim()
      );
      Alert.alert('Success', `Admin account created for ${newAdminName.trim()}!`);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create admin.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleRegenerateCode = async (team: Team) => {
    Alert.alert(
      'Regenerate Code',
      `Are you sure you want to generate a new captain code for ${team.name}? The current code (${team.captainCode}) will be invalidated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          onPress: async () => {
            try {
              const newCode = await dbService.regenerateCaptainCode(team.id);
              Alert.alert('Success', `New Captain Code for ${team.name} is: ${newCode}`);
              loadData();
            } catch (err) {
              Alert.alert('Error', 'Failed to regenerate captain code.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="Admin Controls" showBack />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Tournament configuration panel */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏆 Configure Tournament</Text>
          <Input
            label="Tournament Name"
            placeholder="e.g. Carlo Cup 2026"
            value={tournamentName}
            onChangeText={setTournamentName}
          />
          <Input
            label="Tournament Logo (Emoji or URL)"
            placeholder="e.g. 🏆"
            value={tournamentLogo}
            onChangeText={setTournamentLogo}
          />
          <Button
            title="Save Details"
            loading={savingTournament}
            onPress={handleUpdateTournament}
          />
        </Card>

        {/* Create New Admin */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👑 Add New Admin</Text>
          <Input
            label="Admin Full Name"
            placeholder="e.g. Samuel Admin"
            value={newAdminName}
            onChangeText={setNewAdminName}
            icon={<User color={COLORS.textMuted} size={18} />}
          />
          <Input
            label="Admin Email"
            placeholder="e.g. samuel@carlo.com"
            value={newAdminEmail}
            onChangeText={setNewAdminEmail}
            icon={<Mail color={COLORS.textMuted} size={18} />}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Min 6 characters"
            value={newAdminPassword}
            onChangeText={setNewAdminPassword}
            icon={<Lock color={COLORS.textMuted} size={18} />}
            secureTextEntry
          />
          <Button
            title="Create Admin Account"
            loading={creatingAdmin}
            onPress={handleCreateAdmin}
          />
        </Card>

        {/* Global lock triggers */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔒 Roster Lock Actions</Text>
          <Text style={styles.warningText}>
            Locking all rosters freezes team creations, edits, and deletions for all team captains. Use this before matches start to freeze lineups.
          </Text>
          <Button
            title="Lock All Teams Rosters"
            variant="danger"
            loading={lockingAll}
            onPress={handleLockAllTeams}
            icon={<Lock color={COLORS.text} size={16} />}
          />
        </Card>

        {/* Individual team locks listing */}
        <Text style={styles.listHeaderTitle}>Teams Lock Control ({teams.length})</Text>
        {teams.length === 0 ? (
          <Text style={styles.emptyText}>No registered teams found. Create teams first.</Text>
        ) : (
          teams.map((team) => (
            <Card key={team.id} style={styles.teamLockCard}>
              <Text style={styles.teamLogo}>{team.logoUrl || '🛡️'}</Text>
              
              <View style={styles.teamInfoCol}>
                <Text style={styles.teamName}>{team.name}</Text>
                <Text style={styles.teamCodeText}>
                  Captain Code: <Text style={styles.codeText}>{team.captainCode}</Text>{'  '}
                  <TouchableOpacity 
                    onPress={() => handleRegenerateCode(team)}
                    style={styles.regenerateCodeLink}
                  >
                    <RefreshCw color={COLORS.primaryLight} size={12} style={{ marginTop: 2 }} />
                  </TouchableOpacity>
                </Text>
                <Text style={styles.teamCaptainName}>
                  Captain: {team.captainName || 'Not Registered'}
                </Text>
              </View>

              <TouchableOpacity 
                style={[
                  styles.lockStatusButton,
                  team.team_locked ? styles.lockBtnLocked : styles.lockBtnUnlocked
                ]}
                onPress={() => handleToggleTeamLock(team)}
                activeOpacity={0.7}
              >
                {team.team_locked ? (
                  <>
                    <Lock color="#FCA5A5" size={16} />
                    <Text style={[styles.lockStatusText, { color: '#FCA5A5' }]}>Locked</Text>
                  </>
                ) : (
                  <>
                    <Unlock color="#D1FAE5" size={16} />
                    <Text style={[styles.lockStatusText, { color: '#D1FAE5' }]}>Unlocked</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },
  sectionCard: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
  warningText: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  listHeaderTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  teamLockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginVertical: 4,
  },
  teamLogo: {
    fontSize: 28,
    marginRight: SPACING.md,
  },
  teamInfoCol: {
    flex: 1,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  teamCodeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  codeText: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
  },
  teamCaptainName: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  lockStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  lockBtnLocked: {
    backgroundColor: '#7F1D1D',
    borderColor: '#991B1B',
  },
  lockBtnUnlocked: {
    backgroundColor: '#064E3B',
    borderColor: '#065F46',
  },
  lockStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: SPACING.md,
  },
  regenerateCodeLink: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
