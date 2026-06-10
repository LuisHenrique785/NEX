import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, TextInput, Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { haversineDistance, geocodeAddress } from '../../src/lib/geocoding';
import { COLORS, Badge } from '../../src/components/ui';
import { MAX_DISTANCE_KM } from '../../src/config';
import { useTheme } from '../../src/lib/theme';
import { useDemo } from '../../src/lib/demo';

interface Nodo {
  id: string;
  codigo: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  lat: number | null;
  lng: number | null;
  distance?: number;
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { flex: 1 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
    loadingText: { marginTop: 12, color: theme.textSec, fontSize: 14 },
    searchBox: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchInput: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      padding: 12,
      fontSize: 15,
      color: theme.text,
    },
    list: { padding: 16, paddingBottom: 32 },
    nodoCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.2 : 0.06,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    nodoCardNearby: {
      borderColor: COLORS.yellow,
      backgroundColor: '#FFFEF0',
    },
    nodoCardLeft: { marginRight: 14 },
    nodoIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodoIconText: { fontSize: 22 },
    nodoCardContent: { flex: 1 },
    nodoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    nodoName: { fontSize: 15, fontWeight: '700', color: theme.text, flex: 1 },
    nodoCode: { fontSize: 12, color: theme.textSec, fontWeight: '600', marginBottom: 4 },
    nodoAddress: { fontSize: 12, color: theme.textSec, lineHeight: 18, marginBottom: 2 },
    nodoDistance: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    arrow: { fontSize: 24, color: theme.border, marginLeft: 8 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyIcon: { fontSize: 60, marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: theme.textSec, textAlign: 'center', lineHeight: 20 },
    addressBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginTop: 10, marginBottom: 4,
      padding: 12, borderRadius: 12,
      backgroundColor: theme.surface,
      borderWidth: 1.5, borderColor: theme.border,
    },
    addressBtnText: { fontSize: 13, fontWeight: '700', color: theme.text, flex: 1 },
    addressBtnSub: { fontSize: 11, color: theme.textTer, flex: 1, marginTop: 1 },
  });
}

export default function SelectNodoScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { isDemo } = useDemo();

  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [filtered, setFiltered] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [addressModal, setAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [confirmNodo, setConfirmNodo] = useState<Nodo | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  useEffect(() => {
    loadNodosWithLocation();
  }, []);

  useEffect(() => {
    filterNodos();
  }, [search, nodos]);

  async function loadNodosWithLocation() {
    setLoading(true);
    setLocationError(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let userLat: number | null = null;
      let userLng: number | null = null;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        userLat = loc.coords.latitude;
        userLng = loc.coords.longitude;
        setUserLocation({ lat: userLat, lng: userLng });
      } else {
        setLocationError(true);
      }

      const { data, error } = await supabase
        .from('nodos')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      let processed: Nodo[] = (data || []).map((n) => {
        const dist =
          userLat && userLng && n.lat && n.lng
            ? haversineDistance(userLat, userLng, n.lat, n.lng)
            : null;
        return { ...n, distance: dist ?? undefined };
      });

      if (userLat && userLng) {
        processed = processed.sort((a, b) => {
          const da = a.distance ?? 99999;
          const db = b.distance ?? 99999;
          return da - db;
        });
      }

      setNodos(processed);
      setFiltered(processed);
    } catch (e: any) {
      setLocationError(true);
      Alert.alert('Erro', e.message || 'Não foi possível carregar os NODOS.');
    } finally {
      setLoading(false);
    }
  }

  function filterNodos() {
    if (!search.trim()) {
      setFiltered(nodos);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      nodos.filter(
        (n) =>
          n.nome.toLowerCase().includes(q) ||
          n.codigo?.toLowerCase().includes(q) ||
          n.endereco?.toLowerCase().includes(q) ||
          n.cidade?.toLowerCase().includes(q)
      )
    );
  }

  function handleSelectNodo(nodo: Nodo) {
    const isFar = userLocation && nodo.distance !== undefined && nodo.distance > MAX_DISTANCE_KM;
    const noCoords = !nodo.lat || !nodo.lng;

    // Modo demo: acesso direto sem bloqueio (banner laranja já avisa)
    if (isDemo) {
      router.push(`/agencia/${nodo.id}`);
      return;
    }

    // NODO sem coordenadas: exige confirmação (não conseguimos verificar distância)
    if (noCoords) {
      setConfirmNodo(nodo);
      setConfirmMessage(`O NODO "${nodo.nome}" não possui coordenadas cadastradas e não foi possível verificar a distância.\n\nConfirme que este é realmente o seu NODO.`);
      setConfirmModal(true);
      return;
    }

    // Muito distante (> MAX + 5km): bloqueio total
    if (userLocation && nodo.distance !== undefined && nodo.distance > MAX_DISTANCE_KM + 5) {
      Alert.alert(
        '🚫 Acesso negado',
        `O NODO "${nodo.nome}" está a ${nodo.distance.toFixed(1)}km de você.\n\nVocê precisa estar a menos de ${MAX_DISTANCE_KM}km do NODO para acessá-lo.`,
        [{ text: 'Entendi', style: 'cancel' }]
      );
      return;
    }

    // Entre MAX e MAX+5km: confirmação suave
    if (userLocation && nodo.distance !== undefined && nodo.distance > MAX_DISTANCE_KM) {
      setConfirmNodo(nodo);
      setConfirmMessage(`O NODO "${nodo.nome}" está a ${nodo.distance.toFixed(1)}km de você. Tem certeza que é o NODO correto?`);
      setConfirmModal(true);
      return;
    }

    router.push(`/agencia/${nodo.id}`);
  }

  async function handleAddressSearch() {
    const addr = addressInput.trim();
    if (!addr) return;
    setGeocoding(true);
    try {
      const coords = await geocodeAddress(addr);
      if (!coords) {
        Alert.alert('Endereço não encontrado', 'Não foi possível localizar esse endereço. Tente incluir a cidade e estado (ex: "Rua XV de Novembro 100, Belo Horizonte MG").');
        return;
      }
      setUserLocation(coords);
      setLocationError(false);
      setAddressModal(false);
      setAddressInput('');
      const withDist = nodos.map((n) => ({
        ...n,
        distance: n.lat && n.lng ? haversineDistance(coords.lat, coords.lng, n.lat, n.lng) : undefined,
      }));
      // Exibe APENAS NODOs dentro do raio — endereço manual não libera lista completa
      const nearby = withDist
        .filter((n) => n.distance !== undefined && n.distance <= MAX_DISTANCE_KM)
        .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
      if (nearby.length === 0) {
        Alert.alert(
          'Nenhum NODO próximo',
          `Não encontramos nenhum NODO a menos de ${MAX_DISTANCE_KM}km desse endereço.\n\nVerifique se o endereço está correto e inclui cidade e estado.`
        );
        return;
      }
      setNodos(nearby);
    } catch {
      Alert.alert('Erro', 'Não foi possível buscar o endereço. Verifique sua conexão.');
    } finally {
      setGeocoding(false);
    }
  }

  const AddressModal = () => (
    <Modal visible={addressModal} transparent animationType="fade" onRequestClose={() => setAddressModal(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 400 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8 }}>📍 Digitar Endereço</Text>
          <Text style={{ fontSize: 14, color: theme.textSec, lineHeight: 20, marginBottom: 20 }}>
            Digite o endereço da sua agência para encontrar os NODOs mais próximos.{'\n'}Ex: "Rua das Flores 123, São Paulo SP"
          </Text>
          <TextInput
            style={{
              borderWidth: 2, borderColor: theme.inputBorder, borderRadius: 12,
              padding: 14, fontSize: 15, color: theme.text,
              backgroundColor: theme.input, marginBottom: 20,
            }}
            placeholder="Endereço completo com cidade e estado"
            placeholderTextColor={theme.textTer}
            value={addressInput}
            onChangeText={setAddressInput}
            autoFocus
            onSubmitEditing={handleAddressSearch}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, alignItems: 'center' }}
              onPress={() => { setAddressModal(false); setAddressInput(''); }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textSec }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.yellow, alignItems: 'center', opacity: geocoding ? 0.6 : 1 }}
              onPress={handleAddressSearch}
              disabled={geocoding}
            >
              {geocoding
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={{ fontSize: 14, fontWeight: '800', color: '#000' }}>Buscar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Buscando NODOS próximos...</Text>
      </View>
    );
  }

  // ─── Blocked: no location and not in demo mode ────────────────
  if (!userLocation && !isDemo) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>📍</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text, marginBottom: 10, textAlign: 'center' }}>
            Localização necessária
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSec, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            Para garantir que você acessa apenas o seu NODO, precisamos confirmar sua localização.{'\n\n'}
            Ative a localização do dispositivo ou digite o endereço da sua agência.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.yellow, borderRadius: 14, padding: 16,
              width: '100%', alignItems: 'center', marginBottom: 12,
            }}
            onPress={loadNodosWithLocation}
            activeOpacity={0.85}
          >
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#000' }}>🔄 Tentar localização novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, padding: 16,
              width: '100%', alignItems: 'center', backgroundColor: theme.surface,
            }}
            onPress={() => setAddressModal(true)}
            activeOpacity={0.85}
          >
            <Text style={{ fontWeight: '800', fontSize: 15, color: theme.text }}>📍 Digitar meu endereço</Text>
          </TouchableOpacity>
        </View>
        <AddressModal />
      </SafeAreaView>
    );
  }

  // ─── Main screen ───────────────────────────────────────────────
  const demoNoLocation = isDemo && !userLocation;

  const renderItem = ({ item }: { item: Nodo }) => {
    const isNearby = item.distance !== undefined && item.distance <= MAX_DISTANCE_KM;
    const noCoords = !item.lat || !item.lng;
    return (
      <TouchableOpacity
        style={[styles.nodoCard, isNearby && styles.nodoCardNearby]}
        onPress={() => handleSelectNodo(item)}
        activeOpacity={0.8}
      >
        <View style={styles.nodoCardLeft}>
          <View style={[styles.nodoIcon, { backgroundColor: isNearby ? COLORS.yellow : '#F0F0F0' }]}>
            <Text style={styles.nodoIconText}>{isNearby ? '📍' : '🏪'}</Text>
          </View>
        </View>
        <View style={styles.nodoCardContent}>
          <View style={styles.nodoCardHeader}>
            <Text style={styles.nodoName} numberOfLines={1}>{item.nome}</Text>
            {isNearby && <Badge label="Próximo" color={COLORS.green} />}
            {noCoords && <Badge label="⚠️ Sem coords" color={COLORS.orange} />}
          </View>
          {item.codigo && <Text style={styles.nodoCode}>{item.codigo}</Text>}
          {item.endereco ? (
            <Text style={styles.nodoAddress} numberOfLines={2}>
              📌 {item.endereco}{item.cidade ? `, ${item.cidade}` : ''}
            </Text>
          ) : null}
          {item.distance !== undefined && (
            <Text style={[styles.nodoDistance, { color: isNearby ? COLORS.green : theme.textSec }]}>
              📏 {item.distance < 1 ? `${(item.distance * 1000).toFixed(0)}m` : `${item.distance.toFixed(1)}km`} de você
            </Text>
          )}
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {demoNoLocation && (
          <View style={{
            backgroundColor: '#FF6B0022', borderWidth: 1, borderColor: '#FF6B0055',
            borderRadius: 12, padding: 12, margin: 12, marginBottom: 0,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text style={{ flex: 1, fontSize: 12, color: '#FF6B00', fontWeight: '700', lineHeight: 17 }}>
              MODO DEMO: Localização não detectada. No modo real o acesso seria bloqueado.
            </Text>
          </View>
        )}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍  Buscar por nome, código ou cidade..."
            placeholderTextColor={theme.textTer}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="always"
          />
        </View>

        <TouchableOpacity style={styles.addressBtn} onPress={() => setAddressModal(true)} activeOpacity={0.7}>
          <Text style={{ fontSize: 18 }}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.addressBtnText}>Digitar meu endereço</Text>
            <Text style={styles.addressBtnSub}>Use se o seu NODO não aparecer próximo</Text>
          </View>
          <Text style={{ fontSize: 16, color: theme.textTer }}>›</Text>
        </TouchableOpacity>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyText}>Nenhum NODO encontrado.</Text>
            <Text style={styles.emptySubtext}>
              {nodos.length === 0
                ? 'Cadastre os NODOS na tela inicial com "NOVOS NODOS".'
                : 'Tente outra busca ou use "Digitar meu endereço".'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <AddressModal />

      {/* Confirm NODO Modal */}
      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8 }}>⚠️ Confirmar seleção</Text>
            <Text style={{ fontSize: 14, color: theme.textSec, lineHeight: 20, marginBottom: 20 }}>
              {confirmMessage}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, alignItems: 'center' }}
                onPress={() => setConfirmModal(false)}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textSec }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.yellow, alignItems: 'center' }}
                onPress={() => { setConfirmModal(false); if (confirmNodo) router.push(`/agencia/${confirmNodo.id}`); }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#000' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
