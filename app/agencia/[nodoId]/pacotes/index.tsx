import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, MenuCard, Card } from '../../../../src/components/ui';

export default function PacotesMainScreen() {
  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoIcon}>📦</Text>
          <Text style={styles.infoTitle}>Inventário de Pacotes</Text>
          <Text style={styles.infoText}>
            Realize o inventário físico dos pacotes na agência ou registre expedições.
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>SELECIONE A OPERAÇÃO</Text>

        <MenuCard
          icon="🔍"
          title="Inventário Físico"
          subtitle="Escanear, digitar ou fotografar pacotes"
          color={COLORS.blue}
          onPress={() => router.push(`/agencia/${nodoId}/pacotes/inventario`)}
        />

        <MenuCard
          icon="🚚"
          title="Expedição de Pacotes"
          subtitle="Registrar pacotes expedidos"
          color={COLORS.orange}
          onPress={() => router.push(`/agencia/${nodoId}/pacotes/expedicao`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  container: { padding: 20, paddingBottom: 40 },
  infoCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: COLORS.blue + '44',
  },
  infoIcon: { fontSize: 48, marginBottom: 10 },
  infoTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black, marginBottom: 6 },
  infoText: { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 8,
  },
});
