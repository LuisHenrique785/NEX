import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { COLORS, MenuCard, Card, Badge } from '../../../../src/components/ui';
import { useTheme } from '../../../../src/lib/theme';

interface Movimento {
  id: string;
  tipo: 'chegada' | 'expedicao';
  quantidade: number;
  placa: string | null;
  transportadora: string | null;
  created_at: string;
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { padding: 20, paddingBottom: 40 },
    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 16,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    summaryValue: { fontSize: 28, fontWeight: '900', color: theme.text },
    summaryLabel: { fontSize: 12, color: theme.textSec, marginTop: 2 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSec,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyCard: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { color: theme.textSec, fontSize: 15 },
    movCard: { padding: 14 },
    movRow: { flexDirection: 'row', alignItems: 'flex-start' },
    movIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
    movInfo: { flex: 1 },
    movHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    movTime: { fontSize: 12, color: theme.textSec },
    movQtd: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 2 },
    movDetail: { fontSize: 13, color: theme.textSec },
  });
}

export default function SacasMainScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [totais, setTotais] = useState({ chegada: 0, expedicao: 0 });

  useEffect(() => {
    loadMovimentos();
  }, [nodoId]);

  async function loadMovimentos() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('sacas_movimentos')
      .select('*')
      .eq('nodo_id', nodoId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
      .limit(20);

    const list = data || [];
    setMovimentos(list);
    setTotais({
      chegada: list.filter((m) => m.tipo === 'chegada').reduce((s, m) => s + m.quantidade, 0),
      expedicao: list.filter((m) => m.tipo === 'expedicao').reduce((s, m) => s + m.quantidade, 0),
    });
    setLoading(false);
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Resumo do dia */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: COLORS.green }]}>
            <Text style={styles.summaryValue}>{totais.chegada}</Text>
            <Text style={styles.summaryLabel}>Sacas recebidas hoje</Text>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: COLORS.blue }]}>
            <Text style={styles.summaryValue}>{totais.expedicao}</Text>
            <Text style={styles.summaryLabel}>Sacas expedidas hoje</Text>
          </View>
        </View>

        {/* Ações */}
        <Text style={styles.sectionLabel}>REGISTRAR MOVIMENTO</Text>

        <MenuCard
          icon="📥"
          title="Chegada de Sacas"
          subtitle="Registrar sacas recebidas"
          color={COLORS.green}
          onPress={() => router.push(`/agencia/${nodoId}/sacas/chegada`)}
        />

        <MenuCard
          icon="📤"
          title="Expedição de Sacas"
          subtitle="Registrar sacas enviadas"
          color={COLORS.blue}
          onPress={() => router.push(`/agencia/${nodoId}/sacas/expedicao`)}
        />

        {/* Histórico do dia */}
        <Text style={styles.sectionLabel}>MOVIMENTOS DE HOJE</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />
        ) : movimentos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>🎒  Nenhum movimento hoje.</Text>
          </Card>
        ) : (
          movimentos.map((m) => (
            <Card key={m.id} style={styles.movCard}>
              <View style={styles.movRow}>
                <Text style={styles.movIcon}>{m.tipo === 'chegada' ? '📥' : '📤'}</Text>
                <View style={styles.movInfo}>
                  <View style={styles.movHeader}>
                    <Badge
                      label={m.tipo === 'chegada' ? 'Chegada' : 'Expedição'}
                      color={m.tipo === 'chegada' ? COLORS.green : COLORS.blue}
                    />
                    <Text style={styles.movTime}>{formatTime(m.created_at)}</Text>
                  </View>
                  <Text style={styles.movQtd}>{m.quantidade} sacas</Text>
                  {m.placa && (
                    <Text style={styles.movDetail}>
                      🚛 {m.placa} · {m.transportadora}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
