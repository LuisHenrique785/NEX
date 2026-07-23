import React from 'react';
import {
  View, Text, StyleSheet, Linking, TouchableOpacity, SafeAreaView,
} from 'react-native';
import type { KillSwitchConfig } from '../lib/kill-switch';

interface Props {
  config: KillSwitchConfig;
}

export default function LockScreen({ config }: Props) {
  function call() {
    Linking.openURL(`tel:${config.contact.replace(/\D/g, '')}`);
  }

  function whatsapp() {
    const num = config.contact.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/55${num}`);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.icon}>🔒</Text>

        <Text style={s.title}>Sistema Suspenso</Text>
        <Text style={s.subtitle}>{config.message}</Text>

        <View style={s.priceCard}>
          <Text style={s.priceLabel}>Para continuar utilizando</Text>
          <Text style={s.price}>{config.price_label}</Text>
          <Text style={s.priceSub}>Contrate o plano e reative o acesso imediatamente.</Text>
        </View>

        <Text style={s.ctaLabel}>Entre em contato com o desenvolvedor</Text>
        <Text style={s.contact}>{config.contact}</Text>

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.btn, s.btnWhatsapp]} onPress={whatsapp} activeOpacity={0.85}>
            <Text style={s.btnText}>💬  WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnCall]} onPress={call} activeOpacity={0.85}>
            <Text style={s.btnText}>📞  Ligar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32,
  },
  icon: { fontSize: 64, marginBottom: 24 },
  title: {
    fontSize: 28, fontWeight: '900', color: '#FFFFFF',
    marginBottom: 10, textAlign: 'center',
  },
  subtitle: {
    fontSize: 15, color: '#888', textAlign: 'center',
    lineHeight: 22, marginBottom: 32,
  },
  priceCard: {
    width: '100%', backgroundColor: '#1A1A1A',
    borderRadius: 20, padding: 24, marginBottom: 28,
    borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center',
  },
  priceLabel: { fontSize: 13, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  price: { fontSize: 42, fontWeight: '900', color: '#FFD600', marginBottom: 10 },
  priceSub: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },
  ctaLabel: { fontSize: 13, color: '#666', marginBottom: 6, textAlign: 'center' },
  contact: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 28, letterSpacing: 1 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: {
    flex: 1, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  btnWhatsapp: { backgroundColor: '#25D366' },
  btnCall: { backgroundColor: '#2C2C2C', borderWidth: 1, borderColor: '#3A3A3A' },
  btnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
