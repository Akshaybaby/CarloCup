import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { Award, Plus, Trash2, Check, Clipboard } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { dbService, Fixture, Player, ScorerInfo } from '../services/db';

export const ResultsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { fixtureId } = route.params || {};

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Match details
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [playersA, setPlayersA] = useState<Player[]>([]);
  const [playersB, setPlayersB] = useState<Player[]>([]);

  // Score Input
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');

  // Scorers list
  const [scorers, setScorers] = useState<ScorerInfo[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [goals, setGoals] = useState('1');
  const [assists, setAssists] = useState('0');

  // Clean sheets lists
  const [cleanSheets, setCleanSheets] = useState<string[]>([]); // goalkeeper player IDs

  const loadData = async () => {
    if (!fixtureId) return;
    try {
      setLoading(true);
      const fixtures = await dbService.getFixtures();
      const current = fixtures.find(f => f.id === fixtureId);
      if (!current) {
        Alert.alert('Error', 'Fixture not found.');
        navigation.goBack();
        return;
      }
      setFixture(current);

      if (current.status === 'played') {
        setScoreA(current.scoreA?.toString() || '0');
        setScoreB(current.scoreB?.toString() || '0');
        setScorers(current.scorers || []);
        setCleanSheets(current.cleanSheets || []);
      }

      // Load rosters for Team A and B
      const [teamAPlayers, teamBPlayers] = await Promise.all([
        dbService.getPlayers(current.teamAId),
        dbService.getPlayers(current.teamBId)
      ]);
      setPlayersA(teamAPlayers);
      setPlayersB(teamBPlayers);

      // Default selected player for scorers input
      const allRoster = [...teamAPlayers, ...teamBPlayers];
      if (allRoster.length > 0) {
        setSelectedPlayerId(allRoster[0].id);
      }
    } catch (err) {
      console.error('Failed to load results details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, fixtureId]);

  // Proactively suggest clean sheets if scores are set and team concedes 0
  useEffect(() => {
    const sA = parseInt(scoreA);
    const sB = parseInt(scoreB);
    
    if (isNaN(sA) || isNaN(sB)) return;

    const suggestedCleanSheets: string[] = [];

    // If Team A conceded 0 (Score B is 0), suggest Team A's goalkeeper(s)
    if (sB === 0 && playersA.length > 0) {
      const gkA = playersA.filter(p => p.position === 'Goalkeeper');
      gkA.forEach(p => suggestedCleanSheets.push(p.id));
    }

    // If Team B conceded 0 (Score A is 0), suggest Team B's goalkeeper(s)
    if (sA === 0 && playersB.length > 0) {
      const gkB = playersB.filter(p => p.position === 'Goalkeeper');
      gkB.forEach(p => suggestedCleanSheets.push(p.id));
    }

    setCleanSheets(suggestedCleanSheets);
  }, [scoreA, scoreB, playersA, playersB]);

  const handleAddScorer = () => {
    if (!selectedPlayerId) {
      Alert.alert('Error', 'Please select a player.');
      return;
    }

    const goalNum = parseInt(goals);
    const assistNum = parseInt(assists);

    if (isNaN(goalNum) || goalNum < 0) {
      Alert.alert('Error', 'Invalid goals count.');
      return;
    }
    if (isNaN(assistNum) || assistNum < 0) {
      Alert.alert('Error', 'Invalid assists count.');
      return;
    }

    const allRoster = [...playersA, ...playersB];
    const player = allRoster.find(p => p.id === selectedPlayerId);
    if (!player) return;

    // Check if player is already in scorers, if so update/add, else push new
    const idx = scorers.findIndex(s => s.playerId === selectedPlayerId);
    if (idx !== -1) {
      const updated = [...scorers];
      updated[idx].goals += goalNum;
      updated[idx].assists += assistNum;
      setScorers(updated);
    } else {
      setScorers([
        ...scorers,
        {
          playerId: player.id,
          playerName: player.name,
          teamId: player.teamId,
          goals: goalNum,
          assists: assistNum
        }
      ]);
    }

    // Reset input
    setGoals('1');
    setAssists('0');
  };

  const handleRemoveScorer = (pId: string) => {
    setScorers(scorers.filter(s => s.playerId !== pId));
  };

  const handleToggleCleanSheet = (pId: string) => {
    if (cleanSheets.includes(pId)) {
      setCleanSheets(cleanSheets.filter(id => id !== pId));
    } else {
      setCleanSheets([...cleanSheets, pId]);
    }
  };

  const handleSaveResult = async () => {
    const sA = parseInt(scoreA);
    const sB = parseInt(scoreB);

    if (isNaN(sA) || sA < 0 || isNaN(sB) || sB < 0) {
      Alert.alert('Error', 'Please enter valid scores for both teams.');
      return;
    }

    if (!fixture) return;

    // Verify scorers sum does not exceed scores entered (sanity check, warn but allow)
    const teamAScorerGoals = scorers.filter(s => s.teamId === fixture.teamAId).reduce((sum, s) => sum + s.goals, 0);
    const teamBScorerGoals = scorers.filter(s => s.teamId === fixture.teamBId).reduce((sum, s) => sum + s.goals, 0);

    if (teamAScorerGoals > sA) {
      Alert.alert('Warning', `You have registered ${teamAScorerGoals} goals for ${fixture.teamAName}, but the final score is only ${sA}. Please review scorers.`);
      return;
    }
    if (teamBScorerGoals > sB) {
      Alert.alert('Warning', `You have registered ${teamBScorerGoals} goals for ${fixture.teamBName}, but the final score is only ${sB}. Please review scorers.`);
      return;
    }

    try {
      setSaving(true);
      await dbService.saveFixtureResult(fixture.id, sA, sB, scorers, cleanSheets);
      Alert.alert('Success', 'Match result saved successfully!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save match result.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !fixture) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const allPlayers = [...playersA, ...playersB];
  const allGoalkeepers = allPlayers.filter(p => p.position === 'Goalkeeper');

  return (
    <View style={styles.container}>
      <Header title="Enter Match Result" showBack />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Score Sheet */}
        <Card style={styles.scoreCard}>
          <Text style={styles.cardTitle}>Score Entry Sheet</Text>
          
          <View style={styles.scoreRow}>
            {/* Team A */}
            <View style={styles.teamScoreCol}>
              <Text style={styles.teamLogo}>{fixture.teamAName.substring(0, 1)}</Text>
              <Text style={styles.teamName} numberOfLines={1}>{fixture.teamAName}</Text>
              <Input
                placeholder="0"
                value={scoreA}
                onChangeText={setScoreA}
                keyboardType="number-pad"
                style={styles.scoreInput}
                containerStyle={{ width: 60 }}
              />
            </View>

            <Text style={styles.vsDivider}>VS</Text>

            {/* Team B */}
            <View style={styles.teamScoreCol}>
              <Text style={styles.teamLogo}>{fixture.teamBName.substring(0, 1)}</Text>
              <Text style={styles.teamName} numberOfLines={1}>{fixture.teamBName}</Text>
              <Input
                placeholder="0"
                value={scoreB}
                onChangeText={setScoreB}
                keyboardType="number-pad"
                style={styles.scoreInput}
                containerStyle={{ width: 60 }}
              />
            </View>
          </View>
        </Card>

        {/* Goal Scorers Logger */}
        <Card style={styles.scorerCard}>
          <Text style={styles.cardTitle}>Log Goals & Assists</Text>
          
          {allPlayers.length === 0 ? (
            <Text style={styles.noPlayersWarn}>Please add players to teams to log goals.</Text>
          ) : (
            <View>
              {/* Select Player List */}
              <Text style={styles.inputLabel}>Select Player</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerSelectRow}>
                {allPlayers.map((p) => {
                  const isSelected = selectedPlayerId === p.id;
                  const isTeamA = p.teamId === fixture.teamAId;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.playerPickerBadge,
                        isSelected && styles.playerPickerBadgeActive,
                        { borderColor: isTeamA ? '#3B82F6' : '#EF4444' }
                      ]}
                      onPress={() => setSelectedPlayerId(p.id)}
                    >
                      <Text style={styles.badgeText}>{p.name} (#{p.jerseyNumber})</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Goals / Assists count */}
              <View style={styles.statsCountRow}>
                <Input
                  label="Goals Scored"
                  value={goals}
                  onChangeText={setGoals}
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginRight: SPACING.md }}
                />
                <Input
                  label="Assists"
                  value={assists}
                  onChangeText={setAssists}
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginRight: SPACING.md }}
                />
                <Button
                  title="Add Log"
                  style={styles.addLogBtn}
                  onPress={handleAddScorer}
                  icon={<Plus color={COLORS.background} size={14} />}
                />
              </View>

              {/* Added Scorers List */}
              <Text style={styles.subLabel}>Logged Events:</Text>
              {scorers.length === 0 ? (
                <Text style={styles.emptyScorers}>No goals or assists logged yet.</Text>
              ) : (
                scorers.map((sc) => {
                  const isTeamA = sc.teamId === fixture.teamAId;
                  return (
                    <View key={sc.playerId} style={styles.loggedItem}>
                      <View style={styles.loggedLeft}>
                        <Award color={COLORS.primary} size={16} style={{ marginRight: 8 }} />
                        <Text style={styles.loggedText}>
                          {sc.playerName} ({isTeamA ? 'Home' : 'Away'}):{' '}
                          <Text style={styles.highlightText}>
                            {sc.goals} Goals, {sc.assists} Assists
                          </Text>
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.trashBtn} 
                        onPress={() => handleRemoveScorer(sc.playerId)}
                      >
                        <Trash2 color={COLORS.loss} size={16} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </Card>

        {/* Clean Sheet Keeper Log */}
        {allGoalkeepers.length > 0 && (
          <Card style={styles.gkCard}>
            <Text style={styles.cardTitle}>Clean Sheets (Goalkeepers)</Text>
            <Text style={styles.gkSubtext}>
              Select which goalkeeper(s) should receive clean sheet points:
            </Text>
            
            {allGoalkeepers.map((gk) => {
              const isChecked = cleanSheets.includes(gk.id);
              const isTeamA = gk.teamId === fixture.teamAId;

              return (
                <TouchableOpacity
                  key={gk.id}
                  style={[
                    styles.gkOption,
                    isChecked && styles.gkOptionActive
                  ]}
                  onPress={() => handleToggleCleanSheet(gk.id)}
                >
                  <View style={styles.gkInfoLeft}>
                    <Clipboard color={COLORS.primary} size={16} style={{ marginRight: 8 }} />
                    <Text style={styles.gkName}>
                      {gk.name} ({isTeamA ? 'Home' : 'Away'})
                    </Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    isChecked && styles.checkboxActive
                  ]}>
                    {isChecked && <Check color={COLORS.background} size={12} strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>
        )}

        {/* Action Button */}
        <Button
          title="Save Match Results"
          loading={saving}
          style={styles.saveBtn}
          onPress={handleSaveResult}
        />
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
  scoreCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  teamScoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    fontSize: 24,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  scoreInput: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 0,
  },
  vsDivider: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: '800',
    marginHorizontal: SPACING.md,
  },
  // Scorers list
  scorerCard: {
    marginBottom: SPACING.md,
  },
  noPlayersWarn: {
    color: COLORS.loss,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  playerSelectRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  playerPickerBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surfaceLight,
  },
  playerPickerBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary + ' !important',
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  statsCountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  addLogBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md, // align with input fields bottom spacing
  },
  subLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  emptyScorers: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: SPACING.xs,
  },
  loggedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loggedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loggedText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  highlightText: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
  },
  trashBtn: {
    padding: 4,
  },
  // Goalkeeper styles
  gkCard: {
    marginBottom: SPACING.md,
  },
  gkSubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: SPACING.md,
  },
  gkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.md,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gkOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#0F2C20',
  },
  gkInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gkName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  saveBtn: {
    marginTop: SPACING.md,
    height: 50,
  },
});
