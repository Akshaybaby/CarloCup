import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  FlatList
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Award, Star, TrendingUp, ShieldAlert } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { dbService, PlayerStats } from '../services/db';
import { BibleVerse } from '../components/BibleVerse';

type StatTab = 'mvp' | 'scorers' | 'keepers';

export const StatisticsScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatTab>('mvp');
  
  const [topScorers, setTopScorers] = useState<PlayerStats[]>([]);
  const [bestKeepers, setBestKeepers] = useState<PlayerStats[]>([]);
  const [bestPlayers, setBestPlayers] = useState<PlayerStats[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const stats = await dbService.getStatistics();
      setTopScorers(stats.topScorers);
      setBestKeepers(stats.bestGoalkeepers);
      setBestPlayers(stats.bestPlayers);
    } catch (err) {
      console.error('Failed to load statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Text style={[styles.rankBadge, styles.goldRank]}>🥇</Text>;
      case 1:
        return <Text style={[styles.rankBadge, styles.silverRank]}>🥈</Text>;
      case 2:
        return <Text style={[styles.rankBadge, styles.bronzeRank]}>🥉</Text>;
      default:
        return <Text style={styles.rankNumText}>{index + 1}</Text>;
    }
  };

  const getActiveList = () => {
    switch (activeTab) {
      case 'scorers':
        return {
          title: 'Top Scorers (Most Goals)',
          label: 'Goals',
          key: 'goals',
          data: topScorers,
          icon: <Award color={COLORS.primary} size={20} />
        };
      case 'keepers':
        return {
          title: 'Best Goalkeepers (Clean Sheets)',
          label: 'Clean Sheets',
          key: 'cleanSheets',
          data: bestKeepers,
          icon: <Star color={COLORS.primary} size={20} />
        };
      case 'mvp':
      default:
        return {
          title: 'Player of the Tournament (Goals + Assists)',
          label: 'Total G+A',
          key: 'points',
          data: bestPlayers,
          icon: <TrendingUp color={COLORS.primary} size={20} />
        };
    }
  };

  const activeInfo = getActiveList();

  return (
    <View style={styles.container}>
      <Header title="Statistics" />
      <View style={styles.subContainer}>
        {/* Tab Selector Buttons */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'mvp' && styles.tabButtonActive]}
            onPress={() => setActiveTab('mvp')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'mvp' && styles.tabButtonTextActive]}>
              🏆 MVP (G+A)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'scorers' && styles.tabButtonActive]}
            onPress={() => setActiveTab('scorers')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'scorers' && styles.tabButtonTextActive]}>
              ⚽ SCORERS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'keepers' && styles.tabButtonActive]}
            onPress={() => setActiveTab('keepers')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'keepers' && styles.tabButtonTextActive]}>
              🧤 CLEAN SHEETS
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.listWrapper}>
            {activeInfo.data.length > 0 && (
              <View style={styles.sectionHeaderRow}>
                {activeInfo.icon}
                <Text style={styles.sectionTitle}>{activeInfo.title}</Text>
              </View>
            )}

            <FlatList
              data={activeInfo.data}
              keyExtractor={(item) => item.playerId}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <ShieldAlert color={COLORS.textMuted} size={42} style={{ alignSelf: 'center', marginBottom: SPACING.md }} />
                  <Text style={styles.emptyText}>No stats logged yet.</Text>
                  <Text style={styles.emptySubtext}>
                    Once match results are entered with goal scorers and clean sheets, rankings will appear here automatically.
                  </Text>
                </View>
              }
              ListFooterComponent={<BibleVerse />}
              renderItem={({ item, index }) => {
                // Get display value based on active stat metric
                let metricValue = 0;
                let detailText = '';
                
                if (activeTab === 'mvp') {
                  metricValue = item.points;
                  detailText = `${item.goals} Goals • ${item.assists} Assists`;
                } else if (activeTab === 'scorers') {
                  metricValue = item.goals;
                  detailText = `${item.assists} Assists`;
                } else if (activeTab === 'keepers') {
                  metricValue = item.cleanSheets;
                  detailText = `Keeper clean sheet records`;
                }

                return (
                  <Card style={styles.playerStatsCard}>
                    <View style={styles.rankBadgeContainer}>
                      {getRankBadge(index)}
                    </View>

                    <View style={styles.playerInfoCol}>
                      <Text style={styles.playerName}>{item.playerName}</Text>
                      <Text style={styles.playerTeamName}>🛡️ {item.teamName}</Text>
                      {detailText !== '' && (
                        <Text style={styles.playerDetails}>{detailText}</Text>
                      )}
                    </View>

                    <View style={styles.metricContainer}>
                      <Text style={styles.metricValue}>{metricValue}</Text>
                      <Text style={styles.metricLabel}>{activeInfo.label}</Text>
                    </View>
                  </Card>
                );
              }}
            />
          </View>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 3,
    borderRadius: 8,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
  },
  tabButtonText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  tabButtonTextActive: {
    color: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  listWrapper: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: SPACING.sm,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  playerStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginVertical: 4,
  },
  rankBadgeContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  rankBadge: {
    fontSize: 22,
  },
  goldRank: {},
  silverRank: {},
  bronzeRank: {},
  rankNumText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerInfoCol: {
    flex: 1,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  playerTeamName: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  playerDetails: {
    color: COLORS.primaryLight,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  metricContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 60,
  },
  metricValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
