import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, MenuCard, Card } from '../../src/components/ui';
import { useTheme } from '../../src/lib/theme';
import { formatTimeBRT, startOfTodayBRT } from '../../src/lib/utils';

interface RecentRecebimento {
  id: string;
  total_pacotes: number;
  transportadora: string;
  placa: string;
  created_at: string;
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { padding: 20, paddingBottom: 40 },
    banner: {
      backgroundColor: COLORS.black,
      borderRadius: 20,
      padding: 24,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 16,
    },
    bannerIcon: { fontSize: 40 },
    bannerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.yellow },
    bannerSubtitle: { fontSize: 14, color: '#AAA' },
    statCard: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: COLORS.yellow,
      marginBottom: 8,
    },
    statValue: { fontSize: 48, fontWeight: '900', color: COLORS.black },
    statLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSec,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 10,
    },
    recCard: { padding: 14 },
    recRow: { flexDirection: 'row', alignItems: 'center' },
    recIcon: { fontSize: 24, marginRight: 12 },
    recInfo: { flex: 1 },
    recQtd: { fontSize: 16, fontWeight: '800', color: theme.text },
    recDetail: { fontSize: 13, color: theme.textSec, marginTop: 2 },
    recTime: { fontSize: 12, color: theme.textSec },
  });
}

export default function SVCHomeScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [recentes, setRecentes] = useState<RecentRecebimento[]>([]);
  const [totalHoje, setTotalHoje] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data } = await supabase
      .from('svc_recebimentos')
      .select('id, total_pacotes, transportadora, placa, created_at')
      .gte('created_at', startOfTodayBRT().toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const list = data || [];
    setRecentes(list);
    setTotalHoje(list.reduce((s, r) => s + (r.total_pacotes || 0), 0));
    setLoading(false);
  }

  function formatTime(dateStr: string) { return formatTimeBRT(dateStr); }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* SVC Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>🏭</Text>
          <View>
            <Text style={styles.bannerTitle}>SVC</Text>
            <Text style={styles.bannerSubtitle}>Centro de Serviços</Text>
          </View>
        </View>

        {/* Stats */}
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{loading ? '...' : totalHoje}</Text>
          <Text style={styles.statLabel}>pacotes recebidos hoje</Text>
        </Card>

        <Text style={styles.sectionLabel}>OPERAÇÕES</Text>

        <MenuCard
          icon="📥"
          title="Recebimento de Pacotes"
          subtitle="Registrar pacotes recebidos das agências"
          color={COLORS.blue}
          onPress={() => router.push('/svc/recebimento')}
        />

        <MenuCard
          icon="🔍"
          title="Consulta"
          subtitle="Expedições, pendências e rastreio de pacotes"
          color="#1A3A5C"
          onPress={() => router.push('/admin/consulta')}
        />

        {/* Histórico */}
        {!loading && recentes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECEBIMENTOS DE HOJE</Text>
            {recentes.map((r) => (
              <Card key={r.id} style={styles.recCard}>
                <View style={styles.recRow}>
                  <Text style={styles.recIcon}>📦</Text>
                  <View style={styles.recInfo}>
                    <Text style={styles.recQtd}>{r.total_pacotes} pacotes</Text>
                    {r.transportadora && (
                      <Text style={styles.recDetail}>🚛 {r.transportadora} · {r.placa}</Text>
                    )}
                  </View>
                  <Text style={styles.recTime}>{formatTime(r.created_at)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {loading && <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}
