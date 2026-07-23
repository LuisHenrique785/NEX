import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../src/lib/theme';
import { DemoProvider, useDemo } from '../src/lib/demo';
import { NodoAuthProvider } from '../src/lib/auth';

function DemoBanner() {
  const { isDemo, exitDemo } = useDemo();
  if (!isDemo) return null;
  return (
    <View style={{
      backgroundColor: '#FF6B00',
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>
        🎭 MODO DEMONSTRAÇÃO — dados não serão salvos
      </Text>
      <TouchableOpacity onPress={exitDemo}>
        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Sair ✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function InnerLayout() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.statusBar} backgroundColor={theme.header} />
      <DemoBanner />
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
        <Stack.Screen name="agencia/index" options={{ title: 'Agência — Login' }} />
        <Stack.Screen name="agencia/trocar-senha" options={{ title: 'Criar Senha', headerBackVisible: false }} />
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
        <Stack.Screen name="admin/consulta" options={{ title: 'Consulta', headerShown: false }} />
        <Stack.Screen name="tutorial" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <DemoProvider>
        <NodoAuthProvider>
          <InnerLayout />
        </NodoAuthProvider>
      </DemoProvider>
    </ThemeProvider>
  );
}
