import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, Alert, KeyboardAvoidingView, Platform,
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
      backgroundColor: '#F0FFF4',
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
  });
}

export default function SacasChegadaScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const { isDemo } = useDemo();

  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    const qtd = parseInt(quantidade);
    if (!quantidade || isNaN(qtd) || qtd <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida de sacas.');
      return;
    }

    Alert.alert(
      'Confirmar chegada',
      `Registrar chegada de ${qtd} saca${qtd !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            if (isDemo) {
              Alert.alert('✅ [DEMO] Registrado!', `Chegada de ${qtd} saca${qtd !== 1 ? 's' : ''} registrada (modo demonstração).`, [
                { text: 'OK', onPress: () => router.back() },
              ]);
              return;
            }
            setLoading(true);
            const { error } = await supabase.from('sacas_movimentos').insert({
              nodo_id: nodoId,
              tipo: 'chegada',
              quantidade: qtd,
              observacao: observacao.trim() || null,
            });
            setLoading(false);

            if (error) {
              Alert.alert('Erro', error.message);
              return;
            }

            Alert.alert('✅ Registrado!', `Chegada de ${qtd} saca${qtd !== 1 ? 's' : ''} registrada com sucesso.`, [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            onChangeText={setQuantidade}
            keyboardType="number-pad"
            returnKeyType="done"
          />

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
    </SafeAreaView>
  );
}
