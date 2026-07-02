-- ============================================================
-- NEX INVENTORY - Schema do Banco de Dados (Supabase)
-- Execute este SQL no editor SQL do seu projeto Supabase
-- ============================================================

-- Habilitar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: nodos (Agências/Pontos de distribuição)
-- ============================================================
CREATE TABLE IF NOT EXISTS nodos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT,
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  ativo BOOLEAN DEFAULT true,
  senha TEXT,
  senha_alterada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration para banco existente (execute no SQL Editor do Supabase):
-- ALTER TABLE nodos ADD COLUMN IF NOT EXISTS senha TEXT;
-- ALTER TABLE nodos ADD COLUMN IF NOT EXISTS senha_alterada BOOLEAN DEFAULT false;
-- UPDATE nodos SET senha = codigo WHERE senha IS NULL;

CREATE INDEX IF NOT EXISTS idx_nodos_ativo ON nodos(ativo);
CREATE INDEX IF NOT EXISTS idx_nodos_codigo ON nodos(codigo);

-- ============================================================
-- TABELA: sacas_movimentos (Inventário de Sacas)
-- ============================================================
CREATE TABLE IF NOT EXISTS sacas_movimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nodo_id UUID REFERENCES nodos(id) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('chegada', 'expedicao')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  placa TEXT,
  transportadora TEXT,
  observacao TEXT,
  dentro_horario BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration para tabelas existentes:
-- ALTER TABLE sacas_movimentos ADD COLUMN IF NOT EXISTS dentro_horario BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_sacas_nodo ON sacas_movimentos(nodo_id);
CREATE INDEX IF NOT EXISTS idx_sacas_created ON sacas_movimentos(created_at DESC);

-- ============================================================
-- TABELA: pacotes_expedicoes (Expedições de pacotes)
-- ============================================================
CREATE TABLE IF NOT EXISTS pacotes_expedicoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nodo_id UUID REFERENCES nodos(id) NOT NULL,
  nome_motorista TEXT,
  cpf_motorista TEXT,
  placa TEXT NOT NULL,
  transportadora TEXT NOT NULL,
  total_pacotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration para banco existente (execute no SQL Editor do Supabase):
-- ALTER TABLE pacotes_expedicoes ALTER COLUMN nome_motorista DROP NOT NULL;
-- ALTER TABLE pacotes_expedicoes ALTER COLUMN cpf_motorista DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expedicoes_nodo ON pacotes_expedicoes(nodo_id);
CREATE INDEX IF NOT EXISTS idx_expedicoes_created ON pacotes_expedicoes(created_at DESC);

-- ============================================================
-- TABELA: pacotes_inventario (Inventário físico de pacotes)
-- ============================================================
CREATE TABLE IF NOT EXISTS pacotes_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nodo_id UUID REFERENCES nodos(id) NOT NULL,
  codigo TEXT NOT NULL,
  tipo_entrada TEXT NOT NULL CHECK (tipo_entrada IN ('scanner', 'manual', 'foto')),
  foto_url TEXT,
  status TEXT NOT NULL DEFAULT 'inventoried' CHECK (status IN ('inventoried', 'expedited')),
  expedicao_id UUID REFERENCES pacotes_expedicoes(id),
  inventoried_at TIMESTAMPTZ DEFAULT NOW(),
  expedited_at TIMESTAMPTZ,
  UNIQUE(nodo_id, codigo, status)
);

CREATE INDEX IF NOT EXISTS idx_pacotes_nodo ON pacotes_inventario(nodo_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_codigo ON pacotes_inventario(codigo);
CREATE INDEX IF NOT EXISTS idx_pacotes_status ON pacotes_inventario(status);
CREATE INDEX IF NOT EXISTS idx_pacotes_inventoried ON pacotes_inventario(inventoried_at DESC);

-- ============================================================
-- TABELA: svc_recebimentos (Recebimentos no SVC)
-- ============================================================
CREATE TABLE IF NOT EXISTS svc_recebimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nodo_origem_id UUID REFERENCES nodos(id),
  nome_motorista TEXT,
  cpf_motorista TEXT,
  placa TEXT,
  transportadora TEXT,
  total_pacotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_svc_created ON svc_recebimentos(created_at DESC);

-- ============================================================
-- TABELA: svc_recebimentos_pacotes (Pacotes recebidos no SVC)
-- ============================================================
CREATE TABLE IF NOT EXISTS svc_recebimentos_pacotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recebimento_id UUID REFERENCES svc_recebimentos(id) NOT NULL,
  codigo TEXT NOT NULL,
  tipo_entrada TEXT NOT NULL CHECK (tipo_entrada IN ('scanner', 'manual', 'foto')),
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_svc_pacotes_recebimento ON svc_recebimentos_pacotes(recebimento_id);
CREATE INDEX IF NOT EXISTS idx_svc_pacotes_codigo ON svc_recebimentos_pacotes(codigo);

-- ============================================================
-- TABELA: svc_sacas_retornos (Retorno de sacas ao SVC)
-- ============================================================
CREATE TABLE IF NOT EXISTS svc_sacas_retornos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  placa TEXT NOT NULL,
  transportadora TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_svc_sacas_retornos_created ON svc_sacas_retornos(created_at DESC);

-- ============================================================
-- Storage bucket para fotos de pacotes
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pacotes-fotos', 'pacotes-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE nodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacas_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_sacas_retornos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes_expedicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_recebimentos_pacotes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Função auxiliar: retorna o nodo_id do usuário autenticado
-- (usa o email do Supabase Auth: {codigo}@nex.internal)
-- ============================================================
CREATE OR REPLACE FUNCTION nex_nodo_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM nodos
  WHERE lower(codigo) = split_part(lower(auth.email()), '@', 1)
    AND ativo = true
  LIMIT 1;
$$;

-- ============================================================
-- Policies por tabela
-- nodos: qualquer um lê (para login), só o próprio nodo escreve
-- sacas/pacotes: cada agência só vê/edita o seu nodo_id
-- svc/admin: acesso total (sem nodo_id específico)
-- ============================================================

-- DROP para re-execução limpa
DROP POLICY IF EXISTS "Allow all" ON nodos;
DROP POLICY IF EXISTS "Allow all" ON sacas_movimentos;
DROP POLICY IF EXISTS "Allow all" ON pacotes_expedicoes;
DROP POLICY IF EXISTS "Allow all" ON pacotes_inventario;
DROP POLICY IF EXISTS "Allow all" ON svc_recebimentos;
DROP POLICY IF EXISTS "Allow all" ON svc_recebimentos_pacotes;
DROP POLICY IF EXISTS "Allow all" ON svc_sacas_retornos;
DROP POLICY IF EXISTS "Allow all storage" ON storage.objects;
DROP POLICY IF EXISTS "Nodos: leitura publica" ON nodos;
DROP POLICY IF EXISTS "Nodos: escrita proprio" ON nodos;
DROP POLICY IF EXISTS "Sacas: proprio nodo" ON sacas_movimentos;
DROP POLICY IF EXISTS "Expedicoes: proprio nodo" ON pacotes_expedicoes;
DROP POLICY IF EXISTS "Inventario: proprio nodo" ON pacotes_inventario;
DROP POLICY IF EXISTS "SVC recebimentos: acesso total" ON svc_recebimentos;
DROP POLICY IF EXISTS "SVC pacotes: acesso total" ON svc_recebimentos_pacotes;
DROP POLICY IF EXISTS "SVC sacas retornos: acesso total" ON svc_sacas_retornos;

-- nodos: SELECT aberto (necessário para o login buscar por codigo)
-- UPDATE restrito ao próprio nodo (troca de senha)
CREATE POLICY "Nodos: leitura publica" ON nodos
  FOR SELECT USING (true);

CREATE POLICY "Nodos: escrita proprio" ON nodos
  FOR UPDATE USING (id = nex_nodo_id())
  WITH CHECK (id = nex_nodo_id());

-- sacas_movimentos: apenas o próprio nodo
CREATE POLICY "Sacas: proprio nodo" ON sacas_movimentos
  FOR ALL USING (nodo_id = nex_nodo_id())
  WITH CHECK (nodo_id = nex_nodo_id());

-- pacotes_expedicoes: apenas o próprio nodo
CREATE POLICY "Expedicoes: proprio nodo" ON pacotes_expedicoes
  FOR ALL USING (nodo_id = nex_nodo_id())
  WITH CHECK (nodo_id = nex_nodo_id());

-- pacotes_inventario: apenas o próprio nodo
CREATE POLICY "Inventario: proprio nodo" ON pacotes_inventario
  FOR ALL USING (nodo_id = nex_nodo_id())
  WITH CHECK (nodo_id = nex_nodo_id());

-- SVC e admin: acesso total (não têm nodo_id de agência)
CREATE POLICY "SVC recebimentos: acesso total" ON svc_recebimentos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "SVC pacotes: acesso total" ON svc_recebimentos_pacotes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "SVC sacas retornos: acesso total" ON svc_sacas_retornos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all storage" ON storage.objects
  FOR ALL USING (bucket_id = 'pacotes-fotos') WITH CHECK (bucket_id = 'pacotes-fotos');

-- ============================================================
-- NOTA: as policies de sacas/expedicoes/inventario dependem de
-- nex_nodo_id() que usa auth.email() do Supabase Auth.
-- Enquanto a integração com Supabase Auth não for configurada,
-- essas policies ficam abertas. Para ativar o bloqueio por API:
--   1. Crie um usuário Supabase Auth por nodo:
--      email: {codigo}@nex.internal, senha: a senha do nodo
--   2. O app usa supabase.auth.signInWithPassword() no login
--   3. As policies acima passam a funcionar automaticamente.
-- Até lá, o isolamento é garantido pelo layout guard no app.
-- ============================================================
