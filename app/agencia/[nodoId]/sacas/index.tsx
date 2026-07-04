import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { supabaseAuditoria } from '../../../../src/lib/supabase-auditoria';
import { COLORS, MenuCard, Card, Badge } from '../../../../src/components/ui';
import { useTheme } from '../../../../src/lib/theme';
import { formatTimeBRT, startOfTodayBRT } from '../../../../src/lib/utils';

interface Movimento {
  id: string;
  tipo: 'chegada' | 'expedicao';
  quantidade: number;
  placa: string | null;
  transportadora: string | null;
  dentro_horario: boolean | null;
  created_at: string;
}

interface AuditoriaInfo {
  totalSacas: number;
  extraSacas: number;
  impressas: number;
  eta: string | null;
  loading: boolean;
  sacaIds: string[];
  printedIds: Set<string>;
}

function todayBR(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { padding: 20, paddingBottom: 40 },
    // Auditoria preview card
    auditoriaCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.yellow,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    auditoriaTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.textSec,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    auditoriaNumRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    auditoriaNumBox: {
      flex: 1,
      backgroundColor: theme.bg,
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
    },
    auditoriaNum: { fontSize: 30, fontWeight: '900', color: theme.text },
    auditoriaNumLabel: { fontSize: 11, color: theme.textSec, marginTop: 2, textAlign: 'center' },
    auditoriaProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    auditoriaProgressBar: {
      flex: 1,
      height: 6,
      backgroundColor: theme.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    auditoriaProgressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.green },
    auditoriaProgressText: { fontSize: 12, fontWeight: '700', color: theme.textSec, minWidth: 48, textAlign: 'right' },
    auditoriaEta: { fontSize: 12, color: theme.textSec, marginTop: 6 },
    sacaChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    sacaChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 20, borderWidth: 1.5,
    },
    sacaChipText: { fontSize: 13, fontWeight: '700' },
    // existing styles
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
  const [auditoria, setAuditoria] = useState<AuditoriaInfo>({
    totalSacas: 0, extraSacas: 0, impressas: 0, eta: null, loading: true,
    sacaIds: [], printedIds: new Set(),
  });

  useEffect(() => {
    loadAll();
  }, [nodoId]);

  async function loadAll() {
    const [nodoResult, movResult] = await Promise.all([
      supabase.from('nodos').select('codigo').eq('id', nodoId).single(),
      supabase
        .from('sacas_movimentos')
        .select('*')
        .eq('nodo_id', nodoId)
        .gte('created_at', startOfTodayBRT().toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const list = movResult.data || [];
    setMovimentos(list);
    setTotais({
      chegada: list.filter((m) => m.tipo === 'chegada').reduce((s, m) => s + m.quantidade, 0),
      expedicao: list.filter((m) => m.tipo === 'expedicao').reduce((s, m) => s + m.quantidade, 0),
    });
    setLoading(false);

    if (nodoResult.data?.codigo) {
      await loadAuditoriaSacas(nodoResult.data.codigo);
    } else {
      setAuditoria((prev) => ({ ...prev, loading: false }));
    }
  }

  async function loadAuditoriaSacas(nodoCode: string) {
    const { data: rotaRaw } = await supabaseAuditoria
      .from('rota')
      .select('saca_id, rota, eta, id')
      .eq('nodo', nodoCode)
      .eq('svc', 'SMG3')
      .order('id', { ascending: false });

    if (!rotaRaw || rotaRaw.length === 0) {
      setAuditoria({ totalSacas: 0, extraSacas: 0, impressas: 0, eta: null, loading: false, sacaIds: [], printedIds: new Set() });
      return;
    }

    // Deduplicate by saca_id keeping the latest upload (highest id)
    const latestRota = new Map<string, (typeof rotaRaw)[0]>();
    for (const r of rotaRaw) {
      if (!latestRota.has(r.saca_id)) latestRota.set(r.saca_id, r);
    }
    const entries = Array.from(latestRota.values());
    const totalSacas = entries.length;
    const uniqueRoutes = new Set(entries.map((r) => r.rota)).size;
    const extraSacas = Math.max(0, totalSacas - uniqueRoutes);
    const etaRaw = entries.find((r) => r.eta && r.eta !== '00:00:00')?.eta ?? null;
    const eta = etaRaw ? etaRaw.substring(0, 5) : null;

    // Get today's printed sacas from log
    const today = todayBR();
    const allIds = entries.map((r) => r.saca_id);

    const { data: logRaw } = await supabaseAuditoria
      .from('log')
      .select('saca_id, id')
      .in('saca_id', allIds)
      .ilike('data', `${today}%`);

    // Deduplicate log by saca_id keeping latest
    const latestLog = new Map<string, number>();
    for (const l of logRaw || []) {
      const cur = latestLog.get(l.saca_id);
      if (!cur || l.id > cur) latestLog.set(l.saca_id, l.id);
    }

    const sacaIds = allIds.slice().sort((a, b) => Number(a) - Number(b));

    setAuditoria({
      totalSacas,
      extraSacas,
      impressas: latestLog.size,
      eta,
      loading: false,
      sacaIds,
      printedIds: new Set(latestLog.keys()),
    });
  }

  function formatTime(dateStr: string) { return formatTimeBRT(dateStr); }

  const progressRatio = auditoria.totalSacas > 0 ? auditoria.impressas / auditoria.totalSacas : 0;
  const allPrinted = auditoria.totalSacas > 0 && auditoria.impressas >= auditoria.totalSacas;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Previsão de Sacas - Auditoria */}
        {(auditoria.loading || auditoria.totalSacas > 0) && (
          <View style={styles.auditoriaCard}>
            <Text style={styles.auditoriaTitle}>Sacas previstas para hoje</Text>
            {auditoria.loading ? (
              <ActivityIndicator color={COLORS.yellow} size="small" />
            ) : (
              <>
                <View style={styles.auditoriaNumRow}>
                  <View style={styles.auditoriaNumBox}>
                    <Text style={styles.auditoriaNum}>{auditoria.totalSacas}</Text>
                    <Text style={styles.auditoriaNumLabel}>Total de sacas</Text>
                  </View>
                  <View style={styles.auditoriaNumBox}>
                    <Text style={[styles.auditoriaNum, { color: auditoria.extraSacas > 0 ? COLORS.orange : theme.textTer }]}>
                      {auditoria.extraSacas}
                    </Text>
                    <Text style={styles.auditoriaNumLabel}>Sacas extras</Text>
                  </View>
                </View>
                <View style={styles.auditoriaProgressRow}>
                  <View style={styles.auditoriaProgressBar}>
                    <View style={[styles.auditoriaProgressFill, { width: `${progressRatio * 100}%` as any }]} />
                  </View>
                  <Text style={styles.auditoriaProgressText}>
                    {allPrinted ? '✅' : `${auditoria.impressas}/${auditoria.totalSacas}`}
                  </Text>
                </View>
                {/* Saca ID chips */}
                {auditoria.sacaIds.length > 0 && (
                  <View style={styles.sacaChipsRow}>
                    {auditoria.sacaIds.map((id) => {
                      const printed = auditoria.printedIds.has(id);
                      return (
                        <View
                          key={id}
                          style={[
                            styles.sacaChip,
                            {
                              backgroundColor: printed ? `${COLORS.green}18` : theme.bg,
                              borderColor: printed ? COLORS.green : theme.border,
                            },
                          ]}
                        >
                          {printed && <Text style={{ fontSize: 11 }}>✓</Text>}
                          <Text style={[styles.sacaChipText, { color: printed ? COLORS.green : theme.textSec }]}>
                            {id}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                {allPrinted && (
                  <Text style={[styles.auditoriaEta, { color: COLORS.green, fontWeight: '700' }]}>
                    Todas as sacas impressas
                  </Text>
                )}
                {auditoria.eta && (
                  <Text style={styles.auditoriaEta}>Previsão de chegada: {auditoria.eta}</Text>
                )}
              </>
            )}
          </View>
        )}

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
                  {m.tipo === 'chegada' && m.dentro_horario !== null && (
                    <Text style={[styles.movDetail, { color: m.dentro_horario ? COLORS.green : '#FF6B00', fontWeight: '600' }]}>
                      {m.dentro_horario ? '✅ Dentro do horário' : '⚠️ Fora do horário'}
                    </Text>
                  )}
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
