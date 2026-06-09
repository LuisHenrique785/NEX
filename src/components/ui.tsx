import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

export const COLORS = {
  yellow: '#FFE600',
  yellowDark: '#E6CF00',
  black: '#1A1A1A',
  white: '#FFFFFF',
  gray: '#666666',
  grayLight: '#F5F5F5',
  grayBorder: '#E0E0E0',
  blue: '#3483FA',
  red: '#E53935',
  green: '#43A047',
  orange: '#FB8C00',
};

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({
  label, onPress, variant = 'primary', loading, disabled, style, icon,
}: ButtonProps) {
  const bgColor =
    variant === 'primary' ? COLORS.yellow :
    variant === 'secondary' ? COLORS.black :
    variant === 'danger' ? COLORS.red :
    'transparent';
  const textColor =
    variant === 'primary' ? COLORS.black :
    variant === 'outline' ? COLORS.black :
    COLORS.white;
  const borderColor = variant === 'outline' ? COLORS.grayBorder : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: bgColor, borderColor, borderWidth: variant === 'outline' ? 1.5 : 0 },
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <View style={styles.buttonIcon}>{icon}</View>}
          <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface BadgeProps {
  label: string;
  color?: string;
}

export function Badge({ label, color = COLORS.blue }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function SectionHeader({ title, subtitle, style }: SectionHeaderProps) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

interface MenuCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
}

export function MenuCard({ icon, title, subtitle, onPress, color = COLORS.black, style }: MenuCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.menuCard, style]} activeOpacity={0.8}>
      <View style={[styles.menuCardIcon, { backgroundColor: color + '15' }]}>
        <Text style={styles.menuCardEmoji}>{icon}</Text>
      </View>
      <View style={styles.menuCardContent}>
        <Text style={styles.menuCardTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuCardSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.menuCardArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  buttonIcon: { marginRight: 8 },
  buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: COLORS.black },
  sectionSubtitle: { fontSize: 14, color: COLORS.gray, marginTop: 4 },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  menuCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuCardEmoji: { fontSize: 26 },
  menuCardContent: { flex: 1 },
  menuCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  menuCardSubtitle: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  menuCardArrow: { fontSize: 24, color: COLORS.gray, marginLeft: 8 },
});
