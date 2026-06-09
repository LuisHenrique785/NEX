import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LIGHT = {
  bg: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F0',
  border: '#E0E0E0',
  text: '#1A1A1A',
  textSec: '#666666',
  textTer: '#999999',
  input: '#FFFFFF',
  inputBorder: '#E0E0E0',
  yellow: '#FFE600',
  black: '#1A1A1A',
  white: '#FFFFFF',
  gray: '#666666',
  grayLight: '#F5F5F5',
  grayBorder: '#E0E0E0',
  blue: '#3483FA',
  red: '#E53935',
  green: '#43A047',
  orange: '#FB8C00',
  header: '#FFE600',
  headerText: '#1A1A1A',
  statusBar: 'dark' as 'dark' | 'light',
  isDark: false,
};

export const DARK: typeof LIGHT = {
  bg: '#0F0F0F',
  surface: '#1C1C1E',
  surfaceAlt: '#2C2C2E',
  border: '#3A3A3C',
  text: '#F2F2F7',
  textSec: '#AEAEB2',
  textTer: '#636366',
  input: '#2C2C2E',
  inputBorder: '#48484A',
  yellow: '#FFE600',
  black: '#1A1A1A',
  white: '#FFFFFF',
  gray: '#AEAEB2',
  grayLight: '#2C2C2E',
  grayBorder: '#3A3A3C',
  blue: '#3483FA',
  red: '#E53935',
  green: '#43A047',
  orange: '#FB8C00',
  header: '#1C1C1E',
  headerText: '#F2F2F7',
  statusBar: 'light' as 'dark' | 'light',
  isDark: true,
};

export type Theme = typeof LIGHT;

interface ThemeCtx { theme: Theme; toggle: () => void }
const ThemeContext = createContext<ThemeCtx>({ theme: LIGHT, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@nex_theme')
      .then((v) => { if (v === 'dark') setIsDark(true); })
      .catch(() => {});
  }, []);

  function toggle() {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem('@nex_theme', next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK : LIGHT, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
