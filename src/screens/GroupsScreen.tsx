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
import { Grid, Plus, Edit2, Shield, Save, Check } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { dbService, Group, Team } from '../services/db';
import { authService } from '../services/auth';
import { BibleVerse } from '../components/BibleVerse';

export const GroupsScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'admin';

  // State
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Group creation modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  // Team allocation modal
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [savingAllocation, setSavingAllocation] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gList, tList] = await Promise.all([
        dbService.getGroups(),
        dbService.getTeams()
      ]);
      setGroups(gList);
      setTeams(tList);
    } catch (err) {
      console.error('Failed to load groups data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name is required.');
      return;
    }

    try {
      setSavingGroup(true);
      await dbService.createGroup(groupName.trim());
      Alert.alert('Success', 'Group created successfully!');
      setShowGroupModal(false);
      setGroupName('');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to create group.');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleOpenAllocate = (group: Group) => {
    setSelectedGroup(group);
    // Find team IDs currently assigned to this group, or whose groupId matches
    const currentTeamIds = teams.filter(t => t.groupId === group.id).map(t => t.id);
    setSelectedTeamIds(currentTeamIds);
    setShowAllocateModal(true);
  };

  const handleToggleTeamSelection = (teamId: string) => {
    if (selectedTeamIds.includes(teamId)) {
      setSelectedTeamIds(selectedTeamIds.filter(id => id !== teamId));
    } else {
      setSelectedTeamIds([...selectedTeamIds, teamId]);
    }
  };

  const handleSaveAllocation = async () => {
    if (!selectedGroup) return;

    try {
      setSavingAllocation(true);
      await dbService.assignTeamsToGroup(selectedGroup.id, selectedTeamIds);
      Alert.alert('Success', 'Teams allocated to group successfully!');
      setShowAllocateModal(false);
      setSelectedGroup(null);
      setSelectedTeamIds([]);
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to allocate teams.');
    } finally {
      setSavingAllocation(false);
    }
  };

  const renderGroupCard = ({ item }: { item: Group }) => {
    // Find teams belonging to this group
    const groupTeams = teams.filter(t => t.groupId === item.id);

    return (
      <Card style={styles.groupCard} accent>
        <View style={styles.groupHeader}>
          <View style={styles.groupTitleRow}>
            <Grid color={COLORS.primary} size={20} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.groupName}>{item.name}</Text>
          </View>
          {isAdmin && (
            <Button
              title="Allocate Teams"
              size="sm"
              variant="outline"
              onPress={() => handleOpenAllocate(item)}
            />
          )}
        </View>

        <View style={styles.divider} />

        {groupTeams.length === 0 ? (
          <Text style={styles.emptyGroupText}>No teams assigned to this group yet.</Text>
        ) : (
          <View style={styles.teamsList}>
            {groupTeams.map((team) => (
              <View key={team.id} style={styles.teamRow}>
                <Text style={styles.teamLogo}>{team.logoUrl || '🛡️'}</Text>
                <Text style={styles.teamName}>{team.name}</Text>
                <Text style={styles.captainName}>
                  (Cap: {team.captainName || 'None'})
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Groups" />
      <View style={styles.subContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Groups Management</Text>
          {isAdmin && (
            <Button
              title="Add Group"
              size="sm"
              onPress={() => setShowGroupModal(true)}
              icon={<Plus color={COLORS.background} size={16} />}
            />
          )}
        </View>

        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No groups created yet.</Text>
            </View>
          }
          ListFooterComponent={<BibleVerse />}
        />
      </View>

      {/* CREATE GROUP MODAL */}
      <Modal
        visible={showGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Group</Text>
            
            <Input
              label="Group Name"
              placeholder="e.g. Group A"
              value={groupName}
              onChangeText={setGroupName}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: SPACING.md }}
                onPress={() => setShowGroupModal(false)}
              />
              <Button
                title="Create Group"
                loading={savingGroup}
                style={{ flex: 1 }}
                onPress={handleCreateGroup}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ALLOCATE TEAMS MODAL */}
      <Modal
        visible={showAllocateModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAllocateModal(false);
          setSelectedGroup(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>
              Allocate Teams to {selectedGroup?.name}
            </Text>
            
            <Text style={styles.modalSubtitle}>
              Select the teams you want to include in this group:
            </Text>

            <ScrollView style={styles.allocateScroll}>
              {teams.length === 0 ? (
                <Text style={styles.emptyTeamsWarn}>No teams registered yet. Create teams first.</Text>
              ) : (
                teams.map((team) => {
                  const isChecked = selectedTeamIds.includes(team.id);
                  const inOtherGroup = team.groupId && team.groupId !== selectedGroup?.id;
                  const otherGroupName = groups.find(g => g.id === team.groupId)?.name;

                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.allocateTeamItem,
                        isChecked && styles.allocateTeamItemActive
                      ]}
                      onPress={() => handleToggleTeamSelection(team.id)}
                    >
                      <View style={styles.allocateTeamLeft}>
                        <Text style={styles.allocateTeamLogo}>{team.logoUrl || '🛡️'}</Text>
                        <View>
                          <Text style={styles.allocateTeamName}>{team.name}</Text>
                          {inOtherGroup && (
                            <Text style={styles.otherGroupWarn}>
                              Currently in: {otherGroupName} (Will be reassigned)
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={[
                        styles.checkbox,
                        isChecked && styles.checkboxActive
                      ]}>
                        {isChecked && <Check color={COLORS.background} size={14} strokeWidth={3} />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: SPACING.md }}
                onPress={() => {
                  setShowAllocateModal(false);
                  setSelectedGroup(null);
                }}
              />
              <Button
                title="Save Allocation"
                loading={savingAllocation}
                style={{ flex: 1 }}
                onPress={handleSaveAllocation}
              />
            </View>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  groupCard: {
    marginBottom: SPACING.md,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  emptyGroupText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  teamsList: {
    marginTop: SPACING.xs,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  teamLogo: {
    fontSize: 18,
    marginRight: SPACING.md,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  captainName: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  // Modal styles
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
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
  allocateScroll: {
    marginVertical: SPACING.sm,
  },
  emptyTeamsWarn: {
    color: COLORS.loss,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  allocateTeamItem: {
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
  allocateTeamItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#0F2C20',
  },
  allocateTeamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  allocateTeamLogo: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  allocateTeamName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  otherGroupWarn: {
    color: '#D97706',
    fontSize: 11,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
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
});
