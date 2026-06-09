import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../src/lib/theme';

function InnerLayout() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.statusBar} backgroundColor={theme.header} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.header },
          headerTintColor: theme.headerText,
          headerTitleStyle: { fontWeight: '800', fontSize: 18 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="agencia/index" options={{ title: 'Selecionar NODO' }} />
        <Stack.Screen name="agencia/[nodoId]/index" options={{ title: 'Agência' }} />
        <Stack.Screen name="agencia/[nodoId]/sacas/index" options={{ title: 'Inventário de Sacas' }} />
        <Stack.Screen name="agencia/[nodoId]/sacas/chegada" options={{ title: 'Chegada de Sacas' }} />
        <Stack.Screen name="agencia/[nodoId]/sacas/expedicao" options={{ title: 'Expedição de Sacas' }} />
        <Stack.Screen name="agencia/[nodoId]/pacotes/index" options={{ title: 'Inventário de Pacotes' }} />
        <Stack.Screen name="agencia/[nodoId]/pacotes/inventario" options={{ title: 'Inventário Físico', headerShown: false }} />
        <Stack.Screen name="agencia/[nodoId]/pacotes/expedicao" options={{ title: 'Expedição de Pacotes' }} />
        <Stack.Screen name="svc/index" options={{ title: 'SVC' }} />
        <Stack.Screen name="svc/recebimento" options={{ title: 'Recebimento de Pacotes', headerShown: false }} />
        <Stack.Screen name="admin/novos-nodos" options={{ title: 'Novos NODOS' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <InnerLayout />
    </ThemeProvider>
  );
}
