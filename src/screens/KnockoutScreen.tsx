import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Trophy, Award, Calendar, Edit, ClipboardCheck, ArrowRight, Star } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { BibleVerse } from '../components/BibleVerse';
import { dbService, Fixture, Team } from '../services/db';
import { authService, UserProfile } from '../services/auth';

export const KnockoutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  // State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [semifinals, setSemifinals] = useState<Fixture[]>([]);
  const [finals, setFinals] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Edit Match Teams Modal (Admin only)
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [dateTime, setDateTime] = useState('');
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
      let [fixturesList, teamsList] = await Promise.all([
        dbService.getFixtures(),
        dbService.getTeams()
      ]);

      let sf = fixturesList.filter(f => f.stage === 'semifinal');
      let f = fixturesList.filter(f => f.stage === 'final');

      if (sf.length === 0 || f.length === 0) {
        await dbService.ensureKnockoutFixturesExist();
        fixturesList = await dbService.getFixtures();
        sf = fixturesList.filter(f => f.stage === 'semifinal');
        f = fixturesList.filter(f => f.stage === 'final');
      }

      setSemifinals(sf);
      setFinals(f);
      setTeams(teamsList);
    } catch (err) {
      console.error('Failed to load knockout brackets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const handleOpenEdit = (fix: Fixture) => {
    setSelectedFixture(fix);
    setTeamAId(fix.teamAId);
    setTeamBId(fix.teamBId);
    
    // Format date string for Input
    const formattedDate = new Date(fix.dateTime)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 16);
    setDateTime(formattedDate);
    
    setShowEditModal(true);
  };

  const handleSaveFixture = async () => {
    if (!selectedFixture) return;
    if (!teamAId || !teamBId) {
      Alert.alert('Error', 'Please select both teams.');
      return;
    }
    if (teamAId === teamBId && teamAId !== 'tbd-a' && teamAId !== 'tbd-b') {
      Alert.alert('Error', 'A team cannot play against itself.');
      return;
    }

    const parsedDate = new Date(dateTime.replace(' ', 'T'));
    if (isNaN(parsedDate.getTime())) {
      Alert.alert('Error', 'Invalid date format. Use YYYY-MM-DD HH:MM.');
      return;
    }

    try {
      setSaving(true);
      
      // Look up team names
      const teamA = teams.find(t => t.id === teamAId);
      const teamB = teams.find(t => t.id === teamBId);

      let defaultTeamAName = 'TBD';
      let defaultTeamBName = 'TBD';

      if (selectedFixture.id === 'ko-final') {
        defaultTeamAName = 'Winner Semi-Final 1';
        defaultTeamBName = 'Winner Semi-Final 2';
      } else if (selectedFixture.id === 'ko-sf-1') {
        defaultTeamAName = 'Winner Group A';
        defaultTeamBName = 'Runner-up Group B';
      } else if (selectedFixture.id === 'ko-sf-2') {
        defaultTeamAName = 'Winner Group B';
        defaultTeamBName = 'Runner-up Group A';
      }

      const updates = {
        teamAId,
        teamAName: teamA ? teamA.name : (teamAId === 'tbd-a' ? defaultTeamAName : 'TBD'),
        teamBId,
        teamBName: teamB ? teamB.name : (teamBId === 'tbd-b' ? defaultTeamBName : 'TBD'),
        dateTime: parsedDate.toISOString(),
        groupId: selectedFixture.groupId // retain existing group mapping
      };

      await dbService.updateFixtureDetails(selectedFixture.id, updates);
      Alert.alert('Success', 'Match details updated!');
      setShowEditModal(false);
      setSelectedFixture(null);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update match details.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const teamLogoMap = teams.reduce((acc, t) => {
    acc[t.id] = t.logoUrl || '🛡️';
    return acc;
  }, {} as { [key: string]: string });

  const getTeamLogo = (teamId: string) => {
    if (teamId.startsWith('tbd')) return '❓';
    return teamLogoMap[teamId] || '🛡️';
  };

  let teamATbdLabel = 'TBD A';
  let teamBTbdLabel = 'TBD B';
  if (selectedFixture) {
    if (selectedFixture.id === 'ko-final') {
      teamATbdLabel = 'Winner SF1';
      teamBTbdLabel = 'Winner SF2';
    } else if (selectedFixture.id === 'ko-sf-1') {
      teamATbdLabel = 'Winner Group A';
      teamBTbdLabel = 'Runner-up Group B';
    } else if (selectedFixture.id === 'ko-sf-2') {
      teamATbdLabel = 'Winner Group B';
      teamBTbdLabel = 'Runner-up Group A';
    }
  }

  const renderBracketCard = (item: Fixture) => {
    const hasPlayed = item.status === 'played';
    const isWinnerA = hasPlayed && (item.scoreA ?? 0) >= (item.scoreB ?? 0);
    const isWinnerB = hasPlayed && (item.scoreB ?? 0) >= (item.scoreA ?? 0);

    return (
      <Card key={item.id} style={styles.matchCard} accent={hasPlayed}>
        <View style={styles.cardHeader}>
          <Text style={styles.stageLabel}>
            {item.stage === 'semifinal' ? 'Semi-Final' : '🏆 Grand Final'}
          </Text>
          <Text style={styles.dateText}>{formatDate(item.dateTime)}</Text>
        </View>

        <View style={styles.bracketRowsContainer}>
          {/* Row for Team A */}
          <View style={[styles.bracketTeamRow, isWinnerA && styles.winnerRow]}>
            <View style={styles.bracketTeamLeft}>
              <Text style={styles.bracketTeamEmoji}>{getTeamLogo(item.teamAId)}</Text>
              <Text 
                style={[
                  styles.bracketTeamName, 
                  isWinnerA && styles.winnerTeamText,
                  hasPlayed && !isWinnerA && styles.loserTeamText
                ]} 
                numberOfLines={1}
              >
                {item.teamAName}
              </Text>
            </View>
            <Text 
              style={[
                styles.bracketTeamScore, 
                isWinnerA && styles.winnerScoreText,
                hasPlayed && !isWinnerA && styles.loserScoreText
              ]}
            >
              {hasPlayed ? item.scoreA : '-'}
            </Text>
          </View>

          {/* Divider line between teams */}
          <View style={styles.bracketDivider} />

          {/* Row for Team B */}
          <View style={[styles.bracketTeamRow, isWinnerB && styles.winnerRow]}>
            <View style={styles.bracketTeamLeft}>
              <Text style={styles.bracketTeamEmoji}>{getTeamLogo(item.teamBId)}</Text>
              <Text 
                style={[
                  styles.bracketTeamName, 
                  isWinnerB && styles.winnerTeamText,
                  hasPlayed && !isWinnerB && styles.loserTeamText
                ]} 
                numberOfLines={1}
              >
                {item.teamBName}
              </Text>
            </View>
            <Text 
              style={[
                styles.bracketTeamScore, 
                isWinnerB && styles.winnerScoreText,
                hasPlayed && !isWinnerB && styles.loserScoreText
              ]}
            >
              {hasPlayed ? item.scoreB : '-'}
            </Text>
          </View>
        </View>

        {/* Goal Scorers */}
        {hasPlayed && item.scorers && item.scorers.length > 0 && (
          <View style={styles.scorersSection}>
            <Award color={COLORS.primaryLight} size={14} style={{ marginRight: 6 }} />
            <Text style={styles.scorersText}>
              {item.scorers.map(s => `${s.playerName} (${s.goals}G)`).join(', ')}
            </Text>
          </View>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <View style={styles.adminActionRow}>
            <TouchableOpacity 
              style={styles.adminEditBtn}
              onPress={() => handleOpenEdit(item)}
            >
              <Edit color={COLORS.textMuted} size={15} />
              <Text style={styles.adminEditBtnText}>Configure Teams</Text>
            </TouchableOpacity>

            <Button
              title={hasPlayed ? 'Edit Score' : 'Log Score'}
              variant={hasPlayed ? 'outline' : 'primary'}
              size="sm"
              style={styles.scoreBtn}
              onPress={() => navigation.navigate('ResultsEntry', { fixtureId: item.id })}
              icon={<ClipboardCheck color={hasPlayed ? COLORS.primary : COLORS.background} size={14} />}
            />
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Knockout Stage" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.bracketContainer}>
            {/* 1. Semi Finals Block */}
            <Text style={styles.stageTitle}>🔥 Semi-Finals</Text>
            {semifinals.map(renderBracketCard)}

            {/* Connecting Visual */}
            <View style={styles.connectorRow}>
              <View style={styles.verticalLine} />
            </View>

            {/* 2. Finals Block */}
            <Text style={styles.stageTitle}>🏆 The Grand Finale</Text>
            {finals.map(renderBracketCard)}
            
            {/* Final Champion Indicator */}
            {finals.length > 0 && finals[0].status === 'played' && (
              <Card style={styles.champCard}>
                <Trophy color="#F59E0B" size={40} style={{ marginBottom: SPACING.sm }} />
                <Text style={styles.champLabel}>Carlo Cup Champion</Text>
                <Text style={styles.champName}>
                  🎉 {finals[0].scoreA! > finals[0].scoreB! ? finals[0].teamAName : finals[0].teamBName} 🎉
                </Text>
              </Card>
            )}
          </View>
        )}

        <View style={styles.verseWrapper}>
          <BibleVerse />
        </View>

      </ScrollView>

      {/* ADMIN EDIT MATCH MODAL */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setSelectedFixture(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Set Knockout Competitors</Text>
              
              {/* Team A Selection */}
              <View style={styles.selectGroup}>
                <Text style={styles.selectLabel}>Team A (Home)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                  {/* TBD Option */}
                  <TouchableOpacity
                    style={[
                      styles.pickerBadge,
                      teamAId === 'tbd-a' && styles.pickerBadgeActive
                    ]}
                    onPress={() => setTeamAId('tbd-a')}
                  >
                    <Text style={[styles.pickerBadgeText, teamAId === 'tbd-a' && styles.pickerBadgeTextActive]}>{teamATbdLabel}</Text>
                  </TouchableOpacity>
                  
                  {teams.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.pickerBadge,
                        teamAId === t.id && styles.pickerBadgeActive
                      ]}
                      onPress={() => setTeamAId(t.id)}
                    >
                      <Text style={styles.pickerBadgeEmoji}>{t.logoUrl || '🛡️'}</Text>
                      <Text style={[styles.pickerBadgeText, teamAId === t.id && styles.pickerBadgeTextActive]}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Team B Selection */}
              <View style={styles.selectGroup}>
                <Text style={styles.selectLabel}>Team B (Away)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                  {/* TBD Option */}
                  <TouchableOpacity
                    style={[
                      styles.pickerBadge,
                      teamBId === 'tbd-b' && styles.pickerBadgeActive
                    ]}
                    onPress={() => setTeamBId('tbd-b')}
                  >
                    <Text style={[styles.pickerBadgeText, teamBId === 'tbd-b' && styles.pickerBadgeTextActive]}>{teamBTbdLabel}</Text>
                  </TouchableOpacity>

                  {teams.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.pickerBadge,
                        teamBId === t.id && styles.pickerBadgeActive
                      ]}
                      onPress={() => setTeamBId(t.id)}
                    >
                      <Text style={styles.pickerBadgeEmoji}>{t.logoUrl || '🛡️'}</Text>
                      <Text style={[styles.pickerBadgeText, teamBId === t.id && styles.pickerBadgeTextActive]}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Input
                label="Match Date & Time (YYYY-MM-DD HH:MM)"
                value={dateTime}
                onChangeText={setDateTime}
                icon={<Calendar color={COLORS.textMuted} size={18} />}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  style={{ flex: 1, marginRight: SPACING.md }}
                  onPress={() => {
                    setShowEditModal(false);
                    setSelectedFixture(null);
                  }}
                />
                <Button
                  title="Save Details"
                  loading={saving}
                  style={{ flex: 1 }}
                  onPress={handleSaveFixture}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  loaderContainer: {
    paddingVertical: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bracketContainer: {
    flex: 1,
  },
  stageTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stageLabel: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  bracketRowsContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  bracketTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  bracketTeamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  bracketTeamEmoji: {
    fontSize: 22,
    marginRight: SPACING.sm,
  },
  bracketTeamName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  bracketTeamScore: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  bracketDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  winnerRow: {
    backgroundColor: '#0F2C20', // subtle green for winner highlight
  },
  winnerTeamText: {
    color: COLORS.primaryLight,
    fontWeight: '700',
  },
  loserTeamText: {
    color: COLORS.textMuted,
  },
  winnerScoreText: {
    color: COLORS.primaryLight,
  },
  loserScoreText: {
    color: COLORS.textMuted,
  },
  scorersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scorersText: {
    color: COLORS.textMuted,
    fontSize: 12,
    flex: 1,
  },
  adminActionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminEditBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  scoreBtn: {
    paddingVertical: 5,
    paddingHorizontal: SPACING.md,
  },
  connectorRow: {
    alignItems: 'center',
    height: 30,
    justifyContent: 'center',
  },
  verticalLine: {
    width: 2,
    height: '100%',
    backgroundColor: COLORS.borderLight,
  },
  champCard: {
    backgroundColor: '#1C1304', // Deep gold/brown background
    borderColor: '#F59E0B',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    marginTop: SPACING.lg,
    borderRadius: 16,
  },
  champLabel: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  champName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
    textAlign: 'center',
  },
  verseWrapper: {
    marginTop: SPACING.xl,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
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
  selectGroup: {
    marginBottom: SPACING.md,
  },
  selectLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: 'row',
  },
  pickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerBadgeActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#0F2C20',
  },
  pickerBadgeEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  pickerBadgeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  pickerBadgeTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
});
