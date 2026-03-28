import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, Receipt, History as HistoryIcon, Printer, 
  Plus, Trash2, Calculator, ChevronLeft, Lock, DollarSign, Pickaxe, BookOpen,
  ShoppingCart, Store, Search, X, CheckCircle2, Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OwnerViewBanner } from '../components/OwnerViewBanner';

type TabType = 'mesas' | 'balcao' | 'historico' | 'cozinha' | 'fechamento';
type PaymentMethod = 'dinheiro' | 'pix' | 'cartao' | 'debito' | 'credito';

interface Payment {
  method: PaymentMethod;
  amount: number;
}

interface CartItem {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export const Caixa = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('mesas');
  const [mesasPendentes, setMesasPendentes] = useState<any[]>([]);
  const [pedidosAtivos, setPedidosAtivos] = useState<any[]>([]);
  const [historicoVendas, setHistoricoVendas] = useState<any[]>([]);
  const [cozinhaItems, setCozinhaItems] = useState<any[]>([]);
  const [printedItemIds, setPrintedItemIds] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [autoPrintKds, setAutoPrintKds] = useState(true);
  const [selectedPedidoDetail, setSelectedPedidoDetail] = useState<any>(null);
  const [itemsPedidoDetail, setItemsPedidoDetail] = useState<any[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  
  // Quick Sale (BalcÃ£o) State
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState<any>(null);
  const [checkoutItens, setCheckoutItens] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<Payment[]>([]);
  const [dividirPor, setDividirPor] = useState(1);
  const [valorRecebido, setValorRecebido] = useState<string>('');
  
  // Fechamento State
  const [fundoTroco, setFundoTroco] = useState<string>('0');
  const [sangria, setSangria] = useState<string>('0');
  const [dinheiroGaveta, setDinheiroGaveta] = useState<string>('');
  
  const { signOut, profile } = useAuth();

  const fetchData = async () => {
    try {
      // 1. Mesas Abertas
      const { data: mesas } = await supabase.from('mesas').select('*').eq('status', 'aguardando conta');
      setMesasPendentes(mesas || []);

      const { data: pedidos } = await supabase.from('pedidos')
        .select('*, profiles:garcom_id(full_name), mesas(numero)')
        .neq('status', 'finalizado');
      setPedidosAtivos(pedidos || []);

      // 1b. Itens para Cozinha/Bar (KDS)
      const { data: itensKds } = await supabase
         .from('itens_pedido')
         .select(`
           id, 
           pedido_id, 
           quantidade, 
           status,
           produtos(nome, categoria),
           pedidos(mesa_id, data_hora, mesas(numero))
         `)
         .in('status', ['pendente', 'em preparo']);

      if (itensKds) {
         const formatted = itensKds.map((i: any) => ({
           id: i.id,
           pedido_id: i.pedido_id,
           produto_nome: i.produtos?.nome,
           categoria: i.produtos?.categoria,
           quantidade: i.quantidade,
           status: i.status,
           mesa: i.pedidos?.mesas?.numero || 0,
           data_hora: i.pedidos?.data_hora
         }));
         const COQUITEIS_COZINHA = [
           "caipirinha cachaÃ§a", "caipivodka smirnoff", "caipivodka absolut",
           "gin tÃ´nica tanqueray", "gin tanqueray com red bull", "dry martini",
           "campari", "aperol"
         ];
         const filtered = formatted.filter((item: any) => {
           const cat = item.categoria?.toUpperCase();
           if (cat === 'PETISCO') return true;
           const nome = item.produto_nome?.trim().toLowerCase();
           return COQUITEIS_COZINHA.includes(nome);
         });
         // Ordenar por data_hora ASC (Antigos primeiro)
         filtered.sort((a: any, b: any) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
         setCozinhaItems(filtered);

         if (isInitialLoad && itensKds) {
            setPrintedItemIds(itensKds.map((i: any) => i.id));
            setIsInitialLoad(false);
         }
      }

      // 2. HistÃ³rico (Finalizados hoje)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const { data: historico } = await supabase.from('pedidos')
        .select('*, profiles:garcom_id(full_name), mesas(numero)')
        .eq('status', 'finalizado')
        .gte('finalizado_at', startOfDay)
        .order('finalizado_at', { ascending: false });
      setHistoricoVendas(historico || []);

      // 3. Produtos para Venda de BalcÃ£o
      const { data: prods } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome', { ascending: true });
      setProdutos(prods || []);

    } catch (err) {
      console.error("Erro ao carregar dados do caixa:", err);
    } finally {
      setLoading(false);
    }
  };

  const [lastAccountRequestCount, setLastAccountRequestCount] = useState(0);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, []);

  // Watcher para Imprimir AutomÃ¡tico Novos Itens de Cozinha
  useEffect(() => {
    if (isInitialLoad || !autoPrintKds) return;
    cozinhaItems.forEach(item => {
      if (!printedItemIds.includes(item.id)) {
        handleImprimirCozinha(item);
        setPrintedItemIds(prev => [...prev, item.id]);
      }
    });
  }, [cozinhaItems, printedItemIds, isInitialLoad, autoPrintKds]);

  // Monitorar solicitaÃ§Ãµes de conta (apenas contador visual para o caixa)
  useEffect(() => {
    const currentCount = mesasPendentes.filter(m => m.status === 'aguardando conta').length;
    setLastAccountRequestCount(currentCount);
  }, [mesasPendentes]);

  // --- LÃ³gica de Carrinho (BalcÃ£o) ---
  const addToCart = (product: any) => {
    const existing = carrinho.find(item => item.id === product.id);
    if (existing) {
      setCarrinho(carrinho.map(item => item.id === product.id ? { ...item, quantidade: item.quantidade + 1 } : item));
    } else {
      setCarrinho([...carrinho, { id: product.id, nome: product.nome, preco: Number(product.preco), quantidade: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
     setCarrinho(carrinho.filter(item => item.id !== id));
  };

  const updateCartQty = (id: string, delta: number) => {
    setCarrinho(carrinho.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantidade + delta);
        return { ...item, quantidade: newQty };
      }
      return item;
    }));
  };

  // --- LÃ³gica de Checkout ---
  const openTableCheckout = async (mesa: any) => {
    setSelectedMesa(mesa);
    setPagamentos([]);
    setValorRecebido('');
    setDividirPor(1);
    
    // Buscar pedidos da mesa diretamente para garantir que temos os dados mais frescos
    const { data: pedidosMesa } = await supabase.from('pedidos')
      .select('id')
      .eq('mesa_id', mesa.id)
      .neq('status', 'finalizado');

    if (!pedidosMesa || pedidosMesa.length === 0) {
      setCheckoutItens([]);
      setIsCheckoutOpen(true);
      return;
    }
    
    const { data: itens } = await supabase.from('itens_pedido')
      .select('*, produtos(nome)')
      .in('pedido_id', pedidosMesa.map(p => p.id));
    
    setCheckoutItens(itens?.map(i => ({
       id: i.id,
       nome: i.produtos?.nome,
       quantidade: i.quantidade,
       preco: Number(i.preco_unitario)
    })) || []);
    setIsCheckoutOpen(true);
  };

  const openQuickCheckout = () => {
    if (carrinho.length === 0) return;
    setSelectedMesa(null);
    setCheckoutItens([...carrinho]);
    setPagamentos([]);
    setValorRecebido('');
    setDividirPor(1);
    setIsCheckoutOpen(true);
  };

  const totalCheckout = useMemo(() => {
    return checkoutItens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  }, [checkoutItens]);

  // Taxa de serviÃ§o apenas para mesas que ficaram aguardando conta
  const taxaServico = selectedMesa ? totalCheckout * 0.1 : 0;
  const totalComTaxa = totalCheckout + taxaServico;
  const totalPago = pagamentos.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalRestante = Math.max(0, totalComTaxa - totalPago);

  // CÃ¡lculo de troco reativo (Baseado no que falta pagar ou no que foi pago em dinheiro)
  const valorInput = parseFloat(valorRecebido.replace(',', '.')) || 0;
  const totalEmDinheiro = pagamentos
    .filter(p => p.method === 'dinheiro')
    .reduce((acc, p) => acc + Number(p.amount), 0);
  
  // O troco deve ser: Valor Recebido - (o que falta pagar). 
  // Se jÃ¡ pagou tudo (totalRestante === 0), usa o total em dinheiro como base.
  const baseParaTroco = totalRestante > 0 ? totalRestante : totalEmDinheiro;
  const troco = valorInput > 0 ? Math.max(0, valorInput - baseParaTroco) : 0;

  const handleAddPayment = (method: PaymentMethod, amount: number) => {
    if (amount <= 0) return;
    setPagamentos([...pagamentos, { method, amount }]);
  };

  const handleFinalizar = async () => {
    if (totalRestante > 0.05) {
      alert("A conta ainda nÃ£o foi totalmente paga!");
      return;
    }

    try {
      const formaPagamentoStr = pagamentos.map(p => `${p.method.toUpperCase()} (R$${p.amount.toFixed(2)})`).join(', ');

      if (selectedMesa) {
        // Fluxo de Mesa: Finalizar TODOS os pedidos pendentes desta mesa diretamente no banco
        const { error: updateError } = await supabase.from('pedidos')
          .update({ 
            status: 'finalizado', 
            forma_pagamento: formaPagamentoStr,
            total: totalComTaxa,
            finalizado_at: new Date().toISOString()
          })
          .eq('mesa_id', selectedMesa.id)
          .neq('status', 'finalizado');

        if (updateError) throw updateError;

        await supabase.from('mesas').update({ status: 'livre', precisa_garcom: false }).eq('id', selectedMesa.id);
      } else {
        // Fluxo de BalcÃ£o (Venda Direta)
        const { data: newPedido, error: pErr } = await supabase.from('pedidos').insert({
          mesa_id: null,
          garcom_id: profile?.id,
          status: 'finalizado',
          total: totalCheckout,
          forma_pagamento: formaPagamentoStr,
          finalizado_at: new Date().toISOString()
        }).select().single();

        if (pErr) throw pErr;

        // Inserir itens
        const itensToInsert = checkoutItens.map(item => ({
          pedido_id: newPedido.id,
          produto_id: item.id,
          quantidade: item.quantidade,
          preco_unitario: item.preco,
          status: 'pronto'
        }));
        await supabase.from('itens_pedido').insert(itensToInsert);
        setCarrinho([]);
      }
      
      alert("Venda finalizada com sucesso! ðŸ’°");
      setIsCheckoutOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar venda.");
    }
  };

  const handleStatusChangeCozinha = async (itemId: string) => {
      const nextStatus = 'pronto';
      const updates: any = { 
        status: nextStatus,
        preparo_fim_at: new Date().toISOString()
      };

      const { error } = await supabase.from('itens_pedido').update(updates).eq('id', itemId);
      if (!error) fetchData();
  };

  const handleImprimirCozinha = (item: any) => {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 80] });
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('PEDIDO COZINHA', 40, 10, { align: 'center' });
      doc.line(5, 14, 75, 14);
      
      doc.setFontSize(10);
      doc.text(`MESA: ${item.mesa}`, 5, 20);
      doc.text(`HORA: ${new Date(item.data_hora).toLocaleTimeString()}`, 75, 20, { align: 'right' });
      doc.line(5, 24, 75, 24);

      doc.setFontSize(14);
      doc.text(`${item.quantidade}x ${item.produto_nome}`, 5, 32);
      
      doc.save(`Cozinha_${item.mesa}_${Date.now()}.pdf`);
    });
  };

  const handleVerDetalhes = async (pedido: any) => {
    setSelectedPedidoDetail(pedido);
    setItemsPedidoDetail([]); // Reset anterior
    const { data } = await supabase
      .from('itens_pedido')
      .select('*, produtos(nome)')
      .eq('pedido_id', pedido.id);
    
    if (data) setItemsPedidoDetail(data);
    setIsDetailModalOpen(true);
  };

  const handleImprimir = (itens: any[], finalizada = false) => {
    import('jspdf').then(({ default: jsPDF }) => {
      // Formato aproximado de bobina 80mm (A6 adaptado)
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 160] });
      const subtotal = itens.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
      const taxa = selectedMesa ? subtotal * 0.1 : 0;
      const total = subtotal + taxa;

      // CABEÃ‡ALHO
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('RESENHA DO MOURA', 40, 10, { align: 'center' });

      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text('Gastronomia & Entretenimento', 40, 14, { align: 'center' });
      doc.text('CNPJ: 00.000.000/0001-00', 40, 17, { align: 'center' });
      doc.line(5, 20, 75, 20);
      
      // INFO VENDA
      doc.setFontSize(8);
      doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, 5, 24);
      doc.text(`HORA: ${new Date().toLocaleTimeString('pt-BR')}`, 75, 24, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(selectedMesa ? `MESA: ${selectedMesa.numero}` : 'VENDA DE BALCÃƒO', 5, 28);
      doc.setFont('helvetica', 'normal');
      doc.text(`OP: ${profile?.full_name?.split(' ')[0]}`, 75, 28, { align: 'right' });
      doc.line(5, 30, 75, 30);
      
      // CABEÃ‡ALHO ITENS
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('QTD', 5, 34);
      doc.text('ITENS', 15, 34);
      doc.text('TOTAL', 75, 34, { align: 'right' });
      doc.line(5, 36, 75, 36);
      
      // LISTA DE ITENS
      let y = 40;
      doc.setFont('helvetica', 'normal');
      itens.forEach(item => {
        doc.text(item.quantidade.toString(), 5, y);
        doc.text(item.nome.substring(0, 28), 15, y);
        doc.text(`${(item.preco * item.quantidade).toFixed(2)}`, 75, y, { align: 'right' });
        y += 4;
      });
      
      doc.line(5, y, 75, y);
      y += 5;
      
      // TOTAIS
      doc.setFontSize(8);
      doc.text('SUBTOTAL:', 45, y, { align: 'right' }); doc.text(`${subtotal.toFixed(2)}`, 75, y, { align: 'right' });
      if (taxa > 0) {
        y += 4; doc.text('TAXA SERV (10%):', 45, y, { align: 'right' }); doc.text(`${taxa.toFixed(2)}`, 75, y, { align: 'right' });
      }
      y += 6; doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', 45, y, { align: 'right' }); doc.text(`R$ ${total.toFixed(2)}`, 75, y, { align: 'right' });
      
      // PAGAMENTOS E TROCO
      if (pagamentos.length > 0) {
        y += 8; doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text('PAGAMENTOS:', 5, y);
        y += 4; doc.setFont('helvetica', 'normal');
        pagamentos.forEach(p => {
          doc.text(p.method.toUpperCase(), 5, y);
          doc.text(`${p.amount.toFixed(2)}`, 75, y, { align: 'right' });
          y += 4;
        });

        const pDinheiro = pagamentos.find(p => p.method === 'dinheiro');
        if (pDinheiro && Number(valorRecebido) > 0) {
          y += 2;
          doc.text('VLR RECEBIDO:', 5, y); doc.text(`${Number(valorRecebido).toFixed(2)}`, 75, y, { align: 'right' });
          y += 4; doc.setFont('helvetica', 'bold');
          doc.text('TROCO:', 5, y); doc.text(`${(Number(valorRecebido) - pDinheiro.amount).toFixed(2)}`, 75, y, { align: 'right' });
        }
      }

      // RODAPÃ‰
      y += 12;
      doc.setFontSize(7); doc.setFont('helvetica', 'italic');
      doc.text('Obrigado pela preferÃªncia!', 40, y, { align: 'center' });
      doc.text('Resenha do Moura - Volte Sempre!', 40, y + 4, { align: 'center' });


      doc.save(`Cupom_Resenha_${Date.now()}.pdf`);
    });
  };

  const paymentTotals = useMemo(() => {
    const totals = { pix: 0, dinheiro: 0, debito: 0, credito: 0, outrosCartoes: 0 };
    historicoVendas.forEach(p => {
      if (!p.forma_pagamento) return;
      const matches = p.forma_pagamento.match(/(PIX|DINHEIRO|DÃ‰BITO|DEBITO|CRÃ‰DITO|CREDITO|CARTAO|CARTÃƒO)\s*\(R\$([0-9.]+)\)/gi);
      if (matches) {
        matches.forEach((m: string) => {
          const typeMatch = m.match(/(PIX|DINHEIRO|DÃ‰BITO|DEBITO|CRÃ‰DITO|CREDITO|CARTAO|CARTÃƒO)/i);
          const valMatch = m.match(/R\$([0-9.]+)/);
          if (typeMatch && valMatch) {
            const type = typeMatch[1].toUpperCase();
            const val = parseFloat(valMatch[1]);
            
            if (type === 'PIX') totals.pix += val;
            else if (type === 'DINHEIRO') totals.dinheiro += val;
            else if (type === 'DÃ‰BITO' || type === 'DEBITO') totals.debito += val;
            else if (type === 'CRÃ‰DITO' || type === 'CREDITO') totals.credito += val;
            else if (type === 'CARTAO' || type === 'CARTÃƒO') totals.outrosCartoes += val;
          }
        });
      }
    });
    return totals;
  }, [historicoVendas]);

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'TODOS' || p.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFechamentoCaixa = () => {
    const fnTroco = parseFloat(fundoTroco) || 0;
    const fnSangria = parseFloat(sangria) || 0;
    const fnGaveta = parseFloat(dinheiroGaveta) || 0;
    const dinhEsperado = fnTroco + paymentTotals.dinheiro - fnSangria;
    const diff = fnGaveta - dinhEsperado;

    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 180] });
      
      let y = 10;
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('RESENHA DO MOURA', 40, y, { align: 'center' }); y += 6;
      doc.setFontSize(10);
      doc.text('LEITURA Z - FECHAMENTO', 40, y, { align: 'center' }); y += 4;
      doc.line(5, y, 75, y); y += 6;
      
      const hoje = new Date();
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`DATA: ${hoje.toLocaleDateString('pt-BR')}`, 5, y); doc.text(`HORA: ${hoje.toLocaleTimeString('pt-BR')}`, 75, y, { align: 'right' }); y += 4;
      doc.text(`OPERADOR: ${profile?.full_name?.toUpperCase() || 'CAIXA'}`, 5, y); y += 4;
      doc.line(5, y, 75, y); y += 6;

      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('RESUMO DE MOVIMENTO:', 5, y); y += 8;

      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Fundo Inicial (Troco):', 5, y); doc.text(`R$ ${fnTroco.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('Sangria (Retiradas):', 5, y); doc.text(`R$ ${fnSangria.toFixed(2)}`, 75, y, { align: 'right' }); y += 7;
      
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('VENDAS POR MODALIDADE:', 5, y); y += 6;
      
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('DINHEIRO:', 5, y); doc.text(`R$ ${paymentTotals.dinheiro.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('PIX:', 5, y); doc.text(`R$ ${paymentTotals.pix.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('CARTÃƒO DÃ‰BITO:', 5, y); doc.text(`R$ ${paymentTotals.debito.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('CARTÃƒO CRÃ‰DITO:', 5, y); doc.text(`R$ ${paymentTotals.credito.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      if (paymentTotals.outrosCartoes > 0) {
        doc.text('OUTROS (ANTIGO):', 5, y); doc.text(`R$ ${paymentTotals.outrosCartoes.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      }
      
      y += 2; doc.line(5, y, 75, y); y += 6;
      
      const faturamentoTotal = paymentTotals.dinheiro + paymentTotals.pix + paymentTotals.debito + paymentTotals.credito + paymentTotals.outrosCartoes;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('TOTAL FATURADO:', 5, y); doc.text(`R$ ${faturamentoTotal.toFixed(2)}`, 75, y, { align: 'right' }); y += 8;
      
      doc.line(5, y, 75, y); y += 6;
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('CONFERÃŠNCIA DE GAVETA (ESP.):', 5, y); y += 6;
      
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Dinheiro Operador:', 5, y); doc.text(`R$ ${fnGaveta.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('Dinheiro Esperado:', 5, y); doc.text(`R$ ${dinhEsperado.toFixed(2)}`, 75, y, { align: 'right' }); y += 6;
      
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      let diffText = 'CONFERE EXACTO';
      if (diff > 0) diffText = `SOBRA DE CAIXA: R$ ${Math.abs(diff).toFixed(2)}`;
      else if (diff < 0) diffText = `QUEBRA DE CAIXA: R$ ${Math.abs(diff).toFixed(2)}`;
      
      doc.text(diffText, 40, y, { align: 'center' }); y += 12;
      
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text('-----------------------------------', 40, y, { align: 'center' }); y += 4;
      doc.text('Assinatura do Operador', 40, y, { align: 'center' });

      doc.save(`Leitura_Z_${hoje.getTime()}.pdf`);

      if (confirm("Leitura Z impressa com sucesso! Deseja encerrar seu turno e sair do sistema agora?")) {
         signOut();
      }
    });
  };

  const handleSimularMesasCaixa = async () => {
    if (!confirm("GERAR MESAS DE TESTE: Isso vai ocupar atÃ© 3 mesas livres com pedidos aleatÃ³rios e colocÃ¡-las como 'Aguardando Conta' para vocÃª testar o fechamento de caixa. Deseja continuar?")) return;
    
    // 1. Pegar atÃ© 3 mesas livres
    const { data: mesasLivres } = await supabase.from('mesas').select('*').eq('status', 'livre').limit(3);
    if (!mesasLivres || mesasLivres.length === 0) {
      alert("NÃ£o hÃ¡ mesas livres para simular. Tente finalizar as mesas atuais, limpar o histÃ³rico no Supabase ou adicionar mais mesas no Menu GestÃ£o.");
      return;
    }

    // 2. Pegar alguns produtos
    const { data: prods } = await supabase.from('produtos').select('*').limit(5);
    if (!prods || prods.length === 0) {
      alert("Cadastre alguns produtos primeiro.");
      return;
    }

    for (const mesa of mesasLivres) {
       await supabase.from('mesas').update({ status: 'aguardando conta', precisa_garcom: true }).eq('id', mesa.id);
       const totalRand = Math.floor(Math.random() * 80) + 20;
       
       const { data: p } = await supabase.from('pedidos').insert({
          mesa_id: mesa.id,
          garcom_id: profile?.id,
          status: 'aberto',
          total: totalRand,
          data_hora: new Date().toISOString()
       }).select().single();

       if (p) {
          const qtdItens = Math.floor(Math.random() * 3) + 1;
          for (let i = 0; i < qtdItens; i++) {
             const prod = prods[Math.floor(Math.random() * prods.length)];
             await supabase.from('itens_pedido').insert({
                pedido_id: p.id,
                produto_id: prod.id,
                quantidade: Math.floor(Math.random() * 2) + 1,
                preco_unitario: prod.preco,
                status: 'entregue'
             });
          }
       }
    }

    alert("SimulaÃ§Ã£o gerada com sucesso!");
    fetchData();
  };

  const handleSimularCozinha = async () => {
    if (!confirm("GERAR PEDIDOS DE COZINHA: SerÃ£o criados itens aleatÃ³rios (bebidas/petiscos) na fila de preparo. Continuar?")) return;
    const { data: prods } = await supabase.from('produtos').select('*').in('categoria', ['PETISCO', 'COQUETÃ‰IS', 'BEBIDAS']).limit(10);
    if (!prods || prods.length === 0) { alert('Nenhum petisco ou bebida encontrado.'); return; }

    const { data: p } = await supabase.from('pedidos').insert({
      mesa_id: null,
      garcom_id: profile?.id,
      status: 'novo',
      total: 0,
      data_hora: new Date().toISOString()
    }).select().single();

    if (p) {
      const qtdItens = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < qtdItens; i++) {
         const prod = prods[Math.floor(Math.random() * prods.length)];
         await supabase.from('itens_pedido').insert({
            pedido_id: p.id,
            produto_id: prod.id,
            quantidade: Math.floor(Math.random() * 2) + 1,
            preco_unitario: prod.preco,
            status: 'pendente'
         });
      }
    }
    fetchData();
  };

  const handleSimularHistorico = async () => {
    if (!confirm("GERAR VENDAS DO DIA: SerÃ£o geradas vendas fechadas de PIX, CARTÃƒO e DINHEIRO para o painel de fechamento. Continuar?")) return;
    
    // Gerar uma venda para CADA mÃ©todo para garantir que caia nos totais
    const pagamentosFixos = ['DINHEIRO', 'PIX', 'CARTÃƒO DÃ‰BITO', 'CARTÃƒO CRÃ‰DITO'];
    
    for (const pagType of pagamentosFixos) {
       const totalRand = Math.floor(Math.random() * 80) + 40; // 40 a 120
       const pagStr = `${pagType} (R$${totalRand.toFixed(2)})`;
       
       await supabase.from('pedidos').insert({
          mesa_id: null,
          garcom_id: profile?.id,
          status: 'finalizado',
          total: totalRand,
          forma_pagamento: pagStr,
          data_hora: new Date().toISOString(),
          finalizado_at: new Date().toISOString()
       });
    }
    
    alert("Vendas simuladas com sucesso! Valores foram adicionados ao Caixa.");
    fetchData();
  };

  const categories = ['TODOS', 'PETISCO', 'BEBIDAS', 'COQUETÃ‰IS', 'DESTILADOS (DOSE)'];

  if (loading) return <div className="layout-container d-flex justify-center items-center" style={{height: '100vh', background: '#000', color: 'var(--primary-color)'}}>CARREGANDO CAIXA RESENHA...</div>;

  return (
    <div className="layout-container" style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar" style={{ width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0' }}>
         <div style={{ marginBottom: '3rem' }}><div style={{ width: '40px', height: '40px', background: 'var(--primary-color)', borderRadius: '12px' }}></div></div>
         <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <button onClick={() => setActiveTab('mesas')} style={{ background: 'none', border: 'none', color: activeTab === 'mesas' ? 'var(--primary-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', position: 'relative' }}>
              <Store size={28} /> 
              <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>MESAS</span>
              {mesasPendentes.filter(m => m.status === 'aguardando conta').length > 0 && (
                <div style={{ position: 'absolute', top: '-5px', right: '15px', background: 'var(--danger-color)', color: '#fff', fontSize: '0.6rem', fontWeight: 900, padding: '2px 6px', borderRadius: '10px', animation: 'pulse 1.5s infinite' }}>
                  {mesasPendentes.filter(m => m.status === 'aguardando conta').length}
                </div>
              )}
            </button>
            <button onClick={() => setActiveTab('balcao')} style={{ background: 'none', border: 'none', color: activeTab === 'balcao' ? 'var(--primary-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <ShoppingCart size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>BALCÃƒO</span>
            </button>
            <button onClick={() => setActiveTab('cozinha')} style={{ background: 'none', border: 'none', color: activeTab === 'cozinha' ? 'var(--primary-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', position: 'relative' }}>
              <Utensils size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>COZINHA</span>
              {cozinhaItems.filter(i => i.status === 'pendente').length > 0 && (
                <div style={{ position: 'absolute', top: '-5px', right: '15px', background: 'var(--danger-color)', color: '#fff', fontSize: '0.6rem', fontWeight: 900, padding: '2px 6px', borderRadius: '10px', animation: 'pulse 1.5s infinite' }}>
                  {cozinhaItems.filter(i => i.status === 'pendente').length}
                </div>
              )}
            </button>
            <button onClick={() => setActiveTab('historico')} style={{ background: 'none', border: 'none', color: activeTab === 'historico' ? 'var(--primary-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <HistoryIcon size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>HISTÃ“RICO</span>
            </button>
            <div style={{ flex: 1 }}></div>
            <button onClick={() => setActiveTab('fechamento')} style={{ background: 'none', border: 'none', color: activeTab === 'fechamento' ? 'var(--danger-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <Lock size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>FECHAR DIA</span>
            </button>
         </nav>
         <button onClick={() => signOut()} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}><LogOut size={28}/></button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <OwnerViewBanner panelName="Caixa" />
        <header className="d-flex justify-between items-center mb-6">
           <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-color)' }}>
             {activeTab === 'mesas' ? 'GESTÃƒO DE MESAS' : activeTab === 'balcao' ? 'VENDA DE BALCÃƒO' : activeTab === 'cozinha' ? 'PEDIDOS COZINHA' : activeTab === 'historico' ? 'RELATÃ“RIO DE VENDAS' : 'FECHAMENTO E LEITURA Z'}
           </h1>
           <div className="d-flex items-center gap-4">
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>LOGADO COMO: <b style={{color: '#fff'}}>{profile?.full_name?.toUpperCase()}</b></span>
              <Link to="/" className="btn-outline" style={{ fontSize: '0.7rem' }}>PAINEL GERAL</Link>
           </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'mesas' && (
            <motion.div key="mesas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
               {mesasPendentes.map(mesa => (
                 <div key={mesa.id} className="card hover-surface" style={{ borderLeft: mesa.status === 'aguardando conta' ? '8px solid var(--primary-color)' : '8px solid var(--success-color)', padding: '1.5rem', textAlign: 'center', animation: mesa.status === 'aguardando conta' ? 'pulse 2s infinite' : 'none' }}>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: '0.5rem' }}>{mesa.status.toUpperCase()}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Mesa {mesa.numero}</div>
                    <button className={mesa.status === 'aguardando conta' ? "btn-primary w-full mt-4" : "btn-outline w-full mt-4"} onClick={() => openTableCheckout(mesa)} style={mesa.status === 'aguardando conta' ? { background: 'var(--primary-color)', color: '#000' } : {}}>FECHAR CONTA</button>
                 </div>
               ))}
               {mesasPendentes.length === 0 && (
                 <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', opacity: 0.8 }}>
                   <Receipt size={80} style={{margin: '0 auto 1.5rem', opacity: 0.3}} />
                   <h3 style={{ opacity: 0.3 }}>Nenhuma mesa ativa no momento.</h3>
                   <button onClick={handleSimularMesasCaixa} className="btn-outline mt-6" style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                     GERAR MESAS DE TESTE (SIMULAÃ‡ÃƒO)
                   </button>
                 </div>
               )}
            </motion.div>
          )}

          {activeTab === 'balcao' && (
            <motion.div key="balcao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', height: 'calc(100vh - 180px)' }}>
               {/* CATALOGO */}
                <div className="d-flex flex-col gap-3">
                   <div style={{ position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
                      <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar produto..." style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: '#111', border: '1px solid #222', borderRadius: '10px', color: '#fff' }} />
                   </div>
                   <div className="d-flex gap-2" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
                      {categories.map(c => (
                         <button 
                           key={c} 
                           onClick={() => setSelectedCategory(c)}
                           style={{ 
                             fontSize: '0.65rem', 
                             fontWeight: 800,
                             whiteSpace: 'nowrap', 
                             padding: '8px 16px',
                             borderRadius: '20px',
                             cursor: 'pointer',
                             transition: 'all 0.2s',
                             backgroundColor: selectedCategory === c ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)',
                             color: selectedCategory === c ? '#000' : 'var(--text-muted)',
                             border: selectedCategory === c ? 'none' : '1px solid rgba(255,255,255,0.05)'
                           }}
                         >
                           {c}
                         </button>
                      ))}
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '0.8rem', overflowY: 'auto', paddingRight: '5px' }}>
                      {filteredProdutos.map(p => (
                        <div key={p.id} className="card hover-surface text-center transition-all" style={{ padding: '0.8rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.02)' }} onClick={() => addToCart(p)}>
                           <div style={{ fontSize: '0.5rem', opacity: 0.4, marginBottom: '0.3rem', textTransform: 'uppercase' }}>{p.categoria}</div>
                           <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', height: '2rem', overflow: 'hidden', lineHeight: '1rem' }}>{p.nome}</div>
                           <div style={{ color: 'var(--primary-color)', fontWeight: 900, fontSize: '0.9rem' }}>R$ {Number(p.preco).toFixed(2)}</div>
                        </div>
                      ))}
                   </div>
                </div>
               
               {/* CARRINHO LATERAL */}
               <div className="card d-flex flex-col" style={{ padding: '1.5rem', background: '#111', border: 'none' }}>
                  <div className="d-flex items-center gap-2 mb-6"><ShoppingCart size={20} color="var(--primary-color)" /> <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>CARRINHO</h3></div>
                  <div style={{ flex: 1, overflowY: 'auto' }} className="d-flex flex-col gap-3">
                     {carrinho.map(item => (
                       <div key={item.id} className="d-flex flex-col p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px' }}>{item.nome}</span>
                          <div className="d-flex justify-between items-center">
                             <div className="d-flex items-center gap-3">
                                <button onClick={() => updateCartQty(item.id, -1)} style={{ background: '#222', border: 'none', color: '#fff', width: '24px', height: '24px', borderRadius: '4px' }}>-</button>
                                <span style={{ fontWeight: 800 }}>{item.quantidade}</span>
                                <button onClick={() => updateCartQty(item.id, 1)} style={{ background: '#222', border: 'none', color: '#fff', width: '24px', height: '24px', borderRadius: '4px' }}>+</button>
                             </div>
                             <span style={{ fontWeight: 800, color: 'var(--primary-color)' }}>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                             <button onClick={() => removeFromCart(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)' }}><Trash2 size={16}/></button>
                          </div>
                       </div>
                     ))}
                     {carrinho.length === 0 && <div className="text-center opacity-20 mt-12"><ShoppingCart size={40} style={{margin: '0 auto 1rem'}} /><span>Vazio</span></div>}
                  </div>
                  <div className="pt-6 mt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                     <div className="d-flex justify-between items-center mb-6">
                        <span style={{ opacity: 0.5 }}>TOTAL</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 900 }}>R$ {carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0).toFixed(2)}</span>
                     </div>
                     <button className="btn-primary w-full py-4 px-0" style={{ fontWeight: 900, fontSize: '1.1rem' }} disabled={carrinho.length === 0} onClick={openQuickCheckout}>RECEBER AGORA</button>
                     <button className="w-full mt-2" style={{ background: 'none', border: 'none', color: 'var(--danger-color)', fontSize: '0.7rem', opacity: 0.5 }} onClick={() => setCarrinho([])}>LIMPAR TUDO</button>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'cozinha' && (
            <motion.div key="cozinha" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
               {cozinhaItems.length === 0 ? (
                 <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', opacity: 0.8 }}>
                    <Utensils size={80} style={{margin: '0 auto 1.5rem', opacity: 0.3}} />
                    <h3 style={{ opacity: 0.3 }}>Nenhum pedido pendente de cozinha/bar.</h3>
                    <button onClick={handleSimularCozinha} className="btn-outline mt-6" style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                      GERAR FILA DA COZINHA (SIMULAÃ‡ÃƒO)
                    </button>
                 </div>
               ) : (
                 cozinhaItems.map(item => (
                   <div key={item.id} className="card" style={{ borderLeft: '6px solid var(--danger-color)', padding: '1.5rem', background: '#111' }}>
                     <div className="d-flex justify-between items-center mb-4" style={{ background: 'rgba(212, 175, 55, 0.1)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                       <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-color)' }}>MESA {item.mesa}</span>
                       <div className="d-flex flex-col items-end">
                          <span style={{ color: item.status === 'pendente' ? 'var(--danger-color)' : 'var(--warning-color)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{item.status}</span>
                       </div>
                     </div>
                     <h2 style={{ margin: '1rem 0', fontSize: '1.2rem', fontWeight: 800 }}>{item.quantidade}x {item.produto_nome}</h2>
                     <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Setor: {item.categoria}</p>
                     
                     <div className="d-flex gap-2">
                       <button className="btn-success w-full" style={{ padding: '0.5rem' }} onClick={() => handleStatusChangeCozinha(item.id)}>Marcar Pronto</button>
                     </div>
                   </div>
                 ))
               )}
            </motion.div>
          )}

          {activeTab === 'historico' && (
            <motion.div key="historico" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <div className="d-flex justify-between items-center mb-4">
                 <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Resumo Financeiro (Hoje)</h2>
                 <div className="d-flex gap-2">
                    <button onClick={handleSimularHistorico} className="btn-outline" style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <HistoryIcon size={18} /> GERAR VENDAS AQUI
                    </button>
                    <button onClick={() => setActiveTab('fechamento')} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <Lock size={18} /> IR PARA FECHAMENTO
                    </button>
                  </div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                 <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>VENDAS PIX</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>R$ {paymentTotals.pix.toFixed(2).replace('.', ',')}</div>
                 </div>
                 <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>VENDAS DINHEIRO</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>R$ {paymentTotals.dinheiro.toFixed(2).replace('.', ',')}</div>
                 </div>
                 <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>DÃ‰BITO</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#3b82f6' }}>R$ {paymentTotals.debito.toFixed(2).replace('.', ',')}</div>
                 </div>
                 <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>CRÃ‰DITO</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#8b5cf6' }}>R$ {paymentTotals.credito.toFixed(2).replace('.', ',')}</div>
                 </div>
               </div>
               <div className="card" style={{ padding: 0 }}>
                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <tr>
                      <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem' }}>ID</th>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>TIPO</th>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>CLIENTE</th>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>PAGAMENTO</th>
                      <th style={{ padding: '1rem', textAlign: 'left' }}>DATA</th>
                      <th style={{ padding: '1rem', textAlign: 'right' }}>VALOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoVendas.map(v => (
                      <tr 
                        key={v.id} 
                        onClick={() => handleVerDetalhes(v)}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '1rem', fontSize: '0.7rem', opacity: 0.6, fontFamily: 'monospace' }}>#{v.id.split('-')[0].toUpperCase()}</td>
                        <td style={{ padding: '1rem' }}>{v.mesa_id ? <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>MESA</span> : <span style={{ color: 'var(--success-color)', fontWeight: 700 }}>BALCÃƒO</span>}</td>
                        <td style={{ padding: '1rem' }}>{v.mesa_id ? `Mesa ${v.mesas?.numero}` : 'Venda Direta'}</td>
                        <td style={{ padding: '1rem', fontSize: '0.7rem', opacity: 0.6 }}>{v.forma_pagamento}</td>
                        <td style={{ padding: '1rem', opacity: 0.5 }}>{new Date(v.finalizado_at || v.data_hora).toLocaleTimeString()}</td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800 }}>R$ {Number(v.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
               </div>
            </motion.div>
          )}

          {activeTab === 'fechamento' && (
            <motion.div key="fechamento" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-8 d-flex justify-between items-center bg-surface p-6 rounded-xl border border-border" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Fechamento de Caixa</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Siga o procedimento de conferÃªncia cega para encerramento do turno.</p>
                </div>
                <button onClick={handleSimularHistorico} className="btn-outline" style={{ width: 'auto', padding: '0.75rem 1.5rem', borderColor: 'var(--primary-color)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HistoryIcon size={20} /> GERAR VENDAS PARA TESTE
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', alignItems: 'start' }}>
                {/* COLUNA ESQUERDA: ENTRADAS DO OPERADOR */}
                <div className="card d-flex flex-col gap-6" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-color)', borderBottom: '1px solid rgba(212,175,55,0.2)', paddingBottom: '1rem', marginBottom: '0.5rem' }}>Dados de ConferÃªncia</h3>
                  
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>FUNDO DE TROCO INICIAL (ABERTURA)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>R$</span>
                      <input type="number" step="0.01" value={fundoTroco} onChange={e => setFundoTroco(e.target.value)} placeholder="0.00" className="input-field" style={{ paddingLeft: '3rem', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>SANGRIA / RETIRADAS DO DIA</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>R$</span>
                      <input type="number" step="0.01" value={sangria} onChange={e => setSangria(e.target.value)} placeholder="0.00" className="input-field" style={{ paddingLeft: '3rem', fontSize: '1.3rem', fontWeight: 800, color: '#fff' }} />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0.5rem 0' }}></div>

                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-color)', display: 'block', marginBottom: '0.75rem' }}>VALOR TOTAL NA GAVETA (ESPÃ‰CIE)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, fontSize: '1.5rem', color: 'var(--primary-color)' }}>R$</span>
                      <input type="number" step="0.01" value={dinheiroGaveta} onChange={e => setDinheiroGaveta(e.target.value)} placeholder="0,00" className="input-field" style={{ paddingLeft: '3.5rem', fontSize: '2rem', fontWeight: 900, color: '#fff', height: '4.5rem', borderColor: 'var(--primary-color)' }} />
                    </div>
                    <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '1rem', fontStyle: 'italic', textAlign: 'center' }}>* Declare o valor exato contado fisicamente.</p>
                  </div>
                </div>

                {/* COLUNA DIREITA: RESUMO E CONCLUSÃƒO */}
                <div className="d-flex flex-col gap-6">
                  <div className="card d-flex flex-col gap-5" style={{ background: '#0a0a0a', padding: '2rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', color: '#fff' }}>Resultado da Auditoria</h3>
                    
                    <div className="d-flex flex-col gap-3">
                      <div className="d-flex justify-between items-center">
                          <span style={{ opacity: 0.6 }}>Vendas em Dinheiro:</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>R$ {paymentTotals.dinheiro.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-between items-center">
                          <span style={{ opacity: 0.6 }}>Vendas (CartÃ£o/PIX):</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>R$ {(paymentTotals.pix + paymentTotals.debito + paymentTotals.credito + paymentTotals.outrosCartoes).toFixed(2)}</span>
                      </div>
                    </div>

                    <div style={{ borderTop: 'dashed 1px rgba(255,255,255,0.1)', margin: '1rem 0' }}></div>

                    {(() => {
                        const vlGaveta = parseFloat(dinheiroGaveta) || 0;
                        const vlTroco = parseFloat(fundoTroco) || 0;
                        const vlSangria = parseFloat(sangria) || 0;
                        const dinheiroEsperado = vlTroco + paymentTotals.dinheiro - vlSangria;
                        const diff = vlGaveta - dinheiroEsperado;
                        
                        let diffColor = diff === 0 ? 'var(--success-color)' : diff > 0 ? 'var(--warning-color)' : 'var(--danger-color)';
                        let diffLabel = diff === 0 ? 'CAIXA CONFERIDO' : diff > 0 ? 'SOBRA DE CAIXA' : 'QUEBRA DE CAIXA';

                        return (
                          <>
                            <div className="d-flex justify-between items-center bg-black p-4 rounded-xl" style={{ background: '#000', border: '1px solid rgba(255,255,255,0.03)' }}>
                              <span style={{ opacity: 0.8, fontWeight: 700, fontSize: '0.9rem' }}>ESPERADO EM GAVETA:</span>
                              <b style={{ fontSize: '1.4rem', color: 'var(--primary-color)' }}>R$ {dinheiroEsperado.toFixed(2)}</b>
                            </div>

                            <div className="d-flex flex-col items-center justify-center p-6 rounded-2xl text-center" style={{ background: `rgba(${diff === 0 ? '16,185,129' : diff > 0 ? '245,158,11' : '239,68,68'}, 0.08)`, border: `2px solid ${diffColor}` }}>
                              <span style={{ fontWeight: 900, color: diffColor, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>{diffLabel}</span>
                              <b style={{ fontSize: '2.5rem', color: diffColor }}>R$ {Math.abs(diff).toFixed(2).replace('.', ',')}</b>
                              {diff !== 0 && <span style={{ fontSize: '0.75rem', color: diffColor, opacity: 0.8, marginTop: '5px' }}>DiferenÃ§a apurada na auditoria manual</span>}
                            </div>
                          </>
                        );
                    })()}
                  </div>

                  <button className="btn-primary w-full py-6" onClick={handleFechamentoCaixa} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '20px', boxShadow: '0 10px 40px rgba(212, 175, 55, 0.2)' }}>
                      <div className="d-flex items-center gap-2" style={{ fontSize: '1.4rem', fontWeight: 900 }}><Printer size={28} /> EMITIR LEITURA Z</div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 400, opacity: 0.9, color: '#000' }}>Confirmar fechamento e baixar relatÃ³rio PDF</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* CHECKOUT OVERLAY (MODAL PREMIUM) */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card" style={{ width: '100%', maxWidth: '900px', padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 350px' }}>
                {/* LADO ESQUERDO: CONFERÃŠNCIA */}
                <div style={{ padding: '2.5rem', borderRight: '1px solid #222' }}>
                   <div className="d-flex justify-between items-center mb-8">
                      <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>CONFERÃŠNCIA</h2>
                        <span style={{ opacity: 0.5 }}>{selectedMesa ? `Mesa ${selectedMesa.numero}` : 'Venda RÃ¡pida'}</span>
                      </div>
                      <button onClick={() => setIsCheckoutOpen(false)} style={{ background: '#222', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%' }}><X size={20}/></button>
                   </div>
                   
                   <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="d-flex flex-col gap-2 mb-8">
                      {checkoutItens.map((item, i) => (
                        <div key={i} className="d-flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                           <div className="d-flex items-center gap-3">
                              <span style={{ fontWeight: 800, color: 'var(--primary-color)' }}>{item.quantidade}x</span>
                              <span style={{ fontWeight: 600 }}>{item.nome}</span>
                           </div>
                           <span style={{ fontWeight: 700 }}>R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                        </div>
                      ))}
                   </div>

                   <div className="d-flex flex-col gap-3">
                      {selectedMesa && (
                        <div className="card" style={{ padding: '1.2rem', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)' }}>
                           <div className="d-flex justify-between items-center mb-3">
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6 }}>DIVIDIR CONTA</span>
                              <div className="d-flex items-center gap-3">
                                 <button onClick={() => setDividirPor(Math.max(1, dividirPor-1))} className="btn-outline" style={{width: '32px', height: '32px', padding: '0', fontSize: '1.2rem'}}>-</button>
                                 <span style={{ fontSize: '1.4rem', fontWeight: 900, minWidth: '30px', textAlign: 'center' }}>{dividirPor}</span>
                                 <button onClick={() => setDividirPor(dividirPor+1)} className="btn-outline" style={{width: '32px', height: '32px', padding: '0', fontSize: '1.2rem'}}>+</button>
                              </div>
                           </div>
                           <div className="d-flex justify-between items-center">
                              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>VALOR POR PESSOA:</span>
                              <b style={{ color: 'var(--primary-color)', fontSize: '1.3rem', fontWeight: 900 }}>R$ {(totalComTaxa / dividirPor).toFixed(2)}</b>
                           </div>
                        </div>
                      )}
                      
                      <div className="d-flex gap-2">
                        <button className="btn-outline" style={{ flex: 1, padding: '1rem' }} onClick={() => handleImprimir(checkoutItens)}>
                          <Printer size={18} /> IMPRIMIR CONFERÃŠNCIA
                        </button>
                      </div>
                   </div>
                </div>

                {/* LADO DIREITO: PAGAMENTO */}
                <div style={{ background: '#111', padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                    <div className="mb-8">
                       <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>VALOR TOTAL</span>
                       <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary-color)' }}>R$ {totalComTaxa.toFixed(2)}</div>
                       {selectedMesa && <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>(Inclui 10% de serviÃ§o)</span>}
                    </div>

                    <div className="mb-6">
                       <span style={{ fontSize: '0.7rem', opacity: 0.4, marginBottom: '0.8rem', display: 'block' }}>FORMA DE PAGAMENTO</span>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.8rem" }}>
                           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                              <button onClick={() => handleAddPayment("dinheiro", totalRestante)} className="btn-success" style={{ fontSize: "0.7rem" }}>DINHEIRO TOTAL</button>
                              <button onClick={() => handleAddPayment("pix", totalRestante)} className="btn-primary" style={{ fontSize: "0.7rem" }}>PIX TOTAL</button>
                           </div>
                           
                           {dividirPor > 1 && (
                             <div style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                               <span style={{ fontSize: "0.65rem", opacity: 0.5, marginBottom: "0.8rem", display: "block", textAlign: "center" }}>PAGAR POR PESSOA (1 COTA)</span>
                               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                                 <button onClick={() => handleAddPayment("dinheiro", totalComTaxa / dividirPor)} style={{ background: "#059669", color: "#fff", padding: "0.8rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800 }}>💵 COTA DINHEIRO</button>
                                 <button onClick={() => handleAddPayment("pix", totalComTaxa / dividirPor)} style={{ background: "#b5952f", color: "#000", padding: "0.8rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800 }}>📱 COTA PIX</button>
                                 <button onClick={() => handleAddPayment("debito", totalComTaxa / dividirPor)} style={{ background: "transparent", border: "1px solid #444", color: "#fff", padding: "0.8rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800 }}>💳 COTA DÉBITO</button>
                                 <button onClick={() => handleAddPayment("credito", totalComTaxa / dividirPor)} style={{ background: "transparent", border: "1px solid #444", color: "#fff", padding: "0.8rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800 }}>💳 COTA CRÉDITO</button>
                               </div>
                             </div>
                           )}
                           
                           {dividirPor === 1 && (
                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                               <button onClick={() => handleAddPayment("debito", totalRestante)} className="btn-outline" style={{ fontSize: "0.7rem" }}>DÉBITO</button>
                               <button onClick={() => handleAddPayment("credito", totalRestante)} className="btn-outline" style={{ fontSize: "0.7rem" }}>CRÉDITO</button>
                             </div>
                           )}
                        </div>
                    </div>

                    {pagamentos.length > 0 && (
                      <div className="mb-6">
                         {pagamentos.map((p, i) => (
                           <div key={i} className="d-flex justify-between items-center p-2 rounded mb-2" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{p.method.toUpperCase()}</span>
                              <div className="d-flex items-center gap-2">
                                 <strong>R$ {p.amount.toFixed(2)}</strong>
                                 <Trash2 size={12} color="var(--danger-color)" style={{cursor: 'pointer'}} onClick={() => setPagamentos(pagamentos.filter((_, idx)=> idx !== i))} />
                              </div>
                           </div>
                         ))}
                      </div>
                    )}

                    {pagamentos.some(p => p.method === 'dinheiro') && (
                       <div className="card mb-6" style={{ background: 'rgba(212, 175, 55, 0.08)', border: '2px solid var(--primary-color)', padding: '1.5rem' }}>
                          <div className="d-flex items-center gap-2 mb-3">
                             <Calculator size={18} color="var(--primary-color)"/> 
                             <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>CÃLCULO DE TROCO</span>
                          </div>
                          <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: '5px' }}>VALOR QUE O CLIENTE DEU:</div>
                          <input 
                            type="number" 
                            placeholder="Ex: 50.00" 
                            value={valorRecebido} 
                            onChange={e => setValorRecebido(e.target.value)} 
                            style={{ width: '100%', background: '#000', border: '1px solid #444', color: '#fff', padding: '1rem', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 900 }} 
                          />
                          {valorInput > 0 && (
                            <div className="mt-4 pt-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                               <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>DEVOLVER DE TROCO:</div>
                               <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--success-color)' }}>
                                 R$ {troco.toFixed(2)}
                               </div>
                            </div>
                          )}
                       </div>
                    )}

                    <div className="mt-auto">
                       <div className="d-flex justify-between items-center mb-4">
                          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>RESTANTE</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: totalRestante > 0.05 ? 'var(--danger-color)' : 'var(--success-color)' }}>R$ {totalRestante.toFixed(2)}</span>
                       </div>
                       <button className="btn-primary w-full py-4 px-0" style={{ background: totalRestante > 0.05 ? '#222' : 'var(--success-color)', fontWeight: 900, fontSize: '1.2rem' }} disabled={totalRestante > 0.05} onClick={handleFinalizar}>
                          <CheckCircle2 size={24} style={{ marginRight: '10px' }} /> FINALIZAR VENDA
                       </button>
                    </div>
                </div>
             </motion.div>
          </motion.div>
        )}

        {/* MODAL DE DETALHES DO PEDIDO */}
        {isDetailModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card" style={{ width: '100%', maxWidth: '500px' }}>
              <div className="d-flex justify-between items-center mb-6">
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>DETALHES DO PEDIDO</h3>
                  <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>ID: #{selectedPedidoDetail?.id.split('-')[0].toUpperCase()}</span>
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} style={{ background: '#222', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%' }}><X size={20}/></button>
              </div>

              <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(212, 175, 55, 0.05)', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                <div className="d-flex justify-between mb-2">
                  <span style={{ opacity: 0.6 }}>Cliente:</span>
                  <span style={{ fontWeight: 700 }}>{selectedPedidoDetail?.mesa_id ? `Mesa ${selectedPedidoDetail?.mesas?.numero}` : 'BalcÃ£o'}</span>
                </div>
                <div className="d-flex justify-between mb-2">
                  <span style={{ opacity: 0.6 }}>HorÃ¡rio:</span>
                  <span>{new Date(selectedPedidoDetail?.finalizado_at || selectedPedidoDetail?.data_hora).toLocaleString()}</span>
                </div>
                <div className="d-flex justify-between">
                  <span style={{ opacity: 0.6 }}>Pagamento:</span>
                  <span style={{ fontSize: '0.8rem' }}>{selectedPedidoDetail?.forma_pagamento}</span>
                </div>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="d-flex flex-col gap-2 mb-6">
                {itemsPedidoDetail.map((item, i) => (
                  <div key={i} className="d-flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="d-flex items-center gap-3">
                      <span style={{ fontWeight: 800, color: 'var(--primary-color)' }}>{item.quantidade}x</span>
                      <span style={{ fontWeight: 600 }}>{item.produtos?.nome}</span>
                    </div>
                    <span style={{ fontWeight: 700 }}>R$ {(item.preco_unitario * item.quantidade).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="d-flex justify-between items-center">
                  <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>TOTAL PAGO</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-color)' }}>R$ {Number(selectedPedidoDetail?.total).toFixed(2)}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
