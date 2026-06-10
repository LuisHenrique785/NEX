import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useNavigation } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, Button, Card } from '../../src/components/ui';
import { useTheme } from '../../src/lib/theme';
import type { Theme } from '../../src/lib/theme';
import { useDemo } from '../../src/lib/demo';
import { WebScanner } from '../../src/components/WebScanner';

interface Pacote {
  codigo: string;
  tipo_entrada: 'scanner' | 'manual' | 'foto';
  foto_uri?: string;
}

type InputMode = 'none' | 'scanner' | 'manual' | 'photo';

function formatPlaca(text: string) {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    flex: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: t.textSec, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 10 },
    fieldLabel: { fontSize: 13, fontWeight: '700', color: t.text, marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: t.input, borderRadius: 10, borderWidth: 1.5, borderColor: t.inputBorder, padding: 12, fontSize: 15, color: t.text },
    addButtons: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    addBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: t.isDark ? 0.25 : 0.12, shadowRadius: 6, elevation: 3 },
    addBtnIcon: { fontSize: 22, marginBottom: 4 },
    addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    manualInput: { borderWidth: 2, borderColor: t.yellow, borderRadius: 10, padding: 12, fontSize: 16, textAlign: 'center', color: t.text, fontWeight: '700', fontFamily: 'monospace', backgroundColor: t.isDark ? '#2C2C00' : '#FFFEF0' },
    photoPreview: { width: '100%', height: 160, borderRadius: 10, marginBottom: 8 },
    pacoteRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: t.border },
    pacoteIcon: { fontSize: 18, marginRight: 10, width: 26 },
    pacoteCodigo: { flex: 1, fontSize: 13, color: t.text, fontFamily: 'monospace', fontWeight: '600' },
    pacoteRemove: { color: t.red, fontSize: 18, fontWeight: '700', paddingHorizontal: 6 },
    emptyCard: { alignItems: 'center', paddingVertical: 20 },
    emptyText: { color: t.textSec, fontSize: 14 },
    permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: t.bg },
    permText: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: t.text },
  });
}

export default function SVCRecebimentoScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { isDemo } = useDemo();

  const [placa, setPlaca] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [lastScanned, setLastScanned] = useState('');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [zoom, setZoom] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const scanCooldown = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCode, setPhotoCode] = useState('');

  React.useEffect(() => {
    navigation.setOptions({
      headerShown: inputMode !== 'scanner',
      title: 'Recebimento de Pacotes',
      headerStyle: { backgroundColor: theme.header },
      headerTintColor: theme.headerText,
      headerTitleStyle: { fontWeight: '800' },
      headerShadowVisible: false,
    });
  }, [inputMode, theme]);

  function addPacote(codigo: string, tipo: 'scanner' | 'manual' | 'foto', fotoUri?: string) {
    const trimmed = codigo.trim();
    if (!trimmed) return;
    const dup = pacotes.some((p) => p.codigo === trimmed);
    if (dup) {
      if (tipo === 'scanner') {
        setLastScanned(`⚠️ Repetido: ${trimmed}`);
        setTimeout(() => setLastScanned(''), 2000);
      } else {
        Alert.alert('Duplicado', `${trimmed} já está na lista.`);
      }
      return;
    }
    setPacotes((prev) => [{ codigo: trimmed, tipo_entrada: tipo, foto_uri: fotoUri }, ...prev]);
    if (tipo === 'scanner') {
      setLastScanned(`✅ ${trimmed}`);
      setTimeout(() => setLastScanned(''), 2000);
    }
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setTimeout(() => { scanCooldown.current = false; }, 1500);
    addPacote(result.data, 'scanner');
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão negada'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function uploadPhoto(uri: string, codigo: string): Promise<string | null> {
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const filename = `svc/${codigo}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: `image/${ext}` } as any);
      const { data, error } = await supabase.storage.from('pacotes-fotos').upload(filename, formData, { upsert: true });
      if (error || !data) return null;
      const { data: urlData } = supabase.storage.from('pacotes-fotos').getPublicUrl(data.path);
      return urlData?.publicUrl || null;
    } catch { return null; }
  }

  function handleSave() {
    if (pacotes.length === 0) { Alert.alert('Atenção', 'Adicione pelo menos um pacote.'); return; }
    setConfirmModal(true);
  }

  async function doSave() {
    setConfirmModal(false);
    if (isDemo) {
      Alert.alert('✅ [DEMO] Recebimento Registrado!', `${pacotes.length} pacote${pacotes.length !== 1 ? 's' : ''} registrado${pacotes.length !== 1 ? 's' : ''} (modo demonstração).`, [{ text: 'OK', onPress: () => router.replace('/svc') }]);
      return;
    }
    setSaving(true);
    const { data: recData, error: recError } = await supabase
      .from('svc_recebimentos')
      .insert({ placa: placa.trim() || null, transportadora: transportadora.trim() || null, total_pacotes: pacotes.length })
      .select().single();
    if (recError) { setSaving(false); Alert.alert('Erro', recError.message); return; }
    const items: any[] = [];
    for (const p of pacotes) {
      let fotoUrl: string | null = null;
      if (p.foto_uri) fotoUrl = await uploadPhoto(p.foto_uri, p.codigo);
      items.push({ recebimento_id: recData.id, codigo: p.codigo, tipo_entrada: p.tipo_entrada, foto_url: fotoUrl });
    }
    const { error: itemsError } = await supabase.from('svc_recebimentos_pacotes').insert(items);
    setSaving(false);
    if (itemsError) {
      Alert.alert('Atenção', `Recebimento salvo, mas houve erro ao registrar os pacotes individualmente: ${itemsError.message}`, [{ text: 'OK', onPress: () => router.replace('/svc') }]);
    } else {
      Alert.alert('✅ Recebimento Registrado!', `${pacotes.length} pacote${pacotes.length !== 1 ? 's' : ''} recebido${pacotes.length !== 1 ? 's' : ''} com sucesso.`, [{ text: 'OK', onPress: () => router.replace('/svc') }]);
    }
  }

  const typeIcon = (t: string) => t === 'scanner' ? '📷' : t === 'manual' ? '[teclado]' : '📸';

  // Scanner
  if (inputMode === 'scanner') {
    if (Platform.OS === 'web') {
      return (
        <WebScanner
          onScanned={(code) => addPacote(code, 'scanner')}
          onClose={() => setInputMode('none')}
          count={pacotes.length}
          lastScanned={lastScanned}
          recentCodes={pacotes.map((p) => p.codigo)}
        />
      );
    }
    if (!cameraPermission?.granted) {
      return (
        <View style={styles.permBox}>
          <Text style={styles.permText}>📷  Câmera necessária</Text>
          <Button label="Conceder permissão" onPress={requestCameraPermission} />
          <Button label="Voltar" onPress={() => setInputMode('none')} variant="outline" />
        </View>
      );
    }
    return (
      <View style={scannerStyles.scannerContainer}>
        <CameraView
          key={facing}
          style={scannerStyles.camera}
          facing={facing}
          zoom={zoom}
          enableTorch={flashEnabled}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'datamatrix'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={scannerStyles.scanOverlay}>
          <SafeAreaView>
            <View style={scannerStyles.scanHeader}>
              <TouchableOpacity onPress={() => setInputMode('none')} style={scannerStyles.scanBackBtn}>
                <Text style={scannerStyles.scanBackText}>✓ Feito ({pacotes.length})</Text>
              </TouchableOpacity>
              <View style={scannerStyles.scanActions}>
                <TouchableOpacity
                  onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                  style={scannerStyles.flipBtn}
                >
                  <Text style={{ fontSize: 16 }}>🔄</Text>
                  <Text style={scannerStyles.flipBtnText}>{facing === 'front' ? 'Frontal' : 'Traseira'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setFlashEnabled((f) => !f)} style={scannerStyles.flashBtn}>
                  <Text style={scannerStyles.flashBtnText}>{flashEnabled ? '🔦 ON' : '🔦 OFF'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
          <View style={scannerStyles.zoomRow}>
            {([{ label: '0.5×', v: 0 }, { label: '1×', v: 0.1 }, { label: '2×', v: 0.35 }]).map(z => (
              <TouchableOpacity
                key={z.label}
                style={[scannerStyles.zoomBtn, zoom === z.v && scannerStyles.zoomBtnActive]}
                onPress={() => setZoom(z.v)}
              >
                <Text style={[scannerStyles.zoomBtnText, zoom === z.v && scannerStyles.zoomBtnTextActive]}>{z.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={scannerStyles.scanCounter}>
            <Text style={scannerStyles.scanCounterText}>{pacotes.length} para receber</Text>
          </View>
          <View style={scannerStyles.scanFrame}>
            <View style={[scannerStyles.corner, scannerStyles.cornerTL]} />
            <View style={[scannerStyles.corner, scannerStyles.cornerTR]} />
            <View style={[scannerStyles.corner, scannerStyles.cornerBL]} />
            <View style={[scannerStyles.corner, scannerStyles.cornerBR]} />
          </View>
          {lastScanned ? (
            <View style={[scannerStyles.scanResult, { backgroundColor: lastScanned.startsWith('⚠️') ? COLORS.orange : COLORS.green }]}>
              <Text style={scannerStyles.scanResultText}>{lastScanned}</Text>
            </View>
          ) : (
            <View style={scannerStyles.scanHint}><Text style={scannerStyles.scanHintText}>Aponte para o código do pacote</Text></View>
          )}
          {pacotes.length > 0 && (
            <View style={scannerStyles.recentList}>
              <Text style={scannerStyles.recentLabel}>Na lista ({pacotes.length}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pacotes.slice(0, 8).map((p, i) => (
                  <View key={i} style={scannerStyles.recentChip}><Text style={scannerStyles.recentChipText}>{p.codigo.slice(-8)}</Text></View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.sectionLabel}>DADOS DO VEÍCULO (opcional)</Text>
          <Card>
            <Text style={styles.fieldLabel}>Placa</Text>
            <TextInput style={styles.input} placeholder="ABC1234" placeholderTextColor={theme.textTer} value={placa} onChangeText={(t) => setPlaca(formatPlaca(t))} autoCapitalize="characters" maxLength={7} />
            <Text style={styles.fieldLabel}>Transportadora</Text>
            <TextInput style={styles.input} placeholder="Ex: Total Express" placeholderTextColor={theme.textTer} value={transportadora} onChangeText={setTransportadora} autoCapitalize="words" />
          </Card>

          <Text style={styles.sectionLabel}>PACOTES RECEBIDOS ({pacotes.length})</Text>

          <View style={styles.addButtons}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: COLORS.black }]}
              onPress={async () => { if (Platform.OS !== 'web' && !cameraPermission?.granted) await requestCameraPermission(); setInputMode('scanner'); }}>
              <Text style={styles.addBtnIcon}>📷</Text>
              <Text style={styles.addBtnText}>Scanner</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: COLORS.blue }]} onPress={() => setInputMode('manual')}>
              <Text style={styles.addBtnIcon}>⌨️</Text>
              <Text style={styles.addBtnText}>Digitar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: COLORS.orange }]} onPress={() => setInputMode('photo')}>
              <Text style={styles.addBtnIcon}>📸</Text>
              <Text style={styles.addBtnText}>Foto</Text>
            </TouchableOpacity>
          </View>

          {inputMode === 'manual' && (
            <Card style={{ marginBottom: 4 }}>
              <TextInput style={styles.manualInput} placeholder="Digite o código..." placeholderTextColor={theme.textTer} value={manualCode} onChangeText={setManualCode} autoCapitalize="characters" autoFocus
                returnKeyType="done"
                onSubmitEditing={() => { if (manualCode.trim()) { addPacote(manualCode.trim(), 'manual'); setManualCode(''); } }} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button label="Adicionar" onPress={() => { if (manualCode.trim()) { addPacote(manualCode.trim(), 'manual'); setManualCode(''); } }} style={{ flex: 1 }} />
                <Button label="Fechar" onPress={() => setInputMode('none')} variant="outline" style={{ flex: 1 }} />
              </View>
            </Card>
          )}

          {inputMode === 'photo' && (
            <Card style={{ marginBottom: 4 }}>
              {photoUri
                ? <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                : <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <Button label="📷 Câmera" onPress={handleTakePhoto} style={{ flex: 1 }} />
                    <Button label="🖼 Galeria" onPress={handlePickPhoto} variant="outline" style={{ flex: 1 }} />
                  </View>
              }
              <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Código visível na foto" placeholderTextColor={theme.textTer} value={photoCode} onChangeText={setPhotoCode} autoCapitalize="characters" />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button label="Salvar" onPress={() => { if (!photoUri || !photoCode.trim()) { Alert.alert('Preencha todos os campos'); return; } addPacote(photoCode.trim(), 'foto', photoUri); setPhotoUri(null); setPhotoCode(''); setInputMode('none'); }} style={{ flex: 1 }} />
                <Button label="Cancelar" onPress={() => { setInputMode('none'); setPhotoUri(null); setPhotoCode(''); }} variant="outline" style={{ flex: 1 }} />
              </View>
            </Card>
          )}

          {pacotes.map((p, i) => (
            <View key={i} style={styles.pacoteRow}>
              <Text style={styles.pacoteIcon}>{typeIcon(p.tipo_entrada)}</Text>
              <Text style={styles.pacoteCodigo} numberOfLines={1}>{p.codigo}</Text>
              <TouchableOpacity onPress={() => { Alert.alert('Remover?', p.codigo, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Remover', style: 'destructive', onPress: () => setPacotes((prev) => prev.filter((_, idx) => idx !== i)) }]); }}>
                <Text style={styles.pacoteRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          {pacotes.length === 0 && inputMode === 'none' && (
            <Card style={styles.emptyCard}><Text style={styles.emptyText}>Adicione os pacotes recebidos acima.</Text></Card>
          )}

          <Button label={`Confirmar Recebimento (${pacotes.length})`} onPress={handleSave} loading={saving} style={{ marginTop: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8 }}>
              Confirmar Recebimento
            </Text>
            <Text style={{ fontSize: 15, color: theme.textSec, lineHeight: 22, marginBottom: 20 }}>
              Registrar recebimento de {pacotes.length} pacote{pacotes.length !== 1 ? 's' : ''}?
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Cancelar" onPress={() => setConfirmModal(false)} variant="outline" style={{ flex: 1 }} />
              <Button label="Confirmar" onPress={doSave} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Static styles for the scanner overlay (always dark/camera context)
const scannerStyles = StyleSheet.create({
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: 'rgba(0,0,0,0.65)' },
  scanBackBtn: { padding: 8 },
  scanBackText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  scanActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flipBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  flipBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  zoomRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  zoomBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  zoomBtnActive: { backgroundColor: '#FFE600', borderColor: '#FFE600' },
  zoomBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  zoomBtnTextActive: { color: '#000' },
  flashBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  flashBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  scanCounter: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  scanCounterText: { color: '#FFE600', fontWeight: '800', fontSize: 15 },
  scanFrame: { width: 260, height: 160, alignSelf: 'center', position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#FFE600', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanResult: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, maxWidth: 320 },
  scanResultText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  scanHint: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  scanHintText: { color: '#DDD', fontSize: 13 },
  recentList: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, paddingBottom: 32 },
  recentLabel: { color: '#AAA', fontSize: 12, marginBottom: 8 },
  recentChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 },
  recentChipText: { color: '#FFFFFF', fontSize: 12, fontFamily: 'monospace' },
});
