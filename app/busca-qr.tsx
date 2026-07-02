import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView,
  Alert, ActivityIndicator, StyleSheet, Modal, useWindowDimensions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { supabaseAuditoria } from '../src/lib/supabase-auditoria';
import { useTheme } from '../src/lib/theme';
import { COLORS, Card } from '../src/components/ui';

// ─── Configuração da tabela de auditoria ───────────────────────────────────
const AUDITORIA_TABLE = 'base';
const SEARCH_COLUMN = 'saca_id';
const SVC_FILTER = 'SMG3';
// ──────────────────────────────────────────────────────────────────────────

interface SacaResult {
  id: number;
  saca_id: string;
  qr_mae: string;
  rota: string | null;
  svc: string | null;
}

export default function BuscaQRScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SacaResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedSaca, setSelectedSaca] = useState<SacaResult | null>(null);
  const scanCooldown = useRef(false);

  const qrSize = Math.min(width - 80, 300);

  async function handleSearch(term?: string) {
    const t = (term ?? search).trim();
    if (!t) {
      Alert.alert('Atenção', 'Digite ou escaneie um código para buscar.');
      return;
    }
    setLoading(true);
    setSearched(true);
    setResults([]);
    setSelectedSaca(null);

    const { data, error } = await supabaseAuditoria
      .from(AUDITORIA_TABLE)
      .select('id, saca_id, qr_mae, rota, svc')
      .eq('svc', SVC_FILTER)
      .ilike(SEARCH_COLUMN, `%${t}%`)
      .limit(20);

    if (error) {
      Alert.alert('Erro na busca', 'Não foi possível conectar ao banco de auditoria.');
    } else {
      const list = data || [];
      setResults(list);
      if (list.length === 1) setSelectedSaca(list[0]);
    }
    setLoading(false);
  }

  async function handleScan(value: string) {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setTimeout(() => { scanCooldown.current = false; }, 2000);

    const cleaned = value.replace(/[^0-9a-zA-Z\-_]/g, '');
    setScanning(false);
    setSearch(cleaned);
    await handleSearch(cleaned);
  }

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permissão necessária', 'Habilite o acesso à câmera nas configurações.');
        return;
      }
    }
    setScanning(true);
  }

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20,
      paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    backBtn: { padding: 4, marginRight: 12 },
    backText: { fontSize: 24, color: theme.text },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.text, flex: 1 },
    searchRow: { flexDirection: 'row', gap: 10, padding: 20, paddingBottom: 10 },
    input: {
      flex: 1, backgroundColor: theme.input, borderRadius: 12,
      borderWidth: 1.5, borderColor: theme.inputBorder, paddingHorizontal: 14,
      paddingVertical: 12, fontSize: 15, color: theme.text,
    },
    scanBtn: {
      width: 46, height: 46, borderRadius: 12, backgroundColor: theme.surface,
      borderWidth: 1.5, borderColor: theme.border, alignItems: 'center', justifyContent: 'center',
    },
    searchBtn: {
      backgroundColor: COLORS.yellow, borderRadius: 12,
      paddingHorizontal: 18, height: 46, alignItems: 'center', justifyContent: 'center',
    },
    searchBtnText: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
    resultCard: { padding: 14, marginBottom: 10, marginHorizontal: 20 },
    resultRow: { flexDirection: 'row', alignItems: 'center' },
    resultLabel: { fontSize: 16, fontWeight: '700', color: theme.text, flex: 1 },
    resultSub: { fontSize: 12, color: theme.textSec, marginTop: 2 },
    arrowText: { fontSize: 22, color: theme.textTer },
    emptyCard: { margin: 20, alignItems: 'center', paddingVertical: 32 },
    emptyText: { fontSize: 15, color: theme.textSec, textAlign: 'center' },
    // Modal QR
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    modalCard: {
      backgroundColor: theme.surface, borderRadius: 24, padding: 28,
      width: '100%', maxWidth: 420, alignItems: 'center',
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 4 },
    modalSub: { fontSize: 13, color: theme.textSec, marginBottom: 20, textAlign: 'center' },
    qrWrapper: {
      padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
    },
    qrValue: {
      marginTop: 16, fontSize: 12, color: theme.textSec, textAlign: 'center',
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    closeBtn: {
      marginTop: 20, paddingVertical: 12, paddingHorizontal: 32,
      backgroundColor: COLORS.yellow, borderRadius: 12,
    },
    closeBtnText: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
    // Scanner
    scannerContainer: { flex: 1, backgroundColor: '#000' },
    scannerOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center', alignItems: 'center',
    },
    scanFrame: {
      width: 260, height: 260, borderWidth: 3, borderColor: COLORS.yellow,
      borderRadius: 16, backgroundColor: 'transparent',
    },
    scanHint: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 20, opacity: 0.85 },
    scanClose: {
      position: 'absolute', top: 48, right: 20,
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    scanCloseText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  });

  // ─── Scanner full screen ───────────────────────────────────────────────
  if (scanning) {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13', 'ean8', 'code39'] }}
          onBarcodeScanned={({ data }) => handleScan(data)}
        />
        <View style={styles.scannerOverlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanHint}>Aponte para o código da saca</Text>
        </View>
        <TouchableOpacity style={styles.scanClose} onPress={() => setScanning(false)}>
          <Text style={styles.scanCloseText}>✕ Fechar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Busca QR Saca Mãe</Text>
        </View>

        {/* Search row */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Digite ou escaneie o código da saca"
            placeholderTextColor={theme.textTer}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.scanBtn} onPress={openScanner} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch()} activeOpacity={0.8}>
            <Text style={styles.searchBtnText}>Buscar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {loading && (
            <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 40 }} size="large" />
          )}

          {!loading && searched && results.length === 0 && (
            <Card style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>🔍</Text>
              <Text style={styles.emptyText}>
                Nenhuma saca encontrada para{'\n'}"{search}"
              </Text>
            </Card>
          )}

          {!loading && results.length > 1 && results.map((saca) => (
            <TouchableOpacity key={saca.id} onPress={() => setSelectedSaca(saca)} activeOpacity={0.8}>
              <Card style={styles.resultCard}>
                <View style={styles.resultRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultLabel}>Saca {saca.saca_id}</Text>
                    <Text style={styles.resultSub}>
                      {saca.rota && saca.rota !== 'EMPTY' ? `Rota: ${saca.rota}` : 'Sem rota'} · {saca.svc}
                    </Text>
                  </View>
                  <Text style={styles.arrowText}>›</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}

          {!loading && !searched && (
            <Card style={[styles.emptyCard, { margin: 20 }]}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text>
              <Text style={[styles.emptyText, { fontWeight: '700', color: theme.text, marginBottom: 6 }]}>
                Consulta de QR Saca Mãe
              </Text>
              <Text style={styles.emptyText}>
                Digite o código da saca ou escaneie o QR code para visualizar o QR da saca mãe.
              </Text>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal QR Code */}
      <Modal
        visible={!!selectedSaca}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSaca(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>QR Saca Mãe</Text>
            {selectedSaca && (
              <>
                <Text style={styles.modalSub}>
                  Saca {selectedSaca.saca_id}
                  {selectedSaca.rota && selectedSaca.rota !== 'EMPTY' ? `  ·  ${selectedSaca.rota}` : ''}
                </Text>
                {selectedSaca.qr_mae ? (
                  <>
                    <View style={styles.qrWrapper}>
                      <QRCode
                        value={selectedSaca.qr_mae}
                        size={qrSize}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                      />
                    </View>
                    <Text style={styles.qrValue} numberOfLines={3}>
                      {selectedSaca.qr_mae}
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: theme.textSec, marginVertical: 20 }}>
                    Campo qr_mae não encontrado neste registro.
                  </Text>
                )}
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedSaca(null)}>
              <Text style={styles.closeBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
