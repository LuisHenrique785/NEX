import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../src/lib/supabase';
import { COLORS, Button, Card } from '../../../../src/components/ui';
import { useTheme } from '../../../../src/lib/theme';

function makeStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    flex: { flex: 1 },
    container: { padding: 20, paddingBottom: 40 },
    infoCard: {
      alignItems: 'center',
      paddingVertical: 28,
      marginBottom: 12,
      backgroundColor: '#EFF6FF',
      borderWidth: 1.5,
      borderColor: COLORS.blue + '44',
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
  });
}

export default function SacasExpedicaoScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const { nodoId } = useLocalSearchParams<{ nodoId: string }>();
  const [quantidade, setQuantidade] = useState('');
  const [placa, setPlaca] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  function formatPlaca(text: string) {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  }

  async function handleSave() {
    const qtd = parseInt(quantidade);
    if (!quantidade || isNaN(qtd) || qtd <= 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida de sacas.');
      return;
    }
    if (!placa.trim()) {
      Alert.alert('Atenção', 'Informe a placa do veículo.');
      return;
    }
    if (!transportadora.trim()) {
      Alert.alert('Atenção', 'Informe a transportadora.');
      return;
    }

    Alert.alert(
      'Confirmar expedição',
      `Registrar expedição de ${qtd} saca${qtd !== 1 ? 's' : ''} para ${transportadora.trim()} (${placa.trim()})?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setLoading(true);
            const { error } = await supabase.from('sacas_movimentos').insert({
              nodo_id: nodoId,
              tipo: 'expedicao',
              quantidade: qtd,
              placa: placa.trim(),
              transportadora: transportadora.trim(),
              observacao: observacao.trim() || null,
            });
            setLoading(false);

            if (error) {
              Alert.alert('Erro', error.message);
              return;
            }

            Alert.alert(
              '✅ Expedição Registrada!',
              `${qtd} saca${qtd !== 1 ? 's' : ''} expedida${qtd !== 1 ? 's' : ''} com sucesso.`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
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
            <Text style={styles.infoIcon}>📤</Text>
            <Text style={styles.infoTitle}>Expedição de Sacas</Text>
            <Text style={styles.infoText}>
              Informe os dados da expedição de sacas deste NODO.
            </Text>
          </Card>

          <Text style={styles.label}>Quantidade de Sacas *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 30"
            placeholderTextColor={theme.textTer}
            value={quantidade}
            onChangeText={setQuantidade}
            keyboardType="number-pad"
            returnKeyType="next"
          />

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
            label="Registrar Expedição"
            onPress={handleSave}
            loading={loading}
            variant="secondary"
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
