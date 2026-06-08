import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { 
  Home, 
  Shield, 
  Grid, 
  Calendar, 
  Trophy, 
  TrendingUp,
  Award
} from 'lucide-react-native';

import { RootStackParamList, MainTabParamList } from './types';
import { COLORS } from '../config/theme';
import { authService, UserProfile } from '../services/auth';

// Screens (To be implemented next)
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TeamsScreen } from '../screens/TeamsScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { FixturesScreen } from '../screens/FixturesScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { PointsTableScreen } from '../screens/PointsTableScreen';
import { StatisticsScreen } from '../screens/StatisticsScreen';
import { PlayersScreen } from '../screens/PlayersScreen'; // PlayerEdit will edit players
import { AdminControlsScreen } from '../screens/AdminControlsScreen';
import { KnockoutScreen } from '../screens/KnockoutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Teams"
        component={TeamsScreen}
        options={{
          tabBarLabel: 'Teams',
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color, size }) => <Grid color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Fixtures"
        component={FixturesScreen}
        options={{
          tabBarLabel: 'Fixtures',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Knockout"
        component={KnockoutScreen}
        options={{
          tabBarLabel: 'Knockouts',
          tabBarIcon: ({ color, size }) => <Award color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Standings"
        component={PointsTableScreen}
        options={{
          tabBarLabel: 'Standings',
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((userProfile) => {
      setUser(userProfile);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      {user === null ? (
        // Auth Flow
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : (
        // Application Flow
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen 
            name="ResultsEntry" 
            component={ResultsScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen 
            name="PlayerEdit" 
            component={PlayersScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen 
            name="AdminControls" 
            component={AdminControlsScreen}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
