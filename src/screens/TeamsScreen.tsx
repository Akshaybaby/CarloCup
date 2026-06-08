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
import { Shield, Plus, ArrowLeft, Edit, Trash2, UserPlus, Calendar, User } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { dbService, Team, Player } from '../services/db';
import { authService, UserProfile } from '../services/auth';
import { BibleVerse } from '../components/BibleVerse';

export const TeamsScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  // State
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<Player[]>([]);
  
  // Team Modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  // Player Modal
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerJersey, setPlayerJersey] = useState('');
  const [playerPosition, setPlayerPosition] = useState<'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'>('Midfielder');
  const [playerDob, setPlayerDob] = useState('');
  const [savingPlayer, setSavingPlayer] = useState(false);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const list = await dbService.getTeams();
      setTeams(list);
      
      // If a team was selected, refresh its roster too
      if (selectedTeam) {
        const updatedSelected = list.find(t => t.id === selectedTeam.id);
        if (updatedSelected) {
          setSelectedTeam(updatedSelected);
          const players = await dbService.getPlayers(updatedSelected.id);
          setRoster(players);
        }
      }
    } catch (err) {
      console.error('Failed to load teams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadTeams();
    }
  }, [isFocused]);

  const handleSelectTeam = async (team: Team) => {
    setSelectedTeam(team);
    try {
      const players = await dbService.getPlayers(team.id);
      setRoster(players);
    } catch (err) {
      Alert.alert('Error', 'Failed to load team roster.');
    }
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Team name is required.');
      return;
    }

    try {
      setSavingTeam(true);
      if (editingTeam) {
        await dbService.updateTeam(
          editingTeam.id, 
          teamName.trim(), 
          teamLogo.trim() || '🛡️', 
          editingTeam.captainId, // keep existing links for now
          captainName.trim() || null
        );
        Alert.alert('Success', 'Team updated successfully!');
      } else {
        await dbService.createTeam(
          teamName.trim(), 
          teamLogo.trim() || '🛡️', 
          null, // Captain User ID link (null initially, updated on captain register)
          captainName.trim() || null
        );
        Alert.alert('Success', 'Team created successfully!');
      }
      setShowTeamModal(false);
      setEditingTeam(null);
      setTeamName('');
      setTeamLogo('');
      setCaptainName('');
      loadTeams();
    } catch (err) {
      Alert.alert('Error', 'Failed to save team.');
    } finally {
      setSavingTeam(false);
    }
  };

  const handleEditTeamPress = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamLogo(team.logoUrl || '');
    setCaptainName(team.captainName || '');
    setShowTeamModal(true);
  };

  // Check if current user is authorized to manage roster (Admin or Team Captain)
  const isAuthorizedForRoster = () => {
    if (isAdmin) return true;
    if (currentUser?.role === 'captain' && currentUser.teamId === selectedTeam?.id) {
      return !selectedTeam?.team_locked;
    }
    return false;
  };

  const handleSavePlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Player name is required.');
      return;
    }
    const jerseyNum = parseInt(playerJersey);
    if (isNaN(jerseyNum)) {
      Alert.alert('Error', 'Valid jersey number is required.');
      return;
    }
    if (!selectedTeam) return;

    try {
      setSavingPlayer(true);
      const playerData = {
        name: playerName.trim(),
        jerseyNumber: jerseyNum,
        position: playerPosition,
        dateOfBirth: playerDob || '1999-01-01',
        teamId: selectedTeam.id,
      };

      if (editingPlayer) {
        await dbService.updatePlayer(editingPlayer.id, playerData);
        Alert.alert('Success', 'Player updated successfully!');
      } else {
        await dbService.addPlayer(playerData);
        Alert.alert('Success', 'Player added to roster!');
      }

      setShowPlayerModal(false);
      setEditingPlayer(null);
      setPlayerName('');
      setPlayerJersey('');
      setPlayerDob('');
      // Reload roster
      const players = await dbService.getPlayers(selectedTeam.id);
      setRoster(players);
    } catch (err) {
      Alert.alert('Error', 'Failed to save player.');
    } finally {
      setSavingPlayer(false);
    }
  };

  const handleEditPlayerPress = (player: Player) => {
    setEditingPlayer(player);
    setPlayerName(player.name);
    setPlayerJersey(player.jerseyNumber.toString());
    setPlayerPosition(player.position);
    setPlayerDob(player.dateOfBirth);
    setShowPlayerModal(true);
  };

  const handleDeletePlayerPress = (player: Player) => {
    Alert.alert(
      'Remove Player',
      `Are you sure you want to remove ${player.name} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.deletePlayer(player.id);
              if (selectedTeam) {
                const players = await dbService.getPlayers(selectedTeam.id);
                setRoster(players);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to delete player.');
            }
          }
        }
      ]
    );
  };

  const getPositionBadgeColor = (pos: string) => {
    switch (pos) {
      case 'Goalkeeper': return '#D97706';
      case 'Defender': return '#3B82F6';
      case 'Midfielder': return '#10B981';
      case 'Forward': return '#EF4444';
      default: return COLORS.textMuted;
    }
  };

  return (
    <View style={styles.container}>
      {selectedTeam ? (
        <Header 
          title={selectedTeam.name} 
          showBack 
          onLogoutPress={() => setSelectedTeam(null)} // Hook back press to close Roster sub-view
        />
      ) : (
        <Header title="Teams" />
      )}

      {selectedTeam ? (
        // ==========================================
        // ROSTER DETAIL VIEW
        // ==========================================
        <View style={styles.subContainer}>
          {selectedTeam.team_locked && ( 
            <View style={styles.lockedBanner}>
              <Text style={styles.lockedBannerText}>🔒 Roster is locked. Captains cannot edit.</Text>
            </View>
          )}
          <View style={styles.rosterHeaderCard}>
            <View style={styles.rosterHeaderInfo}>
              <Text style={styles.rosterLogo}>{selectedTeam.logoUrl || '🛡️'}</Text>
              <View style={styles.rosterTeamNameContainer}>
                <Text style={styles.rosterTeamName}>{selectedTeam.name}</Text>
                <Text style={styles.rosterCaptain}>
                  Captain: {selectedTeam.captainName || 'Not Assigned'}
                </Text>
                {selectedTeam.captainCode && (
                  <Text style={styles.rosterCodeText}>Code: {selectedTeam.captainCode}</Text>
                )}
              </View>
            </View>
            {isAuthorizedForRoster() && (
              <Button
                title="Add Player"
                size="sm"
                onPress={() => {
                  setEditingPlayer(null);
                  setPlayerName('');
                  setPlayerJersey('');
                  setPlayerPosition('Midfielder');
                  setPlayerDob('1998-01-01');
                  setShowPlayerModal(true);
                }}
                icon={<UserPlus color={COLORS.background} size={16} />}
              />
            )}
          </View>

          <Text style={styles.rosterTitle}>Team Roster ({roster.length} Players)</Text>

          {roster.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No players registered for this team yet.</Text>
              {isAuthorizedForRoster() && (
                <Text style={styles.emptySubtext}>Tap "Add Player" to build your roster!</Text>
              )}
            </View>
          ) : (
            <FlatList
              data={roster}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListFooterComponent={<BibleVerse />}
              renderItem={({ item }) => (
                <Card style={styles.playerCard}>
                  <View style={styles.playerNumBg}>
                    <Text style={styles.playerNumText}>#{item.jerseyNumber}</Text>
                  </View>
                  <View style={styles.playerMainInfo}>
                    <Text style={styles.playerName}>{item.name}</Text>
                    <View style={styles.playerMetaRow}>
                      <View style={[styles.posBadge, { backgroundColor: getPositionBadgeColor(item.position) }]}>
                        <Text style={styles.posBadgeText}>{item.position}</Text>
                      </View>
                      <Text style={styles.playerDobText}>DoB: {item.dateOfBirth}</Text>
                    </View>
                  </View>
                  {isAuthorizedForRoster() && (
                    <View style={styles.playerActions}>
                      <TouchableOpacity 
                        style={styles.actionIconButton} 
                        onPress={() => handleEditPlayerPress(item)}
                      >
                        <Edit color={COLORS.primary} size={18} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionIconButton} 
                        onPress={() => handleDeletePlayerPress(item)}
                      >
                        <Trash2 color={COLORS.loss} size={18} />
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              )}
            />
          )}
        </View>
      ) : (
        // ==========================================
        // TEAMS LIST VIEW
        // ==========================================
        <View style={styles.subContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Registered Teams ({teams.length})</Text>
            {isAdmin && (
              <Button
                title="Create Team"
                size="sm"
                onPress={() => {
                  setEditingTeam(null);
                  setTeamName('');
                  setTeamLogo('');
                  setCaptainName('');
                  setShowTeamModal(true);
                }}
                icon={<Plus color={COLORS.background} size={16} />}
              />
            )}
          </View>

          <FlatList
            data={teams}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={<BibleVerse />}
            renderItem={({ item }) => (
              <Card 
                style={styles.teamItemCard}
                onPress={() => handleSelectTeam(item)}
              >
                <Text style={styles.teamLogoEmoji}>{item.logoUrl || '🛡'}</Text>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{item.name}</Text>
                  <Text style={styles.teamCaptainLabel}>
                    Captain: {item.captainName || 'Not Assigned'}
                  </Text>
                  <View style={styles.teamMetaTags}>
                    {item.team_locked ? (
                      <Text style={[styles.metaBadge, styles.lockedBadge]}>🔒 Locked</Text>
                    ) : (
                      <Text style={[styles.metaBadge, styles.activeBadge]}>🔓 Open</Text>
                    )}
                    <Text style={[styles.metaBadge, styles.codeBadge]}>Code: {item.captainCode}</Text>
                  </View>
                </View>
                <View style={styles.teamActions}>
                  {isAdmin && (
                    <TouchableOpacity 
                      style={styles.teamEditBtn}
                      onPress={(e) => {
                        e.stopPropagation(); // prevent opening roster
                        handleEditTeamPress(item);
                      }}
                    >
                      <Edit color={COLORS.textMuted} size={18} />
                    </TouchableOpacity>
                  )}
                  <Shield color={COLORS.primary} size={20} />
                </View>
              </Card>
            )}
          />
        </View>
      )}

      {/* TEAM CREATION / EDIT MODAL */}
      <Modal
        visible={showTeamModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowTeamModal(false);
          setEditingTeam(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTeam ? 'Edit Team Details' : 'Create New Team'}
            </Text>
            
            <Input
              label="Team Name"
              placeholder="e.g. FC Saints"
              value={teamName}
              onChangeText={setTeamName}
            />

            <Input
              label="Team Logo (Emoji or URL)"
              placeholder="e.g. ⛪, 🕊️, ☘️"
              value={teamLogo}
              onChangeText={setTeamLogo}
            />

            <Input
              label="Captain's Name"
              placeholder="Name of the team captain"
              value={captainName}
              onChangeText={setCaptainName}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: SPACING.md }}
                onPress={() => {
                  setShowTeamModal(false);
                  setEditingTeam(null);
                }}
              />
              <Button
                title="Save Team"
                loading={savingTeam}
                style={{ flex: 1 }}
                onPress={handleSaveTeam}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* PLAYER ADD / EDIT MODAL */}
      <Modal
        visible={showPlayerModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPlayerModal(false);
          setEditingPlayer(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingPlayer ? 'Edit Player Profile' : 'Add Player to Roster'}
              </Text>
              
              <Input
                label="Player Full Name"
                placeholder="John Doe"
                value={playerName}
                onChangeText={setPlayerName}
                icon={<User color={COLORS.textMuted} size={18} />}
              />

              <Input
                label="Jersey Number"
                placeholder="e.g. 10"
                value={playerJersey}
                onChangeText={setPlayerJersey}
                keyboardType="number-pad"
              />

              <View style={styles.formSelectGroup}>
                <Text style={styles.selectLabel}>Playing Position</Text>
                <View style={styles.positionGrid}>
                  {(['Goalkeeper', 'Defender', 'Midfielder', 'Forward'] as const).map((pos) => (
                    <TouchableOpacity
                      key={pos}
                      style={[
                        styles.posOption,
                        playerPosition === pos && styles.posOptionActive
                      ]}
                      onPress={() => setPlayerPosition(pos)}
                    >
                      <Text style={[
                        styles.posOptionText,
                        playerPosition === pos && styles.posOptionTextActive
                      ]}>
                        {pos}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Date of Birth"
                placeholder="YYYY-MM-DD"
                value={playerDob}
                onChangeText={setPlayerDob}
                icon={<Calendar color={COLORS.textMuted} size={18} />}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  style={{ flex: 1, marginRight: SPACING.md }}
                  onPress={() => {
                    setShowPlayerModal(false);
                    setEditingPlayer(null);
                  }}
                />
                <Button
                  title="Save Player"
                  loading={savingPlayer}
                  style={{ flex: 1 }}
                  onPress={handleSavePlayer}
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
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  teamItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  teamLogoEmoji: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamCaptainLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  teamActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamEditBtn: {
    padding: SPACING.sm,
    marginRight: SPACING.xs,
  },
  // Roster Sub-view Style
  rosterHeaderCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  rosterHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rosterLogo: {
    fontSize: 36,
    marginRight: SPACING.md,
  },
  rosterTeamName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  rosterCaptain: {
    color: COLORS.primaryLight,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  rosterTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginVertical: 4,
  },
  playerNumBg: {
    backgroundColor: COLORS.surfaceLight,
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playerNumText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  playerMainInfo: {
    flex: 1,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  posBadgeText: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: 'bold',
  },
  playerDobText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  playerActions: {
    flexDirection: 'row',
  },
  actionIconButton: {
    padding: 6,
    marginLeft: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  emptySubtext: {
    color: COLORS.primaryLight,
    fontSize: 12,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  // Modal Style
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
  modalActions: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
  formSelectGroup: {
    marginBottom: SPACING.md,
  },
  selectLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  posOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 6,
    margin: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  posOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#0F2C20',
  },
  posOptionText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  posOptionTextActive: {
    color: COLORS.primary,
  },
  lockedBanner: {
    backgroundColor: '#3E1C1F',
    borderColor: '#7F1D1D',
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  lockedBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rosterTeamNameContainer: {
    flexDirection: 'column',
  },
  rosterCodeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  teamMetaTags: {
    flexDirection: 'row',
    marginTop: 6,
  },
  metaBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    overflow: 'hidden',
  },
  lockedBadge: {
    backgroundColor: '#7F1D1D',
    color: '#FCA5A5',
  },
  activeBadge: {
    backgroundColor: '#064E3B',
    color: '#D1FAE5',
  },
  codeBadge: {
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.textMuted,
  },
});
