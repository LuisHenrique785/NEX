import React, { useEffect, useState } from 'react';
import {
  View, Text, SafeAreaView, TextInput, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  TouchableOpacity, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, Button, Card } from '../../src/components/ui';
import { useTheme } from '../../src/lib/theme';
import { useNodoAuth } from '../../src/lib/auth';
import { useDemo } from '../../src/lib/demo';

export default function AgenciaLoginScreen() {
  const { theme } = useTheme();
  const { session, authLoading, login } = useNodoAuth();
  const { isDemo } = useDemo();

  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  // Se já logado, redireciona para a home da agência
  useEffect(() => {
    if (!authLoading && session) {
      router.replace(`/agencia/${session.nodoId}`);
    }
  }, [authLoading, session]);

  async function handleLogin() {
    const codigoNorm = codigo.trim().toUpperCase();
    const senhaNorm = senha.trim();

    if (!codigoNorm) { Alert.alert('Atenção', 'Informe o código do NODO.'); return; }
    if (!senhaNorm) { Alert.alert('Atenção', 'Informe a senha.'); return; }

    setLoading(true);
    try {
      const { data: nodo, error } = await supabase
        .from('nodos')
        .select('id, codigo, nome, senha, senha_alterada')
        .eq('codigo', codigoNorm)
        .eq('ativo', true)
        .single();

      if (error || !nodo) {
        Alert.alert('NODO não encontrado', 'Verifique o código e tente novamente.');
        return;
      }

      if (nodo.senha !== senhaNorm) {
        Alert.alert('Senha incorreta', 'Verifique a senha e tente novamente.');
        return;
      }

      // Primeiro acesso: senha ainda não foi alterada
      if (!nodo.senha_alterada) {
        router.push(
          `/agencia/trocar-senha?nodoId=${nodo.id}&codigo=${encodeURIComponent(nodo.codigo)}&nome=${encodeURIComponent(nodo.nome)}`
        );
        return;
      }

      await login({ nodoId: nodo.id, nodoCodigo: nodo.codigo, nodoNome: nodo.nome });
      router.replace(`/agencia/${nodo.id}`);
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    const codigoNorm = codigo.trim().toUpperCase();
    if (!codigoNorm) { Alert.alert('Atenção', 'Informe o código do NODO.'); return; }

    setLoading(true);
    try {
      const { data: nodo } = await supabase
        .from('nodos')
        .select('id, codigo, nome')
        .eq('codigo', codigoNorm)
        .eq('ativo', true)
        .single();

      if (!nodo) {
        Alert.alert('NODO não encontrado', 'Verifique o código e tente novamente.');
        return;
      }

      router.replace(`/agencia/${nodo.id}`);
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Erro ao buscar NODO.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={COLORS.yellow} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">

          <Text style={{ fontSize: 52, textAlign: 'center', marginBottom: 14 }}>🏪</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: theme.text, textAlign: 'center', marginBottom: 6 }}>
            Acesso da Agência
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSec, textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
            Entre com o código e senha do seu NODO
          </Text>

          {isDemo && (
            <View style={{
              backgroundColor: '#FF6B0022', borderWidth: 1.5, borderColor: '#FF6B0055',
              borderRadius: 12, padding: 12, marginBottom: 20,
            }}>
              <Text style={{ fontSize: 13, color: '#FF6B00', fontWeight: '700', textAlign: 'center' }}>
                🎭 MODO DEMO — Digite o código do NODO para acessar sem senha
              </Text>
            </View>
          )}

          <Card style={{ padding: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Código do NODO
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.input, borderRadius: 12, borderWidth: 1.5,
                borderColor: theme.inputBorder, padding: 14, fontSize: 20, color: theme.text,
                fontWeight: '800', fontFamily: 'monospace', marginBottom: 16, letterSpacing: 3,
                textAlign: 'center',
              }}
              placeholder="Ex: SMG3"
              placeholderTextColor={theme.textTer}
              value={codigo}
              onChangeText={(t) => setCodigo(t.toUpperCase().replace(/\s/g, ''))}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType={isDemo ? 'done' : 'next'}
              onSubmitEditing={isDemo ? handleDemoLogin : undefined}
            />

            {!isDemo && (
              <>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Senha
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <TextInput
                    style={{
                      flex: 1, backgroundColor: theme.input, borderRadius: 12, borderWidth: 1.5,
                      borderColor: theme.inputBorder, padding: 14, fontSize: 18, color: theme.text,
                      fontWeight: '700',
                    }}
                    placeholder="Senha"
                    placeholderTextColor={theme.textTer}
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!showSenha}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowSenha(v => !v)}
                    style={{ padding: 14, marginLeft: 4 }}
                  >
                    <Text style={{ fontSize: 18 }}>{showSenha ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Button
              label={isDemo ? 'Acessar (Demo)' : 'Entrar'}
              onPress={isDemo ? handleDemoLogin : handleLogin}
              loading={loading}
            />
          </Card>

          {!isDemo && (
            <Text style={{ textAlign: 'center', color: theme.textTer, fontSize: 12, marginTop: 16, lineHeight: 18 }}>
              No primeiro acesso, a senha é o próprio código do NODO.{'\n'}
              Você será solicitado a criar uma nova senha.
            </Text>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
