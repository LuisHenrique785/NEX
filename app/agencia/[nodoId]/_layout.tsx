import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, router, useLocalSearchParams } from 'expo-router';
import { useNodoAuth } from '../../../src/lib/auth';
import { useDemo } from '../../../src/lib/demo';
import { COLORS } from '../../../src/components/ui';
import { useTheme } from '../../../src/lib/theme';

export default function NodoLayout() {
  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
  const { session, authLoading } = useNodoAuth();
  const { isDemo } = useDemo();
  const { theme } = useTheme();

  useEffect(() => {
    if (authLoading) return;
    if (isDemo) return; // demo mode: acesso livre

    // Se não há sessão ou a sessão é de outro nodo → volta ao login
    if (!session || session.nodoId !== nodoId) {
      router.replace('/agencia');
    }
  }, [authLoading, session, nodoId, isDemo]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
      </View>
    );
  }

  // Bloqueia renderização enquanto o redirect ainda não aconteceu
  if (!isDemo && (!session || session.nodoId !== nodoId)) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  // Slot renderiza a tela filha sem criar novo navigator (mantém headers do layout raiz)
  return <Slot />;
}
