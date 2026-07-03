import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, Modal,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { COLORS, MenuCard, Card } from '../../../src/components/ui';
import { useTheme } from '../../../src/lib/theme';
import { useNodoAuth } from '../../../src/lib/auth';
import { useDemo } from '../../../src/lib/demo';

interface Nodo {
  id: string;
  codigo: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
}

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { padding: 20, paddingBottom: 40 },
    nodoCard: { marginBottom: 8 },
    nodoHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    nodoIconBox: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: COLORS.yellow,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    nodoIconText: { fontSize: 26 },
    nodoInfo: { flex: 1 },
    nodoName: { fontSize: 17, fontWeight: '800', color: theme.text, marginBottom: 3 },
    nodoCode: { fontSize: 12, color: theme.textSec, fontWeight: '600', marginBottom: 4 },
    nodoAddress: { fontSize: 13, color: theme.textSec, lineHeight: 18 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSec,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 8,
      marginBottom: 8,
    },
  });
}

export default function AgenciaHomeScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { logout } = useNodoAuth();
  const { isDemo } = useDemo();

  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
  const navigation = useNavigation();
  const [nodo, setNodo] = useState<Nodo | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutModal, setLogoutModal] = useState(false);

  useEffect(() => {
    loadNodo();
  }, [nodoId]);

  useEffect(() => {
    if (nodo) {
      navigation.setOptions({
        title: nodo.nome,
        headerRight: () => !isDemo ? (
          <TouchableOpacity
            onPress={handleLogout}
            style={{ marginRight: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textSec }}>Sair</Text>
          </TouchableOpacity>
        ) : null,
      });
    }
  }, [nodo, theme]);

  function handleLogout() {
    setLogoutModal(true);
  }

  async function loadNodo() {
    const { data } = await supabase.from('nodos').select('*').eq('id', nodoId).single();
    setNodo(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* NODO Info */}
        <Card style={styles.nodoCard}>
          <View style={styles.nodoHeader}>
            <View style={styles.nodoIconBox}>
              <Text style={styles.nodoIconText}>🏪</Text>
            </View>
            <View style={styles.nodoInfo}>
              <Text style={styles.nodoName}>{nodo?.nome}</Text>
              {nodo?.codigo && <Text style={styles.nodoCode}>Código: {nodo.codigo}</Text>}
              {nodo?.endereco && (
                <Text style={styles.nodoAddress} numberOfLines={2}>
                  📌 {nodo.endereco}{nodo.cidade ? `, ${nodo.cidade}` : ''}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Menu */}
        <Text style={styles.sectionLabel}>O QUE DESEJA FAZER?</Text>

        <MenuCard
          icon="🎒"
          title="Inventário de Sacas"
          subtitle="Chegada e expedição de sacas"
          color={COLORS.orange}
          onPress={() => router.push(`/agencia/${nodoId}/sacas`)}
        />

        <MenuCard
          icon="📦"
          title="Inventário de Pacotes"
          subtitle="Inventário físico e expedição"
          color={COLORS.blue}
          onPress={() => router.push(`/agencia/${nodoId}/pacotes`)}
        />
      </ScrollView>

      <Modal visible={logoutModal} transparent animationType="fade" onRequestClose={() => setLogoutModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text, marginBottom: 8 }}>Sair da agência</Text>
            <Text style={{ fontSize: 14, color: theme.textSec, lineHeight: 20, marginBottom: 24 }}>
              Deseja sair? Você precisará fazer login novamente.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface }}
                onPress={() => setLogoutModal(false)}
              >
                <Text style={{ fontWeight: '700', color: theme.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: COLORS.red }}
                onPress={async () => { setLogoutModal(false); await logout(); router.replace('/agencia'); }}
              >
                <Text style={{ fontWeight: '800', color: '#fff' }}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
