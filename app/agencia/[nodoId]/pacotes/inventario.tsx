import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  TextInput, SafeAreaView, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { COLORS, Button, Card, Badge } from '../../../../src/components/ui';
import { useTheme } from '../../../../src/lib/theme';
import { useDemo } from '../../../../src/lib/demo';
import { WebScanner } from '../../../../src/components/WebScanner';
import { formatTimeBRT, startOfTodayBRT, startOfYesterdayBRT } from '../../../../src/lib/utils';

interface Pacote {
  id: string;
  codigo: string;
  tipo_entrada: 'scanner' | 'manual' | 'foto';
  inventoried_at: string;
  foto_url?: string | null;
}

type Mode = 'menu' | 'scanner' | 'manual' | 'photo';

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    flex: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },
    pendingCard: {
      backgroundColor: theme.isDark ? '#3D2800' : '#FFF3CD',
      borderWidth: 1.5,
      borderColor: COLORS.orange + '66',
      marginBottom: 12,
    },
    pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    pendingTitle: { fontSize: 16, fontWeight: '800', color: theme.isDark ? '#FFC107' : '#856404' },
    pendingSubtitle: { fontSize: 13, color: theme.isDark ? '#FFC107' : '#856404', lineHeight: 18, marginBottom: 8 },
    pendingCode: { fontSize: 13, color: theme.isDark ? '#FFC107' : '#856404', fontFamily: 'monospace', marginBottom: 3 },
    pendingMore: { fontSize: 12, color: theme.isDark ? '#FFC107' : '#856404', fontStyle: 'italic', marginTop: 4 },
    counterCard: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: COLORS.yellow,
      marginBottom: 8,
    },
    counterValue: { fontSize: 48, fontWeight: '900', color: COLORS.black },
    counterLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSec,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 10,
    },
    optionBtn: {
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    optionIcon: { fontSize: 30, marginRight: 16 },
    optionText: { flex: 1 },
    optionTitle: { fontSize: 17, fontWeight: '800' },
    optionSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
    scannedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    scannedIcon: { fontSize: 18, marginRight: 10, width: 28 },
    scannedCode: { flex: 1, fontSize: 13, color: theme.text, fontFamily: 'monospace', fontWeight: '600' },
    scannedTime: { fontSize: 12, color: theme.textSec, marginLeft: 8 },
    manualCard: { alignItems: 'center', marginBottom: 20 },
    manualIcon: { fontSize: 48, marginBottom: 12 },
    manualTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 16 },
    manualInput: {
      width: '100%',
      borderWidth: 2,
      borderColor: COLORS.yellow,
      borderRadius: 12,
      padding: 14,
      fontSize: 18,
      textAlign: 'center',
      color: theme.text,
      fontWeight: '700',
      fontFamily: 'monospace',
      backgroundColor: theme.input,
    },
    photoCard: { marginBottom: 16 },
    photoIcon: { fontSize: 48, marginBottom: 10, textAlign: 'center' },
    photoTitle: { fontSize: 18, fontWeight: '800', color: theme.text, marginBottom: 6, textAlign: 'center' },
    photoSubtitle: { fontSize: 13, color: theme.textSec, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
    photoButtons: { flexDirection: 'row', marginBottom: 16 },
    photoPreviewBox: { alignItems: 'center', marginBottom: 16 },
    photoPreview: { width: '100%', height: 200, borderRadius: 12 },
    photoRemove: { marginTop: 8 },
    photoRemoveText: { color: COLORS.red, fontWeight: '700' },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: theme.input,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.inputBorder,
      padding: 14,
      fontSize: 16,
      color: theme.text,
      fontFamily: 'monospace',
    },
    permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: theme.bg },
    permText: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: theme.text },
  });
}

const scannerStyles = StyleSheet.create({
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 52,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  scanBackText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scanActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flipBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flipBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  flashBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  flashBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  scanCenter: { alignItems: 'center' },
  scanCounter: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  scanCounterText: { color: COLORS.yellow, fontWeight: '800', fontSize: 15 },
  scanFrame: { width: 280, height: 170, position: 'relative' },
  scanCorner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: COLORS.yellow,
    borderWidth: 3,
  },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanBottom: { paddingBottom: 24 },
  scanFeedback: { alignItems: 'center', marginBottom: 8, paddingHorizontal: 16 },
  scanResult: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16 },
  scanResultText: { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  scanHint: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scanHintText: { color: '#ddd', fontSize: 13 },
  scanSaving: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  scanSavingText: { color: '#fff', fontSize: 13 },
  recentList: { backgroundColor: 'rgba(0,0,0,0.75)', padding: 12 },
  recentLabel: { color: '#aaa', fontSize: 11, marginBottom: 6 },
  recentChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  recentChipText: { color: '#fff', fontSize: 12, fontFamily: 'monospace' },
});

export default function InventarioFisicoScreen() {
  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { isDemo } = useDemo();

  const [mode, setMode] = useState<Mode>('menu');
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [pendencias, setPendencias] = useState<Pacote[]>([]);
  const [expPendencias, setExpPendencias] = useState<{ codigo: string; expedited_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [lastScanned, setLastScanned] = useState('');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const scanCooldown = useRef(false);

  const [manualCode, setManualCode] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCode, setPhotoCode] = useState('');

  useEffect(() => {
    navigation.setOptions({
      headerShown: mode !== 'scanner',
      title: 'Inventário Físico',
      headerStyle: { backgroundColor: theme.header },
      headerTintColor: theme.headerText,
      headerTitleStyle: { fontWeight: '800' },
      headerShadowVisible: false,
    });
  }, [mode, theme]);

  useEffect(() => {
    loadPacotes();
  }, [nodoId]);

  async function loadPacotes() {
    setLoading(true);
    const today = startOfTodayBRT();
    const yesterday = startOfYesterdayBRT();

    const { data: todayData } = await supabase
      .from('pacotes_inventario')
      .select('id, codigo, tipo_entrada, inventoried_at, foto_url')
      .eq('nodo_id', nodoId)
      .eq('status', 'inventoried')
      .gte('inventoried_at', today.toISOString())
      .order('inventoried_at', { ascending: false });

    const { data: yestData } = await supabase
      .from('pacotes_inventario')
      .select('id, codigo, tipo_entrada, inventoried_at, foto_url')
      .eq('nodo_id', nodoId)
      .eq('status', 'inventoried')
      .gte('inventoried_at', yesterday.toISOString())
      .lt('inventoried_at', today.toISOString());

    const todayCodes = new Set((todayData || []).map((p) => p.codigo));
    const pendentes = (yestData || []).filter((p) => !todayCodes.has(p.codigo));

    setPacotes(todayData || []);
    setPendencias(pendentes);

    // Expedition pendencies: packages sent by this agency but not yet received at SVC
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expedited } = await supabase
      .from('pacotes_inventario')
      .select('codigo, expedited_at')
      .eq('nodo_id', nodoId)
      .eq('status', 'expedited')
      .gte('expedited_at', sevenDaysAgo)
      .order('expedited_at', { ascending: false });

    if (expedited && expedited.length > 0) {
      const codes = expedited.map((p: any) => p.codigo);
      const { data: received } = await supabase
        .from('svc_recebimentos_pacotes')
        .select('codigo')
        .in('codigo', codes);
      const receivedSet = new Set((received || []).map((r: any) => r.codigo));
      setExpPendencias(expedited.filter((p: any) => !receivedSet.has(p.codigo)));
    } else {
      setExpPendencias([]);
    }

    setLoading(false);
  }

  async function addPacote(
    codigo: string,
    tipo: 'scanner' | 'manual' | 'foto',
    fotoUri?: string
  ) {
    const cleaned = codigo.replace(/[^0-9]/g, '');
    if (!cleaned) return;
    if (cleaned.length !== 11) {
      if (tipo === 'scanner') {
        setLastScanned(`⚠️ Inválido: ${cleaned.length} dígitos`);
        setTimeout(() => setLastScanned(''), 2000);
      } else {
        Alert.alert('Código inválido', `O código deve ter exatamente 11 dígitos numéricos.\nInformado: ${cleaned.length} dígito${cleaned.length !== 1 ? 's' : ''}.`);
      }
      return;
    }

    const alreadyScanned = pacotes.some((p) => p.codigo === cleaned);
    if (alreadyScanned) {
      if (tipo === 'scanner') {
        setLastScanned(`⚠️ Já bipado: ${cleaned}`);
        setTimeout(() => setLastScanned(''), 2000);
      } else {
        Alert.alert('Duplicado', `O pacote ${cleaned} já foi bipado hoje.`);
      }
      return;
    }

    if (isDemo) {
      const fakeEntry: Pacote = {
        id: `demo_${Date.now()}`,
        codigo: cleaned,
        tipo_entrada: tipo,
        inventoried_at: new Date().toISOString(),
        foto_url: null,
      };
      setPacotes((prev) => [fakeEntry, ...prev]);
      setPendencias((prev) => prev.filter((p) => p.codigo !== cleaned));
      if (tipo === 'scanner') {
        setLastScanned(`✅ ${cleaned}`);
        setTimeout(() => setLastScanned(''), 2000);
      }
      return;
    }

    setSaving(true);
    let fotoUrl: string | null = null;
    if (fotoUri) fotoUrl = await uploadPhoto(fotoUri, cleaned);

    const { data, error } = await supabase
      .from('pacotes_inventario')
      .insert({ nodo_id: nodoId, codigo: cleaned, tipo_entrada: tipo, foto_url: fotoUrl, status: 'inventoried' })
      .select()
      .single();

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Duplicado', `O pacote ${cleaned} já está no inventário.`);
      } else {
        Alert.alert('Erro', error.message);
      }
      return;
    }

    setPacotes((prev) => [data, ...prev]);
    setPendencias((prev) => prev.filter((p) => p.codigo !== cleaned));

    if (tipo === 'scanner') {
      setLastScanned(`✅ ${cleaned}`);
      setTimeout(() => setLastScanned(''), 2000);
    }
  }

  async function uploadPhoto(uri: string, codigo: string): Promise<string | null> {
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const filename = `${nodoId}/${codigo}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: `image/${ext}` } as any);

      const { data, error } = await supabase.storage
        .from('pacotes-fotos')
        .upload(filename, formData, { contentType: `image/${ext}`, upsert: true });

      if (error || !data) return null;

      const { data: urlData } = supabase.storage.from('pacotes-fotos').getPublicUrl(data.path);
      return urlData?.publicUrl || null;
    } catch {
      return null;
    }
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setTimeout(() => { scanCooldown.current = false; }, 1500);
    addPacote(result.data, 'scanner');
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada', 'Precisamos de acesso à galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada', 'Precisamos de acesso à câmera.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function handlePhotoSubmit() {
    if (!photoUri) { Alert.alert('Atenção', 'Selecione ou tire uma foto do pacote.'); return; }
    if (!photoCode.trim()) { Alert.alert('Atenção', 'Digite o código do pacote visível na foto.'); return; }
    await addPacote(photoCode.trim(), 'foto', photoUri);
    setPhotoUri(null);
    setPhotoCode('');
    setMode('menu');
  }

  function formatTime(dateStr: string) {
    return formatTimeBRT(dateStr);
  }

  const typeIcon = (tipo: string) =>
    tipo === 'scanner' ? '📷' : tipo === 'manual' ? '⌨️' : '📸';

  // ─── SCANNER MODE ─────────────────────────────────────────────
  if (mode === 'scanner') {
    if (Platform.OS === 'web') {
      return (
        <WebScanner
          onScanned={(code) => addPacote(code, 'scanner')}
          onClose={() => setMode('menu')}
          count={pacotes.length}
          lastScanned={lastScanned}
          recentCodes={pacotes.map((p) => p.codigo)}
        />
      );
    }

    if (!cameraPermission?.granted) {
      return (
        <View style={styles.permBox}>
          <Text style={styles.permText}>📷  Câmera necessária para escanear</Text>
          <Button label="Conceder permissão" onPress={requestCameraPermission} />
          <Button label="Voltar" onPress={() => setMode('menu')} variant="outline" />
        </View>
      );
    }

    return (
      <View style={scannerStyles.scannerContainer}>
        <CameraView
          key={facing}
          style={scannerStyles.camera}
          facing={facing}
          enableTorch={flashEnabled}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'datamatrix'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        <View style={scannerStyles.scanOverlay}>
          <SafeAreaView>
            <View style={scannerStyles.scanHeader}>
              <TouchableOpacity onPress={() => setMode('menu')} style={{ padding: 8 }}>
                <Text style={scannerStyles.scanBackText}>✓ Feito ({pacotes.length})</Text>
              </TouchableOpacity>
              <View style={scannerStyles.scanActions}>
                <TouchableOpacity
                  onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                  style={scannerStyles.flipBtn}
                >
                  <Text style={{ fontSize: 16 }}>🔄</Text>
                  <Text style={scannerStyles.flipBtnText}>
                    {facing === 'front' ? 'Frontal' : 'Traseira'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFlashEnabled((f) => !f)} style={scannerStyles.flashBtn}>
                  <Text style={scannerStyles.flashBtnText}>{flashEnabled ? '🔦 ON' : '🔦 OFF'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          <View style={scannerStyles.scanCenter}>
            <View style={scannerStyles.scanCounter}>
              <Text style={scannerStyles.scanCounterText}>
                {pacotes.length} pacote{pacotes.length !== 1 ? 's' : ''} bipado{pacotes.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={scannerStyles.scanFrame}>
              {[
                { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
                { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
                { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
                { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
              ].map((s, i) => (
                <View key={i} style={[scannerStyles.scanCorner, s as any]} />
              ))}
            </View>
          </View>

          <View style={scannerStyles.scanBottom}>
            <View style={scannerStyles.scanFeedback}>
              {lastScanned ? (
                <View style={[scannerStyles.scanResult, { backgroundColor: lastScanned.startsWith('⚠️') ? COLORS.orange : COLORS.green }]}>
                  <Text style={scannerStyles.scanResultText}>{lastScanned}</Text>
                </View>
              ) : (
                <View style={scannerStyles.scanHint}>
                  <Text style={scannerStyles.scanHintText}>Aponte para o QR Code ou código de barras</Text>
                </View>
              )}
            </View>

            {saving && (
              <View style={scannerStyles.scanSaving}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={scannerStyles.scanSavingText}>Salvando...</Text>
              </View>
            )}

            {pacotes.length > 0 && (
              <View style={scannerStyles.recentList}>
                <Text style={scannerStyles.recentLabel}>Últimos bipados ({pacotes.length}):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {pacotes.slice(0, 8).map((p) => (
                    <View key={p.id} style={scannerStyles.recentChip}>
                      <Text style={scannerStyles.recentChipText}>{p.codigo.slice(-8)}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ─── MANUAL MODE ──────────────────────────────────────────────
  if (mode === 'manual') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container}>
            <Card style={styles.manualCard}>
              <Text style={styles.manualIcon}>⌨️</Text>
              <Text style={styles.manualTitle}>Digitar Código Manualmente</Text>
              <TextInput
                style={styles.manualInput}
                placeholder="Digite ou bipe o código..."
                placeholderTextColor={theme.textTer}
                value={manualCode}
                onChangeText={(t) => {
                  const v = t.replace(/[^0-9]/g, '').slice(0, 11);
                  setManualCode(v);
                  if (v.length === 11) { addPacote(v, 'manual'); setManualCode(''); }
                }}
                keyboardType="number-pad"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (manualCode) { addPacote(manualCode, 'manual'); setManualCode(''); }
                }}
              />
              <Button
                label="Adicionar"
                onPress={() => {
                  if (manualCode) { addPacote(manualCode, 'manual'); setManualCode(''); }
                }}
                loading={saving}
                style={{ marginTop: 12 }}
              />
            </Card>

            <Text style={styles.sectionLabel}>ADICIONADOS HOJE ({pacotes.length})</Text>
            {pacotes.slice(0, 20).map((p) => (
              <View key={p.id} style={styles.scannedRow}>
                <Text style={styles.scannedIcon}>{typeIcon(p.tipo_entrada)}</Text>
                <Text style={styles.scannedCode}>{p.codigo}</Text>
                <Text style={styles.scannedTime}>{formatTime(p.inventoried_at)}</Text>
              </View>
            ))}

            <Button label="← Voltar" onPress={() => setMode('menu')} variant="outline" style={{ marginTop: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── PHOTO MODE ───────────────────────────────────────────────
  if (mode === 'photo') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container}>
            <Card style={styles.photoCard}>
              <Text style={styles.photoIcon}>📸</Text>
              <Text style={styles.photoTitle}>Enviar Foto do Pacote</Text>
              <Text style={styles.photoSubtitle}>
                Tire ou selecione uma foto do pacote com o ID e dados visíveis.
              </Text>

              {photoUri ? (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.photoRemove}>
                    <Text style={styles.photoRemoveText}>✕ Remover</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoButtons}>
                  <Button label="📷  Tirar Foto" onPress={handleTakePhoto} style={{ flex: 1, marginRight: 8 }} />
                  <Button label="🖼  Galeria" onPress={handlePickPhoto} variant="outline" style={{ flex: 1 }} />
                </View>
              )}

              <Text style={styles.label}>Código do Pacote (visível na foto) *</Text>
              <TextInput
                style={styles.input}
                placeholder="11 dígitos numéricos"
                placeholderTextColor={theme.textTer}
                value={photoCode}
                onChangeText={(t) => setPhotoCode(t.replace(/[^0-9]/g, '').slice(0, 11))}
                keyboardType="number-pad"
              />

              <Button label="Salvar Pacote" onPress={handlePhotoSubmit} loading={saving} style={{ marginTop: 16 }} />
            </Card>

            <Button label="← Voltar" onPress={() => setMode('menu')} variant="outline" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── MAIN MENU ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Expedition pendencies: sent by agency, not yet received at SVC */}
        {expPendencias.length > 0 && (
          <Card style={[styles.pendingCard, { borderColor: COLORS.red + '66', backgroundColor: theme.isDark ? '#3D0000' : '#FFF0F0' }]}>
            <View style={styles.pendingHeader}>
              <Text style={[styles.pendingTitle, { color: theme.isDark ? '#FF6B6B' : '#B71C1C' }]}>
                🚨 Não Recebidos no SVC
              </Text>
              <Badge label={`${expPendencias.length}`} color={COLORS.red} />
            </View>
            <Text style={[styles.pendingSubtitle, { color: theme.isDark ? '#FF6B6B' : '#B71C1C' }]}>
              Estes pacotes foram expedidos mas o SVC ainda não confirmou o recebimento:
            </Text>
            {expPendencias.slice(0, 5).map((p, i) => (
              <Text key={i} style={[styles.pendingCode, { color: theme.isDark ? '#FF6B6B' : '#B71C1C' }]}>• {p.codigo}</Text>
            ))}
            {expPendencias.length > 5 && (
              <Text style={[styles.pendingMore, { color: theme.isDark ? '#FF6B6B' : '#B71C1C' }]}>
                ... e mais {expPendencias.length - 5}
              </Text>
            )}
          </Card>
        )}

        {pendencias.length > 0 && (
          <Card style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <Text style={styles.pendingTitle}>⚠️ Pendências</Text>
              <Badge label={`${pendencias.length}`} color={COLORS.orange} />
            </View>
            <Text style={styles.pendingSubtitle}>
              Estes pacotes foram bipados ontem mas ainda não aparecem no inventário de hoje:
            </Text>
            {pendencias.slice(0, 5).map((p) => (
              <Text key={p.id} style={styles.pendingCode}>• {p.codigo}</Text>
            ))}
            {pendencias.length > 5 && (
              <Text style={styles.pendingMore}>... e mais {pendencias.length - 5}</Text>
            )}
          </Card>
        )}

        <Card style={styles.counterCard}>
          <Text style={styles.counterValue}>{loading ? '...' : pacotes.length}</Text>
          <Text style={styles.counterLabel}>
            pacote{pacotes.length !== 1 ? 's' : ''} no inventário de hoje
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>ADICIONAR PACOTES</Text>

        <TouchableOpacity
          style={[styles.optionBtn, { backgroundColor: COLORS.black }]}
          onPress={async () => {
            if (Platform.OS !== 'web' && !cameraPermission?.granted) await requestCameraPermission();
            setMode('scanner');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.optionIcon}>📷</Text>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: COLORS.white }]}>Escanear (Câmera)</Text>
            <Text style={styles.optionSubtitle}>QR Code ou código de barras</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionBtn, { backgroundColor: COLORS.blue }]}
          onPress={() => setMode('manual')}
          activeOpacity={0.85}
        >
          <Text style={styles.optionIcon}>⌨️</Text>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: COLORS.white }]}>Digitar Manualmente</Text>
            <Text style={styles.optionSubtitle}>Quando o scanner não funcionar</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionBtn, { backgroundColor: COLORS.orange }]}
          onPress={() => setMode('photo')}
          activeOpacity={0.85}
        >
          <Text style={styles.optionIcon}>📸</Text>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: COLORS.white }]}>Enviar Foto</Text>
            <Text style={styles.optionSubtitle}>Quando nenhuma opção funcionar</Text>
          </View>
        </TouchableOpacity>

        {!loading && pacotes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>INVENTARIADOS HOJE ({pacotes.length})</Text>
            {pacotes.map((p) => (
              <View key={p.id} style={styles.scannedRow}>
                <Text style={styles.scannedIcon}>{typeIcon(p.tipo_entrada)}</Text>
                <Text style={styles.scannedCode} numberOfLines={1}>{p.codigo}</Text>
                <Text style={styles.scannedTime}>{formatTime(p.inventoried_at)}</Text>
              </View>
            ))}
          </>
        )}

        {loading && <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}
