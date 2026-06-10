import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/lib/theme';
import { useDemo } from '../src/lib/demo';
import { Button } from '../src/components/ui';
import { ADMIN_PIN } from '../src/config';

const DEMO_PASSWORD = 'MELI@7852';

export default function HomeScreen() {
  const { theme, toggle } = useTheme();
  const { isDemo, enterDemo, exitDemo } = useDemo();
  const [adminModal, setAdminModal] = useState(false);
  const [pin, setPin] = useState('');
  const [demoModal, setDemoModal] = useState(false);
  const [demoPass, setDemoPass] = useState('');

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

  function handleDemoAccess() {
    if (demoPass === DEMO_PASSWORD) {
      setDemoModal(false);
      setDemoPass('');
      enterDemo();
    } else {
      Alert.alert('Senha incorreta', 'Verifique a senha e tente novamente.');
      setDemoPass('');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.header }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, backgroundColor: theme.bg }}
        bounces={false}
      >
        {/* Hero Header */}
        <View style={{
          backgroundColor: theme.header,
          paddingTop: 24,
          paddingBottom: 48,
          paddingHorizontal: 24,
        }}>
          {/* Top row: logo + toggle */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 12,
                backgroundColor: theme.isDark ? '#FFE600' : '#1A1A1A',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: theme.isDark ? '#1A1A1A' : '#FFE600', fontSize: 18, fontWeight: '900' }}>N</Text>
              </View>
              <View>
                <Text style={{ fontSize: 20, fontWeight: '900', color: theme.headerText, letterSpacing: -0.5 }}>
                  NEX
                </Text>
                <Text style={{ fontSize: 11, color: theme.isDark ? '#AEAEB2' : '#555', fontWeight: '500', marginTop: -2 }}>
                  Inventário
                </Text>
              </View>
            </View>

            {/* Theme toggle */}
            <TouchableOpacity
              onPress={toggle}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: theme.isDark ? '#2C2C2E' : 'rgba(0,0,0,0.08)',
                borderRadius: 100,
                paddingVertical: 8,
                paddingHorizontal: 14,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16 }}>{theme.isDark ? '☀️' : '🌙'}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.isDark ? '#F2F2F7' : '#333' }}>
                {theme.isDark ? 'Claro' : 'Escuro'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={{ fontSize: 30, fontWeight: '900', color: theme.headerText, lineHeight: 34, marginBottom: 6 }}>
            Sistema de{'\n'}Inventário
          </Text>
          <Text style={{ fontSize: 14, color: theme.isDark ? '#AEAEB2' : '#555', fontWeight: '500' }}>
            Mercado Livre Logística
          </Text>
        </View>

        {/* Profile cards */}
        <View style={{ padding: 24, paddingTop: 28 }}>
          <Text style={{
            fontSize: 11, fontWeight: '800', color: theme.textTer,
            textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16,
          }}>
            Selecione seu perfil
          </Text>

          {/* Agência card */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.yellow,
              borderRadius: 20,
              padding: 24,
              marginBottom: 14,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#FFE600',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 6,
            }}
            onPress={() => router.push('/agencia')}
            activeOpacity={0.88}
          >
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: 'rgba(0,0,0,0.1)',
              alignItems: 'center', justifyContent: 'center', marginRight: 18,
            }}>
              <Text style={{ fontSize: 30 }}>🏪</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5 }}>
                Agência
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginTop: 3, fontWeight: '500' }}>
                Inventário, chegada e expedição
              </Text>
            </View>
            <Text style={{ fontSize: 28, color: 'rgba(0,0,0,0.25)' }}>›</Text>
          </TouchableOpacity>

          {/* SVC card */}
          <TouchableOpacity
            style={{
              backgroundColor: theme.isDark ? '#1C1C1E' : '#1A1A1A',
              borderRadius: 20,
              padding: 24,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 6,
              borderWidth: theme.isDark ? 1 : 0,
              borderColor: theme.isDark ? '#3A3A3C' : 'transparent',
            }}
            onPress={() => router.push('/svc')}
            activeOpacity={0.88}
          >
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: 'rgba(255,230,0,0.15)',
              alignItems: 'center', justifyContent: 'center', marginRight: 18,
            }}>
              <Text style={{ fontSize: 30 }}>🏭</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFE600', letterSpacing: -0.5 }}>
                SVC
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3, fontWeight: '500' }}>
                Recebimento de pacotes
              </Text>
            </View>
            <Text style={{ fontSize: 28, color: 'rgba(255,255,255,0.2)' }}>›</Text>
          </TouchableOpacity>

          {/* Consulta button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#1A3A5C',
              borderRadius: 20,
              padding: 24,
              marginTop: 14,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => router.push('/admin/consulta')}
            activeOpacity={0.88}
          >
            <View style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: 'rgba(100,180,255,0.15)',
              alignItems: 'center', justifyContent: 'center', marginRight: 18,
            }}>
              <Text style={{ fontSize: 30 }}>🔍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#64B4FF', letterSpacing: -0.5 }}>
                Consulta
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 3, fontWeight: '500' }}>
                Expedições, pendências e rastreio
              </Text>
            </View>
            <Text style={{ fontSize: 28, color: 'rgba(255,255,255,0.2)' }}>›</Text>
          </TouchableOpacity>

          {/* Admin button */}
          <TouchableOpacity
            style={{
              marginTop: 14,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: theme.border,
              borderStyle: 'dashed',
              padding: 20,
              alignItems: 'center',
              backgroundColor: theme.surface,
            }}
            onPress={() => setAdminModal(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 24, marginBottom: 6 }}>⚙️</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textSec, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Novos NODOS
            </Text>
            <Text style={{ fontSize: 12, color: theme.textTer, marginTop: 3 }}>
              Sincronizar agências
            </Text>
          </TouchableOpacity>

          {/* Demo Mode button */}
          <TouchableOpacity
            style={{
              marginTop: 14,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: isDemo ? '#FF6B00' : theme.border,
              padding: 20,
              alignItems: 'center',
              backgroundColor: isDemo ? '#FF6B0015' : theme.surface,
            }}
            onPress={() => isDemo ? exitDemo() : setDemoModal(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 24, marginBottom: 6 }}>🎭</Text>
            <Text style={{ fontSize: 13, fontWeight: '800', color: isDemo ? '#FF6B00' : theme.textSec, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {isDemo ? 'Sair do Demo' : 'Modo Demo'}
            </Text>
            <Text style={{ fontSize: 12, color: theme.textTer, marginTop: 3 }}>
              {isDemo ? 'Demo ativo — toque para encerrar' : 'Apresentação sem salvar dados'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Demo Mode Modal */}
      <Modal
        visible={demoModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setDemoModal(false); setDemoPass(''); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8 }}>
              🎭 Modo Demonstração
            </Text>
            <Text style={{ fontSize: 14, color: theme.textSec, lineHeight: 20, marginBottom: 20 }}>
              Nenhum dado será salvo no banco. Digite a senha para ativar.
            </Text>
            <TextInput
              style={{
                borderWidth: 2, borderColor: '#FF6B00', borderRadius: 12,
                padding: 14, fontSize: 18, letterSpacing: 4, textAlign: 'center',
                color: theme.text, backgroundColor: theme.input, marginBottom: 20,
              }}
              placeholder="Senha"
              placeholderTextColor={theme.textTer}
              value={demoPass}
              onChangeText={setDemoPass}
              secureTextEntry
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleDemoAccess}
            />
            <View style={{ flexDirection: 'row' }}>
              <Button
                label="Cancelar"
                onPress={() => { setDemoModal(false); setDemoPass(''); }}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                label="Ativar Demo"
                onPress={handleDemoAccess}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin PIN Modal */}
      <Modal
        visible={adminModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setAdminModal(false); setPin(''); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 28, width: '100%', maxWidth: 380 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: theme.text, marginBottom: 8 }}>
              🔒 Acesso Restrito
            </Text>
            <Text style={{ fontSize: 14, color: theme.textSec, lineHeight: 20, marginBottom: 20 }}>
              Digite o PIN de administrador para sincronizar os NODOS da planilha.
            </Text>
            <TextInput
              style={{
                borderWidth: 2, borderColor: theme.inputBorder, borderRadius: 12,
                padding: 14, fontSize: 24, letterSpacing: 8, textAlign: 'center',
                color: theme.text, backgroundColor: theme.input, marginBottom: 20,
              }}
              placeholder="PIN"
              placeholderTextColor={theme.textTer}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              onSubmitEditing={handleAdminAccess}
            />
            <View style={{ flexDirection: 'row' }}>
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
    </SafeAreaView>
  );
}
