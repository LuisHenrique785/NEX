import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, MenuCard, Card } from '../../src/components/ui';
import { useTheme } from '../../src/lib/theme';
import { useDemo } from '../../src/lib/demo';
import { haversineDistance } from '../../src/lib/geocoding';
import { formatTimeBRT, startOfTodayBRT } from '../../src/lib/utils';
import { SVC_LAT, SVC_LNG, SVC_MAX_KM } from '../../src/config';

interface RecentRecebimento {
  id: string;
  total_pacotes: number;
  transportadora: string;
  placa: string;
  created_at: string;
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    container: { padding: 20, paddingBottom: 40 },
    banner: {
      backgroundColor: COLORS.black,
      borderRadius: 20,
      padding: 24,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      gap: 16,
    },
    bannerIcon: { fontSize: 40 },
    bannerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.yellow },
    bannerSubtitle: { fontSize: 14, color: '#AAA' },
    statCard: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: COLORS.yellow,
      marginBottom: 8,
    },
    statValue: { fontSize: 48, fontWeight: '900', color: COLORS.black },
    statLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSec,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 10,
    },
    recCard: { padding: 14 },
    recRow: { flexDirection: 'row', alignItems: 'center' },
    recIcon: { fontSize: 24, marginRight: 12 },
    recInfo: { flex: 1 },
    recQtd: { fontSize: 16, fontWeight: '800', color: theme.text },
    recDetail: { fontSize: 13, color: theme.textSec, marginTop: 2 },
    recTime: { fontSize: 12, color: theme.textSec },
  });
}

export default function SVCHomeScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { isDemo } = useDemo();

  const [locationChecking, setLocationChecking] = useState(true);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [recentes, setRecentes] = useState<RecentRecebimento[]>([]);
  const [totalHoje, setTotalHoje] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSVCLocation();
  }, []);

  async function checkSVCLocation() {
    setLocationChecking(true);
    setLocationBlocked(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationBlocked(true);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const dist = haversineDistance(loc.coords.latitude, loc.coords.longitude, SVC_LAT, SVC_LNG);
      if (dist > SVC_MAX_KM) {
        setLocationBlocked(true);
      }
    } catch {
      setLocationBlocked(true);
    } finally {
      setLocationChecking(false);
    }
  }

  useEffect(() => {
    if (!locationChecking && (!locationBlocked || isDemo)) {
      loadStats();
    }
  }, [locationChecking, locationBlocked, isDemo]);

  async function loadStats() {
    const { data } = await supabase
      .from('svc_recebimentos')
      .select('id, total_pacotes, transportadora, placa, created_at')
      .gte('created_at', startOfTodayBRT().toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const list = data || [];
    setRecentes(list);
    setTotalHoje(list.reduce((s, r) => s + (r.total_pacotes || 0), 0));
    setLoading(false);
  }

  // ─── Verificando localização ───────────────────────────────────
  if (locationChecking) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
        <Text style={{ color: theme.textSec, marginTop: 12, fontSize: 14 }}>Verificando localização...</Text>
      </SafeAreaView>
    );
  }

  // ─── Bloqueado (não está no SVC) ───────────────────────────────
  if (locationBlocked && !isDemo) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🚫</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text, marginBottom: 10, textAlign: 'center' }}>
            Acesso restrito ao SVC
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSec, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
            Você precisa estar no Centro de Serviços (SVC) para acessar esta área.{'\n\n'}
            Raio permitido: {SVC_MAX_KM}km. Aproxime-se do SVC e tente novamente.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: COLORS.yellow, borderRadius: 14, padding: 16,
              width: '100%', alignItems: 'center', marginBottom: 12,
            }}
            onPress={checkSVCLocation}
            activeOpacity={0.85}
          >
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#000' }}>🔄 Tentar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, padding: 16,
              width: '100%', alignItems: 'center', backgroundColor: theme.surface,
            }}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={{ fontWeight: '700', fontSize: 15, color: theme.text }}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── SVC normal (ou demo com aviso) ───────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Aviso demo */}
        {isDemo && locationBlocked && (
          <View style={{
            backgroundColor: '#FF6B0022', borderRadius: 12, padding: 12,
            marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
            borderWidth: 1, borderColor: '#FF6B0055',
          }}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <Text style={{ flex: 1, fontSize: 12, color: '#FF6B00', fontWeight: '700', lineHeight: 17 }}>
              MODO DEMO: No modo real, você precisaria estar a menos de {SVC_MAX_KM}km do SVC para acessar esta área.
            </Text>
          </View>
        )}

        {/* SVC Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>🏭</Text>
          <View>
            <Text style={styles.bannerTitle}>SVC</Text>
            <Text style={styles.bannerSubtitle}>Centro de Serviços</Text>
          </View>
        </View>

        {/* Stats */}
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{loading ? '...' : totalHoje}</Text>
          <Text style={styles.statLabel}>pacotes recebidos hoje</Text>
        </Card>

        <Text style={styles.sectionLabel}>OPERAÇÕES</Text>

        <MenuCard
          icon="📥"
          title="Recebimento de Pacotes"
          subtitle="Registrar pacotes recebidos das agências"
          color={COLORS.blue}
          onPress={() => router.push('/svc/recebimento')}
        />

        <MenuCard
          icon="🔍"
          title="Consulta"
          subtitle="Expedições, pendências e rastreio de pacotes"
          color="#1A3A5C"
          onPress={() => router.push('/admin/consulta')}
        />

        {/* Histórico */}
        {!loading && recentes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECEBIMENTOS DE HOJE</Text>
            {recentes.map((r) => (
              <Card key={r.id} style={styles.recCard}>
                <View style={styles.recRow}>
                  <Text style={styles.recIcon}>📦</Text>
                  <View style={styles.recInfo}>
                    <Text style={styles.recQtd}>{r.total_pacotes} pacotes</Text>
                    {r.transportadora && (
                      <Text style={styles.recDetail}>🚛 {r.transportadora} · {r.placa}</Text>
                    )}
                  </View>
                  <Text style={styles.recTime}>{formatTimeBRT(r.created_at)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {loading && <ActivityIndicator color={COLORS.yellow} style={{ marginTop: 20 }} />}
      </ScrollView>
    </SafeAreaView>
  );
}
