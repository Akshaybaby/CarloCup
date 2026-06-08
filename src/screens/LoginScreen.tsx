import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  TouchableOpacity
} from 'react-native';
import { Mail, Lock, User, KeyRound, Eye, EyeOff } from 'lucide-react-native';

import { COLORS, SPACING } from '../config/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authService, UserRole } from '../services/auth';
import { dbService, Team } from '../services/db';

export const LoginScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [roleCode, setRoleCode] = useState('');
  const [teamId, setTeamId] = useState<string>('');
  
  // UI Helpers
  const [showPassword, setShowPassword] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    if (isSignUp) {
      // Load teams just to show mock captain codes hints
      dbService.getTeams().then(setTeams).catch(console.error);
    }
  }, [isSignUp]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in email and password.');
      return;
    }

    if (isSignUp && !name) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await authService.signup(email, password, name, role, roleCode);
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await authService.login(email, password);
      }
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewerMode = () => {
    authService.continueAsViewer();
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerSection}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>🏆</Text>
          </View>
          <Text style={styles.appName}>Carlo Cup</Text>
          <Text style={styles.appSubtitle}>Football Tournament Manager</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>

          {isSignUp && (
            <Input
              label="Full Name"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              icon={<User color={COLORS.textMuted} size={20} />}
            />
          )}

          <Input
            label="Email Address"
            placeholder="name@church.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon={<Mail color={COLORS.textMuted} size={20} />}
          />

          <View style={styles.passwordContainer}>
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={{ flex: 1 }}
              icon={<Lock color={COLORS.textMuted} size={20} />}
            />
            <TouchableOpacity 
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff color={COLORS.textMuted} size={18} />
              ) : (
                <Eye color={COLORS.textMuted} size={18} />
              )}
            </TouchableOpacity>
          </View>

          {isSignUp && (
            <View style={styles.signUpOptions}>
              <Text style={styles.label}>Register As</Text>
              <View style={styles.roleTabs}>
                {(['viewer', 'captain'] as UserRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleTab,
                      role === r && styles.roleTabActive
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[
                      styles.roleTabText,
                      role === r && styles.roleTabTextActive
                    ]}>
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {role === 'captain' && (
                <Input
                  label="Team Captain Code"
                  placeholder="e.g. FS2026"
                  value={roleCode}
                  onChangeText={setRoleCode}
                  autoCapitalize="characters"
                  icon={<KeyRound color={COLORS.textMuted} size={20} />}
                />
              )}
            </View>
          )}

          <Button 
            title={isSignUp ? 'Register Account' : 'Log In'}
            onPress={handleAuth}
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity 
            style={styles.toggleBtn}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.toggleText}>
              {isSignUp ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button 
            title="Continue as Viewer (Public Mode)"
            variant="outline"
            onPress={handleViewerMode}
          />
        </View>


      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    padding: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logoPlaceholderText: {
    fontSize: 36,
  },
  appName: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  appSubtitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 36, // align with input field center
    height: 30,
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  signUpOptions: {
    marginBottom: SPACING.md,
  },
  roleTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 3,
    marginBottom: SPACING.md,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
  },
  roleTabText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  roleTabTextActive: {
    color: COLORS.background,
  },
  teamSelectContainer: {
    marginVertical: SPACING.xs,
  },
  teamRow: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  teamSelectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  teamSelectorBadgeActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#0F2C20',
  },
  teamEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  teamNameText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: SPACING.md,
  },
  toggleBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  toggleText: {
    color: COLORS.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    fontSize: 12,
    fontWeight: 'bold',
  },
  mockInfoCard: {
    backgroundColor: '#1C160C',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: '#3D2F17',
  },
  mockInfoTitle: {
    color: '#F59E0B',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  mockInfoText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginVertical: 2,
  },
  boldText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
});
