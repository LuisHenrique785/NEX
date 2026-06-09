import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../src/components/ui';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor={COLORS.yellow} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.yellow },
          headerTintColor: COLORS.black,
          headerTitleStyle: { fontWeight: '800', fontSize: 18 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#F8F8F8' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="agencia/index" options={{ title: 'Selecionar NODO', headerBackTitle: 'Início' }} />
        <Stack.Screen name="agencia/[nodoId]/index" options={{ title: 'Agência', headerBackTitle: 'NODO' }} />
        <Stack.Screen name="agencia/[nodoId]/sacas/index" options={{ title: 'Inventário de Sacas' }} />
        <Stack.Screen name="agencia/[nodoId]/sacas/chegada" options={{ title: 'Chegada de Sacas' }} />
        <Stack.Screen name="agencia/[nodoId]/sacas/expedicao" options={{ title: 'Expedição de Sacas' }} />
        <Stack.Screen name="agencia/[nodoId]/pacotes/index" options={{ title: 'Inventário de Pacotes' }} />
        <Stack.Screen name="agencia/[nodoId]/pacotes/inventario" options={{ title: 'Inventário Físico', headerShown: false }} />
        <Stack.Screen name="agencia/[nodoId]/pacotes/expedicao" options={{ title: 'Expedição de Pacotes' }} />
        <Stack.Screen name="svc/index" options={{ title: 'SVC', headerBackTitle: 'Início' }} />
        <Stack.Screen name="svc/recebimento" options={{ title: 'Recebimento de Pacotes', headerShown: false }} />
        <Stack.Screen name="admin/novos-nodos" options={{ title: 'Novos NODOS', headerBackTitle: 'Início' }} />
      </Stack>
    </>
  );
}
