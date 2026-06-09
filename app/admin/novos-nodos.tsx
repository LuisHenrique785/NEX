import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { importNodosFromSheets, importNodosFromCSV } from '../../src/lib/sheets';
import { COLORS, Button, Card, Badge } from '../../src/components/ui';
import { useTheme } from '../../src/lib/theme';

interface Nodo {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  estado: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { padding: 20, paddingBottom: 40 },
    infoCard: {
      backgroundColor: '#FFFEF0',
      borderWidth: 1.5,
      borderColor: COLORS.yellow,
      marginBottom: 16,
    },
    infoTitle: { fontSize: 16, fontWeight: '800', color: theme.text, marginBottom: 8 },
    infoText: { fontSize: 13, color: theme.textSec, lineHeight: 20 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSec,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    hint: { fontSize: 12, color: theme.textSec, marginTop: 6, marginBottom: 4, lineHeight: 18 },
    uploadBtn: {
      backgroundColor: COLORS.black,
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
      marginBottom: 12,
      position: 'relative',
    },
    uploadBtnDisabled: { opacity: 0.5 },
    uploadIcon: { fontSize: 32, marginRight: 16 },
    uploadText: { flex: 1 },
    uploadTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
    uploadSubtitle: { color: theme.textTer, fontSize: 13, marginTop: 3 },
    howToCard: {
      backgroundColor: '#F0F8FF',
      borderWidth: 1,
      borderColor: COLORS.blue + '44',
      marginBottom: 8,
    },
    howToTitle: { fontSize: 13, fontWeight: '800', color: theme.text, marginBottom: 10 },
    howToStep: { fontSize: 13, color: theme.textSec, lineHeight: 22 },
    bold: { fontWeight: '700', color: theme.text },
    progressCard: { backgroundColor: '#1A1A1A', marginBottom: 12, alignItems: 'center' },
    progressText: { color: COLORS.yellow, fontSize: 13, textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statBox: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 16, alignItems: 'center' },
    statVal: { fontSize: 28, fontWeight: '900' },
    statLbl: { fontSize: 12, color: theme.textSec, marginTop: 2 },
    emptyCard: { alignItems: 'center', paddingVertical: 28 },
    emptyText: { color: theme.textSec, fontSize: 14, textAlign: 'center', lineHeight: 22 },
    nodoCard: { padding: 14, marginBottom: 8 },
    nodoNome: { fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 2 },
    nodoCodigo: { fontSize: 12, color: theme.textSec, marginBottom: 4 },
    nodoCidade: { fontSize: 13, color: theme.textSec, marginBottom: 6 },
  });
}

export default function NovosNodosScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState<{ added: number; updated: number; skipped: number } | null>(null);

  useEffect(() => {
    loadNodos();
  }, []);

  async function loadNodos() {
    setLoading(true);
    const { data } = await supabase
      .from('nodos')
      .select('id, codigo, nome, cidade, estado, lat, lng, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    setNodos(data || []);
    setLoading(false);
  }

  async function runImport(fn: () => Promise<{ added: number; skipped: number; errors: string[] }>) {
    setImporting(true);
    setStats(null);
    try {
      const result = await fn();
      setStats({ added: result.added, updated: result.updated, skipped: result.skipped });
      const parts = [];
      if (result.added > 0) parts.push(`${result.added} novo${result.added !== 1 ? 's' : ''}`);
      if (result.updated > 0) parts.push(`${result.updated} corrigido${result.updated !== 1 ? 's' : ''}`);
      if (result.skipped > 0) parts.push(`${result.skipped} já ok`);
      const summary = parts.join(' · ');
      const msg =
        result.errors.length > 0
          ? `${summary}\n\nErros:\n${result.errors.slice(0, 5).join('\n')}`
          : summary || 'Nenhuma alteração necessária.';
      Alert.alert(result.errors.length > 0 ? 'Concluído com erros' : '✅ Concluído!', msg);
      await loadNodos();
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha na importação.');
    } finally {
      setImporting(false);
      setProgress('');
    }
  }

  function handleSyncSheets() {
    Alert.alert(
      'Sincronizar com Google Sheets',
      'Vai buscar os NODOS da planilha online. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sincronizar', onPress: () => runImport(() => importNodosFromSheets((msg) => setProgress(msg))) },
      ]
    );
  }

  function handleCSVFile(e: any) {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      const text = ev.target?.result as string;
      if (text) runImport(() => importNodosFromCSV(text, (msg) => setProgress(msg)));
    };
    reader.readAsText(file, 'UTF-8');
    // Reset so same file can be re-selected
    e.target.value = '';
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Info */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>⚙️ Gerenciamento de NODOS</Text>
          <Text style={styles.infoText}>
            Importe os NODOS da planilha "Controle NODOS — BASE - Nodos".
            {'\n\n'}Coluna C = Código · Coluna E = Nome · Coluna F = Endereço
          </Text>
        </Card>

        {/* Opção 1: Sincronizar online */}
        <Text style={styles.sectionLabel}>OPÇÃO 1 — PLANILHA ONLINE</Text>
        <Button
          label={importing ? 'Importando...' : '🔄  Sincronizar com Google Sheets'}
          onPress={handleSyncSheets}
          loading={importing}
        />
        <Text style={styles.hint}>
          Tenta buscar diretamente da planilha. Pode falhar por restrição de acesso.
        </Text>

        {/* Opção 2: Upload CSV */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>OPÇÃO 2 — UPLOAD DE CSV (RECOMENDADO)</Text>

        {/* On web: overlay invisible <input type="file"> directly on the button.
            This is required for iOS Safari and Chrome mobile — programmatic .click()
            on a dynamically-created input is blocked by those browsers. */}
        <View style={[styles.uploadBtn, importing && styles.uploadBtnDisabled]}>
          <Text style={styles.uploadIcon}>📂</Text>
          <View style={styles.uploadText}>
            <Text style={styles.uploadTitle}>Selecionar arquivo CSV</Text>
            <Text style={styles.uploadSubtitle}>Exporte da planilha e faça upload aqui</Text>
          </View>
          {Platform.OS === 'web' && !importing && React.createElement('input', {
            type: 'file',
            accept: '.csv,text/csv',
            style: {
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              opacity: 0,
              cursor: 'pointer',
              width: '100%',
              height: '100%',
            },
            onChange: handleCSVFile,
          })}
        </View>

        <Card style={styles.howToCard}>
          <Text style={styles.howToTitle}>Como exportar o CSV da planilha:</Text>
          <Text style={styles.howToStep}>1. Abra a planilha Google Sheets (aba "BASE - Nodos")</Text>
          <Text style={styles.howToStep}>2. Clique em <Text style={styles.bold}>Arquivo → Fazer download → CSV</Text></Text>
          <Text style={styles.howToStep}>3. Salve o arquivo no celular/computador</Text>
          <Text style={styles.howToStep}>4. Toque no botão acima e selecione o arquivo</Text>
        </Card>

        {/* Progress */}
        {(importing || progress) && (
          <Card style={styles.progressCard}>
            {importing && <ActivityIndicator color={COLORS.yellow} style={{ marginBottom: 8 }} />}
            <Text style={styles.progressText}>{progress || 'Iniciando...'}</Text>
          </Card>
        )}

        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: COLORS.green + '22', borderColor: COLORS.green }]}>
              <Text style={[styles.statVal, { color: COLORS.green }]}>{stats.added}</Text>
              <Text style={styles.statLbl}>Novos</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: COLORS.blue + '22', borderColor: COLORS.blue }]}>
              <Text style={[styles.statVal, { color: COLORS.blue }]}>{stats.updated}</Text>
              <Text style={styles.statLbl}>Corrigidos</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: COLORS.gray + '22', borderColor: COLORS.gray }]}>
              <Text style={[styles.statVal, { color: COLORS.gray }]}>{stats.skipped}</Text>
              <Text style={styles.statLbl}>Já ok</Text>
            </View>
          </View>
        )}

        {/* NODOS list */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
          NODOS CADASTRADOS ({loading ? '...' : nodos.length})
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.yellow} />
        ) : nodos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhum NODO cadastrado ainda.{'\n'}Use uma das opções acima para importar.
            </Text>
          </Card>
        ) : (
          nodos.map((nodo) => (
            <Card key={nodo.id} style={styles.nodoCard}>
              <Text style={styles.nodoNome}>{nodo.nome}</Text>
              {nodo.codigo && <Text style={styles.nodoCodigo}>{nodo.codigo}</Text>}
              {nodo.cidade && (
                <Text style={styles.nodoCidade}>
                  📍 {nodo.cidade}{nodo.estado ? `, ${nodo.estado}` : ''}
                </Text>
              )}
              {nodo.lat ? (
                <Badge label="Geocodificado ✓" color={COLORS.green} />
              ) : (
                <Badge label="Sem coordenadas" color={COLORS.orange} />
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
