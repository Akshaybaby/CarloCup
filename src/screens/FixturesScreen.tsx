import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Calendar, Plus, Edit, Trash2, Award, ClipboardCheck } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { dbService, Fixture, Team, Group } from '../services/db';
import { authService } from '../services/auth';
import { BibleVerse } from '../components/BibleVerse';

export const FixturesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'admin';

  // State
  const [loading, setLoading] = useState(true);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [filteredFixtures, setFilteredFixtures] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'played'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingFixture, setEditingFixture] = useState<Fixture | null>(null);
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [groupId, setGroupId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fList, tList, gList] = await Promise.all([
        dbService.getFixtures(),
        dbService.getTeams(),
        dbService.getGroups()
      ]);
      setFixtures(fList);
      setTeams(tList);
      setGroups(gList);
    } catch (err) {
      console.error('Failed to load fixtures data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  // Apply filters
  useEffect(() => {
    let result = fixtures;

    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter);
    }

    if (groupFilter !== 'all') {
      result = result.filter(f => f.groupId === groupFilter);
    }

    setFilteredFixtures(result);
  }, [fixtures, statusFilter, groupFilter]);

  const handleOpenCreate = () => {
    setEditingFixture(null);
    setTeamAId(teams[0]?.id || '');
    setTeamBId(teams[1]?.id || '');
    setGroupId(groups[0]?.id || '');
    
    // Set a default date format
    const d = new Date();
    d.setHours(18, 0, 0, 0); // 6:00 PM
    setDateTime(d.toISOString().replace('T', ' ').substring(0, 16));
    
    setShowModal(true);
  };

  const handleOpenEdit = (fix: Fixture) => {
    setEditingFixture(fix);
    setTeamAId(fix.teamAId);
    setTeamBId(fix.teamBId);
    setGroupId(fix.groupId);
    
    const formattedDate = new Date(fix.dateTime)
      .toISOString()
      .replace('T', ' ')
      .substring(0, 16);
    setDateTime(formattedDate);
    
    setShowModal(true);
  };

  const handleSaveFixture = async () => {
    if (!teamAId || !teamBId) {
      Alert.alert('Error', 'Please select both teams.');
      return;
    }
    if (teamAId === teamBId) {
      Alert.alert('Error', 'A team cannot play against itself.');
      return;
    }
    if (!dateTime.trim()) {
      Alert.alert('Error', 'Date and time is required.');
      return;
    }
    if (!groupId) {
      Alert.alert('Error', 'Please select a group.');
      return;
    }

    // Validate date format
    const parsedDate = new Date(dateTime.replace(' ', 'T'));
    if (isNaN(parsedDate.getTime())) {
      Alert.alert('Error', 'Invalid date format. Please use YYYY-MM-DD HH:MM.');
      return;
    }

    try {
      setSaving(true);
      const teamA = teams.find(t => t.id === teamAId);
      const teamB = teams.find(t => t.id === teamBId);

      const payload = {
        teamAId,
        teamAName: teamA?.name || 'Team A',
        teamBId,
        teamBName: teamB?.name || 'Team B',
        dateTime: parsedDate.toISOString(),
        groupId,
      };

      if (editingFixture) {
        await dbService.updateFixtureDetails(editingFixture.id, payload);
        Alert.alert('Success', 'Fixture updated successfully!');
      } else {
        await dbService.addFixture(payload);
        Alert.alert('Success', 'Fixture scheduled successfully!');
      }
      setShowModal(false);
      setEditingFixture(null);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save fixture.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFixture = (id: string) => {
    Alert.alert(
      'Delete Fixture',
      'Are you sure you want to cancel and delete this match fixture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deleteFixture(id);
              loadData();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete fixture.');
            }
          }
        }
      ]
    );
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

  const groupNameMap = groups.reduce((acc, g) => {
    acc[g.id] = g.name;
    return acc;
  }, {} as { [key: string]: string });

  const teamLogoMap = teams.reduce((acc, t) => {
    acc[t.id] = t.logoUrl || '🛡️';
    return acc;
  }, {} as { [key: string]: string });

  return (
    <View style={styles.container}>
      <Header title="Match Fixtures" />
      <View style={styles.subContainer}>
        {/* Filters and Actions */}
        <View style={styles.toolbar}>
          <View style={styles.filtersContainer}>
            {/* Status Filter Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {(['all', 'scheduled', 'played'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusBadge,
                    statusFilter === status && styles.statusBadgeActive
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[
                    styles.statusBadgeText,
                    statusFilter === status && styles.statusBadgeTextActive
                  ]}>
                    {status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Group Filter Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.statusBadge,
                  groupFilter === 'all' && styles.statusBadgeActive
                ]}
                onPress={() => setGroupFilter('all')}
              >
                <Text style={[
                  styles.statusBadgeText,
                  groupFilter === 'all' && styles.statusBadgeTextActive
                ]}>
                  ALL GROUPS
                </Text>
              </TouchableOpacity>
              {groups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.statusBadge,
                    groupFilter === g.id && styles.statusBadgeActive
                  ]}
                  onPress={() => setGroupFilter(g.id)}
                >
                  <Text style={[
                    styles.statusBadgeText,
                    groupFilter === g.id && styles.statusBadgeTextActive
                  ]}>
                    {g.name.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {isAdmin && teams.length >= 2 && (
            <Button
              title="Schedule"
              size="sm"
              onPress={handleOpenCreate}
              icon={<Plus color={COLORS.background} size={16} />}
              style={styles.scheduleBtn}
            />
          )}
        </View>

        {/* Fixtures List */}
        <FlatList
          data={filteredFixtures}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No fixtures match current filter.</Text>
              {isAdmin && teams.length < 2 && (
                <Text style={styles.emptySubtext}>Please create at least 2 teams first.</Text>
              )}
            </View>
          }
          ListFooterComponent={<BibleVerse />}
          renderItem={({ item }) => (
            <Card style={styles.fixtureCard} accent={item.status === 'played'}>
              {/* Match Info Header */}
              <View style={styles.cardHeader}>
                <View style={styles.groupLabelBg}>
                  <Text style={styles.groupLabelText}>
                    {groupNameMap[item.groupId] || 'Group'}
                  </Text>
                </View>
                <Text style={styles.dateTimeText}>{formatDate(item.dateTime)}</Text>
              </View>

              {/* Match Scoreboard */}
              <View style={styles.matchScoreboard}>
                <View style={styles.teamContainer}>
                  <Text style={styles.teamEmoji}>{teamLogoMap[item.teamAId] || '🛡️'}</Text>
                  <Text style={styles.teamName} numberOfLines={1}>{item.teamAName}</Text>
                </View>

                <View style={styles.scoreContainer}>
                  {item.status === 'played' ? (
                    <View style={styles.playedScoreRow}>
                      <Text style={styles.scoreText}>{item.scoreA}</Text>
                      <Text style={styles.scoreDivider}>-</Text>
                      <Text style={styles.scoreText}>{item.scoreB}</Text>
                    </View>
                  ) : (
                    <View style={styles.vsContainer}>
                      <Text style={styles.vsText}>VS</Text>
                    </View>
                  )}
                </View>

                <View style={styles.teamContainer}>
                  <Text style={styles.teamEmoji}>{teamLogoMap[item.teamBId] || '🛡️'}</Text>
                  <Text style={styles.teamName} numberOfLines={1}>{item.teamBName}</Text>
                </View>
              </View>

              {/* Match Goal Scorers Display */}
              {item.status === 'played' && item.scorers && item.scorers.length > 0 && (
                <View style={styles.scorersDisplay}>
                  <Award color={COLORS.primaryLight} size={14} style={{ marginRight: 6 }} />
                  <Text style={styles.scorersText}>
                    {item.scorers.map(s => `${s.playerName} (${s.goals}G${s.assists > 0 ? ` ${s.assists}A` : ''})`).join(', ')}
                  </Text>
                </View>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <View style={styles.adminBar}>
                  <View style={styles.adminLeft}>
                    <TouchableOpacity 
                      style={styles.adminActionBtn} 
                      onPress={() => handleOpenEdit(item)}
                    >
                      <Edit color={COLORS.textMuted} size={16} />
                      <Text style={styles.adminBtnText}>Edit</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.adminActionBtn} 
                      onPress={() => handleDeleteFixture(item.id)}
                    >
                      <Trash2 color={COLORS.loss} size={16} />
                      <Text style={[styles.adminBtnText, { color: COLORS.loss }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                  <Button
                    title={item.status === 'played' ? 'Edit Score' : 'Enter Score'}
                    variant={item.status === 'played' ? 'outline' : 'primary'}
                    size="sm"
                    style={styles.scoreEnterBtn}
                    onPress={() => navigation.navigate('ResultsEntry', { fixtureId: item.id })}
                    icon={<ClipboardCheck color={item.status === 'played' ? COLORS.primary : COLORS.background} size={14} />}
                  />
                </View>
              )}
            </Card>
          )}
        />
      </View>

      {/* CREATE / EDIT FIXTURE MODAL */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowModal(false);
          setEditingFixture(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingFixture ? 'Edit Match Fixture' : 'Schedule New Match'}
              </Text>

              {/* Team A Picker */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Home Team (Team A)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
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

              {/* Team B Picker */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Away Team (Team B)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
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

              {/* Group Picker */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Match Group</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
                  {groups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.pickerBadge,
                        groupId === g.id && styles.pickerBadgeActive
                      ]}
                      onPress={() => setGroupId(g.id)}
                    >
                      <Text style={[styles.pickerBadgeText, groupId === g.id && styles.pickerBadgeTextActive]}>{g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Input
                label="Date & Time (YYYY-MM-DD HH:MM)"
                placeholder="2026-06-09 18:00"
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
                    setShowModal(false);
                    setEditingFixture(null);
                  }}
                />
                <Button
                  title="Save Fixture"
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
  subContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    justifyContent: 'space-between',
  },
  filtersContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  filterScroll: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  statusBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusBadgeText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadgeTextActive: {
    color: COLORS.background,
  },
  scheduleBtn: {
    alignSelf: 'center',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  fixtureCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  groupLabelBg: {
    backgroundColor: '#0F2C20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupLabelText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateTimeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  matchScoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
    maxWidth: '40%',
  },
  teamEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playedScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    marginHorizontal: 12,
  },
  scoreDivider: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  vsContainer: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vsText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  scorersDisplay: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scorersText: {
    color: COLORS.textMuted,
    fontSize: 12,
    flex: 1,
  },
  adminBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminLeft: {
    flexDirection: 'row',
  },
  adminActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  adminBtnText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  scoreEnterBtn: {
    paddingVertical: 5,
    paddingHorizontal: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  emptySubtext: {
    color: COLORS.primaryLight,
    fontSize: 12,
    marginTop: 6,
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
  pickerSection: {
    marginBottom: SPACING.md,
  },
  pickerLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    paddingLeft: 2,
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
