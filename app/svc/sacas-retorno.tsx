import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, Alert, KeyboardAvoidingView, Platform, Modal, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, Button, Card } from '../../src/components/ui';
import { useTheme } from '../../src/lib/theme';
import { useDemo } from '../../src/lib/demo';

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    flex: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },
    infoCard: {
      alignItems: 'center',
      paddingVertical: 28,
      marginBottom: 12,
      backgroundColor: theme.isDark ? theme.surfaceAlt : '#FFF7ED',
      borderWidth: 1.5,
      borderColor: '#FF9500' + '44',
    },
    infoIcon: { fontSize: 48, marginBottom: 10 },
    infoTitle: { fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 6 },
    infoText: { fontSize: 14, color: theme.textSec, textAlign: 'center', lineHeight: 20 },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      marginTop: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: theme.input,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.inputBorder,
      padding: 14,
      fontSize: 16,
      color: theme.text,
      fontWeight: '600',
    },
    textArea: { minHeight: 80, textAlignVertical: 'top', fontWeight: '400' },
    saveBtn: { marginTop: 28 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: theme.text, marginBottom: 8 },
    modalText: { fontSize: 14, color: theme.textSec, lineHeight: 20, marginBottom: 24 },
    modalBtns: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  });
}

export default function SVCSacasRetornoScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { isDemo } = useDemo();

  const [placa, setPlaca] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [resultModal, setResultModal] = useState<{ ok: boolean; msg: string } | null>(null);

  function formatPlaca(text: string) {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  }

  function handleSave() {
    const qtd = parseInt(quantidade);
    if (!placa.trim()) {
      Alert.alert('Atenção', 'Informe a placa do veículo.');
      return;
    }
    if (!transportadora.trim()) {
      Alert.alert('Atenção', 'Informe a transportadora.');
      return;
    }
    if (!quantidade || isNaN(qtd) || qtd <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida de sacas.');
      return;
    }
    setConfirmModal(true);
  }

  async function doSave() {
    const qtd = parseInt(quantidade);
    setConfirmModal(false);

    if (isDemo) {
      setResultModal({ ok: true, msg: `${qtd} saca${qtd !== 1 ? 's' : ''} de retorno registrada${qtd !== 1 ? 's' : ''} (modo demonstração).` });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('svc_sacas_retornos').insert({
      placa: placa.trim(),
      transportadora: transportadora.trim(),
      quantidade: qtd,
      observacao: observacao.trim() || null,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }

    setResultModal({ ok: true, msg: `${qtd} saca${qtd !== 1 ? 's' : ''} de retorno registrada${qtd !== 1 ? 's' : ''} com sucesso.\n${transportadora.trim()} · ${placa.trim()}` });
  }

  const qtd = parseInt(quantidade) || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <Card style={styles.infoCard}>
            <Text style={styles.infoIcon}>↩️</Text>
            <Text style={styles.infoTitle}>Retorno de Sacas</Text>
            <Text style={styles.infoText}>
              Registre as sacas que retornaram ao SVC via transportadora.
            </Text>
          </Card>

          <Text style={styles.label}>Placa do Veículo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: ABC1234"
            placeholderTextColor={theme.textTer}
            value={placa}
            onChangeText={(t) => setPlaca(formatPlaca(t))}
            autoCapitalize="characters"
            maxLength={7}
            returnKeyType="next"
          />

          <Text style={styles.label}>Transportadora *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Total Express"
            placeholderTextColor={theme.textTer}
            value={transportadora}
            onChangeText={setTransportadora}
            returnKeyType="next"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Quantidade de Sacas *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 15"
            placeholderTextColor={theme.textTer}
            value={quantidade}
            onChangeText={(t) => setQuantidade(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            returnKeyType="next"
          />

          <Text style={styles.label}>Observação (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Observações adicionais..."
            placeholderTextColor={theme.textTer}
            value={observacao}
            onChangeText={setObservacao}
            multiline
            numberOfLines={3}
          />

          <Button
            label="Registrar Retorno"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirmar retorno</Text>
            <Text style={styles.modalText}>
              Registrar retorno de {qtd} saca{qtd !== 1 ? 's' : ''}?{'\n'}
              {transportadora.trim()} · {placa.trim()}
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border }]}
                onPress={() => setConfirmModal(false)}
              >
                <Text style={{ fontWeight: '700', color: theme.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#FF9500' }]}
                onPress={doSave}
              >
                <Text style={{ fontWeight: '800', color: '#fff' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!resultModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>
              {resultModal?.ok ? '✅' : '⚠️'}
            </Text>
            <Text style={styles.modalTitle}>{resultModal?.ok ? 'Retorno Registrado!' : 'Atenção'}</Text>
            <Text style={styles.modalText}>{resultModal?.msg}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: '#FF9500' }]}
              onPress={() => { setResultModal(null); router.back(); }}
            >
              <Text style={{ fontWeight: '800', color: '#fff' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
