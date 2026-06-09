import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useNavigation } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, Button, Card } from '../../src/components/ui';

interface Pacote {
  codigo: string;
  tipo_entrada: 'scanner' | 'manual' | 'foto';
  foto_uri?: string;
}

type InputMode = 'none' | 'scanner' | 'manual' | 'photo';

function formatCPF(text: string) {
  const nums = text.replace(/\D/g, '').slice(0, 11);
  return nums
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatPlaca(text: string) {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

export default function SVCRecebimentoScreen() {
  const navigation = useNavigation();

  const [nomeMotorista, setNomeMotorista] = useState('');
  const [cpfMotorista, setCpfMotorista] = useState('');
  const [placa, setPlaca] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [saving, setSaving] = useState(false);
  const [lastScanned, setLastScanned] = useState('');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const scanCooldown = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCode, setPhotoCode] = useState('');

  React.useEffect(() => {
    navigation.setOptions({
      headerShown: inputMode !== 'scanner',
      title: 'Recebimento de Pacotes',
      headerStyle: { backgroundColor: COLORS.yellow },
      headerTintColor: COLORS.black,
      headerTitleStyle: { fontWeight: '800' },
      headerShadowVisible: false,
    });
  }, [inputMode]);

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

  async function handleSave() {
    if (pacotes.length === 0) { Alert.alert('Atenção', 'Adicione pelo menos um pacote.'); return; }

    Alert.alert(
      'Confirmar Recebimento',
      `Registrar recebimento de ${pacotes.length} pacote${pacotes.length !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setSaving(true);

            const { data: recData, error: recError } = await supabase
              .from('svc_recebimentos')
              .insert({
                nome_motorista: nomeMotorista.trim() || null,
                cpf_motorista: cpfMotorista.replace(/\D/g, '') || null,
                placa: placa.trim() || null,
                transportadora: transportadora.trim() || null,
                total_pacotes: pacotes.length,
              })
              .select()
              .single();

            if (recError) {
              setSaving(false);
              Alert.alert('Erro', recError.message);
              return;
            }

            const items: any[] = [];
            for (const p of pacotes) {
              let fotoUrl: string | null = null;
              if (p.foto_uri) fotoUrl = await uploadPhoto(p.foto_uri, p.codigo);
              items.push({
                recebimento_id: recData.id,
                codigo: p.codigo,
                tipo_entrada: p.tipo_entrada,
                foto_url: fotoUrl,
              });
            }

            await supabase.from('svc_recebimentos_pacotes').insert(items);

            setSaving(false);
            Alert.alert(
              '✅ Recebimento Registrado!',
              `${pacotes.length} pacote${pacotes.length !== 1 ? 's' : ''} registrado${pacotes.length !== 1 ? 's' : ''} com sucesso.`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
          },
        },
      ]
    );
  }

  const typeIcon = (t: string) => t === 'scanner' ? '📷' : t === 'manual' ? '⌨️' : '📸';

  // Scanner
  if (inputMode === 'scanner') {
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
      <View style={styles.scannerContainer}>
        <CameraView style={styles.camera} facing="back" enableTorch={flashEnabled}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'datamatrix'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.scanOverlay}>
          <SafeAreaView>
            <View style={styles.scanHeader}>
              <TouchableOpacity onPress={() => setInputMode('none')} style={styles.scanBackBtn}>
                <Text style={styles.scanBackText}>✓ Feito ({pacotes.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFlashEnabled((f) => !f)} style={styles.flashBtn}>
                <Text style={styles.flashBtnText}>{flashEnabled ? '🔦 ON' : '🔦 OFF'}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          <View style={styles.scanCounter}>
            <Text style={styles.scanCounterText}>{pacotes.length} para receber</Text>
          </View>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          {lastScanned ? (
            <View style={[styles.scanResult, { backgroundColor: lastScanned.startsWith('⚠️') ? COLORS.orange : COLORS.green }]}>
              <Text style={styles.scanResultText}>{lastScanned}</Text>
            </View>
          ) : (
            <View style={styles.scanHint}><Text style={styles.scanHintText}>Aponte para o código do pacote</Text></View>
          )}
          {pacotes.length > 0 && (
            <View style={styles.recentList}>
              <Text style={styles.recentLabel}>Na lista ({pacotes.length}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pacotes.slice(0, 8).map((p, i) => (
                  <View key={i} style={styles.recentChip}><Text style={styles.recentChipText}>{p.codigo.slice(-8)}</Text></View>
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
          <Text style={styles.sectionLabel}>DADOS DO MOTORISTA (opcional)</Text>
          <Card>
            <Text style={styles.fieldLabel}>Nome</Text>
            <TextInput style={styles.input} placeholder="Nome do motorista" value={nomeMotorista} onChangeText={setNomeMotorista} autoCapitalize="words" />
            <Text style={styles.fieldLabel}>CPF</Text>
            <TextInput style={styles.input} placeholder="000.000.000-00" value={cpfMotorista} onChangeText={(t) => setCpfMotorista(formatCPF(t))} keyboardType="number-pad" maxLength={14} />
            <Text style={styles.fieldLabel}>Placa</Text>
            <TextInput style={styles.input} placeholder="ABC1234" value={placa} onChangeText={(t) => setPlaca(formatPlaca(t))} autoCapitalize="characters" maxLength={7} />
            <Text style={styles.fieldLabel}>Transportadora</Text>
            <TextInput style={styles.input} placeholder="Ex: Total Express" value={transportadora} onChangeText={setTransportadora} autoCapitalize="words" />
          </Card>

          <Text style={styles.sectionLabel}>PACOTES RECEBIDOS ({pacotes.length})</Text>

          <View style={styles.addButtons}>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: COLORS.black }]}
              onPress={async () => { if (!cameraPermission?.granted) await requestCameraPermission(); setInputMode('scanner'); }}>
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
              <TextInput style={styles.manualInput} placeholder="Digite o código..." value={manualCode} onChangeText={setManualCode} autoCapitalize="characters" autoFocus
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
              <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Código visível na foto" value={photoCode} onChangeText={setPhotoCode} autoCapitalize="characters" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.gray, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: COLORS.black, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F8F8F8', borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.grayBorder, padding: 12, fontSize: 15, color: COLORS.black },
  addButtons: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  addBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  addBtnIcon: { fontSize: 22, marginBottom: 4 },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  manualInput: { borderWidth: 2, borderColor: COLORS.yellow, borderRadius: 10, padding: 12, fontSize: 16, textAlign: 'center', color: COLORS.black, fontWeight: '700', fontFamily: 'monospace', backgroundColor: '#FFFEF0' },
  photoPreview: { width: '100%', height: 160, borderRadius: 10, marginBottom: 8 },
  pacoteRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: COLORS.grayBorder },
  pacoteIcon: { fontSize: 18, marginRight: 10, width: 26 },
  pacoteCodigo: { flex: 1, fontSize: 13, color: COLORS.black, fontFamily: 'monospace', fontWeight: '600' },
  pacoteRemove: { color: COLORS.red, fontSize: 18, fontWeight: '700', paddingHorizontal: 6 },
  emptyCard: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { color: COLORS.gray, fontSize: 14 },
  // Scanner
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  scanOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  scanBackBtn: { padding: 8 },
  scanBackText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  flashBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  flashBtnText: { color: COLORS.white, fontWeight: '700' },
  scanCounter: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  scanCounterText: { color: COLORS.yellow, fontWeight: '800', fontSize: 15 },
  scanFrame: { width: 260, height: 160, alignSelf: 'center', position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: COLORS.yellow, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
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
