import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { supabaseAuditoria } from '../../../src/lib/supabase-auditoria';
import { COLORS, MenuCard, Card } from '../../../src/components/ui';
import { useTheme } from '../../../src/lib/theme';
import { useNodoAuth } from '../../../src/lib/auth';
import { useDemo } from '../../../src/lib/demo';

interface Nodo {
  id: string;
  codigo: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
}

function todayBR(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${now.getFullYear()}`;
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { padding: 20, paddingBottom: 40 },
    nodoCard: { marginBottom: 8 },
    nodoHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    nodoIconBox: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: COLORS.yellow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    nodoIconText: { fontSize: 26 },
    nodoInfo: { flex: 1 },
    nodoName: { fontSize: 17, fontWeight: '800', color: theme.text, marginBottom: 3 },
    nodoCode: { fontSize: 12, color: theme.textSec, fontWeight: '600', marginBottom: 4 },
    nodoAddress: { fontSize: 13, color: theme.textSec, lineHeight: 18 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSec,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 8,
      marginBottom: 8,
    },
    sacasCard: {
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.yellow,
    },
    sacasHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sacasTitle: { fontSize: 12, fontWeight: '700', color: theme.textSec, textTransform: 'uppercase', letterSpacing: 1 },
    sacasNums: { flexDirection: 'row', gap: 16, marginBottom: 8 },
    sacasNum: { fontSize: 26, fontWeight: '900', color: theme.text },
    sacasNumLabel: { fontSize: 11, color: theme.textSec },
    sacasChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    sacasChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 3 },
    sacasChipText: { fontSize: 12, fontWeight: '700' },
    sacasEta: { fontSize: 12, color: theme.textSec, marginTop: 6 },
  });
}

export default function AgenciaHomeScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { logout } = useNodoAuth();
  const { isDemo } = useDemo();

  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
  const navigation = useNavigation();
  const [nodo, setNodo] = useState<Nodo | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);
  const [sacasInfo, setSacasInfo] = useState<{
    totalSacas: number; impressas: number; eta: string | null;
    sacaIds: string[]; printedIds: Set<string>; loading: boolean;
  }>({ totalSacas: 0, impressas: 0, eta: null, sacaIds: [], printedIds: new Set(), loading: true });

  useEffect(() => {
    loadNodo();
  }, [nodoId]);

  useEffect(() => {
    if (nodo) {
      navigation.setOptions({
        title: nodo.nome,
        headerRight: () => !isDemo ? (
          <TouchableOpacity
            onPress={handleLogout}
            style={{ marginRight: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSec }}>Sair</Text>
          </TouchableOpacity>
        ) : null,
      });
      loadSacasAuditoria(nodo.codigo);
    }
  }, [nodo, theme]);

  function handleLogout() {
    setLogoutModal(true);
  }

  async function loadNodo() {
    const { data } = await supabase.from('nodos').select('*').eq('id', nodoId).single();
    setNodo(data);
    setLoading(false);
  }

  async function loadSacasAuditoria(nodoCode: string) {
    const { data: rotaRaw } = await supabaseAuditoria
      .from('rota')
      .select('saca_id, rota, eta, id')
      .eq('nodo', nodoCode)
      .eq('svc', 'SMG3')
      .order('id', { ascending: false });

    if (!rotaRaw || rotaRaw.length === 0) {
      setSacasInfo({ totalSacas: 0, impressas: 0, eta: null, sacaIds: [], printedIds: new Set(), loading: false });
      return;
    }

    const latestRota = new Map<string, (typeof rotaRaw)[0]>();
    for (const r of rotaRaw) {
      if (!latestRota.has(r.saca_id)) latestRota.set(r.saca_id, r);
    }
    const entries = Array.from(latestRota.values());
    const totalSacas = entries.length;
    const etaRaw = entries.find((r) => r.eta && r.eta !== '00:00:00')?.eta ?? null;
    const eta = etaRaw ? etaRaw.substring(0, 5) : null;
    const allIds = entries.map((r) => r.saca_id);

    const today = todayBR();
    const { data: logRaw } = await supabaseAuditoria
      .from('log')
      .select('saca_id, id')
      .in('saca_id', allIds)
      .ilike('data', `${today}%`);

    const latestLog = new Map<string, number>();
    for (const l of logRaw || []) {
      const cur = latestLog.get(l.saca_id);
      if (!cur || l.id > cur) latestLog.set(l.saca_id, l.id);
    }

    const sacaIds = allIds.slice().sort((a, b) => Number(a) - Number(b));
    setSacasInfo({
      totalSacas,
      impressas: latestLog.size,
      eta,
      sacaIds,
      printedIds: new Set(latestLog.keys()),
      loading: false,
    });
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* NODO Info */}
        <Card style={styles.nodoCard}>
          <View style={styles.nodoHeader}>
            <View style={styles.nodoIconBox}>
              <Text style={styles.nodoIconText}>🏪</Text>
            </View>
            <View style={styles.nodoInfo}>
              <Text style={styles.nodoName}>{nodo?.nome}</Text>
              {nodo?.codigo && <Text style={styles.nodoCode}>Código: {nodo.codigo}</Text>}
              {nodo?.endereco && (
                <Text style={styles.nodoAddress} numberOfLines={2}>
                  📌 {nodo.endereco}{nodo.cidade ? `, ${nodo.cidade}` : ''}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Sacas do dia */}
        {(sacasInfo.loading || sacasInfo.totalSacas > 0) && (
          <View style={styles.sacasCard}>
            <View style={styles.sacasHeader}>
              <Text style={styles.sacasTitle}>🎒 Sacas previstas hoje</Text>
              {sacasInfo.eta ? (
                <Text style={{ fontSize: 12, color: theme.textSec }}>ETA {sacasInfo.eta}</Text>
              ) : null}
            </View>
            {sacasInfo.loading ? (
              <ActivityIndicator color={COLORS.yellow} size="small" />
            ) : (
              <>
                <View style={styles.sacasNums}>
                  <View>
                    <Text style={styles.sacasNum}>{sacasInfo.totalSacas}</Text>
                    <Text style={styles.sacasNumLabel}>Total</Text>
                  </View>
                  <View style={{ width: 1, backgroundColor: theme.border }} />
                  <View>
                    <Text style={[styles.sacasNum, { color: sacasInfo.impressas > 0 ? COLORS.green : theme.textSec }]}>
                      {sacasInfo.impressas}
                    </Text>
                    <Text style={styles.sacasNumLabel}>Impressas</Text>
                  </View>
                </View>
                <View style={styles.sacasChipsRow}>
                  {sacasInfo.sacaIds.map((id) => {
                    const printed = sacasInfo.printedIds.has(id);
                    return (
                      <View
                        key={id}
                        style={[styles.sacasChip, {
                          backgroundColor: printed ? `${COLORS.green}18` : theme.bg,
                          borderColor: printed ? COLORS.green : theme.border,
                        }]}
                      >
                        {printed && <Text style={{ fontSize: 10 }}>✓</Text>}
                        <Text style={[styles.sacasChipText, { color: printed ? COLORS.green : theme.textSec }]}>
                          {id}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* Menu */}
        <Text style={styles.sectionLabel}>O QUE DESEJA FAZER?</Text>

        <MenuCard
          icon="🎒"
          title="Inventário de Sacas"
          subtitle="Chegada e expedição de sacas"
          color={COLORS.orange}
          onPress={() => router.push(`/agencia/${nodoId}/sacas`)}
        />

        <MenuCard
          icon="📦"
          title="Inventário de Pacotes"
          subtitle="Inventário físico e expedição"
          color={COLORS.blue}
          onPress={() => router.push(`/agencia/${nodoId}/pacotes`)}
        />
      </ScrollView>

      <Modal visible={logoutModal} transparent animationType="fade" onRequestClose={() => setLogoutModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text, marginBottom: 8 }}>Sair da agência</Text>
            <Text style={{ fontSize: 14, color: theme.textSec, lineHeight: 20, marginBottom: 24 }}>
              Deseja sair? Você precisará fazer login novamente.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface }}
                onPress={() => setLogoutModal(false)}
              >
                <Text style={{ fontWeight: '700', color: theme.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: COLORS.red }}
                onPress={async () => { setLogoutModal(false); await logout(); router.replace('/agencia'); }}
              >
                <Text style={{ fontWeight: '800', color: '#fff' }}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
