-- Tabela de Gastos Mensais
CREATE TABLE IF NOT EXISTS public.gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    data_gasto TIMESTAMPTZ DEFAULT NOW(),
    categoria TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- Política de Acesso (Apenas Dono e Admin)
DROP POLICY IF EXISTS "Acesso Total Gastos" ON public.gastos;
CREATE POLICY "Acesso Total Gastos" ON public.gastos FOR ALL USING (
  EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dono'))
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gastos;

-- Recarregar cache do esquema
NOTIFY pgrst, 'reload schema';
