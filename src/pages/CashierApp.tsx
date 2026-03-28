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
  
  // Quick Sale (Balcão) State
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedMesa, setSelectedMesa] = useState<any>(null);
  const [checkoutItens, setCheckoutItens] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<Payment[]>([]);
  const [dividirPor, setDividirPor] = useState(1);
  const [incluirTaxa, setIncluirTaxa] = useState(true);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  
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
           params: {
             mesa: i.pedidos?.mesas?.numero || 0,
             data_hora: i.pedidos?.data_hora
           }
         }));
         
         const formattedWithExtra = formatted.map(f => ({
           ...f,
           mesa: f.params.mesa,
           data_hora: f.params.data_hora
         }));

         const COQUITEIS_COZINHA = [
           "caipirinha cachaça", "caipivodka smirnoff", "caipivodka absolut",
           "gin tônica tanqueray", "gin tanqueray com red bull", "dry martini",
           "campari", "aperol"
         ];
         const filtered = formattedWithExtra.filter((item: any) => {
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

      // 2. Histórico (Finalizados hoje)
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const { data: historico } = await supabase.from('pedidos')
        .select('*, profiles:garcom_id(full_name), mesas(numero)')
        .eq('status', 'finalizado')
        .gte('finalizado_at', startOfDay)
        .order('finalizado_at', { ascending: false });
      setHistoricoVendas(historico || []);

      // 3. Produtos para Venda de Balcão
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

  // Watcher para Imprimir Automático Novos Itens de Cozinha
  useEffect(() => {
    if (isInitialLoad || !autoPrintKds) return;
    cozinhaItems.forEach(item => {
      if (!printedItemIds.includes(item.id)) {
        handleImprimirCozinha(item);
        setPrintedItemIds(prev => [...prev, item.id]);
      }
    });
  }, [cozinhaItems, printedItemIds, isInitialLoad, autoPrintKds]);

  // Monitorar solicitações de conta
  useEffect(() => {
    const currentCount = mesasPendentes.filter(m => m.status === 'aguardando conta').length;
    setLastAccountRequestCount(currentCount);
  }, [mesasPendentes]);

  // --- Lógica de Carrinho (Balcão) ---
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

  // --- Lógica de Checkout ---
  const openTableCheckout = async (mesa: any) => {
    setSelectedMesa(mesa);
    setPagamentos([]);
    setValorRecebido('');
    setCustomAmount('');
    setDividirPor(1);
    setIncluirTaxa(true);
    setSelectedMethod(null);
    
    // Buscar pedidos da mesa
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
    setCustomAmount('');
    setDividirPor(1);
    setIncluirTaxa(false); // Balcão geralmente não tem taxa
    setSelectedMethod(null);
    setIsCheckoutOpen(true);
  };

  const totalCheckout = useMemo(() => {
    return checkoutItens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  }, [checkoutItens]);

  // Taxa de serviço opcional
  const taxaServico = (selectedMesa && incluirTaxa) ? totalCheckout * 0.1 : 0;
  const totalComTaxa = totalCheckout + taxaServico;
  const totalPago = pagamentos.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalRestante = Math.max(0, totalComTaxa - totalPago);

  // Cálculo de troco reativo
  const valorInput = parseFloat(valorRecebido.replace(',', '.')) || 0;
  const totalEmDinheiro = pagamentos
    .filter(p => p.method === 'dinheiro')
    .reduce((acc, p) => acc + Number(p.amount), 0);
  
  const baseParaTroco = totalRestante > 0 ? totalRestante : totalEmDinheiro;
  const troco = valorInput > 0 ? Math.max(0, valorInput - baseParaTroco) : 0;

  const handleAddPayment = (method: PaymentMethod, amount: number) => {
    if (amount <= 0) return;
    const finalAmount = Math.min(amount, totalRestante);
    if (finalAmount <= 0) return;
    setPagamentos([...pagamentos, { method, amount: finalAmount }]);
    setValorRecebido('');
    setCustomAmount('');
  };

  const handleFinalizar = async () => {
    if (totalRestante > 0.1) {
      alert("A conta ainda não foi totalmente paga!");
      return;
    }

    try {
      const formaPagamentoStr = pagamentos.map(p => `${p.method.toUpperCase()} (R$${p.amount.toFixed(2)})`).join(', ');

      if (selectedMesa) {
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
        const { data: newPedido, error: pErr } = await supabase.from('pedidos').insert({
          mesa_id: null,
          garcom_id: profile?.id,
          status: 'finalizado',
          total: totalCheckout,
          forma_pagamento: formaPagamentoStr,
          finalizado_at: new Date().toISOString()
        }).select().single();

        if (pErr) throw pErr;

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
      
      alert("Venda finalizada com sucesso! 💰");
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
    setItemsPedidoDetail([]);
    const { data } = await supabase
      .from('itens_pedido')
      .select('*, produtos(nome)')
      .eq('pedido_id', pedido.id);
    if (data) setItemsPedidoDetail(data);
    setIsDetailModalOpen(true);
  };

  const handleImprimir = (itens: any[]) => {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 160] });
      const subtotal = itens.reduce((acc, i) => acc + (i.preco * i.quantidade), 0);
      const taxa = selectedMesa ? subtotal * 0.1 : 0;
      const total = subtotal + (selectedMesa && incluirTaxa ? taxa : 0);

      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('RESENHA DO MOURA', 40, 10, { align: 'center' });
      doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text('Gastronomia & Entretenimento', 40, 14, { align: 'center' });
      doc.line(5, 20, 75, 20);
      doc.setFontSize(8);
      doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, 5, 24);
      doc.text(`HORA: ${new Date().toLocaleTimeString('pt-BR')}`, 75, 24, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(selectedMesa ? `MESA: ${selectedMesa.numero}` : 'VENDA DE BALCÃO', 5, 28);
      doc.line(5, 30, 75, 30);
      doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('QTD', 5, 34); doc.text('ITENS', 15, 34); doc.text('TOTAL', 75, 34, { align: 'right' });
      doc.line(5, 36, 75, 36);
      let y = 40;
      doc.setFont('helvetica', 'normal');
      itens.forEach(item => {
        doc.text(item.quantidade.toString(), 5, y);
        doc.text(item.nome.substring(0, 28), 15, y);
        doc.text(`${(item.preco * item.quantidade).toFixed(2)}`, 75, y, { align: 'right' });
        y += 4;
      });
      doc.line(5, y, 75, y); y += 5;
      doc.setFontSize(8);
      doc.text('SUBTOTAL:', 45, y, { align: 'right' }); doc.text(`${subtotal.toFixed(2)}`, 75, y, { align: 'right' });
      if (taxa > 0 && incluirTaxa) {
        y += 4; doc.text('TAXA SERV (10%):', 45, y, { align: 'right' }); doc.text(`${taxa.toFixed(2)}`, 75, y, { align: 'right' });
      }
      y += 6; doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('TOTAL:', 45, y, { align: 'right' }); doc.text(`R$ ${total.toFixed(2)}`, 75, y, { align: 'right' });
      y += 12;
      doc.setFontSize(7); doc.setFont('helvetica', 'italic');
      doc.text('Obrigado pela preferência!', 40, y, { align: 'center' });
      doc.save(`Recibo_Resenha_${Date.now()}.pdf`);
    });
  };

  const paymentTotals = useMemo(() => {
    const totals = { pix: 0, dinheiro: 0, debito: 0, credito: 0, outrosCartoes: 0 };
    historicoVendas.forEach(p => {
      if (!p.forma_pagamento) return;
      const matches = p.forma_pagamento.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)\s*\(R\$([0-9.]+)\)/gi);
      if (matches) {
        matches.forEach((m: string) => {
          const typeMatch = m.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)/i);
          const valMatch = m.match(/R\$([0-9.]+)/);
          if (typeMatch && valMatch) {
            const type = typeMatch[1].toUpperCase();
            const val = parseFloat(valMatch[1]);
            if (type === 'PIX') totals.pix += val;
            else if (type === 'DINHEIRO') totals.dinheiro += val;
            else if (type === 'DÉBITO' || type === 'DEBITO') totals.debito += val;
            else if (type === 'CRÉDITO' || type === 'CREDITO') totals.credito += val;
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
      doc.text('LEITURA Z - FECHAMENTO', 40, y, { align: 'center' }); y += 4;
      doc.line(5, y, 75, y); y += 6;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, 5, y); doc.text(`HORA: ${new Date().toLocaleTimeString('pt-BR')}`, 75, y, { align: 'right' }); y += 4;
      doc.text(`OPERADOR: ${profile?.full_name?.toUpperCase() || 'CAIXA'}`, 5, y); y += 6;
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('VENDAS POR MODALIDADE:', 5, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('DINHEIRO:', 5, y); doc.text(`R$ ${paymentTotals.dinheiro.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('PIX:', 5, y); doc.text(`R$ ${paymentTotals.pix.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('CARTÃO DÉBITO:', 5, y); doc.text(`R$ ${paymentTotals.debito.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('CARTÃO CRÉDITO:', 5, y); doc.text(`R$ ${paymentTotals.credito.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      y += 6; doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('CONFERÊNCIA DE GAVETA:', 5, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Dinheiro Esperado:', 5, y); doc.text(`R$ ${dinhEsperado.toFixed(2)}`, 75, y, { align: 'right' }); y += 5;
      doc.text('Dinheiro Declarado:', 5, y); doc.text(`R$ ${fnGaveta.toFixed(2)}`, 75, y, { align: 'right' }); y += 6;
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text(diff === 0 ? 'CONFERE' : diff > 0 ? `SOBRA: R$ ${diff.toFixed(2)}` : `QUEBRA: R$ ${Math.abs(diff).toFixed(2)}`, 40, y, { align: 'center' });
      doc.save(`Fechamento_${Date.now()}.pdf`);
      if (confirm("Encerrar turno e sair?")) signOut();
    });
  };

  const handleSimularMesasCaixa = async () => {
    if (!confirm("GERAR MESAS DE TESTE?")) return;
    const { data: mesasLivres } = await supabase.from('mesas').select('*').eq('status', 'livre').limit(3);
    const { data: prods } = await supabase.from('produtos').select('*').limit(5);
    if (!mesasLivres || !prods) return;
    for (const mesa of mesasLivres) {
       await supabase.from('mesas').update({ status: 'aguardando conta', precisa_garcom: true }).eq('id', mesa.id);
       const { data: p } = await supabase.from('pedidos').insert({ mesa_id: mesa.id, garcom_id: profile?.id, status: 'aberto', total: 50, data_hora: new Date().toISOString() }).select().single();
       if (p) {
          await supabase.from('itens_pedido').insert({ pedido_id: p.id, produto_id: prods[0].id, quantidade: 2, preco_unitario: prods[0].preco, status: 'entregue' });
       }
    }
    fetchData();
  };

  const handleSimularCozinha = async () => {
    const { data: prods } = await supabase.from('produtos').select('*').limit(3);
    if (!prods) return;
    const { data: p } = await supabase.from('pedidos').insert({ mesa_id: null, garcom_id: profile?.id, status: 'novo', total: 0, data_hora: new Date().toISOString() }).select().single();
    if (p) {
       await supabase.from('itens_pedido').insert({ pedido_id: p.id, produto_id: prods[0].id, quantidade: 1, preco_unitario: prods[0].preco, status: 'pendente' });
    }
    fetchData();
  };

  const handleSimularHistorico = async () => {
    const pagamentosFixos = ['DINHEIRO', 'PIX', 'DÉBITO', 'CRÉDITO'];
    for (const pagType of pagamentosFixos) {
       const totalRand = 50;
       const pagStr = `${pagType} (R$${totalRand.toFixed(2)})`;
       await supabase.from('pedidos').insert({ mesa_id: null, garcom_id: profile?.id, status: 'finalizado', total: totalRand, forma_pagamento: pagStr, data_hora: new Date().toISOString(), finalizado_at: new Date().toISOString() });
    }
    fetchData();
  };

  const categories = ['TODOS', 'PETISCO', 'BEBIDAS', 'COQUETÉIS', 'DESTILADOS (DOSE)'];

  if (loading) return <div className="layout-container d-flex justify-center items-center" style={{height: '100vh', background: '#000', color: 'var(--primary-color)'}}>CARREGANDO CAIXA RESENHA...</div>;

  return (
    <div className="layout-container" style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <aside className="sidebar" style={{ width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 0' }}>
         <div style={{ marginBottom: '3rem' }}><div style={{ width: '40px', height: '40px', background: 'var(--primary-color)', borderRadius: '12px' }}></div></div>
         <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <button onClick={() => setActiveTab('mesas')} style={{ background: 'none', border: 'none', color: activeTab === 'mesas' ? 'var(--primary-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', position: 'relative' }}>
              <Store size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>MESAS</span>
            </button>
            <button onClick={() => setActiveTab('balcao')} style={{ background: 'none', border: 'none', color: activeTab === 'balcao' ? 'var(--primary-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <ShoppingCart size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>BALCÃO</span>
            </button>
            <button onClick={() => setActiveTab('cozinha')} style={{ background: 'none', border: 'none', color: activeTab === 'cozinha' ? 'var(--primary-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <Utensils size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>COZINHA</span>
            </button>
            <button onClick={() => setActiveTab('historico')} style={{ background: 'none', border: 'none', color: activeTab === 'historico' ? 'var(--primary-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <HistoryIcon size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>HISTÓRICO</span>
            </button>
            <button onClick={() => setActiveTab('fechamento')} style={{ background: 'none', border: 'none', color: activeTab === 'fechamento' ? 'var(--danger-color)' : '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <Lock size={28} /> <span style={{ fontSize: '0.6rem', fontWeight: 700 }}>FECHAR DIA</span>
            </button>
         </nav>
         <button onClick={() => signOut()} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}><LogOut size={28}/></button>
      </aside>

      <main className="main-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <OwnerViewBanner panelName="Caixa" />
        <header className="d-flex justify-between items-center mb-6">
           <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary-color)' }}>
             {activeTab === 'mesas' ? 'GESTÃO DE MESAS' : activeTab === 'balcao' ? 'VENDA DE BALCÃO' : activeTab === 'cozinha' ? 'PEDIDOS COZINHA' : activeTab === 'historico' ? 'RELATÓRIO DE VENDAS' : 'FECHAMENTO E LEITURA Z'}
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
                 <div key={mesa.id} className="card hover-surface" style={{ borderLeft: '8px solid var(--primary-color)', padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: '0.5rem' }}>AGUARDANDO CONTA</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Mesa {mesa.numero}</div>
                    <button className="btn-primary w-full mt-4" onClick={() => openTableCheckout(mesa)} style={{ background: 'var(--primary-color)', color: '#000' }}>FECHAR CONTA</button>
                 </div>
               ))}
               {mesasPendentes.length === 0 && (
                 <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '5rem', opacity: 0.8 }}>
                   <Receipt size={80} style={{margin: '0 auto 1.5rem', opacity: 0.3}} />
                   <h3 style={{ opacity: 0.3 }}>Nenhuma mesa ativa no momento.</h3>
                   <button onClick={handleSimularMesasCaixa} className="btn-outline mt-6">Simular Mesas</button>
                 </div>
               )}
            </motion.div>
          )}

          {activeTab === 'balcao' && (
            <motion.div key="balcao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', height: 'calc(100vh - 180px)' }}>
                <div className="d-flex flex-col gap-3">
                   <div style={{ position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
                      <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar..." style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: '#111', border: '1px solid #222', borderRadius: '10px', color: '#fff' }} />
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '0.8rem', overflowY: 'auto' }}>
                      {filteredProdutos.map(p => (
                        <div key={p.id} className="card hover-surface text-center" style={{ padding: '0.8rem', cursor: 'pointer' }} onClick={() => addToCart(p)}>
                           <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.nome}</div>
                           <div style={{ color: 'var(--primary-color)', fontWeight: 900 }}>R$ {Number(p.preco).toFixed(2)}</div>
                        </div>
                      ))}
                   </div>
                </div>
               
               <div className="card d-flex flex-col" style={{ padding: '0', background: '#f8f8f8', border: '1px solid #ddd', borderRadius: '4px', color: '#111', fontFamily: 'monospace' }}>
                  <div style={{ background: '#eee', padding: '1rem', textAlign: 'center', borderBottom: '2px dashed #ccc' }}>
                     <h3 style={{ fontSize: '0.9rem', fontWeight: 900 }}>RESENHA DO MOURA</h3>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} className="d-flex flex-col gap-2">
                     {carrinho.map(item => (
                       <div key={item.id} className="d-flex justify-between">
                          <span>{item.quantidade}x {item.nome}</span>
                          <span>{(item.preco * item.quantidade).toFixed(2)}</span>
                       </div>
                     ))}
                  </div>
                  <div style={{ padding: '1rem', background: '#fff', borderTop: '2px dashed #ccc' }}>
                     <div className="d-flex justify-between mb-4">
                        <b>TOTAL GERAL:</b>
                        <b style={{ fontSize: '1.5rem' }}>R$ {carrinho.reduce((acc, i) => acc + (i.preco * i.quantidade), 0).toFixed(2)}</b>
                     </div>
                     <button className="btn-primary w-full py-4" onClick={openQuickCheckout}>RECEBER AGORA</button>
                     <button className="w-full mt-2" style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.6rem' }} onClick={() => setCarrinho([])}>CANCELAR TUDO</button>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'historico' && (
            <motion.div key="historico" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                 <div className="card" style={{ padding: '1rem' }}>PIX: R$ {paymentTotals.pix.toFixed(2)}</div>
                 <div className="card" style={{ padding: '1rem' }}>DINHEIRO: R$ {paymentTotals.dinheiro.toFixed(2)}</div>
                 <div className="card" style={{ padding: '1rem' }}>DÉBITO: R$ {paymentTotals.debito.toFixed(2)}</div>
                 <div className="card" style={{ padding: '1rem' }}>CRÉDITO: R$ {paymentTotals.credito.toFixed(2)}</div>
               </div>
               <div className="card" style={{ padding: 0 }}>
                  <table style={{ width: '100%' }}>
                   <thead>
                     <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                       <th style={{ padding: '1rem', textAlign: 'left' }}>Mesa</th>
                       <th style={{ padding: '1rem', textAlign: 'left' }}>Pagamento</th>
                       <th style={{ padding: '1rem', textAlign: 'right' }}>Total</th>
                     </tr>
                   </thead>
                   <tbody>
                     {historicoVendas.map(v => (
                       <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} onClick={() => handleVerDetalhes(v)}>
                         <td style={{ padding: '1rem' }}>{v.mesa_id ? `Mesa ${v.mesas?.numero}` : 'Balcão'}</td>
                         <td style={{ padding: '1rem', fontSize: '0.7rem' }}>{v.forma_pagamento}</td>
                         <td style={{ padding: '1rem', textAlign: 'right' }}>R$ {Number(v.total).toFixed(2)}</td>
                       </tr>
                     ))}
                   </tbody>
                </table>
               </div>
            </motion.div>
          )}

          {activeTab === 'fechamento' && (
             <motion.div key="fechamento" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
                   <h2 className="mb-6">Fechamento de Caixa</h2>
                   <div className="mb-4">
                      <label style={{ display: 'block', marginBottom: '0.5rem' }}>Declaração de Dinheiro em Gaveta (R$)</label>
                      <input type="number" value={dinheiroGaveta} onChange={e => setDinheiroGaveta(e.target.value)} className="input-field" style={{ fontSize: '2rem', height: '4rem', textAlign: 'center' }} />
                   </div>
                   <button className="btn-primary w-full py-4" onClick={handleFechamentoCaixa}>FINALIZAR E IMPRIMIR Z</button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '92vh', padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 320px', alignItems: 'stretch' }}>
                {/* Coluna Esquerda: Itens e Conferência */}
                <div style={{ padding: '1.2rem', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                   <div className="d-flex justify-between items-center mb-4">
                      <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>CONFERÊNCIA</h2>
                        <span style={{ opacity: 0.5 }}>{selectedMesa ? `Mesa ${selectedMesa.numero}` : 'Venda Rápida'}</span>
                      </div>
                      <button onClick={() => setIsCheckoutOpen(false)} style={{ background: '#222', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%' }}><X size={18}/></button>
                   </div>
                   
                   <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }} className="d-flex flex-col gap-2">
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

                   {selectedMesa && (
                     <div className="card mb-4" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                        <div className="d-flex justify-between items-center mb-4">
                           <div className="d-flex items-center gap-2">
                             <div onClick={() => setIncluirTaxa(!incluirTaxa)} style={{ width: '40px', height: '20px', background: incluirTaxa ? 'var(--success-color)' : '#333', borderRadius: '10px', position: 'relative', cursor: 'pointer' }}>
                                <div style={{ position: 'absolute', top: '2px', left: incluirTaxa ? '22px' : '2px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: '0.2s' }}></div>
                             </div>
                             <span style={{ fontSize: '0.8rem' }}>TAXA DE SERVIÇO (10%)</span>
                           </div>
                           <b>R$ {taxaServico.toFixed(2)}</b>
                        </div>
                        <div className="d-flex justify-between items-center">
                           <span style={{ opacity: 0.6 }}>DIVIDIR CONTA POR:</span>
                           <div className="d-flex items-center gap-3">
                              <button onClick={() => setDividirPor(Math.max(1, dividirPor-1))} className="btn-outline" style={{width: '30px', height: '30px', padding: 0}}>-</button>
                              <b>{dividirPor}</b>
                              <button onClick={() => setDividirPor(dividirPor+1)} className="btn-outline" style={{width: '30px', height: '30px', padding: 0}}>+</button>
                           </div>
                        </div>
                     </div>
                   )}
                   <button className="btn-outline w-full p-4" onClick={() => handleImprimir(checkoutItens)}><Printer size={18} /> IMPRIMIR CONFERÊNCIA</button>
                </div>

                {/* Coluna Direita: Pagamentos */}
                <div style={{ background: '#111', padding: '1.2rem', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                    <div className="mb-4">
                       <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>VALOR TOTAL</span>
                       <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-color)' }}>R$ {totalComTaxa.toFixed(2)}</div>
                    </div>

                    <div className="mb-4">
                        <label style={{ fontSize: '0.65rem', opacity: 0.4, display: 'block', marginBottom: '8px', fontWeight: 800 }}>MÉTODO DE PAGAMENTO</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1rem' }}>
                           {[
                             { id: 'dinheiro', label: 'DINHEIRO', color: '#10b981' },
                             { id: 'pix', label: 'PIX', color: '#d4af37' },
                             { id: 'debito', label: 'DÉBITO', color: '#fff' },
                             { id: 'credito', label: 'CRÉDITO', color: '#fff' }
                           ].map(m => (
                             <button 
                                key={m.id}
                                onClick={() => setSelectedMethod(m.id as PaymentMethod)}
                                className={selectedMethod === m.id ? 'btn-primary' : 'btn-outline'}
                                style={{ 
                                  padding: '0.5rem', 
                                  fontSize: '0.7rem', 
                                  fontWeight: 800,
                                  borderColor: selectedMethod === m.id ? m.color : 'rgba(255,255,255,0.1)',
                                  background: selectedMethod === m.id ? m.color : 'transparent',
                                  color: selectedMethod === m.id ? '#000' : m.color,
                                  transition: '0.2s'
                                }}
                             >
                               {m.label}
                             </button>
                           ))}
                        </div>

                        <div className="card" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                           <label style={{ fontSize: '0.65rem', opacity: 0.4, display: 'block', marginBottom: '4px' }}>VALOR PARCIAL (R$)</label>
                           <input 
                             type="number" 
                             value={customAmount} 
                             onChange={e => setCustomAmount(e.target.value)} 
                             placeholder={totalRestante.toFixed(2)}
                             style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid #333', color: '#fff', padding: '0.2rem 0', marginBottom: '0.8rem', fontSize: '1.5rem', fontWeight: 900, outline: 'none' }} 
                           />
                           
                           <button 
                             onClick={() => {
                               if (!selectedMethod) {
                                  alert("Selecione um método de pagamento primeiro!");
                                  return;
                               }
                               const val = parseFloat(customAmount) || totalRestante;
                               handleAddPayment(selectedMethod, val);
                             }}
                             disabled={!selectedMethod}
                             className="btn-primary w-full"
                             style={{ opacity: selectedMethod ? 1 : 0.5 }}
                           >
                             ADICIONAR PAGAMENTO
                           </button>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                       <label style={{ fontSize: '0.65rem', opacity: 0.4, display: 'block', marginBottom: '8px' }}>PAGAMENTOS RECEBIDOS</label>
                       {pagamentos.map((p, i) => (
                         <div key={i} className="d-flex justify-between p-2 rounded-lg mb-2" style={{ background: 'rgba(255,255,255,0.05)', borderLeft: `4px solid ${p.method === 'dinheiro' ? '#10b981' : '#d4af37'}` }}>
                            <div className="d-flex flex-col">
                              <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{p.method.toUpperCase()}</span>
                            </div>
                            <b style={{ fontSize: '0.9rem' }}>R$ {p.amount.toFixed(2)}</b>
                         </div>
                       ))}
                       {pagamentos.length === 0 && <div style={{ textAlign: 'center', opacity: 0.3, padding: '1rem', border: '1px dashed #333', borderRadius: '8px', fontSize: '0.7rem' }}>Aguardando...</div>}
                    </div>

                    <div className="mt-auto pt-4" style={{ borderTop: '1px solid #222' }}>
                       <div className="d-flex justify-between items-end mb-4">
                          <div>
                            <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>RESTANTE</span>
                            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: totalRestante > 0.1 ? 'var(--danger-color)' : 'var(--success-color)' }}>R$ {totalRestante.toFixed(2)}</div>
                          </div>
                          {totalRestante <= 0.1 && <div style={{ color: 'var(--success-color)', fontWeight: 800, fontSize: '0.8rem' }}>PAGO ✓</div>}
                       </div>
                       <button 
                         className="btn-primary w-full py-4" 
                         disabled={totalRestante > 0.1} 
                         onClick={handleFinalizar}
                         style={{ fontSize: '1rem', background: totalRestante <= 0.1 ? 'var(--success-color)' : 'rgba(255,255,255,0.05)', color: totalRestante <= 0.1 ? '#000' : 'rgba(255,255,255,0.1)' }}
                       >
                         {totalRestante <= 0.1 ? 'FINALIZAR VENDA' : 'PAGAMENTO PENDENTE'}
                       </button>
                    </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
