-- Tabela de Cartões para Gastos
CREATE TABLE IF NOT EXISTS public.cartoes_gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    bandeira TEXT NOT NULL,
    banco TEXT,
    cor TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para Cartões
ALTER TABLE public.cartoes_gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso Total Cartoes" ON public.cartoes_gastos;
CREATE POLICY "Acesso Total Cartoes" ON public.cartoes_gastos FOR ALL USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dono'))
);

-- Atualizar Tabela de Gastos com novas colunas
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'Dinheiro';
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES public.cartoes_gastos(id);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cartoes_gastos;

-- Recarregar cache
NOTIFY pgrst, 'reload schema';
