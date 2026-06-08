import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity 
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Trophy, RefreshCw } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Header } from '../components/Header';
import { Card } from '../components/Card';
import { dbService, Group, StandingsRow } from '../services/db';
import { BibleVerse } from '../components/BibleVerse';

export const PointsTableScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const gList = await dbService.getGroups();
      setGroups(gList);
      
      const activeGroup = selectedGroupId === 'all' ? undefined : selectedGroupId;
      const table = await dbService.getStandings(activeGroup);
      setStandings(table);
    } catch (err) {
      console.error('Failed to load standings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, selectedGroupId]);

  const handleGroupSelect = (gId: string) => {
    setSelectedGroupId(gId);
  };

  return (
    <View style={styles.container}>
      <Header title="Standings" />
      <View style={styles.subContainer}>
        {/* Group Filter Tab Row */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
            <TouchableOpacity
              style={[
                styles.tabBadge,
                selectedGroupId === 'all' && styles.tabBadgeActive
              ]}
              onPress={() => handleGroupSelect('all')}
            >
              <Text style={[
                styles.tabText,
                selectedGroupId === 'all' && styles.tabTextActive
              ]}>
                OVERALL
              </Text>
            </TouchableOpacity>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.tabBadge,
                  selectedGroupId === g.id && styles.tabBadgeActive
                ]}
                onPress={() => handleGroupSelect(g.id)}
              >
                <Text style={[
                  styles.tabText,
                  selectedGroupId === g.id && styles.tabTextActive
                ]}>
                  {g.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : standings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Trophy color={COLORS.textMuted} size={40} />
            <Text style={styles.emptyText}>No standings data available.</Text>
            <Text style={styles.emptySubtext}>
              Assign teams to groups and enter match results to view standings.
            </Text>
          </View>
        ) : (
          <Card style={styles.tableCard}>
            {/* Table Header Row */}
            <View style={styles.tableHeaderRow}>
              {/* Frozen left header */}
              <View style={styles.frozenHeaderCol}>
                <Text style={styles.headerText}>POS  TEAM</Text>
              </View>

              {/* Scrollable stats headers */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
                <View style={styles.statsHeaderGroup}>
                  <Text style={[styles.headerCellText, styles.statCell]}>P</Text>
                  <Text style={[styles.headerCellText, styles.statCell]}>W</Text>
                  <Text style={[styles.headerCellText, styles.statCell]}>D</Text>
                  <Text style={[styles.headerCellText, styles.statCell]}>L</Text>
                  <Text style={[styles.headerCellText, styles.statCell]}>GF</Text>
                  <Text style={[styles.headerCellText, styles.statCell]}>GA</Text>
                  <Text style={[styles.headerCellText, styles.statCell, { width: 34 }]}>GD</Text>
                  <Text style={[styles.headerCellText, styles.statCell, styles.ptsCell]}>PTS</Text>
                </View>
              </ScrollView>
            </View>

            {/* Standings Rows */}
            <ScrollView style={styles.rowsScroll} showsVerticalScrollIndicator={false}>
              {standings.map((row, index) => {
                const isTopSpot = index === 0 && selectedGroupId !== 'all';
                return (
                  <View 
                    key={row.teamId} 
                    style={[
                      styles.tableRow, 
                      isTopSpot && styles.topSpotRow
                    ]}
                  >
                    {/* Frozen left column info */}
                    <View style={styles.frozenRowCol}>
                      <Text style={[
                        styles.posText,
                        index === 0 ? styles.posFirst : null
                      ]}>
                        {index + 1}
                      </Text>
                      <Text style={styles.logoText}>{row.teamLogoUrl || '🛡️'}</Text>
                      <Text style={styles.teamNameText} numberOfLines={1}>
                        {row.teamName}
                      </Text>
                    </View>

                    {/* Scrollable statistics cells */}
                    <View style={styles.statsRowGroup}>
                      <Text style={[styles.cellText, styles.statCell]}>{row.played}</Text>
                      <Text style={[styles.cellText, styles.statCell]}>{row.won}</Text>
                      <Text style={[styles.cellText, styles.statCell]}>{row.draw}</Text>
                      <Text style={[styles.cellText, styles.statCell]}>{row.lost}</Text>
                      <Text style={[styles.cellText, styles.statCell]}>{row.goalsFor}</Text>
                      <Text style={[styles.cellText, styles.statCell]}>{row.goalsAgainst}</Text>
                      <Text style={[
                        styles.cellText, 
                        styles.statCell, 
                        { width: 34 },
                        row.goalDifference > 0 ? styles.positiveGd : row.goalDifference < 0 ? styles.negativeGd : null
                      ]}>
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </Text>
                      <Text style={[styles.ptsText, styles.statCell, styles.ptsCell]}>
                        {row.points}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </Card>
        )}
        <BibleVerse />
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
  filterSection: {
    marginBottom: SPACING.sm,
  },
  tabRow: {
    flexDirection: 'row',
  },
  tabBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 16,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabTextActive: {
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
  tableCard: {
    padding: 0,
    flex: 1,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  frozenHeaderCol: {
    width: 120,
    justifyContent: 'center',
  },
  headerText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statsHeaderGroup: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    paddingLeft: SPACING.xs,
  },
  headerCellText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statCell: {
    width: 24,
    textAlign: 'center',
  },
  ptsCell: {
    width: 30,
    color: COLORS.primary,
  },
  rowsScroll: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  topSpotRow: {
    backgroundColor: '#0F2C20', // Highlight top team of group
  },
  frozenRowCol: {
    width: 120,
    flexDirection: 'row',
    alignItems: 'center',
  },
  posText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    width: 20,
  },
  posFirst: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
  },
  logoText: {
    fontSize: 16,
    marginRight: 6,
  },
  teamNameText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  statsRowGroup: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    paddingLeft: SPACING.xs,
  },
  cellText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  ptsText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  positiveGd: {
    color: COLORS.win,
  },
  negativeGd: {
    color: COLORS.loss,
  },
});
