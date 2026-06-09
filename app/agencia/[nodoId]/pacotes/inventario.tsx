import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  TextInput, Modal, SafeAreaView, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { COLORS, Button, Card, Badge } from '../../../../src/components/ui';

interface Pacote {
  id: string;
  codigo: string;
  tipo_entrada: 'scanner' | 'manual' | 'foto';
  inventoried_at: string;
  foto_url?: string | null;
}

type Mode = 'menu' | 'scanner' | 'manual' | 'photo';

export default function InventarioFisicoScreen() {
  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
  const navigation = useNavigation();

  const [mode, setMode] = useState<Mode>('menu');
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [pendencias, setPendencias] = useState<Pacote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scanner
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [lastScanned, setLastScanned] = useState('');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const scanCooldown = useRef(false);

  // Manual
  const [manualCode, setManualCode] = useState('');

  // Photo
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCode, setPhotoCode] = useState('');

  useEffect(() => {
    navigation.setOptions({
      headerShown: mode !== 'scanner',
      title: 'Inventário Físico',
      headerStyle: { backgroundColor: COLORS.yellow },
      headerTintColor: COLORS.black,
      headerTitleStyle: { fontWeight: '800' },
      headerShadowVisible: false,
    });
  }, [mode]);

  useEffect(() => {
    loadPacotes();
  }, [nodoId]);

  async function loadPacotes() {
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Today's inventory
    const { data: todayData } = await supabase
      .from('pacotes_inventario')
      .select('id, codigo, tipo_entrada, inventoried_at, foto_url')
      .eq('nodo_id', nodoId)
      .eq('status', 'inventoried')
      .gte('inventoried_at', today.toISOString())
      .order('inventoried_at', { ascending: false });

    // Yesterday's that weren't inventoried today
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
    setLoading(false);
  }

  async function addPacote(
    codigo: string,
    tipo: 'scanner' | 'manual' | 'foto',
    fotoUri?: string
  ) {
    const trimmed = codigo.trim();
    if (!trimmed) return;

    // Check duplicate for today
    const alreadyScanned = pacotes.some((p) => p.codigo === trimmed);
    if (alreadyScanned) {
      if (tipo === 'scanner') {
        setLastScanned(`⚠️ Já bipado: ${trimmed}`);
        setTimeout(() => setLastScanned(''), 2000);
      } else {
        Alert.alert('Duplicado', `O pacote ${trimmed} já foi bipado hoje.`);
      }
      return;
    }

    setSaving(true);
    let fotoUrl: string | null = null;

    if (fotoUri) {
      fotoUrl = await uploadPhoto(fotoUri, trimmed);
    }

    const { data, error } = await supabase
      .from('pacotes_inventario')
      .insert({
        nodo_id: nodoId,
        codigo: trimmed,
        tipo_entrada: tipo,
        foto_url: fotoUrl,
        status: 'inventoried',
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Duplicado', `O pacote ${trimmed} já está no inventário.`);
      } else {
        Alert.alert('Erro', error.message);
      }
      return;
    }

    setPacotes((prev) => [data, ...prev]);
    // Remove from pending if it was there
    setPendencias((prev) => prev.filter((p) => p.codigo !== trimmed));

    if (tipo === 'scanner') {
      setLastScanned(`✅ ${trimmed}`);
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

      const { data: urlData } = supabase.storage
        .from('pacotes-fotos')
        .getPublicUrl(data.path);

      return urlData?.publicUrl || null;
    } catch {
      return null;
    }
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanCooldown.current) return;
    scanCooldown.current = true;
    setTimeout(() => { scanCooldown.current = false; }, 1500);

    const code = result.data;
    addPacote(code, 'scanner');
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handlePhotoSubmit() {
    if (!photoUri) {
      Alert.alert('Atenção', 'Selecione ou tire uma foto do pacote.');
      return;
    }
    if (!photoCode.trim()) {
      Alert.alert('Atenção', 'Digite o código do pacote visível na foto.');
      return;
    }
    await addPacote(photoCode.trim(), 'foto', photoUri);
    setPhotoUri(null);
    setPhotoCode('');
    setMode('menu');
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const typeIcon = (tipo: string) =>
    tipo === 'scanner' ? '📷' : tipo === 'manual' ? '⌨️' : '📸';

  // ─── SCANNER MODE ─────────────────────────────────────────────
  if (mode === 'scanner') {
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
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={flashEnabled}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'datamatrix'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        {/* Overlay */}
        <View style={styles.scanOverlay}>
          {/* Top bar */}
          <SafeAreaView>
            <View style={styles.scanHeader}>
              <TouchableOpacity onPress={() => setMode('menu')} style={styles.scanBackBtn}>
                <Text style={styles.scanBackText}>✕ Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFlashEnabled((f) => !f)} style={styles.flashBtn}>
                <Text style={styles.flashBtnText}>{flashEnabled ? '🔦 ON' : '🔦 OFF'}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Counter */}
          <View style={styles.scanCounter}>
            <Text style={styles.scanCounterText}>
              {pacotes.length} pacote{pacotes.length !== 1 ? 's' : ''} bipado{pacotes.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Target frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.scanCorner, styles.scanCornerTL]} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
          </View>

          {/* Last scanned */}
          {lastScanned ? (
            <View style={[
              styles.scanResult,
              { backgroundColor: lastScanned.startsWith('⚠️') ? COLORS.orange : COLORS.green },
            ]}>
              <Text style={styles.scanResultText}>{lastScanned}</Text>
            </View>
          ) : (
            <View style={styles.scanHint}>
              <Text style={styles.scanHintText}>Aponte para o QR Code ou código de barras</Text>
            </View>
          )}

          {saving && (
            <View style={styles.scanSaving}>
              <ActivityIndicator color={COLORS.white} size="small" />
              <Text style={styles.scanSavingText}>Salvando...</Text>
            </View>
          )}

          {/* Recent list at bottom */}
          {pacotes.length > 0 && (
            <View style={styles.recentList}>
              <Text style={styles.recentLabel}>Últimos bipados:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pacotes.slice(0, 8).map((p) => (
                  <View key={p.id} style={styles.recentChip}>
                    <Text style={styles.recentChipText}>{p.codigo.slice(-8)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
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
                placeholder="Digite o ID do pacote..."
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (manualCode.trim()) {
                    addPacote(manualCode.trim(), 'manual');
                    setManualCode('');
                  }
                }}
              />
              <Button
                label="Adicionar"
                onPress={() => {
                  if (manualCode.trim()) {
                    addPacote(manualCode.trim(), 'manual');
                    setManualCode('');
                  }
                }}
                loading={saving}
                style={{ marginTop: 12 }}
              />
            </Card>

            {/* List of scanned so far */}
            <Text style={styles.sectionLabel}>
              ADICIONADOS HOJE ({pacotes.length})
            </Text>
            {pacotes.slice(0, 20).map((p) => (
              <View key={p.id} style={styles.scannedRow}>
                <Text style={styles.scannedIcon}>{typeIcon(p.tipo_entrada)}</Text>
                <Text style={styles.scannedCode}>{p.codigo}</Text>
                <Text style={styles.scannedTime}>{formatTime(p.inventoried_at)}</Text>
              </View>
            ))}

            <Button
              label="← Voltar"
              onPress={() => setMode('menu')}
              variant="outline"
              style={{ marginTop: 20 }}
            />
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
                  <Button
                    label="📷  Tirar Foto"
                    onPress={handleTakePhoto}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    label="🖼  Galeria"
                    onPress={handlePickPhoto}
                    variant="outline"
                    style={{ flex: 1 }}
                  />
                </View>
              )}

              <Text style={styles.label}>Código do Pacote (visível na foto) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: MLM123456789"
                value={photoCode}
                onChangeText={setPhotoCode}
                autoCapitalize="characters"
              />

              <Button
                label="Salvar Pacote"
                onPress={handlePhotoSubmit}
                loading={saving}
                style={{ marginTop: 16 }}
              />
            </Card>

            <Button
              label="← Voltar"
              onPress={() => setMode('menu')}
              variant="outline"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── MAIN MENU ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Pending from yesterday */}
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

        {/* Counter */}
        <Card style={styles.counterCard}>
          <Text style={styles.counterValue}>{loading ? '...' : pacotes.length}</Text>
          <Text style={styles.counterLabel}>
            pacote{pacotes.length !== 1 ? 's' : ''} no inventário de hoje
          </Text>
        </Card>

        {/* Scan options */}
        <Text style={styles.sectionLabel}>ADICIONAR PACOTES</Text>

        <TouchableOpacity
          style={[styles.optionBtn, { backgroundColor: COLORS.black }]}
          onPress={async () => {
            if (!cameraPermission?.granted) await requestCameraPermission();
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

        {/* Scanned list */}
        {!loading && pacotes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              INVENTARIADOS HOJE ({pacotes.length})
            </Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },

  // Scanner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanBackBtn: { padding: 8 },
  scanBackText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  flashBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  flashBtnText: { color: COLORS.white, fontWeight: '700' },
  scanCounter: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanCounterText: { color: COLORS.yellow, fontWeight: '800', fontSize: 15 },
  scanFrame: {
    width: 260,
    height: 160,
    alignSelf: 'center',
    position: 'relative',
  },
  scanCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.yellow,
    borderWidth: 3,
  },
  scanCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  scanCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  scanCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  scanCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanResult: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    maxWidth: 320,
  },
  scanResultText: { color: COLORS.white, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  scanHint: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  scanHintText: { color: '#DDD', fontSize: 13 },
  scanSaving: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanSavingText: { color: COLORS.white, fontSize: 13 },
  recentList: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    paddingBottom: 32,
  },
  recentLabel: { color: '#AAA', fontSize: 12, marginBottom: 8 },
  recentChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  recentChipText: { color: COLORS.white, fontSize: 12, fontFamily: 'monospace' },

  // Main menu
  pendingCard: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1.5,
    borderColor: COLORS.orange + '66',
    marginBottom: 12,
  },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pendingTitle: { fontSize: 16, fontWeight: '800', color: '#856404' },
  pendingSubtitle: { fontSize: 13, color: '#856404', lineHeight: 18, marginBottom: 8 },
  pendingCode: { fontSize: 13, color: '#856404', fontFamily: 'monospace', marginBottom: 3 },
  pendingMore: { fontSize: 12, color: '#856404', fontStyle: 'italic', marginTop: 4 },
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
    color: COLORS.gray,
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
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  scannedIcon: { fontSize: 18, marginRight: 10, width: 28 },
  scannedCode: { flex: 1, fontSize: 13, color: COLORS.black, fontFamily: 'monospace', fontWeight: '600' },
  scannedTime: { fontSize: 12, color: COLORS.gray, marginLeft: 8 },

  // Manual
  manualCard: { alignItems: 'center', marginBottom: 20 },
  manualIcon: { fontSize: 48, marginBottom: 12 },
  manualTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black, marginBottom: 16 },
  manualInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: COLORS.yellow,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    textAlign: 'center',
    color: COLORS.black,
    fontWeight: '700',
    fontFamily: 'monospace',
    backgroundColor: '#FFFEF0',
  },

  // Photo
  photoCard: { marginBottom: 16 },
  photoIcon: { fontSize: 48, marginBottom: 10, textAlign: 'center' },
  photoTitle: { fontSize: 18, fontWeight: '800', color: COLORS.black, marginBottom: 6, textAlign: 'center' },
  photoSubtitle: { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  photoButtons: { flexDirection: 'row', marginBottom: 16 },
  photoPreviewBox: { alignItems: 'center', marginBottom: 16 },
  photoPreview: { width: '100%', height: 200, borderRadius: 12 },
  photoRemove: { marginTop: 8 },
  photoRemoveText: { color: COLORS.red, fontWeight: '700' },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    padding: 14,
    fontSize: 16,
    color: COLORS.black,
    fontFamily: 'monospace',
  },

  // Permission
  permBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permText: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: COLORS.black },
});
