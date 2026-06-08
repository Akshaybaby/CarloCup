import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewStyle, 
  TouchableOpacity 
} from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../config/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  accent?: boolean; // If true, adds a top green border indicator
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  accent = false,
}) => {
  const cardStyle = [
    styles.card,
    accent && styles.accentCard,
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  accentCard: {
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
  },
});
