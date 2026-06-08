import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, LogOut } from 'lucide-react-native';
import { COLORS, SPACING } from '../config/theme';
import { authService } from '../services/auth';


interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onLogoutPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  rightAction,
  onLogoutPress,
}) => {
  const navigation = useNavigation();
  const user = authService.getCurrentUser();

  const handleLogout = async () => {
    if (onLogoutPress) {
      onLogoutPress();
    } else {
      await authService.logout();
    }
  };

  const getRoleLabel = () => {
    if (!user) return null;
    switch (user.role) {
      case 'admin':
        return { label: 'Admin', color: COLORS.adminBg };
      case 'captain':
        return { label: 'Captain', color: COLORS.captainBg };
      case 'viewer':
      default:
        return user.isAnonymous ? { label: 'Viewer', color: COLORS.viewerBg } : { label: 'Member', color: COLORS.viewerBg };
    }
  };

  const role = getRoleLabel();

  return (
    <View style={styles.outerContainer}>
      {/* Header bar safe area container */}
      
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {showBack ? (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <ArrowLeft color={COLORS.text} size={22} />
            </TouchableOpacity>
          ) : (
            // Spacer to keep layout centered/aligned
            <View style={styles.backSpacer} />
          )}

          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {role && (
              <View style={[styles.badge, { backgroundColor: role.color }]}>
                <Text style={styles.badgeText}>{role.label}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsContainer}>
            {rightAction}
            {user && !user.isAnonymous && (
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityLabel="Log out"
              >
                <LogOut color={COLORS.loss} size={20} />
              </TouchableOpacity>
            )}
            {user?.isAnonymous && (
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityLabel="Exit Viewer Mode"
              >
                <LogOut color={COLORS.textMuted} size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  safeArea: {
    backgroundColor: COLORS.background,
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backSpacer: {
    width: 40,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
    maxWidth: '70%',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 60, // Keep layout balanced with back button space + logout
  },
  logoutButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
});
