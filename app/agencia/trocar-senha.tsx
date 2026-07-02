import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, TextInput, Alert,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, Button, Card } from '../../src/components/ui';
import { useTheme } from '../../src/lib/theme';
import { useNodoAuth } from '../../src/lib/auth';

export default function TrocarSenhaScreen() {
  const { theme } = useTheme();
  const { login } = useNodoAuth();
  const { nodoId, codigo, nome } = useLocalSearchParams<{
    nodoId: string; codigo: string; nome: string;
  }>();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleTrocar() {
    const decodedCodigo = decodeURIComponent(codigo || '');
    const decodedNome = decodeURIComponent(nome || '');

    if (!novaSenha.trim()) { Alert.alert('Atenção', 'Informe a nova senha.'); return; }
    if (novaSenha.length < 4) { Alert.alert('Atenção', 'A senha deve ter pelo menos 4 caracteres.'); return; }
    if (novaSenha.toUpperCase() === decodedCodigo.toUpperCase()) {
      Alert.alert('Senha inválida', 'A nova senha não pode ser igual ao código do NODO.');
      return;
    }
    if (novaSenha !== confirmar) { Alert.alert('Atenção', 'As senhas não conferem.'); return; }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('nodos')
        .update({ senha: novaSenha, senha_alterada: true })
        .eq('id', nodoId);

      if (error) { Alert.alert('Erro', error.message); return; }

      await login({ nodoId, nodoCodigo: decodedCodigo, nodoNome: decodedNome });
      router.replace(`/agencia/${nodoId}`);
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Erro ao salvar senha.');
    } finally {
      setLoading(false);
    }
  }

  const decodedCodigo = decodeURIComponent(codigo || '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">

          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 14 }}>🔑</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text, textAlign: 'center', marginBottom: 8 }}>
            Crie sua senha
          </Text>

          <View style={{
            backgroundColor: COLORS.yellow + '22', borderWidth: 1.5, borderColor: COLORS.yellow + '66',
            borderRadius: 12, padding: 12, marginBottom: 24,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, textAlign: 'center' }}>
              Primeiro acesso — NODO {decodedCodigo}
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSec, textAlign: 'center', marginTop: 4 }}>
              Escolha uma senha nova. Ela não pode ser igual ao código do NODO.
            </Text>
          </View>

          <Card style={{ padding: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Nova senha
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <TextInput
                style={{
                  flex: 1, backgroundColor: theme.input, borderRadius: 12, borderWidth: 1.5,
                  borderColor: theme.inputBorder, padding: 14, fontSize: 18, color: theme.text, fontWeight: '700',
                }}
                placeholder="Mínimo 4 caracteres"
                placeholderTextColor={theme.textTer}
                value={novaSenha}
                onChangeText={setNovaSenha}
                secureTextEntry={!showNova}
                returnKeyType="next"
                autoFocus
              />
              <TouchableOpacity onPress={() => setShowNova(v => !v)} style={{ padding: 14, marginLeft: 4 }}>
                <Text style={{ fontSize: 18 }}>{showNova ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Confirmar senha
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <TextInput
                style={{
                  flex: 1, backgroundColor: theme.input, borderRadius: 12, borderWidth: 1.5,
                  borderColor: confirmar && confirmar !== novaSenha ? COLORS.red : theme.inputBorder,
                  padding: 14, fontSize: 18, color: theme.text, fontWeight: '700',
                }}
                placeholder="Repita a senha"
                placeholderTextColor={theme.textTer}
                value={confirmar}
                onChangeText={setConfirmar}
                secureTextEntry={!showConfirmar}
                returnKeyType="done"
                onSubmitEditing={handleTrocar}
              />
              <TouchableOpacity onPress={() => setShowConfirmar(v => !v)} style={{ padding: 14, marginLeft: 4 }}>
                <Text style={{ fontSize: 18 }}>{showConfirmar ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {confirmar && confirmar !== novaSenha && (
              <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '600', marginBottom: 12, textAlign: 'center' }}>
                As senhas não conferem
              </Text>
            )}

            <Button
              label="Salvar e Entrar"
              onPress={handleTrocar}
              loading={loading}
            />
          </Card>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
