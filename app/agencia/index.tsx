import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { haversineDistance } from '../../src/lib/geocoding';
import { COLORS, Card, Badge } from '../../src/components/ui';
import { MAX_DISTANCE_KM } from '../../src/config';

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

export default function SelectNodoScreen() {
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [filtered, setFiltered] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    loadNodosWithLocation();
  }, []);

  useEffect(() => {
    filterNodos();
  }, [search, nodos]);

  async function loadNodosWithLocation() {
    setLoading(true);
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

      // Sort: nearby first (within MAX_DISTANCE_KM), then rest alphabetically
      if (userLat && userLng) {
        const nearby = processed
          .filter((n) => n.distance !== undefined && n.distance <= MAX_DISTANCE_KM)
          .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        const far = processed.filter(
          (n) => n.distance === undefined || n.distance > MAX_DISTANCE_KM
        ).sort((a, b) => a.nome.localeCompare(b.nome));
        processed = [...nearby, ...far];
      }

      setNodos(processed);
      setFiltered(processed);
    } catch (e: any) {
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
    if (!userLocation && !locationError) return;

    if (
      userLocation &&
      nodo.lat &&
      nodo.lng &&
      nodo.distance !== undefined &&
      nodo.distance > MAX_DISTANCE_KM + 5
    ) {
      Alert.alert(
        'Confirmar seleção',
        `O NODO "${nodo.nome}" está a ${nodo.distance.toFixed(1)}km de você. Tem certeza que é o NODO correto?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', onPress: () => router.push(`/agencia/${nodo.id}`) },
        ]
      );
    } else {
      router.push(`/agencia/${nodo.id}`);
    }
  }

  const renderItem = ({ item }: { item: Nodo }) => {
    const isNearby = item.distance !== undefined && item.distance <= MAX_DISTANCE_KM;
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
          </View>
          {item.codigo && <Text style={styles.nodoCode}>{item.codigo}</Text>}
          {item.endereco ? (
            <Text style={styles.nodoAddress} numberOfLines={2}>
              📌 {item.endereco}{item.cidade ? `, ${item.cidade}` : ''}
            </Text>
          ) : null}
          {item.distance !== undefined && (
            <Text style={[styles.nodoDistance, { color: isNearby ? COLORS.green : COLORS.gray }]}>
              📏 {item.distance < 1 ? `${(item.distance * 1000).toFixed(0)}m` : `${item.distance.toFixed(1)}km`} de você
            </Text>
          )}
        </View>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={styles.loadingText}>Buscando NODOS próximos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {locationError && (
          <View style={styles.locationWarning}>
            <Text style={styles.locationWarningText}>
              ⚠️ Localização não disponível. Todos os NODOS são exibidos.
            </Text>
          </View>
        )}

        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍  Buscar por nome, código ou cidade..."
            value={search}
            onChangeText={setSearch}
            clearButtonMode="always"
          />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyText}>Nenhum NODO encontrado.</Text>
            <Text style={styles.emptySubtext}>
              {nodos.length === 0
                ? 'Cadastre os NODOS na tela inicial com "NOVOS NODOS".'
                : 'Tente outra busca.'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8F8' },
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 14 },
  locationWarning: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    margin: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.orange,
  },
  locationWarningText: { color: '#856404', fontSize: 13, fontWeight: '500' },
  searchBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.black,
  },
  list: { padding: 16, paddingBottom: 32 },
  nodoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
  nodoName: { fontSize: 15, fontWeight: '700', color: COLORS.black, flex: 1 },
  nodoCode: { fontSize: 12, color: COLORS.gray, fontWeight: '600', marginBottom: 4 },
  nodoAddress: { fontSize: 12, color: COLORS.gray, lineHeight: 18, marginBottom: 2 },
  nodoDistance: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  arrow: { fontSize: 24, color: COLORS.grayBorder, marginLeft: 8 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.black, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20 },
});
