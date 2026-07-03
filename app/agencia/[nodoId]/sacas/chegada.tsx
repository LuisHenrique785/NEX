import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, Alert, KeyboardAvoidingView, Platform, Modal, TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { COLORS, Button, Card } from '../../../../src/components/ui';
import { useTheme } from '../../../../src/lib/theme';
import { useDemo } from '../../../../src/lib/demo';

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    flex: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },
    infoCard: {
      alignItems: 'center',
      paddingVertical: 28,
      marginBottom: 12,
      backgroundColor: theme.isDark ? theme.surfaceAlt : '#F0FFF4',
      borderWidth: 1.5,
      borderColor: COLORS.green + '44',
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
      fontSize: 18,
      color: theme.text,
      fontWeight: '600',
    },
    textArea: { fontSize: 15, fontWeight: '400', minHeight: 80, textAlignVertical: 'top' },
    saveBtn: { marginTop: 28 },
    horarioRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
    horarioBtn: {
      flex: 1, paddingVertical: 14, paddingHorizontal: 10,
      borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    horarioBtnText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalBox: { backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: theme.text, marginBottom: 8 },
    modalText: { fontSize: 14, color: theme.textSec, lineHeight: 20, marginBottom: 24 },
    modalBtns: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  });
}

export default function SacasChegadaScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { isDemo } = useDemo();
  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();

  const [quantidade, setQuantidade] = useState('');
  const [dentroHorario, setDentroHorario] = useState<boolean | null>(null);
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [resultModal, setResultModal] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleSave() {
    const qtd = parseInt(quantidade);
    if (!quantidade || isNaN(qtd) || qtd <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida de sacas.');
      return;
    }
    if (dentroHorario === null) {
      Alert.alert('Atenção', 'Informe se a chegada foi dentro ou fora do horário.');
      return;
    }
    setConfirmModal(true);
  }

  async function doSave() {
    const qtd = parseInt(quantidade);
    setConfirmModal(false);

    if (isDemo) {
      setResultModal({ ok: true, msg: `Chegada de ${qtd} saca${qtd !== 1 ? 's' : ''} registrada (modo demonstração).` });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('sacas_movimentos').insert({
      nodo_id: nodoId,
      tipo: 'chegada',
      quantidade: qtd,
      dentro_horario: dentroHorario,
      observacao: observacao.trim() || null,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Erro', error.message);
      return;
    }

    setResultModal({ ok: true, msg: `Chegada de ${qtd} saca${qtd !== 1 ? 's' : ''} registrada com sucesso.` });
  }

  const qtd = parseInt(quantidade) || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container}>
          <Card style={styles.infoCard}>
            <Text style={styles.infoIcon}>📥</Text>
            <Text style={styles.infoTitle}>Chegada de Sacas</Text>
            <Text style={styles.infoText}>
              Informe a quantidade de sacas que chegaram neste NODO.
            </Text>
          </Card>

          <Text style={styles.label}>Quantidade de Sacas *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 25"
            placeholderTextColor={theme.textTer}
            value={quantidade}
            onChangeText={(t) => setQuantidade(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            returnKeyType="done"
          />

          <Text style={styles.label}>Horário de Chegada *</Text>
          <View style={styles.horarioRow}>
            <TouchableOpacity
              style={[styles.horarioBtn, {
                backgroundColor: dentroHorario === true ? COLORS.green + '22' : theme.input,
                borderColor: dentroHorario === true ? COLORS.green : theme.inputBorder,
              }]}
              onPress={() => setDentroHorario(true)}
            >
              <Text style={[styles.horarioBtnText, { color: dentroHorario === true ? COLORS.green : theme.textSec }]}>
                ✅ Dentro do{'\n'}horário
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.horarioBtn, {
                backgroundColor: dentroHorario === false ? '#FF6B0022' : theme.input,
                borderColor: dentroHorario === false ? '#FF6B00' : theme.inputBorder,
              }]}
              onPress={() => setDentroHorario(false)}
            >
              <Text style={[styles.horarioBtnText, { color: dentroHorario === false ? '#FF6B00' : theme.textSec }]}>
                ⚠️ Fora do{'\n'}horário
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Observação (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ex: Carga do turno da manhã..."
            placeholderTextColor={theme.textTer}
            value={observacao}
            onChangeText={setObservacao}
            multiline
            numberOfLines={3}
            returnKeyType="done"
          />

          <Button
            label="Registrar Chegada"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirmar chegada</Text>
            <Text style={styles.modalText}>
              Registrar chegada de {qtd} saca{qtd !== 1 ? 's' : ''} neste NODO?
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border }]}
                onPress={() => setConfirmModal(false)}
              >
                <Text style={{ fontWeight: '700', color: theme.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.green }]}
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
            <Text style={styles.modalTitle}>{resultModal?.ok ? 'Registrado!' : 'Atenção'}</Text>
            <Text style={styles.modalText}>{resultModal?.msg}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: COLORS.green }]}
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
