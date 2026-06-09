import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { importNodosFromSheets } from '../../src/lib/sheets';
import { COLORS, Button, Card, Badge } from '../../src/components/ui';

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

export default function NovosNodosScreen() {
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState<{ added: number; skipped: number } | null>(null);

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

  async function handleImport() {
    Alert.alert(
      'Sincronizar NODOS',
      'Isso vai buscar os NODOS da planilha Google Sheets e importar os novos. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sincronizar',
          onPress: async () => {
            setImporting(true);
            setStats(null);
            try {
              const result = await importNodosFromSheets((msg) => setProgress(msg));
              setStats({ added: result.added, skipped: result.skipped });
              if (result.errors.length > 0) {
                Alert.alert(
                  'Importação concluída com erros',
                  `${result.added} adicionados, ${result.skipped} já existentes.\n\nErros:\n${result.errors.slice(0, 5).join('\n')}`
                );
              } else {
                Alert.alert(
                  '✅ Sincronização Concluída!',
                  `${result.added} novo${result.added !== 1 ? 's' : ''} NODO${result.added !== 1 ? 's' : ''} importado${result.added !== 1 ? 's' : ''}.\n${result.skipped} já existiam.`
                );
              }
              await loadNodos();
            } catch (e: any) {
              Alert.alert('Erro', e.message || 'Não foi possível acessar a planilha.');
            } finally {
              setImporting(false);
              setProgress('');
            }
          },
        },
      ]
    );
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    await supabase.from('nodos').update({ ativo: !currentActive }).eq('id', id);
    await loadNodos();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Info card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>⚙️ Gerenciamento de NODOS</Text>
          <Text style={styles.infoText}>
            Sincronize os NODOS da planilha Google Sheets (aba "BASE - Nodos").
            Novos NODOS serão geocodificados automaticamente pelo endereço.
          </Text>
        </Card>

        {/* Import button */}
        <Button
          label={importing ? 'Importando...' : '🔄  Sincronizar com Planilha'}
          onPress={handleImport}
          loading={importing}
          style={styles.importBtn}
        />

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
            <View style={[styles.statBox, { backgroundColor: COLORS.gray + '22', borderColor: COLORS.gray }]}>
              <Text style={[styles.statVal, { color: COLORS.gray }]}>{stats.skipped}</Text>
              <Text style={styles.statLbl}>Já existiam</Text>
            </View>
          </View>
        )}

        {/* NODOS list */}
        <Text style={styles.sectionLabel}>
          NODOS CADASTRADOS ({loading ? '...' : nodos.length})
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.yellow} />
        ) : nodos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Nenhum NODO cadastrado ainda.{'\n'}Use o botão acima para importar da planilha.
            </Text>
          </Card>
        ) : (
          nodos.map((nodo) => (
            <Card key={nodo.id} style={styles.nodoCard}>
              <View style={styles.nodoRow}>
                <View style={styles.nodoInfo}>
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
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  container: { padding: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: '#FFFEF0',
    borderWidth: 1.5,
    borderColor: COLORS.yellow,
    marginBottom: 8,
  },
  infoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.black, marginBottom: 8 },
  infoText: { fontSize: 13, color: COLORS.gray, lineHeight: 19 },
  importBtn: { marginBottom: 8 },
  progressCard: {
    backgroundColor: '#1A1A1A',
    marginBottom: 12,
    alignItems: 'center',
  },
  progressText: { color: COLORS.yellow, fontSize: 13, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: {
    flex: 1, borderWidth: 1.5, borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  statVal: { fontSize: 28, fontWeight: '900' },
  statLbl: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.gray,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 10,
  },
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyText: { color: COLORS.gray, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  nodoCard: { padding: 14 },
  nodoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nodoInfo: { flex: 1 },
  nodoNome: { fontSize: 15, fontWeight: '700', color: COLORS.black, marginBottom: 2 },
  nodoCodigo: { fontSize: 12, color: COLORS.gray, marginBottom: 4 },
  nodoCidade: { fontSize: 13, color: COLORS.gray, marginBottom: 6 },
});
