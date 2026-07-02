import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  TextInput, SafeAreaView, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { COLORS, Button, Card, Badge } from '../../../../src/components/ui';
import { useTheme } from '../../../../src/lib/theme';
import type { Theme } from '../../../../src/lib/theme';
import { useDemo } from '../../../../src/lib/demo';
import { WebScanner } from '../../../../src/components/WebScanner';

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
    emptyPackages: { alignItems: 'center', paddingVertical: 20 },
    emptyPackagesText: { color: t.textSec, fontSize: 14 },
    permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: t.bg },
    permText: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: t.text },
  });
}

export default function ExpedicaoPacotesScreen() {
  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
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

  // Camera
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [zoom, setZoom] = useState(0);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const scanCooldown = useRef(false);
  const addedCodesRef = useRef(new Set<string>());

  // Manual
  const [manualCode, setManualCode] = useState('');

  // Photo
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCode, setPhotoCode] = useState('');

  function addPacote(codigo: string, tipo: 'scanner' | 'manual' | 'foto', fotoUri?: string) {
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
    if (addedCodesRef.current.has(cleaned)) {
      if (tipo === 'scanner') {
        setLastScanned(`⚠️ Repetido: ${cleaned}`);
        setTimeout(() => setLastScanned(''), 2000);
      } else {
        Alert.alert('Duplicado', `O pacote ${cleaned} já está na lista.`);
      }
      return;
    }
    addedCodesRef.current.add(cleaned);
    setPacotes((prev) => [{ codigo: cleaned, tipo_entrada: tipo, foto_uri: fotoUri }, ...prev]);
    if (tipo === 'scanner') {
      setLastScanned(`✅ ${cleaned}`);
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
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos da câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos da galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  function handlePhotoAdd() {
    if (!photoUri) { Alert.alert('Atenção', 'Selecione uma foto.'); return; }
    if (!photoCode.trim()) { Alert.alert('Atenção', 'Digite o código do pacote.'); return; }
    addPacote(photoCode.trim(), 'foto', photoUri);
    setPhotoUri(null);
    setPhotoCode('');
    setInputMode('none');
  }

  async function uploadPhoto(uri: string, codigo: string): Promise<string | null> {
    try {
      const ext = uri.split('.').pop() || 'jpg';
      const filename = `expedicao/${nodoId}/${codigo}_${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', { uri, name: filename, type: `image/${ext}` } as any);
      const { data, error } = await supabase.storage
        .from('pacotes-fotos')
        .upload(filename, formData, { contentType: `image/${ext}`, upsert: true });
      if (error || !data) return null;
      const { data: urlData } = supabase.storage.from('pacotes-fotos').getPublicUrl(data.path);
      return urlData?.publicUrl || null;
    } catch { return null; }
  }

  function handleSave() {
    if (!placa.trim()) { Alert.alert('Atenção', 'Informe a placa.'); return; }
    if (!transportadora.trim()) { Alert.alert('Atenção', 'Informe a transportadora.'); return; }
    if (pacotes.length === 0) { Alert.alert('Atenção', 'Adicione pelo menos um pacote.'); return; }
    setConfirmModal(true);
  }

  async function doSave() {
    setConfirmModal(false);
    if (isDemo) {
      Alert.alert('✅ [DEMO] Expedição Registrada!', `${pacotes.length} pacote${pacotes.length !== 1 ? 's' : ''} expedido${pacotes.length !== 1 ? 's' : ''} (modo demonstração).`, [{ text: 'OK', onPress: () => router.replace(`/agencia/${nodoId}/pacotes`) }]);
      return;
    }
    setSaving(true);
    try {
    const { data: expData, error: expError } = await supabase
      .from('pacotes_expedicoes')
      .insert({ nodo_id: nodoId, placa: placa.trim(), transportadora: transportadora.trim(), total_pacotes: pacotes.length })
      .select().single();
    if (expError) { Alert.alert('Erro ao criar expedição', expError.message); return; }

    let erros = 0;
    for (const p of pacotes) {
      let fotoUrl: string | null = null;
      if (p.foto_uri) fotoUrl = await uploadPhoto(p.foto_uri, p.codigo);
      const { data: existing } = await supabase.from('pacotes_inventario').select('id').eq('nodo_id', nodoId).eq('codigo', p.codigo).eq('status', 'inventoried').single();
      if (existing) {
        const { error } = await supabase.from('pacotes_inventario').update({ status: 'expedited', expedicao_id: expData.id, expedited_at: new Date().toISOString() }).eq('id', existing.id);
        if (error) erros++;
      } else {
        const { error } = await supabase.from('pacotes_inventario').insert({ nodo_id: nodoId, codigo: p.codigo, tipo_entrada: p.tipo_entrada, foto_url: fotoUrl, status: 'expedited', expedicao_id: expData.id, expedited_at: new Date().toISOString() });
        if (error) erros++;
      }
    }

    if (erros > 0) {
      Alert.alert('Atenção', `Expedição salva, mas ${erros} pacote${erros !== 1 ? 's' : ''} tiv${erros !== 1 ? 'eram' : 'e'} erro ao registrar. Verifique na Consulta.`, [{ text: 'OK', onPress: () => router.replace(`/agencia/${nodoId}/pacotes`) }]);
    } else {
      Alert.alert('✅ Expedição Registrada!', `${pacotes.length} pacote${pacotes.length !== 1 ? 's' : ''} expedido${pacotes.length !== 1 ? 's' : ''} com sucesso.`, [{ text: 'OK', onPress: () => router.replace(`/agencia/${nodoId}/pacotes`) }]);
    }
    } catch (e: any) {
      Alert.alert('Erro inesperado', e?.message || 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const typeIcon = (tipo: string) => tipo === 'scanner' ? '📷' : tipo === 'manual' ? '⌨️' : '📸';

  // ─── SCANNER MODAL ────────────────────────────────────────────
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
            <Text style={scannerStyles.scanCounterText}>{pacotes.length} na expedição</Text>
          </View>
          <View style={scannerStyles.scanFrame}>
            <View style={[scannerStyles.scanCorner, scannerStyles.scanCornerTL]} />
            <View style={[scannerStyles.scanCorner, scannerStyles.scanCornerTR]} />
            <View style={[scannerStyles.scanCorner, scannerStyles.scanCornerBL]} />
            <View style={[scannerStyles.scanCorner, scannerStyles.scanCornerBR]} />
          </View>
          {lastScanned ? (
            <View style={[scannerStyles.scanResult, { backgroundColor: lastScanned.startsWith('⚠️') ? COLORS.orange : COLORS.green }]}>
              <Text style={scannerStyles.scanResultText}>{lastScanned}</Text>
            </View>
          ) : (
            <View style={scannerStyles.scanHint}>
              <Text style={scannerStyles.scanHintText}>Escaneie os pacotes para adicionar</Text>
            </View>
          )}
          {pacotes.length > 0 && (
            <View style={scannerStyles.recentList}>
              <Text style={scannerStyles.recentLabel}>Na lista ({pacotes.length}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pacotes.slice(0, 8).map((p, i) => (
                  <View key={i} style={scannerStyles.recentChip}>
                    <Text style={scannerStyles.recentChipText}>{p.codigo.slice(-8)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ─── MAIN FORM ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* Vehicle info */}
          <Text style={styles.sectionLabel}>DADOS DO VEÍCULO</Text>
          <Card>
            <Text style={styles.fieldLabel}>Placa do Veículo *</Text>
            <TextInput style={styles.input} placeholder="ABC1234" placeholderTextColor={theme.textTer} value={placa} onChangeText={(t) => setPlaca(formatPlaca(t))} autoCapitalize="characters" maxLength={7} returnKeyType="next" />

            <Text style={styles.fieldLabel}>Transportadora *</Text>
            <TextInput style={styles.input} placeholder="Ex: Total Express" placeholderTextColor={theme.textTer} value={transportadora} onChangeText={setTransportadora} autoCapitalize="words" returnKeyType="done" />
          </Card>

          {/* Pacotes */}
          <Text style={styles.sectionLabel}>PACOTES A EXPEDIR ({pacotes.length})</Text>

          <View style={styles.addButtons}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: COLORS.black }]}
              onPress={async () => { if (Platform.OS !== 'web' && !cameraPermission?.granted) await requestCameraPermission(); setInputMode('scanner'); }}
            >
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

          {/* Manual input inline */}
          {inputMode === 'manual' && (
            <Card style={{ marginBottom: 4 }}>
              <TextInput
                style={styles.manualInput}
                placeholder="Digite o código do pacote..."
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => { if (manualCode.trim()) { addPacote(manualCode.trim(), 'manual'); setManualCode(''); } }}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button label="Adicionar" onPress={() => { if (manualCode.trim()) { addPacote(manualCode.trim(), 'manual'); setManualCode(''); } }} style={{ flex: 1 }} />
                <Button label="Fechar" onPress={() => setInputMode('none')} variant="outline" style={{ flex: 1 }} />
              </View>
            </Card>
          )}

          {/* Photo input inline */}
          {inputMode === 'photo' && (
            <Card style={{ marginBottom: 4 }}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <Button label="📷 Câmera" onPress={handleTakePhoto} style={{ flex: 1 }} />
                  <Button label="🖼 Galeria" onPress={handlePickPhoto} variant="outline" style={{ flex: 1 }} />
                </View>
              )}
              <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Código do pacote na foto" value={photoCode} onChangeText={setPhotoCode} autoCapitalize="characters" />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <Button label="Salvar" onPress={handlePhotoAdd} style={{ flex: 1 }} />
                <Button label="Cancelar" onPress={() => { setInputMode('none'); setPhotoUri(null); setPhotoCode(''); }} variant="outline" style={{ flex: 1 }} />
              </View>
            </Card>
          )}

          {/* Pacotes list */}
          {pacotes.length > 0 && (
            <>
              {pacotes.map((p, i) => (
                <View key={i} style={styles.pacoteRow}>
                  <Text style={styles.pacoteIcon}>{typeIcon(p.tipo_entrada)}</Text>
                  <Text style={styles.pacoteCodigo} numberOfLines={1}>{p.codigo}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      addedCodesRef.current.delete(p.codigo);
                      setPacotes((prev) => prev.filter((_, idx) => idx !== i));
                    }}
                  >
                    <Text style={styles.pacoteRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {pacotes.length === 0 && inputMode === 'none' && (
            <Card style={styles.emptyPackages}>
              <Text style={styles.emptyPackagesText}>Adicione os pacotes da expedição acima.</Text>
            </Card>
          )}

          <Button
            label={`Confirmar Expedição (${pacotes.length})`}
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: 24 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8 }}>
              Confirmar Expedição
            </Text>
            <Text style={{ fontSize: 15, color: theme.textSec, lineHeight: 22, marginBottom: 20 }}>
              Expedir {pacotes.length} pacote{pacotes.length !== 1 ? 's' : ''} — {transportadora.trim()} ({placa.trim()})?
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
  scanBackText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  scanActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flipBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  flipBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  zoomRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  zoomBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  zoomBtnActive: { backgroundColor: '#FFE600', borderColor: '#FFE600' },
  zoomBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  zoomBtnTextActive: { color: '#000' },
  flashBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  flashBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  scanCounter: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  scanCounterText: { color: COLORS.yellow, fontWeight: '800', fontSize: 15 },
  scanFrame: { width: 260, height: 160, alignSelf: 'center', position: 'relative' },
  scanCorner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.yellow, borderWidth: 3 },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanResult: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, maxWidth: 320 },
  scanResultText: { color: COLORS.white, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  scanHint: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  scanHintText: { color: '#DDD', fontSize: 13 },
  recentList: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, paddingBottom: 32 },
  recentLabel: { color: '#AAA', fontSize: 12, marginBottom: 8 },
  recentChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 },
  recentChipText: { color: COLORS.white, fontSize: 12, fontFamily: 'monospace' },
  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: COLORS.black },
});
