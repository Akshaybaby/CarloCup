import { 
  TouchableOpacity, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  TouchableOpacityProps, 
  ViewStyle, 
  TextStyle,
  View
} from 'react-native';
import { COLORS, SPACING } from '../config/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  size = 'md',
  style,
  textStyle,
  disabled,
  icon,
  ...props
}) => {
  const getButtonStyles = (): ViewStyle[] => {
    const stylesList: ViewStyle[] = [styles.base];
    
    // Size styles
    if (size === 'sm') stylesList.push(styles.smBtn);
    else if (size === 'lg') stylesList.push(styles.lgBtn);
    else stylesList.push(styles.mdBtn);

    // Variant styles
    if (disabled) {
      stylesList.push(styles.disabledBtn);
    } else {
      switch (variant) {
        case 'secondary':
          stylesList.push(styles.secondaryBtn);
          break;
        case 'outline':
          stylesList.push(styles.outlineBtn);
          break;
        case 'danger':
          stylesList.push(styles.dangerBtn);
          break;
        case 'primary':
        default:
          stylesList.push(styles.primaryBtn);
          break;
      }
    }

    if (style) stylesList.push(style);
    return stylesList;
  };

  const getTextStyles = (): TextStyle[] => {
    const stylesList: TextStyle[] = [styles.textBase];

    if (size === 'sm') stylesList.push(styles.smText);
    else if (size === 'lg') stylesList.push(styles.lgText);

    if (disabled) {
      stylesList.push(styles.disabledText);
    } else {
      switch (variant) {
        case 'outline':
          stylesList.push(styles.outlineText);
          break;
        case 'secondary':
          stylesList.push(styles.secondaryText);
          break;
        case 'danger':
          stylesList.push(styles.dangerText);
          break;
        case 'primary':
        default:
          stylesList.push(styles.primaryText);
          break;
      }
    }

    if (textStyle) stylesList.push(textStyle);
    return stylesList;
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? COLORS.primary : COLORS.textDark} 
          size="small" 
        />
      ) : (
        <>
          {icon && <View style={[styles.iconContainer, !title && { marginRight: 0 }]}>{icon}</View>}
          {title !== "" && <Text style={getTextStyles()}>{title}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconContainer: {
    marginRight: 6,
  },
  mdBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  smBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  lgBtn: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  secondaryBtn: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderColor: COLORS.primary,
  },
  dangerBtn: {
    backgroundColor: COLORS.loss,
    borderColor: COLORS.loss,
  },
  disabledBtn: {
    backgroundColor: '#1E2521',
    borderColor: 'transparent',
  },
  textBase: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  smText: {
    fontSize: 12,
  },
  lgText: {
    fontSize: 16,
  },
  primaryText: {
    color: COLORS.background, // Contrast against neon green
  },
  secondaryText: {
    color: COLORS.text,
  },
  outlineText: {
    color: COLORS.primary,
  },
  dangerText: {
    color: COLORS.text,
  },
  disabledText: {
    color: COLORS.textMuted,
  },
});
