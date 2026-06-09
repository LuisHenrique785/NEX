import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS, Button } from '../src/components/ui';
import { ADMIN_PIN } from '../src/config';

export default function HomeScreen() {
  const [adminModal, setAdminModal] = useState(false);
  const [pin, setPin] = useState('');

  function handleAdminAccess() {
    if (pin === ADMIN_PIN) {
      setAdminModal(false);
      setPin('');
      router.push('/admin/novos-nodos');
    } else {
      Alert.alert('PIN incorreto', 'Verifique o PIN e tente novamente.');
      setPin('');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>NEX</Text>
          </View>
          <Text style={styles.appName}>Sistema de Inventário</Text>
          <Text style={styles.appSubtitle}>Mercado Livre Logística</Text>
        </View>

        {/* Main Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.menuLabel}>Selecione seu perfil</Text>

          <TouchableOpacity
            style={[styles.bigCard, { backgroundColor: COLORS.yellow }]}
            onPress={() => router.push('/agencia')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigCardIcon}>🏪</Text>
            <View style={styles.bigCardText}>
              <Text style={styles.bigCardTitle}>Agência</Text>
              <Text style={styles.bigCardSubtitle}>Inventário, chegada e expedição</Text>
            </View>
            <Text style={styles.bigCardArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bigCard, { backgroundColor: COLORS.black }]}
            onPress={() => router.push('/svc')}
            activeOpacity={0.85}
          >
            <Text style={styles.bigCardIcon}>🏭</Text>
            <View style={styles.bigCardText}>
              <Text style={[styles.bigCardTitle, { color: COLORS.white }]}>SVC</Text>
              <Text style={[styles.bigCardSubtitle, { color: '#AAAAAA' }]}>
                Recebimento de pacotes
              </Text>
            </View>
            <Text style={[styles.bigCardArrow, { color: COLORS.white }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Button */}
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => setAdminModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.adminButtonIcon}>⚙️</Text>
          <Text style={styles.adminButtonText}>NOVOS NODOS</Text>
          <Text style={styles.adminButtonSub}>Sincronizar agências</Text>
        </TouchableOpacity>

        {/* Admin PIN Modal */}
        <Modal
          visible={adminModal}
          transparent
          animationType="fade"
          onRequestClose={() => { setAdminModal(false); setPin(''); }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🔒 Acesso Restrito</Text>
              <Text style={styles.modalSubtitle}>
                Digite o PIN de administrador para sincronizar os NODOS da planilha.
              </Text>
              <TextInput
                style={styles.pinInput}
                placeholder="PIN"
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                onSubmitEditing={handleAdminAccess}
              />
              <View style={styles.modalButtons}>
                <Button
                  label="Cancelar"
                  onPress={() => { setAdminModal(false); setPin(''); }}
                  variant="outline"
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  label="Confirmar"
                  onPress={handleAdminAccess}
                  variant="primary"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.yellow },
  container: {
    flexGrow: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    backgroundColor: COLORS.yellow,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: { color: COLORS.yellow, fontSize: 26, fontWeight: '900' },
  appName: { fontSize: 24, fontWeight: '900', color: COLORS.black, marginBottom: 4 },
  appSubtitle: { fontSize: 14, color: '#555', fontWeight: '500' },
  menuSection: {
    padding: 24,
    paddingTop: 28,
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  bigCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  bigCardIcon: { fontSize: 36, marginRight: 16 },
  bigCardText: { flex: 1 },
  bigCardTitle: { fontSize: 22, fontWeight: '900', color: COLORS.black },
  bigCardSubtitle: { fontSize: 13, color: '#444', marginTop: 3, fontWeight: '500' },
  bigCardArrow: { fontSize: 28, color: COLORS.black, opacity: 0.4 },
  adminButton: {
    margin: 24,
    marginTop: 0,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.grayBorder,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  adminButtonIcon: { fontSize: 28, marginBottom: 6 },
  adminButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.gray,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  adminButtonSub: { fontSize: 12, color: '#AAA', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: COLORS.gray, lineHeight: 20, marginBottom: 20 },
  pinInput: {
    borderWidth: 2,
    borderColor: COLORS.grayBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    color: COLORS.black,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row' },
});
