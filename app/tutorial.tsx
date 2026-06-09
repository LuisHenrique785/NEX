import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../src/lib/theme';
import type { Theme } from '../src/lib/theme';
import { COLORS } from '../src/components/ui';

type Perfil = 'agencia' | 'svc' | 'meli';

interface Step {
  icon: string;
  title: string;
  desc: string;
  tip?: string;
}

const STEPS: Record<Perfil, Step[]> = {
  agencia: [
    {
      icon: '🏪',
      title: 'Selecione sua Agência',
      desc: 'Na tela inicial, toque em "Agência". O app usa sua localização para encontrar a agência mais próxima. Confirme a unidade correta antes de continuar.',
    },
    {
      icon: '📦',
      title: 'Inventário de Pacotes',
      desc: 'Acesse "Pacotes" → "Inventário". Escaneie os códigos de barras dos pacotes com a câmera ou digite manualmente. Cada código é registrado com data e hora no sistema.',
      tip: 'Câmera traseira é selecionada automaticamente. Botão 🔄 troca para frontal se necessário.',
    },
    {
      icon: '📥',
      title: 'Chegada de Sacas',
      desc: 'Acesse "Sacas" → "Chegada". Informe a quantidade de sacas recebidas, a transportadora e a placa do veículo. Confirme para registrar.',
    },
    {
      icon: '🚚',
      title: 'Expedição de Pacotes',
      desc: 'Acesse "Pacotes" → "Expedição". Preencha os dados do motorista (nome, CPF, placa, transportadora), escaneie todos os pacotes que serão enviados e toque em "Confirmar Expedição".',
      tip: 'Só é possível confirmar após preencher todos os campos do motorista e adicionar pelo menos 1 pacote.',
    },
    {
      icon: '🚨',
      title: 'Pendências no SVC',
      desc: 'No Inventário, aparece a seção "Não Recebidos no SVC" com os pacotes que o motorista pegou mas o SVC ainda não confirmou o recebimento. Esses ficam como pendência até o SVC escanear.',
      tip: 'Se o motorista devolveu pacotes sem entregar, eles continuam pendentes aqui.',
    },
  ],
  svc: [
    {
      icon: '🏭',
      title: 'Acesse o SVC',
      desc: 'Na tela inicial, toque em "SVC". A tela principal mostra o total de pacotes recebidos hoje e o histórico dos últimos recebimentos do dia.',
    },
    {
      icon: '📥',
      title: 'Recebimento de Pacotes',
      desc: 'Toque em "Recebimento de Pacotes". Os dados do motorista são opcionais — preencha se quiser. Em seguida, escaneie todos os pacotes da carga recebida usando scanner, digitação manual ou foto.',
      tip: 'Você pode escanear centenas de pacotes em sequência. Códigos duplicados são avisados automaticamente.',
    },
    {
      icon: '✅',
      title: 'Confirmar Recebimento',
      desc: 'Após adicionar todos os pacotes, toque em "Confirmar Recebimento". Um modal de confirmação aparece — toque em "Confirmar" para gravar. O sistema volta automaticamente à tela inicial do SVC.',
    },
    {
      icon: '🔍',
      title: 'Consulta',
      desc: 'Toque em "Consulta" no menu SVC para acessar o painel. Requer senha. Veja expedições por agência, analise motoristas com divergências e rastreie pacotes individuais.',
    },
  ],
  meli: [
    {
      icon: '🔒',
      title: 'Acesso ao Consulta',
      desc: 'Na tela inicial ou no menu SVC, toque em "🔍 Consulta" e insira a senha. O painel tem 5 abas de análise.',
    },
    {
      icon: '📦',
      title: 'Aba Expedições',
      desc: 'Lista as últimas 60 expedições com resumo de quantos pacotes foram enviados, quantos chegaram no SVC e quantos estão pendentes. Badge vermelho = tem pendências.',
    },
    {
      icon: '🏪',
      title: 'Aba Por Agência',
      desc: 'Agrupa todos os pacotes expedidos por agência. Escolha o período (7, 15 ou 30 dias). Toque em "Ver X IDs" para ver todos os códigos com status. Botão "📥 Baixar CSV" exporta a relação da agência.',
      tip: 'Agências com mais pendências aparecem primeiro.',
    },
    {
      icon: '🚛',
      title: 'Aba Motoristas',
      desc: 'Análise de divergência por motorista: quantos pacotes pegou vs quantos entregou no SVC. Se houver diferença, mostra os IDs específicos que não chegaram — que voltam como pendência da agência.',
      tip: 'Motoristas com mais pacotes faltando aparecem no topo. CSV disponível por motorista.',
    },
    {
      icon: '🔍',
      title: 'Aba Buscar Pacote',
      desc: 'Digite qualquer código para ver o histórico completo: quando foi inventariado na agência, quando foi expedido e quando chegou no SVC. Se ainda não chegou, aparece "⚠️ Não recebido no SVC".',
    },
    {
      icon: '📥',
      title: 'Aba Exportar CSV',
      desc: 'Selecione data inicial e final e clique "Baixar CSV" para exportar o inventário completo do período. Colunas: Código, Agência, Status, Data Inventário, Data Expedição, Data Recebimento SVC. Todos os horários em BRT (UTC-3).',
      tip: 'No celular (app nativo) o download não está disponível — use a versão web pelo navegador.',
    },
  ],
};

const TABS: { key: Perfil; label: string; icon: string; color: string }[] = [
  { key: 'agencia', label: 'Agência', icon: '🏪', color: COLORS.yellow },
  { key: 'svc',     label: 'SVC',     icon: '🏭', color: '#1A1A1A' },
  { key: 'meli',    label: 'Meli',    icon: '🔍', color: '#1A3A5C' },
];

function makeStyles(t: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: {
      backgroundColor: t.header,
      paddingTop: 16, paddingBottom: 20, paddingHorizontal: 20,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: t.headerText },
    headerSub: { fontSize: 12, color: t.isDark ? '#AEAEB2' : '#777', marginTop: 2 },
    closeBtn: {
      backgroundColor: t.isDark ? '#2C2C2E' : 'rgba(0,0,0,0.08)',
      borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    },
    closeBtnText: { fontSize: 13, fontWeight: '700', color: t.isDark ? '#F2F2F7' : '#333' },

    tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 10 },
    tab: {
      flex: 1, paddingVertical: 12, borderRadius: 14,
      alignItems: 'center', borderWidth: 2, borderColor: t.border,
      backgroundColor: t.surface,
    },
    tabIcon: { fontSize: 22, marginBottom: 2 },
    tabLabel: { fontSize: 12, fontWeight: '800', color: t.textSec },

    container: { padding: 20, paddingBottom: 40 },

    stepCard: {
      backgroundColor: t.surface,
      borderRadius: 16,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: t.isDark ? 0.2 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    stepTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 8 },
    stepNum: {
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: COLORS.yellow, alignItems: 'center', justifyContent: 'center',
      marginTop: 2,
    },
    stepNumText: { fontSize: 13, fontWeight: '900', color: COLORS.black },
    stepIcon: { fontSize: 28 },
    stepTitle: { fontSize: 15, fontWeight: '800', color: t.text, flex: 1, flexWrap: 'wrap' },
    stepDesc: { fontSize: 13, color: t.textSec, lineHeight: 20, marginLeft: 42 },
    tipBox: {
      backgroundColor: t.isDark ? '#2C2C00' : '#FFFDE7',
      borderRadius: 10, padding: 10, marginTop: 10, marginLeft: 42,
      flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    },
    tipIcon: { fontSize: 14 },
    tipText: { fontSize: 12, color: t.isDark ? '#FFE600' : '#5D4037', lineHeight: 18, flex: 1 },
  });
}

export default function TutorialScreen() {
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(theme), [theme]);
  const [perfil, setPerfil] = useState<Perfil>('agencia');

  const steps = STEPS[perfil];
  const activeTab = TABS.find((t) => t.key === perfil)!;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tutorial NEX</Text>
          <Text style={styles.headerSub}>Guia de uso por perfil</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕ Fechar</Text>
        </TouchableOpacity>
      </View>

      {/* Tab selector */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tab,
              perfil === t.key && {
                backgroundColor: t.color,
                borderColor: t.color,
              },
            ]}
            onPress={() => setPerfil(t.key)}
            activeOpacity={0.8}
          >
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[
              styles.tabLabel,
              perfil === t.key && {
                color: t.key === 'agencia' ? COLORS.black : '#FFFFFF',
              },
            ]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Steps */}
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile banner */}
        <View style={{
          backgroundColor: activeTab.color,
          borderRadius: 16, padding: 18,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          marginBottom: 20, marginTop: 16,
        }}>
          <Text style={{ fontSize: 36 }}>{activeTab.icon}</Text>
          <View>
            <Text style={{
              fontSize: 20, fontWeight: '900',
              color: activeTab.key === 'agencia' ? COLORS.black : '#FFFFFF',
            }}>
              {activeTab.key === 'agencia' ? 'Perfil Agência'
                : activeTab.key === 'svc' ? 'Perfil SVC'
                : 'Perfil Meli / Consulta'}
            </Text>
            <Text style={{
              fontSize: 12, marginTop: 2,
              color: activeTab.key === 'agencia' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
            }}>
              {activeTab.key === 'agencia' ? 'Inventário, chegada e expedição de pacotes'
                : activeTab.key === 'svc' ? 'Recebimento e conferência de cargas'
                : 'Análise, consulta e exportação de dados'}
            </Text>
          </View>
        </View>

        {steps.map((step, i) => (
          <View key={i} style={styles.stepCard}>
            <View style={styles.stepTop}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>
            <Text style={styles.stepDesc}>{step.desc}</Text>
            {step.tip && (
              <View style={styles.tipBox}>
                <Text style={styles.tipIcon}>💡</Text>
                <Text style={styles.tipText}>{step.tip}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
