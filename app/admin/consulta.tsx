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
interface AgenciaPacote {
  codigo: string;
  expedited_at: string | null;
  recebido_at: string | null;
}

interface AgenciaData {
  nodo_id: string;
  nodo_nome: string;
  total_enviados: number;
  total_recebidos: number;
  total_pendentes: number;
  pacotes: AgenciaPacote[];
}

interface MotoristaPacoteFaltando {
  codigo: string;
  nodo_nome: string;
  expedited_at: string | null;
}

interface MotoristaData {
  chave: string;
  nome: string;
  cpf: string | null;
  total_expedicoes: number;
  total_pego: number;
  total_entregue: number;
  total_faltando: number;
  faltando: MotoristaPacoteFaltando[];
}

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
    tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    tab: { flex: 1, minWidth: '45%', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: t.border, alignItems: 'center' },
    tabActive: { backgroundColor: COLORS.yellow, borderColor: COLORS.yellow },
    tabLabel: { fontSize: 12, fontWeight: '700', color: t.textSec },
    tabLabelActive: { color: COLORS.black },

    // Agency cards
    agCard: { padding: 14, marginBottom: 10 },
    agHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    agName: { fontSize: 15, fontWeight: '800', color: t.text, flex: 1 },
    agActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    agExpandBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: t.border },
    agExpandText: { fontSize: 12, fontWeight: '700', color: t.textSec },
    agDownloadBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.blue + '22' },
    agDownloadText: { fontSize: 12, fontWeight: '700', color: COLORS.blue },
    codeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: t.border },
    codeText: { flex: 1, fontSize: 12, color: t.text, fontFamily: 'monospace' },
    codeStatus: { fontSize: 11, fontWeight: '700' },
    periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    periodBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
    periodBtnActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
    periodBtnText: { fontSize: 12, fontWeight: '700', color: t.textSec },
    periodBtnTextActive: { color: COLORS.yellow },

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

    // Motorista cards
    motCard: { padding: 14, marginBottom: 10 },
    motHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    motName: { fontSize: 15, fontWeight: '800', color: t.text, flex: 1 },
    motMeta: { fontSize: 12, color: t.textSec, marginBottom: 10 },
    motAlertBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: COLORS.red + '18', borderRadius: 10,
      padding: 12, marginBottom: 10,
    },
    motAlertIcon: { fontSize: 22 },
    motAlertTitle: { fontSize: 14, fontWeight: '800', color: COLORS.red },
    motAlertSub: { fontSize: 12, color: COLORS.red, marginTop: 1 },
    motOkBox: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: COLORS.green + '18', borderRadius: 10,
      padding: 12, marginBottom: 10,
    },
    motOkTitle: { fontSize: 14, fontWeight: '800', color: COLORS.green },
    faltandoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: t.border },
    faltandoCode: { flex: 1, fontSize: 12, color: t.text, fontFamily: 'monospace', fontWeight: '600' },
    faltandoAgencia: { fontSize: 11, color: t.textSec },
    faltandoDate: { fontSize: 10, color: t.textTer, marginTop: 1 },

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
  const [tab, setTab] = useState<'expedicoes' | 'agencias' | 'motoristas' | 'busca' | 'exportar'>('expedicoes');

  // Export tab state
  const [exportDateFrom, setExportDateFrom] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  );
  const [exportDateTo, setExportDateTo] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  );
  const [exporting, setExporting] = useState(false);

  // Expedições tab state
  const [expedicoes, setExpedicoes] = useState<Expedicao[]>([]);
  const [loadingExp, setLoadingExp] = useState(false);
  const [expLoaded, setExpLoaded] = useState(false);

  // Motoristas tab state
  const [motoristas, setMotoristas] = useState<MotoristaData[]>([]);
  const [loadingMotoristas, setLoadingMotoristas] = useState(false);
  const [expandedMotoristas, setExpandedMotoristas] = useState<Set<string>>(new Set());
  const [motPeriod, setMotPeriod] = useState(7);

  // Agências tab state
  const [agencias, setAgencias] = useState<AgenciaData[]>([]);
  const [loadingAgencias, setLoadingAgencias] = useState(false);
  const [expandedAgencias, setExpandedAgencias] = useState<Set<string>>(new Set());
  const [agenciasPeriod, setAgenciasPeriod] = useState(7);

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

  // ─── Motoristas ──────────────────────────────────────────────────
  async function loadMotoristas(days = motPeriod) {
    setLoadingMotoristas(true);
    setExpandedMotoristas(new Set());
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Fetch expeditions in the period
      const { data: exps } = await supabase
        .from('pacotes_expedicoes')
        .select('id, nome_motorista, cpf_motorista, total_pacotes')
        .gte('created_at', since);

      if (!exps || exps.length === 0) { setMotoristas([]); return; }

      const expIds = exps.map((e: any) => e.id);

      // Get all packages in those expeditions
      const { data: pkgs } = await supabase
        .from('pacotes_inventario')
        .select('codigo, expedicao_id, expedited_at, nodo_id, nodos(nome)')
        .in('expedicao_id', expIds)
        .eq('status', 'expedited');

      if (!pkgs || pkgs.length === 0) { setMotoristas([]); return; }

      const codes = pkgs.map((p: any) => p.codigo);
      const { data: received } = await supabase
        .from('svc_recebimentos_pacotes')
        .select('codigo')
        .in('codigo', codes);
      const receivedSet = new Set((received || []).map((r: any) => r.codigo as string));

      // Map expedicao_id → motorista info
      const expMap = new Map((exps as any[]).map((e) => [e.id, e]));

      // Group by motorista key (cpf if available, else nome)
      const motMap = new Map<string, MotoristaData>();
      for (const p of pkgs as any[]) {
        const exp = expMap.get(p.expedicao_id);
        if (!exp) continue;
        const chave = exp.cpf_motorista || exp.nome_motorista || 'desconhecido';
        if (!motMap.has(chave)) {
          motMap.set(chave, {
            chave,
            nome: exp.nome_motorista || 'Motorista desconhecido',
            cpf: exp.cpf_motorista || null,
            total_expedicoes: 0,
            total_pego: 0,
            total_entregue: 0,
            total_faltando: 0,
            faltando: [],
          });
        }
        const mot = motMap.get(chave)!;
        mot.total_pego++;
        if (receivedSet.has(p.codigo)) {
          mot.total_entregue++;
        } else {
          mot.total_faltando++;
          mot.faltando.push({
            codigo: p.codigo,
            nodo_nome: p.nodos?.nome || '—',
            expedited_at: p.expedited_at,
          });
        }
      }

      // Count expeditions per motorista
      for (const exp of exps as any[]) {
        const chave = exp.cpf_motorista || exp.nome_motorista || 'desconhecido';
        if (motMap.has(chave)) motMap.get(chave)!.total_expedicoes++;
      }

      setMotoristas(
        Array.from(motMap.values()).sort((a, b) => b.total_faltando - a.total_faltando)
      );
    } finally {
      setLoadingMotoristas(false);
    }
  }

  function toggleMotorista(chave: string) {
    setExpandedMotoristas((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave); else next.add(chave);
      return next;
    });
  }

  function downloadMotoristaCSV(mot: MotoristaData) {
    const header = 'Código,Agência,Status,Data Expedição (BRT)';
    const rows = mot.faltando.map((p) => [
      p.codigo,
      `"${p.nodo_nome}"`,
      'Não entregue no SVC',
      p.expedited_at ? formatDateTimeBRT(p.expedited_at) : '',
    ].join(','));
    const csv = '﻿' + [header, ...rows].join('\n');
    const filename = `faltando_${mot.nome.replace(/\s+/g, '_')}.csv`;
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = (document as any).createElement('a');
      a.href = url; a.download = filename;
      (document as any).body.appendChild(a);
      a.click();
      (document as any).body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // ─── Agências ────────────────────────────────────────────────────
  async function loadAgencias(days = agenciasPeriod) {
    setLoadingAgencias(true);
    setExpandedAgencias(new Set());
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data: pkgs } = await supabase
        .from('pacotes_inventario')
        .select('codigo, nodo_id, expedited_at, nodos(nome)')
        .eq('status', 'expedited')
        .gte('expedited_at', since)
        .order('expedited_at', { ascending: false });

      if (!pkgs || pkgs.length === 0) {
        setAgencias([]);
        return;
      }

      const codes = pkgs.map((p: any) => p.codigo);
      const { data: received } = await supabase
        .from('svc_recebimentos_pacotes')
        .select('codigo, created_at')
        .in('codigo', codes);
      const receivedMap = new Map((received || []).map((r: any) => [r.codigo, r.created_at as string]));

      const agMap = new Map<string, AgenciaData>();
      for (const p of pkgs as any[]) {
        if (!agMap.has(p.nodo_id)) {
          agMap.set(p.nodo_id, {
            nodo_id: p.nodo_id,
            nodo_nome: p.nodos?.nome || p.nodo_id,
            total_enviados: 0, total_recebidos: 0, total_pendentes: 0,
            pacotes: [],
          });
        }
        const ag = agMap.get(p.nodo_id)!;
        const recAt = receivedMap.get(p.codigo) || null;
        ag.total_enviados++;
        if (recAt) ag.total_recebidos++; else ag.total_pendentes++;
        ag.pacotes.push({ codigo: p.codigo, expedited_at: p.expedited_at, recebido_at: recAt });
      }

      setAgencias(Array.from(agMap.values()).sort((a, b) => b.total_pendentes - a.total_pendentes));
    } finally {
      setLoadingAgencias(false);
    }
  }

  function toggleAgencia(nodoId: string) {
    setExpandedAgencias((prev) => {
      const next = new Set(prev);
      if (next.has(nodoId)) next.delete(nodoId); else next.add(nodoId);
      return next;
    });
  }

  function downloadAgenciaCSV(ag: AgenciaData) {
    const header = 'Código,Status,Data Expedição (BRT),Data Recebimento SVC (BRT)';
    const rows = ag.pacotes.map((p) => [
      p.codigo,
      p.recebido_at ? 'Recebido SVC' : 'Pendente',
      p.expedited_at ? formatDateTimeBRT(p.expedited_at) : '',
      p.recebido_at ? formatDateTimeBRT(p.recebido_at) : '',
    ].join(','));
    const csv = '﻿' + [header, ...rows].join('\n');
    const filename = `agencia_${ag.nodo_nome.replace(/\s+/g, '_')}_${agenciasPeriod}d.csv`;
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = (document as any).createElement('a');
      a.href = url; a.download = filename;
      (document as any).body.appendChild(a);
      a.click();
      (document as any).body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  // ─── CSV Export ─────────────────────────────────────────────────
  async function doExport() {
    setExporting(true);
    try {
      const start = new Date(`${exportDateFrom}T03:00:00.000Z`);
      const end = new Date(`${exportDateTo}T03:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1); // include full last day

      const { data: inventory } = await supabase
        .from('pacotes_inventario')
        .select('codigo, status, inventoried_at, expedited_at, nodo_id, nodos(nome)')
        .gte('inventoried_at', start.toISOString())
        .lt('inventoried_at', end.toISOString())
        .order('inventoried_at', { ascending: true });

      if (!inventory || inventory.length === 0) {
        Alert.alert('Sem dados', 'Nenhum registro encontrado para o período selecionado.');
        return;
      }

      const codes = inventory.map((p: any) => p.codigo);
      const { data: received } = await supabase
        .from('svc_recebimentos_pacotes')
        .select('codigo, created_at')
        .in('codigo', codes);
      const receivedMap = new Map((received || []).map((r: any) => [r.codigo, r.created_at]));

      const header = 'Código,Agência,Status,Data Inventário (BRT),Data Expedição (BRT),Data Recebimento SVC (BRT)';
      const rows = inventory.map((p: any) => {
        const nomeNodo = (p as any).nodos?.nome || p.nodo_id;
        const recAt = receivedMap.get(p.codigo);
        const statusLabel = recAt ? 'Recebido SVC' : p.status === 'expedited' ? 'Expedido' : 'Inventariado';
        return [
          p.codigo,
          `"${nomeNodo}"`,
          statusLabel,
          p.inventoried_at ? formatDateTimeBRT(p.inventoried_at) : '',
          p.expedited_at ? formatDateTimeBRT(p.expedited_at) : '',
          recAt ? formatDateTimeBRT(recAt) : '',
        ].join(',');
      });

      const csv = '﻿' + [header, ...rows].join('\n');
      const filename = `inventario_${exportDateFrom}${exportDateFrom !== exportDateTo ? `_ate_${exportDateTo}` : ''}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = (document as any).createElement('a');
        a.href = url;
        a.download = filename;
        (document as any).body.appendChild(a);
        a.click();
        (document as any).body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('CSV', `${inventory.length} registros. Use a versão web para fazer o download do arquivo.`);
      }
    } finally {
      setExporting(false);
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
        {/* Tabs — 2×2 grid */}
        <View style={styles.tabRow}>
          {([
            ['expedicoes',  '📦 Expedições'],
            ['agencias',    '🏪 Por Agência'],
            ['motoristas',  '🚛 Motoristas'],
            ['busca',       '🔍 Buscar'],
            ['exportar',    '📥 Exportar CSV'],
          ] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => {
                setTab(key);
                if (key === 'agencias' && agencias.length === 0 && !loadingAgencias) loadAgencias();
                if (key === 'motoristas' && motoristas.length === 0 && !loadingMotoristas) loadMotoristas();
              }}
            >
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
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

        {/* ── AGÊNCIAS TAB ── */}
        {tab === 'agencias' && (
          <>
            {/* Period selector */}
            <View style={styles.periodRow}>
              {([7, 15, 30] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.periodBtn, agenciasPeriod === d && styles.periodBtnActive]}
                  onPress={() => { setAgenciasPeriod(d); loadAgencias(d); }}
                >
                  <Text style={[styles.periodBtnText, agenciasPeriod === d && styles.periodBtnTextActive]}>
                    {d} dias
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.periodBtn, { marginLeft: 'auto' as any }]}
                onPress={() => loadAgencias()}
              >
                <Text style={styles.periodBtnText}>↺ Atualizar</Text>
              </TouchableOpacity>
            </View>

            {loadingAgencias && <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />}

            {!loadingAgencias && agencias.length === 0 && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>Nenhuma expedição encontrada no período.</Text>
              </Card>
            )}

            {agencias.map((ag) => {
              const expanded = expandedAgencias.has(ag.nodo_id);
              return (
                <Card key={ag.nodo_id} style={styles.agCard}>
                  {/* Header */}
                  <View style={styles.agHeader}>
                    <Text style={styles.agName}>{ag.nodo_nome}</Text>
                    {ag.total_pendentes > 0
                      ? <Badge label={`${ag.total_pendentes} pendente${ag.total_pendentes !== 1 ? 's' : ''}`} color={COLORS.red} />
                      : <Badge label="✓ Completo" color={COLORS.green} />
                    }
                  </View>

                  {/* Stats */}
                  <View style={styles.statsRow}>
                    <View style={[styles.statBox, { backgroundColor: COLORS.blue + '22' }]}>
                      <Text style={[styles.statVal, { color: COLORS.blue }]}>{ag.total_enviados}</Text>
                      <Text style={[styles.statLbl, { color: COLORS.blue }]}>Enviados</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: COLORS.green + '22' }]}>
                      <Text style={[styles.statVal, { color: COLORS.green }]}>{ag.total_recebidos}</Text>
                      <Text style={[styles.statLbl, { color: COLORS.green }]}>Recebidos</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: ag.total_pendentes > 0 ? COLORS.red + '22' : COLORS.green + '11' }]}>
                      <Text style={[styles.statVal, { color: ag.total_pendentes > 0 ? COLORS.red : COLORS.green }]}>{ag.total_pendentes}</Text>
                      <Text style={[styles.statLbl, { color: ag.total_pendentes > 0 ? COLORS.red : COLORS.green }]}>Pendentes</Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.agActions}>
                    <TouchableOpacity style={styles.agExpandBtn} onPress={() => toggleAgencia(ag.nodo_id)}>
                      <Text style={{ fontSize: 14 }}>{expanded ? '▲' : '▼'}</Text>
                      <Text style={styles.agExpandText}>
                        {expanded ? 'Fechar' : `Ver ${ag.pacotes.length} IDs`}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.agDownloadBtn} onPress={() => downloadAgenciaCSV(ag)}>
                      <Text style={{ fontSize: 14 }}>📥</Text>
                      <Text style={styles.agDownloadText}>Baixar CSV</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Expanded package list */}
                  {expanded && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.sectionLabel, { marginTop: 0 }]}>
                        TODOS OS IDs ({ag.pacotes.length})
                      </Text>
                      {ag.pacotes.map((p, i) => (
                        <View key={i} style={styles.codeRow}>
                          <Text style={styles.codeText}>{p.codigo}</Text>
                          {p.recebido_at
                            ? <Text style={[styles.codeStatus, { color: COLORS.green }]}>✅ Recebido</Text>
                            : <Text style={[styles.codeStatus, { color: COLORS.red }]}>⏳ Pendente</Text>
                          }
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {/* ── MOTORISTAS TAB ── */}
        {tab === 'motoristas' && (
          <>
            <View style={styles.periodRow}>
              {([7, 15, 30] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.periodBtn, motPeriod === d && styles.periodBtnActive]}
                  onPress={() => { setMotPeriod(d); loadMotoristas(d); }}
                >
                  <Text style={[styles.periodBtnText, motPeriod === d && styles.periodBtnTextActive]}>
                    {d} dias
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.periodBtn, { marginLeft: 'auto' as any }]}
                onPress={() => loadMotoristas()}
              >
                <Text style={styles.periodBtnText}>↺ Atualizar</Text>
              </TouchableOpacity>
            </View>

            {loadingMotoristas && <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />}

            {!loadingMotoristas && motoristas.length === 0 && (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>Nenhuma expedição no período.</Text>
              </Card>
            )}

            {motoristas.map((mot) => {
              const expanded = expandedMotoristas.has(mot.chave);
              const temFaltando = mot.total_faltando > 0;
              return (
                <Card key={mot.chave} style={styles.motCard}>
                  <View style={styles.motHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.motName}>{mot.nome}</Text>
                      {mot.cpf && (
                        <Text style={styles.motMeta}>
                          CPF: {mot.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                          {'  ·  '}{mot.total_expedicoes} expedição{mot.total_expedicoes !== 1 ? 'ões' : ''}
                        </Text>
                      )}
                    </View>
                    {temFaltando
                      ? <Badge label={`${mot.total_faltando} faltando`} color={COLORS.red} />
                      : <Badge label="✓ Tudo entregue" color={COLORS.green} />
                    }
                  </View>

                  {/* Discrepancy summary */}
                  {temFaltando ? (
                    <View style={styles.motAlertBox}>
                      <Text style={styles.motAlertIcon}>⚠️</Text>
                      <View>
                        <Text style={styles.motAlertTitle}>
                          Pegou {mot.total_pego} · Entregou {mot.total_entregue} · Faltam {mot.total_faltando}
                        </Text>
                        <Text style={styles.motAlertSub}>
                          Os {mot.total_faltando} pacote{mot.total_faltando !== 1 ? 's' : ''} abaixo não chegaram no SVC — voltam como pendência das agências.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.motOkBox}>
                      <Text style={{ fontSize: 18 }}>✅</Text>
                      <Text style={styles.motOkTitle}>
                        Pegou {mot.total_pego} · Entregou {mot.total_entregue} — sem divergência
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  {temFaltando && (
                    <View style={styles.agActions}>
                      <TouchableOpacity style={styles.agExpandBtn} onPress={() => toggleMotorista(mot.chave)}>
                        <Text style={{ fontSize: 14 }}>{expanded ? '▲' : '▼'}</Text>
                        <Text style={styles.agExpandText}>
                          {expanded ? 'Fechar' : `Ver ${mot.total_faltando} IDs faltando`}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.agDownloadBtn} onPress={() => downloadMotoristaCSV(mot)}>
                        <Text style={{ fontSize: 14 }}>📥</Text>
                        <Text style={styles.agDownloadText}>Baixar CSV</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Expanded missing list */}
                  {expanded && temFaltando && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.sectionLabel, { marginTop: 0 }]}>
                        PACOTES NÃO ENTREGUES ({mot.faltando.length})
                      </Text>
                      {mot.faltando.map((p, i) => (
                        <View key={i} style={styles.faltandoItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.faltandoCode}>{p.codigo}</Text>
                            <Text style={styles.faltandoAgencia}>📍 {p.nodo_nome}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.codeStatus, { color: COLORS.red }]}>⏳ Pendente</Text>
                            {p.expedited_at && (
                              <Text style={styles.faltandoDate}>{formatDateTimeBRT(p.expedited_at)}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
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
        {/* ── EXPORTAR TAB ── */}
        {tab === 'exportar' && (
          <>
            <Text style={styles.sectionLabel}>EXPORTAR INVENTÁRIO (CSV)</Text>
            <Card style={{ padding: 16, marginBottom: 14 }}>
              <Text style={{ fontSize: 14, color: theme.text, fontWeight: '700', marginBottom: 6 }}>
                Data inicial
              </Text>
              {Platform.OS === 'web'
                ? React.createElement('input', {
                    type: 'date',
                    value: exportDateFrom,
                    onChange: (e: any) => setExportDateFrom(e.target.value),
                    style: {
                      width: '100%', padding: 12, fontSize: 15, borderRadius: 10,
                      border: `1.5px solid ${theme.inputBorder}`,
                      backgroundColor: theme.input, color: theme.text, marginBottom: 14,
                    },
                  })
                : <TextInput
                    style={[styles.searchInput, { marginBottom: 14 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textTer}
                    value={exportDateFrom}
                    onChangeText={setExportDateFrom}
                    keyboardType="numbers-and-punctuation"
                  />
              }

              <Text style={{ fontSize: 14, color: theme.text, fontWeight: '700', marginBottom: 6 }}>
                Data final
              </Text>
              {Platform.OS === 'web'
                ? React.createElement('input', {
                    type: 'date',
                    value: exportDateTo,
                    onChange: (e: any) => setExportDateTo(e.target.value),
                    style: {
                      width: '100%', padding: 12, fontSize: 15, borderRadius: 10,
                      border: `1.5px solid ${theme.inputBorder}`,
                      backgroundColor: theme.input, color: theme.text, marginBottom: 14,
                    },
                  })
                : <TextInput
                    style={[styles.searchInput, { marginBottom: 14 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textTer}
                    value={exportDateTo}
                    onChangeText={setExportDateTo}
                    keyboardType="numbers-and-punctuation"
                  />
              }

              <Button
                label={exporting ? 'Gerando...' : '📥 Baixar CSV'}
                onPress={doExport}
                loading={exporting}
              />
            </Card>

            <Card style={[styles.emptyCard, { paddingVertical: 20 }]}>
              <Text style={{ color: theme.textSec, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                O CSV inclui todos os pacotes inventariados no período, com status de expedição e recebimento no SVC (horários em BRT, UTC-3).
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
