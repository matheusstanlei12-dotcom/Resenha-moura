-- Atualizar tabela de Gastos para incluir a Forma de Pagamento
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'Outros';
