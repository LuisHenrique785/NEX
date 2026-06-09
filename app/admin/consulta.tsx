import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, Card, Badge, Button } from '../../src/components/ui';
import { useTheme } from '../../src/lib/theme';
import type { Theme } from '../../src/lib/theme';
import { CONSULTA_PASSWORD } from '../../src/config';
import { formatDateTimeBRT, formatTimeBRT } from '../../src/lib/utils';

// ─── Types ───────────────────────────────────────────────────────
interface Expedicao {
  id: string;
  created_at: string;
  nome_motorista: string | null;
  placa: string | null;
  total_pacotes: number;
  nodo_nome: string;
  nodo_codigo: string;
  enviados: number;
  recebidos: number;
  pendentes: number;
}

interface PackageHistory {
  codigo: string;
  inventoriado_at: string | null;
  nodo_nome: string;
  expedido_at: string | null;
  recebido_at: string | null;
  status: 'inventoried' | 'expedited' | 'received_svc';
}

// ─── Styles ──────────────────────────────────────────────────────
function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    flex: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },

    // Login
    loginWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    loginIcon: { fontSize: 52, marginBottom: 16 },
    loginTitle: { fontSize: 22, fontWeight: '900', color: t.text, marginBottom: 6 },
    loginSub: { fontSize: 14, color: t.textSec, marginBottom: 28, textAlign: 'center' },
    loginInput: {
      width: '100%', maxWidth: 360,
      borderWidth: 2, borderColor: t.inputBorder, borderRadius: 14,
      padding: 16, fontSize: 20, letterSpacing: 4, textAlign: 'center',
      color: t.text, backgroundColor: t.input, marginBottom: 16,
    },

    // Tabs
    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, alignItems: 'center' },
    tabActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
    tabLabel: { fontSize: 13, fontWeight: '700', color: t.textSec },
    tabLabelActive: { color: COLORS.black },

    // Search
    searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    searchInput: {
      flex: 1, backgroundColor: t.input, borderRadius: 12,
      borderWidth: 1.5, borderColor: t.inputBorder,
      padding: 12, fontSize: 14, color: t.text, fontFamily: 'monospace',
    },
    searchBtn: {
      backgroundColor: COLORS.black, borderRadius: 12,
      paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
    },
    searchBtnText: { color: COLORS.yellow, fontWeight: '800', fontSize: 14 },

    // Expedition cards
    expCard: { padding: 14, marginBottom: 10 },
    expHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    expAgency: { fontSize: 15, fontWeight: '800', color: t.text, flex: 1 },
    expDate: { fontSize: 12, color: t.textSec },
    expMeta: { fontSize: 13, color: t.textSec, marginBottom: 10 },
    statsRow: { flexDirection: 'row', gap: 8 },
    statBox: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
    statLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Package history
    pkgCard: { padding: 16 },
    pkgCode: { fontSize: 18, fontWeight: '900', color: t.text, fontFamily: 'monospace', marginBottom: 12 },
    timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 12 },
    timelineLabel: { fontSize: 14, fontWeight: '700', color: t.text },
    timelineTime: { fontSize: 12, color: t.textSec, marginTop: 2 },
    timelineConnector: { width: 2, height: 16, backgroundColor: t.border, marginLeft: 5, marginBottom: 0, marginTop: -4 },

    sectionLabel: {
      fontSize: 11, fontWeight: '800', color: t.textSec,
      textTransform: 'uppercase', letterSpacing: 1.5,
      marginTop: 20, marginBottom: 12,
    },
    emptyCard: { alignItems: 'center', paddingVertical: 32 },
    emptyText: { color: t.textSec, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  });
}

// ─── Main Component ──────────────────────────────────────────────
export default function ConsultaScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'expedicoes' | 'busca'>('expedicoes');

  // Expedições tab state
  const [expedicoes, setExpedicoes] = useState<Expedicao[]>([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const [expLoaded, setExpLoaded] = useState(false);

  // Busca tab state
  const [searchCode, setSearchCode] = useState('');
  const [pkgHistory, setPkgHistory] = useState<PackageHistory | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  function handleLogin() {
    if (password === CONSULTA_PASSWORD) {
      setUnlocked(true);
      loadExpedicoes();
    } else {
      Alert.alert('Senha incorreta', 'Verifique a senha e tente novamente.');
      setPassword('');
    }
  }

  // ─── Load expeditions with sent/received/pending counts ─────────
  async function loadExpedicoes() {
    setLoadingExp(true);
    try {
      // Fetch expeditions with agency info
      const { data: exps } = await supabase
        .from('pacotes_expedicoes')
        .select('id, created_at, nome_motorista, placa, total_pacotes, nodo_id, nodos(nome, codigo)')
        .order('created_at', { ascending: false })
        .limit(60);

      if (!exps || exps.length === 0) {
        setExpedicoes([]);
        setExpLoaded(true);
        setLoadingExp(false);
        return;
      }

      const expIds = exps.map((e: any) => e.id);

      // Get all expedited packages for these expeditions
      const { data: packages } = await supabase
        .from('pacotes_inventario')
        .select('codigo, expedicao_id')
        .in('expedicao_id', expIds)
        .eq('status', 'expedited');

      // Build map: expedicaoId → [codes]
      const pkgByExp = new Map<string, string[]>();
      (packages || []).forEach((p: any) => {
        if (!pkgByExp.has(p.expedicao_id)) pkgByExp.set(p.expedicao_id, []);
        pkgByExp.get(p.expedicao_id)!.push(p.codigo);
      });

      const allCodes = (packages || []).map((p: any) => p.codigo);

      // Check which arrived at SVC
      let receivedSet = new Set<string>();
      if (allCodes.length > 0) {
        const { data: received } = await supabase
          .from('svc_recebimentos_pacotes')
          .select('codigo')
          .in('codigo', allCodes);
        receivedSet = new Set((received || []).map((r: any) => r.codigo));
      }

      const result: Expedicao[] = exps.map((e: any) => {
        const codes = pkgByExp.get(e.id) || [];
        const recebidos = codes.filter(c => receivedSet.has(c)).length;
        return {
          id: e.id,
          created_at: e.created_at,
          nome_motorista: e.nome_motorista,
          placa: e.placa,
          total_pacotes: e.total_pacotes,
          nodo_nome: e.nodos?.nome || '—',
          nodo_codigo: e.nodos?.codigo || '—',
          enviados: codes.length || e.total_pacotes,
          recebidos,
          pendentes: (codes.length || e.total_pacotes) - recebidos,
        };
      });

      setExpedicoes(result);
      setExpLoaded(true);
    } finally {
      setLoadingExp(false);
    }
  }

  // ─── Search a specific package code ─────────────────────────────
  async function handleSearch() {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    setSearching(true);
    setNotFound(false);
    setPkgHistory(null);

    try {
      // Check inventory record
      const { data: inv } = await supabase
        .from('pacotes_inventario')
        .select('codigo, status, inventoried_at, expedited_at, nodo_id, nodos(nome)')
        .eq('codigo', code)
        .order('inventoried_at', { ascending: false })
        .limit(1)
        .single();

      // Check SVC received
      const { data: svcRec } = await supabase
        .from('svc_recebimentos_pacotes')
        .select('codigo, created_at')
        .eq('codigo', code)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!inv && !svcRec) {
        setNotFound(true);
        setSearching(false);
        return;
      }

      let status: PackageHistory['status'] = 'inventoried';
      if (svcRec) status = 'received_svc';
      else if (inv?.status === 'expedited') status = 'expedited';

      setPkgHistory({
        codigo: code,
        inventoriado_at: inv?.inventoried_at || null,
        nodo_nome: (inv as any)?.nodos?.nome || '—',
        expedido_at: inv?.expedited_at || null,
        recebido_at: svcRec?.created_at || null,
        status,
      });
    } finally {
      setSearching(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center' }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.loginWrap}>
            <Text style={styles.loginIcon}>🔍</Text>
            <Text style={styles.loginTitle}>Consulta NEX</Text>
            <Text style={styles.loginSub}>
              Digite a senha para acessar o painel de consultas.
            </Text>
            <TextInput
              style={styles.loginInput}
              placeholder="Senha"
              placeholderTextColor={theme.textTer}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <View style={{ flexDirection: 'row', gap: 10, width: '100%', maxWidth: 360 }}>
              <Button label="Voltar" onPress={() => router.back()} variant="outline" style={{ flex: 1 }} />
              <Button label="Entrar" onPress={handleLogin} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === 'expedicoes' && styles.tabActive]}
            onPress={() => setTab('expedicoes')}
          >
            <Text style={[styles.tabLabel, tab === 'expedicoes' && styles.tabLabelActive]}>
              📦 Expedições
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'busca' && styles.tabActive]}
            onPress={() => setTab('busca')}
          >
            <Text style={[styles.tabLabel, tab === 'busca' && styles.tabLabelActive]}>
              🔍 Buscar Pacote
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── EXPEDIÇÕES TAB ── */}
        {tab === 'expedicoes' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.sectionLabel}>ÚLTIMAS 60 EXPEDIÇÕES</Text>
              <TouchableOpacity onPress={loadExpedicoes}>
                <Text style={{ color: COLORS.blue, fontWeight: '700', fontSize: 13 }}>↺ Atualizar</Text>
              </TouchableOpacity>
            </View>

            {loadingExp && <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />}

            {!loadingExp && expedicoes.length === 0 && expLoaded && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>Nenhuma expedição registrada ainda.</Text>
              </Card>
            )}

            {expedicoes.map((exp) => (
              <Card key={exp.id} style={styles.expCard}>
                <View style={styles.expHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expAgency}>{exp.nodo_nome}</Text>
                    <Text style={[styles.expDate, { marginTop: 2 }]}>
                      {formatDateTimeBRT(exp.created_at)}
                    </Text>
                  </View>
                  {exp.pendentes > 0 ? (
                    <Badge label={`${exp.pendentes} pendente${exp.pendentes !== 1 ? 's' : ''}`} color={COLORS.red} />
                  ) : (
                    <Badge label="✓ Completo" color={COLORS.green} />
                  )}
                </View>

                {exp.nome_motorista && (
                  <Text style={styles.expMeta}>
                    🚛 {exp.nome_motorista}{exp.placa ? ` · ${exp.placa}` : ''}
                  </Text>
                )}

                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { backgroundColor: COLORS.blue + '22' }]}>
                    <Text style={[styles.statVal, { color: COLORS.blue }]}>{exp.enviados}</Text>
                    <Text style={[styles.statLbl, { color: COLORS.blue }]}>Enviados</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: COLORS.green + '22' }]}>
                    <Text style={[styles.statVal, { color: COLORS.green }]}>{exp.recebidos}</Text>
                    <Text style={[styles.statLbl, { color: COLORS.green }]}>Recebidos</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: exp.pendentes > 0 ? COLORS.red + '22' : COLORS.green + '11' }]}>
                    <Text style={[styles.statVal, { color: exp.pendentes > 0 ? COLORS.red : COLORS.green }]}>
                      {exp.pendentes}
                    </Text>
                    <Text style={[styles.statLbl, { color: exp.pendentes > 0 ? COLORS.red : COLORS.green }]}>
                      Pendente
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* ── BUSCA TAB ── */}
        {tab === 'busca' && (
          <>
            <Text style={styles.sectionLabel}>CONSULTAR PACOTE POR CÓDIGO</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Ex: MLM123456789 ou 75343242..."
                placeholderTextColor={theme.textTer}
                value={searchCode}
                onChangeText={(t) => { setSearchCode(t); setNotFound(false); setPkgHistory(null); }}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
                {searching
                  ? <ActivityIndicator color={COLORS.yellow} size="small" />
                  : <Text style={styles.searchBtnText}>Buscar</Text>
                }
              </TouchableOpacity>
            </View>

            {notFound && (
              <Card style={styles.emptyCard}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>🔎</Text>
                <Text style={styles.emptyText}>
                  Pacote não encontrado.{'\n'}Verifique o código e tente novamente.
                </Text>
              </Card>
            )}

            {pkgHistory && (
              <Card style={styles.pkgCard}>
                <Text style={styles.pkgCode}>{pkgHistory.codigo}</Text>

                {/* Status badge */}
                <View style={{ marginBottom: 16 }}>
                  {pkgHistory.status === 'received_svc' && <Badge label="✅ Recebido no SVC" color={COLORS.green} />}
                  {pkgHistory.status === 'expedited' && <Badge label="🚛 Em trânsito (não recebido no SVC)" color={COLORS.orange} />}
                  {pkgHistory.status === 'inventoried' && <Badge label="📦 Em inventário (não expedido)" color={COLORS.blue} />}
                </View>

                {/* Timeline */}
                {pkgHistory.inventoriado_at && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: COLORS.blue }]} />
                    <View>
                      <Text style={styles.timelineLabel}>📦 Inventariado — {pkgHistory.nodo_nome}</Text>
                      <Text style={styles.timelineTime}>{formatDateTimeBRT(pkgHistory.inventoriado_at)}</Text>
                    </View>
                  </View>
                )}

                {pkgHistory.expedido_at && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: COLORS.orange }]} />
                    <View>
                      <Text style={styles.timelineLabel}>🚛 Expedido pela agência</Text>
                      <Text style={styles.timelineTime}>{formatDateTimeBRT(pkgHistory.expedido_at)}</Text>
                    </View>
                  </View>
                )}

                {pkgHistory.recebido_at && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: COLORS.green }]} />
                    <View>
                      <Text style={styles.timelineLabel}>✅ Recebido no SVC</Text>
                      <Text style={styles.timelineTime}>{formatDateTimeBRT(pkgHistory.recebido_at)}</Text>
                    </View>
                  </View>
                )}

                {!pkgHistory.recebido_at && pkgHistory.expedido_at && (
                  <View style={styles.timelineItem}>
                    <View style={[styles.timelineDot, { backgroundColor: COLORS.red, borderWidth: 2, borderColor: COLORS.red + '55' }]} />
                    <View>
                      <Text style={[styles.timelineLabel, { color: COLORS.red }]}>⚠️ Não recebido no SVC</Text>
                      <Text style={styles.timelineTime}>Pendente de confirmação</Text>
                    </View>
                  </View>
                )}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
