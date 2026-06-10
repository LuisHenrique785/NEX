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
import { formatDateTimeBRT, startOfTodayBRT } from '../../src/lib/utils';

// ─── Types ───────────────────────────────────────────────────────
interface Expedicao {
  id: string;
  created_at: string;
  placa: string | null;
  transportadora: string | null;
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

type MainTab = 'expedicoes' | 'pendencias' | 'busca' | 'exportar';
type StatusFilter = 'all' | 'pending' | 'complete';

const EXPORT_PERIODS = [
  { label: 'Hoje',    days: 1  },
  { label: '7 dias',  days: 7  },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
] as const;

function getStartDate(days: number): Date {
  const today = startOfTodayBRT();
  return new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
}

function buildCSV(rows: any[]): string {
  const headers = [
    'Data/Hora (BRT)', 'NODO', 'Código', 'Placa', 'Transportadora',
    'Total Declarado', 'Enviados', 'Recebidos SVC', 'Pendentes',
  ];
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      r.created_at_brt, r.nodo_nome, r.nodo_codigo,
      r.placa, r.transportadora,
      r.total_pacotes, r.enviados, r.recebidos, r.pendentes,
    ].map(escape).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

function downloadCSV(csv: string, filename: string) {
  if (Platform.OS !== 'web') {
    Alert.alert('Não disponível', 'O download de CSV só está disponível no navegador web.');
    return;
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Styles ──────────────────────────────────────────────────────
function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    flex: { flex: 1 },
    container: { padding: 16, paddingBottom: 40 },

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
    tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    tab: {
      flex: 1, paddingVertical: 10, borderRadius: 12,
      borderWidth: 1.5, borderColor: t.border, alignItems: 'center',
    },
    tabActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
    tabLabel: { fontSize: 12, fontWeight: '700', color: t.textSec },
    tabLabelActive: { color: COLORS.black },

    // Filter chips
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    filterChip: {
      paddingVertical: 6, paddingHorizontal: 12,
      borderRadius: 20, borderWidth: 1.5, borderColor: t.border,
      backgroundColor: t.surface,
    },
    filterChipActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
    filterChipText: { fontSize: 12, fontWeight: '700', color: t.textSec },
    filterChipTextActive: { color: COLORS.yellow },

    // Search
    searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    searchInput: {
      flex: 1, backgroundColor: t.input, borderRadius: 12,
      borderWidth: 1.5, borderColor: t.inputBorder,
      padding: 12, fontSize: 14, color: t.text,
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

    sectionLabel: {
      fontSize: 11, fontWeight: '800', color: t.textSec,
      textTransform: 'uppercase', letterSpacing: 1.5,
      marginTop: 16, marginBottom: 10,
    },
    emptyCard: { alignItems: 'center', paddingVertical: 32 },
    emptyText: { color: t.textSec, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  });
}

// ─── Expedition Card ─────────────────────────────────────────────
function ExpCard({ exp, styles, isPendencia }: { exp: Expedicao; styles: ReturnType<typeof makeStyles>; isPendencia?: boolean }) {
  const ageMs = Date.now() - new Date(exp.created_at).getTime();
  const ageHours = Math.floor(ageMs / 3600000);
  const ageDays = Math.floor(ageHours / 24);
  const isUrgent = isPendencia && ageDays >= 1;

  return (
    <Card style={[styles.expCard, isUrgent && { borderWidth: 1.5, borderColor: '#FF3B30' }]}>
      <View style={styles.expHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.expAgency}>{exp.nodo_nome}</Text>
          <Text style={[styles.expDate, { marginTop: 2 }]}>
            {formatDateTimeBRT(exp.created_at)}
            {isPendencia && (
              <Text style={{ color: isUrgent ? '#FF3B30' : '#FF9500', fontWeight: '700' }}>
                {ageDays > 0 ? `  ·  há ${ageDays}d` : `  ·  há ${ageHours}h`}
              </Text>
            )}
          </Text>
        </View>
        {exp.pendentes > 0 ? (
          <Badge label={`${exp.pendentes} pendente${exp.pendentes !== 1 ? 's' : ''}`} color={COLORS.red} />
        ) : (
          <Badge label="✓ Completo" color={COLORS.green} />
        )}
      </View>

      {(exp.transportadora || exp.placa) && (
        <Text style={styles.expMeta}>
          🚛 {exp.transportadora || ''}{exp.placa ? ` · ${exp.placa}` : ''}
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
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function ConsultaScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<MainTab>('expedicoes');

  // Expedições tab state
  const [expedicoes, setExpedicoes] = useState<Expedicao[]>([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const [expLoaded, setExpLoaded] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expSearch, setExpSearch] = useState('');

  // Busca tab state
  const [searchCode, setSearchCode] = useState('');
  const [pkgHistory, setPkgHistory] = useState<PackageHistory | null>(null);
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Export tab state
  const [exportPeriod, setExportPeriod] = useState<1 | 7 | 15 | 30>(7);
  const [exportLoading, setExportLoading] = useState(false);

  function handleLogin() {
    if (password === CONSULTA_PASSWORD) {
      setUnlocked(true);
      loadExpedicoes();
    } else {
      Alert.alert('Senha incorreta', 'Verifique a senha e tente novamente.');
      setPassword('');
    }
  }

  // ─── Load expeditions ────────────────────────────────────────────
  async function loadExpedicoes() {
    setLoadingExp(true);
    try {
      const { data: exps } = await supabase
        .from('pacotes_expedicoes')
        .select('id, created_at, placa, transportadora, total_pacotes, nodo_id, nodos(nome, codigo)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!exps || exps.length === 0) {
        setExpedicoes([]);
        setExpLoaded(true);
        return;
      }

      const expIds = exps.map((e: any) => e.id);

      const { data: packages } = await supabase
        .from('pacotes_inventario')
        .select('codigo, expedicao_id')
        .in('expedicao_id', expIds)
        .eq('status', 'expedited');

      const pkgByExp = new Map<string, string[]>();
      (packages || []).forEach((p: any) => {
        if (!pkgByExp.has(p.expedicao_id)) pkgByExp.set(p.expedicao_id, []);
        pkgByExp.get(p.expedicao_id)!.push(p.codigo);
      });

      const allCodes = (packages || []).map((p: any) => p.codigo);
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
          placa: e.placa,
          transportadora: e.transportadora,
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

  // ─── Search package ───────────────────────────────────────────────
  async function handleSearch() {
    const code = searchCode.trim().toUpperCase();
    if (!code) return;
    setSearching(true);
    setNotFound(false);
    setPkgHistory(null);

    try {
      const { data: inv } = await supabase
        .from('pacotes_inventario')
        .select('codigo, status, inventoried_at, expedited_at, nodo_id, nodos(nome)')
        .eq('codigo', code)
        .order('inventoried_at', { ascending: false })
        .limit(1)
        .single();

      const { data: svcRec } = await supabase
        .from('svc_recebimentos_pacotes')
        .select('codigo, created_at')
        .eq('codigo', code)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!inv && !svcRec) {
        setNotFound(true);
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

  // ─── Export CSV ───────────────────────────────────────────────────
  async function handleExport() {
    setExportLoading(true);
    try {
      const since = getStartDate(exportPeriod).toISOString();
      const { data: exps } = await supabase
        .from('pacotes_expedicoes')
        .select('id, created_at, placa, transportadora, total_pacotes, nodo_id, nodos(nome, codigo)')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (!exps || exps.length === 0) {
        Alert.alert('Sem dados', `Nenhuma expedição encontrada nos últimos ${exportPeriod === 1 ? 'hoje' : exportPeriod + ' dias'}.`);
        return;
      }

      const expIds = exps.map((e: any) => e.id);
      const { data: packages } = await supabase
        .from('pacotes_inventario')
        .select('codigo, expedicao_id')
        .in('expedicao_id', expIds)
        .eq('status', 'expedited');

      const pkgByExp = new Map<string, string[]>();
      (packages || []).forEach((p: any) => {
        if (!pkgByExp.has(p.expedicao_id)) pkgByExp.set(p.expedicao_id, []);
        pkgByExp.get(p.expedicao_id)!.push(p.codigo);
      });

      const allCodes = (packages || []).map((p: any) => p.codigo);
      let receivedSet = new Set<string>();
      if (allCodes.length > 0) {
        const { data: received } = await supabase
          .from('svc_recebimentos_pacotes')
          .select('codigo')
          .in('codigo', allCodes);
        receivedSet = new Set((received || []).map((r: any) => r.codigo));
      }

      const rows = exps.map((e: any) => {
        const codes = pkgByExp.get(e.id) || [];
        const recebidos = codes.filter((c: string) => receivedSet.has(c)).length;
        const enviados = codes.length || e.total_pacotes;
        return {
          created_at_brt: formatDateTimeBRT(e.created_at),
          nodo_nome: e.nodos?.nome || '—',
          nodo_codigo: e.nodos?.codigo || '—',
          placa: e.placa || '',
          transportadora: e.transportadora || '',
          total_pacotes: e.total_pacotes,
          enviados,
          recebidos,
          pendentes: enviados - recebidos,
        };
      });

      const label = exportPeriod === 1 ? 'hoje' : `${exportPeriod}dias`;
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(buildCSV(rows), `nex-expedicoes-${label}-${date}.csv`);
    } finally {
      setExportLoading(false);
    }
  }

  // ─── Derived data ────────────────────────────────────────────────
  const filteredExps = expedicoes.filter(exp => {
    if (statusFilter === 'pending' && exp.pendentes === 0) return false;
    if (statusFilter === 'complete' && exp.pendentes > 0) return false;
    if (expSearch.trim()) {
      const q = expSearch.toLowerCase();
      if (
        !exp.nodo_nome.toLowerCase().includes(q) &&
        !(exp.placa || '').toLowerCase().includes(q) &&
        !(exp.transportadora || '').toLowerCase().includes(q) &&
        !(exp.nodo_codigo || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const pendencias = expedicoes
    .filter(e => e.pendentes > 0)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const totalEnviados = expedicoes.reduce((s, e) => s + e.enviados, 0);
  const totalRecebidos = expedicoes.reduce((s, e) => s + e.recebidos, 0);
  const totalPendentes = expedicoes.reduce((s, e) => s + e.pendentes, 0);

  // ─── Login screen ─────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center' }]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

  // ─── Main screen ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* ── Dashboard Header ── */}
        <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text, letterSpacing: -0.5 }}>
                📊 Consulta NEX
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>
                Expedições, pendências e rastreio
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { setUnlocked(false); setPassword(''); setExpedicoes([]); setExpLoaded(false); }}
              style={{
                backgroundColor: theme.surface, borderRadius: 10,
                borderWidth: 1, borderColor: theme.border,
                paddingVertical: 6, paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.textSec, fontWeight: '700' }}>Sair</Text>
            </TouchableOpacity>
          </View>

          {loadingExp && !expLoaded ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={theme.textTer} />
                </View>
              ))}
            </View>
          ) : expLoaded ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                { val: expedicoes.length, label: 'Expedições', color: COLORS.blue },
                { val: totalEnviados,     label: 'Enviados',   color: '#FF9500' },
                { val: totalRecebidos,    label: 'Recebidos',  color: COLORS.green },
                { val: totalPendentes,    label: 'Pendentes',  color: totalPendentes > 0 ? '#FF3B30' : COLORS.green },
              ]).map(({ val, label, color }) => (
                <View key={label} style={{
                  flex: 1, backgroundColor: color + '22',
                  borderRadius: 12, padding: 10, alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color }}>{val}</Text>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: theme.textSec, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* ── Tabs ── */}
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
            style={[styles.tab, tab === 'pendencias' && styles.tabActive, pendencias.length > 0 && tab !== 'pendencias' && { borderColor: '#FF3B30' }]}
            onPress={() => setTab('pendencias')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.tabLabel, tab === 'pendencias' && styles.tabLabelActive]}>
                ⚠️ Pendências
              </Text>
              {pendencias.length > 0 && (
                <View style={{
                  backgroundColor: tab === 'pendencias' ? '#000' : '#FF3B30',
                  borderRadius: 8, minWidth: 18, height: 18,
                  justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
                }}>
                  <Text style={{ color: tab === 'pendencias' ? COLORS.yellow : '#FFF', fontSize: 10, fontWeight: '900' }}>
                    {pendencias.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'busca' && styles.tabActive]}
            onPress={() => setTab('busca')}
          >
            <Text style={[styles.tabLabel, tab === 'busca' && styles.tabLabelActive]}>
              🔍 Buscar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'exportar' && styles.tabActive]}
            onPress={() => setTab('exportar')}
          >
            <Text style={[styles.tabLabel, tab === 'exportar' && styles.tabLabelActive]}>
              📥 CSV
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── ABA: EXPEDIÇÕES ── */}
        {tab === 'expedicoes' && (
          <>
            {/* Filtro de status */}
            <View style={styles.filterRow}>
              {([
                { key: 'all',      label: 'Todas' },
                { key: 'pending',  label: 'Pendentes' },
                { key: 'complete', label: 'Completas' },
              ] as { key: StatusFilter; label: string }[]).map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
                  onPress={() => setStatusFilter(f.key)}
                >
                  <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Busca por NODO / placa / transportadora */}
            <TextInput
              style={[styles.searchInput, { marginBottom: 12 }]}
              placeholder="🔍  Filtrar por NODO, placa ou transportadora..."
              placeholderTextColor={theme.textTer}
              value={expSearch}
              onChangeText={setExpSearch}
              clearButtonMode="always"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionLabel}>
                {filteredExps.length} RESULTADO{filteredExps.length !== 1 ? 'S' : ''}
              </Text>
              <TouchableOpacity onPress={loadExpedicoes}>
                <Text style={{ color: COLORS.blue, fontWeight: '700', fontSize: 13 }}>↺ Atualizar</Text>
              </TouchableOpacity>
            </View>

            {loadingExp && <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />}

            {!loadingExp && filteredExps.length === 0 && expLoaded && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {expedicoes.length === 0
                    ? 'Nenhuma expedição registrada ainda.'
                    : 'Nenhuma expedição encontrada com esses filtros.'}
                </Text>
              </Card>
            )}

            {filteredExps.map(exp => (
              <ExpCard key={exp.id} exp={exp} styles={styles} />
            ))}
          </>
        )}

        {/* ── ABA: PENDÊNCIAS ── */}
        {tab === 'pendencias' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.sectionLabel}>
                {pendencias.length} EXPEDIÇÃO{pendencias.length !== 1 ? 'ÕES' : ''} PENDENTE{pendencias.length !== 1 ? 'S' : ''}
              </Text>
              <TouchableOpacity onPress={loadExpedicoes}>
                <Text style={{ color: COLORS.blue, fontWeight: '700', fontSize: 13 }}>↺ Atualizar</Text>
              </TouchableOpacity>
            </View>

            {loadingExp && <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />}

            {!loadingExp && pendencias.length === 0 && expLoaded && (
              <Card style={styles.emptyCard}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
                <Text style={styles.emptyText}>
                  Nenhuma pendência!{'\n'}Todas as expedições foram recebidas no SVC.
                </Text>
              </Card>
            )}

            {pendencias.map(exp => (
              <ExpCard key={exp.id} exp={exp} styles={styles} isPendencia />
            ))}
          </>
        )}

        {/* ── ABA: BUSCAR PACOTE ── */}
        {tab === 'busca' && (
          <>
            <Text style={styles.sectionLabel}>CONSULTAR PACOTE POR CÓDIGO</Text>

            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Ex: MLM123456789 ou 75343242..."
                placeholderTextColor={theme.textTer}
                value={searchCode}
                onChangeText={(v) => { setSearchCode(v); setNotFound(false); setPkgHistory(null); }}
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

                <View style={{ marginBottom: 16 }}>
                  {pkgHistory.status === 'received_svc' && <Badge label="✅ Recebido no SVC" color={COLORS.green} />}
                  {pkgHistory.status === 'expedited' && <Badge label="🚛 Em trânsito — aguardando SVC" color={COLORS.orange} />}
                  {pkgHistory.status === 'inventoried' && <Badge label="📦 Em inventário — não expedido" color={COLORS.blue} />}
                </View>

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
                    <View style={[styles.timelineDot, { backgroundColor: COLORS.red }]} />
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

        {/* ── ABA: EXPORTAR CSV ── */}
        {tab === 'exportar' && (
          <>
            <Text style={styles.sectionLabel}>EXPORTAR EXPEDIÇÕES EM CSV</Text>

            <Card style={{ padding: 16, marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: theme.textSec, lineHeight: 20 }}>
                Selecione o período e baixe uma planilha com todas as expedições registradas, incluindo NODO, transportadora, placa e status de recebimento no SVC.
              </Text>
            </Card>

            <Text style={[styles.sectionLabel, { marginTop: 4 }]}>PERÍODO</Text>
            <View style={[styles.filterRow, { flexWrap: 'wrap' }]}>
              {EXPORT_PERIODS.map(p => (
                <TouchableOpacity
                  key={p.days}
                  style={[
                    styles.filterChip,
                    { paddingVertical: 10, paddingHorizontal: 20 },
                    exportPeriod === p.days && styles.filterChipActive,
                  ]}
                  onPress={() => setExportPeriod(p.days as 1 | 7 | 15 | 30)}
                >
                  <Text style={[styles.filterChipText, exportPeriod === p.days && styles.filterChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Card style={{ padding: 14, marginBottom: 20, backgroundColor: COLORS.blue + '15' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 24 }}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>
                    {exportPeriod === 1 ? 'Expedições de hoje' : `Expedições dos últimos ${exportPeriod} dias`}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSec, marginTop: 2 }}>
                    Colunas: Data/Hora · NODO · Código · Placa · Transportadora · Total · Enviados · Recebidos · Pendentes
                  </Text>
                </View>
              </View>
            </Card>

            <TouchableOpacity
              style={{
                backgroundColor: exportLoading ? theme.surface : COLORS.black,
                borderRadius: 14, padding: 18,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
                borderWidth: exportLoading ? 1.5 : 0,
                borderColor: theme.border,
              }}
              onPress={handleExport}
              disabled={exportLoading}
              activeOpacity={0.85}
            >
              {exportLoading
                ? <ActivityIndicator color={COLORS.yellow} size="small" />
                : <Text style={{ fontSize: 20 }}>📥</Text>
              }
              <Text style={{
                fontSize: 16, fontWeight: '900',
                color: exportLoading ? theme.textSec : COLORS.yellow,
              }}>
                {exportLoading ? 'Gerando CSV...' : 'Baixar CSV'}
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 11, color: theme.textTer, textAlign: 'center', marginTop: 12, lineHeight: 16 }}>
              O download é iniciado automaticamente no navegador.{'\n'}
              Abra o arquivo no Excel ou Google Sheets.
            </Text>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
