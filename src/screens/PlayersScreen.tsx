import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ScrollView
} from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { Search, Shield, User, Calendar, Save, Trash2, ArrowLeft } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { dbService, Player, Team } from '../services/db';
import { authService } from '../services/auth';

export const PlayersScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  // Check if we are in Modal Form Edit mode
  const routeParams = route.params;
  const isFormMode = routeParams && routeParams.teamId;
  const editTeamId = routeParams?.teamId;
  const editPlayerId = routeParams?.playerId;

  // Registry Mode state
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('All');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('All');

  // Form Mode state
  const [playerName, setPlayerName] = useState('');
  const [playerPosition, setPlayerPosition] = useState<'Goalkeeper' | 'Defender' | 'Midfielder' | 'Forward'>('Midfielder');
  const [playerDob, setPlayerDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [teamName, setTeamName] = useState('');

  // Load Registry Data
  const loadRegistryData = async () => {
    try {
      const [pList, tList] = await Promise.all([
        dbService.getPlayers(),
        dbService.getTeams()
      ]);
      setAllPlayers(pList);
      setFilteredPlayers(pList);
      setTeams(tList);
    } catch (err) {
      console.error('Failed to load players registry', err);
    }
  };

  // Load Form Data for editing
  const loadFormData = async () => {
    if (!isFormMode) return;
    try {
      const tList = await dbService.getTeams();
      const currentTeam = tList.find(t => t.id === editTeamId);
      if (currentTeam) {
        setTeamName(currentTeam.name);
      }

      if (editPlayerId) {
        const pList = await dbService.getPlayers(editTeamId);
        const player = pList.find(p => p.id === editPlayerId);
        if (player) {
          setPlayerName(player.name);
          setPlayerPosition(player.position);
          setPlayerDob(player.dateOfBirth);
        }
      }
    } catch (err) {
      console.error('Failed to load player edit form data', err);
    }
  };

  useEffect(() => {
    if (isFocused) {
      if (isFormMode) {
        loadFormData();
      } else {
        loadRegistryData();
      }
    }
  }, [isFocused, isFormMode]);

  // Apply filters in Registry mode
  useEffect(() => {
    if (isFormMode) return;
    
    let result = allPlayers;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }

    if (selectedPosition !== 'All') {
      result = result.filter(p => p.position === selectedPosition);
    }

    if (selectedTeamId !== 'All') {
      result = result.filter(p => p.teamId === selectedTeamId);
    }

    setFilteredPlayers(result);
  }, [searchQuery, selectedPosition, selectedTeamId, allPlayers]);

  const handleSavePlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Player name is required.');
      return;
    }

    try {
      setSaving(true);
      const playerData = {
        name: playerName.trim(),
        jerseyNumber: 0,
        position: playerPosition,
        dateOfBirth: playerDob || '1999-01-01',
        teamId: editTeamId,
      };

      if (editPlayerId) {
        await dbService.updatePlayer(editPlayerId, playerData);
        Alert.alert('Success', 'Player profile updated.');
      } else {
        await dbService.addPlayer(playerData);
        Alert.alert('Success', 'Player added to roster.');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save player.');
    } finally {
      setSaving(false);
    }
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

  if (isFormMode) {
    // ==========================================
    // FORM EDIT SCREEN MODAL
    // ==========================================
    return (
      <View style={styles.container}>
        <Header title={editPlayerId ? 'Edit Player' : 'New Player'} showBack />
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Card style={styles.formCard}>
            <Text style={styles.formSubTitle}>Team: {teamName}</Text>
            
            <Input
              label="Player Name"
              placeholder="e.g. John Doe"
              value={playerName}
              onChangeText={setPlayerName}
              icon={<User color={COLORS.textMuted} size={18} />}
            />



            <View style={styles.formSelectGroup}>
              <Text style={styles.selectLabel}>Position</Text>
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

            <Button
              title={editPlayerId ? 'Update Player' : 'Create Player'}
              loading={saving}
              style={styles.submitBtn}
              onPress={handleSavePlayer}
            />
          </Card>
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // REGISTRY VIEW (LIST & FILTER SEARCH)
  // ==========================================
  const teamNameMap = teams.reduce((acc, t) => {
    acc[t.id] = t.name;
    return acc;
  }, {} as { [key: string]: string });

  return (
    <View style={styles.container}>
      <Header title="Player Registry" />
      <View style={styles.subContainer}>
        {/* Search Input */}
        <Input
          placeholder="Search players by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Search color={COLORS.textMuted} size={18} />}
        />

        {/* Filters Panel */}
        <View style={styles.filtersWrapper}>
          <Text style={styles.filterTitle}>Filter By:</Text>
          
          {/* Position Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[
                  styles.filterBadge,
                  selectedPosition === pos && styles.filterBadgeActive
                ]}
                onPress={() => setSelectedPosition(pos)}
              >
                <Text style={[
                  styles.filterBadgeText,
                  selectedPosition === pos && styles.filterBadgeTextActive
                ]}>
                  {pos}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Team Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterBadge,
                selectedTeamId === 'All' && styles.filterBadgeActive
              ]}
              onPress={() => setSelectedTeamId('All')}
            >
              <Text style={[
                styles.filterBadgeText,
                selectedTeamId === 'All' && styles.filterBadgeTextActive
              ]}>
                All Teams
              </Text>
            </TouchableOpacity>
            {teams.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.filterBadge,
                  selectedTeamId === t.id && styles.filterBadgeActive
                ]}
                onPress={() => setSelectedTeamId(t.id)}
              >
                <Text style={[
                  styles.filterBadgeText,
                  selectedTeamId === t.id && styles.filterBadgeTextActive
                ]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Players List */}
        {filteredPlayers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matching players found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPlayers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card style={styles.playerRegistryCard}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{item.name}</Text>
                  <View style={styles.playerSubRow}>
                    <Text style={styles.playerTeamName}>
                      🛡️ {teamNameMap[item.teamId] || 'Unknown Team'}
                    </Text>
                    <View style={[styles.posBadge, { backgroundColor: getPositionBadgeColor(item.position) }]}>
                      <Text style={styles.posBadgeText}>{item.position}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </View>
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
  formContainer: {
    padding: SPACING.lg,
  },
  formCard: {
    backgroundColor: COLORS.surface,
  },
  formSubTitle: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
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
  submitBtn: {
    marginTop: SPACING.lg,
  },
  // Registry Styling
  filtersWrapper: {
    marginBottom: SPACING.md,
  },
  filterTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  filterRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  filterBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterBadgeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterBadgeTextActive: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  playerRegistryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginVertical: 4,
  },
  registryNumBg: {
    backgroundColor: COLORS.surfaceLight,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  registryNumText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  playerSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  playerTeamName: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  posBadgeText: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
