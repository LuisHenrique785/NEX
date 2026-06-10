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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sacas_nodo ON sacas_movimentos(nodo_id);
CREATE INDEX IF NOT EXISTS idx_sacas_created ON sacas_movimentos(created_at DESC);

-- ============================================================
-- TABELA: pacotes_expedicoes (Expedições de pacotes)
-- ============================================================
CREATE TABLE IF NOT EXISTS pacotes_expedicoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nodo_id UUID REFERENCES nodos(id) NOT NULL,
  nome_motorista TEXT NOT NULL,
  cpf_motorista TEXT NOT NULL,
  placa TEXT NOT NULL,
  transportadora TEXT NOT NULL,
  total_pacotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
-- Row Level Security (RLS) - desabilitado para facilitar acesso
-- Em produção, configure conforme necessário
-- ============================================================
ALTER TABLE nodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacas_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_sacas_retornos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes_expedicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacotes_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE svc_recebimentos_pacotes ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (DROP antes para evitar conflito em re-execuções)
DROP POLICY IF EXISTS "Allow all" ON nodos;
DROP POLICY IF EXISTS "Allow all" ON sacas_movimentos;
DROP POLICY IF EXISTS "Allow all" ON pacotes_expedicoes;
DROP POLICY IF EXISTS "Allow all" ON pacotes_inventario;
DROP POLICY IF EXISTS "Allow all" ON svc_recebimentos;
DROP POLICY IF EXISTS "Allow all" ON svc_recebimentos_pacotes;
DROP POLICY IF EXISTS "Allow all" ON svc_sacas_retornos;
DROP POLICY IF EXISTS "Allow all storage" ON storage.objects;

CREATE POLICY "Allow all" ON nodos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON sacas_movimentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pacotes_expedicoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pacotes_inventario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON svc_recebimentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON svc_recebimentos_pacotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON svc_sacas_retornos FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all storage" ON storage.objects
  FOR ALL USING (bucket_id = 'pacotes-fotos') WITH CHECK (bucket_id = 'pacotes-fotos');
