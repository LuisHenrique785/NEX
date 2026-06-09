import React from 'react';
import {
  TouchableOpacity, Text, View, ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme, LIGHT } from '../lib/theme';

// Static fallback for code that still imports COLORS directly
export const COLORS = LIGHT;

export { useTheme };

// ─── Button ──────────────────────────────────────────────────────────────────

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
  const { theme } = useTheme();

  const bgColor =
    variant === 'primary' ? theme.yellow :
    variant === 'secondary' ? theme.text :
    variant === 'danger' ? theme.red :
    'transparent';
  const textColor =
    variant === 'primary' ? theme.black :
    variant === 'outline' ? theme.text :
    '#FFFFFF';
  const borderColor = variant === 'outline' ? theme.border : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          paddingVertical: 15,
          paddingHorizontal: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginVertical: 6,
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          opacity: (disabled || loading) ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text style={{ fontSize: 16, fontWeight: '700', letterSpacing: 0.3, color: textColor }}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 16,
          marginVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.isDark ? 0.25 : 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: string;
}

export function Badge({ label, color = COLORS.blue }: BadgeProps) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start', backgroundColor: color + '22', borderColor: color }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}

// ─── SectionHeader ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function SectionHeader({ title, subtitle, style }: SectionHeaderProps) {
  const { theme } = useTheme();
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 14, color: theme.textSec, marginTop: 4 }}>{subtitle}</Text>}
    </View>
  );
}

// ─── MenuCard ────────────────────────────────────────────────────────────────

interface MenuCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
}

export function MenuCard({ icon, title, subtitle, onPress, color = '#1A1A1A', style }: MenuCardProps) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        {
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 18,
          marginVertical: 8,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.isDark ? 0.25 : 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
        <Text style={{ fontSize: 26 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 13, color: theme.textSec, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      <Text style={{ fontSize: 24, color: theme.border, marginLeft: 8 }}>›</Text>
    </TouchableOpacity>
  );
}
