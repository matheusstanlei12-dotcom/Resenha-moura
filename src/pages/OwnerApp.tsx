import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Users as UsersIcon, Package, Utensils, 
  Clock, Star, LogOut, LayoutDashboard,
  PieChart as PieIcon, LayoutGrid,
  QrCode, Banknote, CreditCard, Lock, History as HistoryIcon,
  ChevronDown, ChevronUp, Folder, FileText
} from 'lucide-react';
import { FechamentoCaixa } from '../components/FechamentoCaixa';

type TabType = 'dashboard' | 'usuarios' | 'produtos' | 'mesas' | 'avaliacoes' | 'caixa';


const COLORS = ['#d4af37', '#eab308', '#f59e0b', '#10b981', '#3b82f6'];

const KPIItem = ({ title, value, icon, color, trend }: any) => (
  <div className="card" style={{ padding: '1.5rem', position: 'relative' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, height: '3px', width: '100%', background: color }}></div>
    <div className="d-flex justify-between items-start mb-4">
       <div style={{ background: `${color}11`, padding: '10px', borderRadius: '10px' }}>{icon}</div>
       <span style={{ fontSize: '0.65rem', padding: '4px 8px', background: `${color}11`, borderRadius: '20px', color }}>{trend}</span>
    </div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{title}</div>
    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{value}</div>
  </div>
);

const SidebarItem = ({ active, icon, label, onClick, color }: any) => (
  <div className={`sidebar-item ${active ? 'active' : ''}`} onClick={onClick} style={{ color: color || (active ? 'var(--primary-color)' : 'var(--text-muted)') }}>
    {icon} <span>{label}</span>
  </div>
);

export const Dono = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  const [faturamento, setFaturamento] = useState(0);
  const [pedidosAtivosCount, setPedidosAtivosCount] = useState(0);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [mesas, setMesas] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [waiterRanking, setWaiterRanking] = useState<any[]>([]);
  const [avgPrepTimes, setAvgPrepTimes] = useState<any[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [historicoCompleto, setHistoricoCompleto] = useState<any[]>([]);
  const [turnosHistorico, setTurnosHistorico] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);


  // Modal Novo Colaborador
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('garcom');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const fetchData = async () => {
    try {
      const { data: pFinalizados } = await supabase.from('pedidos').select('total').eq('status', 'finalizado');
      setFaturamento(pFinalizados?.reduce((acc, p) => acc + Number(p.total), 0) || 0);
      
      const { count } = await supabase.from('pedidos').select('id', { count: 'exact' }).neq('status', 'finalizado');
      setPedidosAtivosCount(count || 0);

      const { data: profiles, error: e3 } = await supabase.from('profiles').select('*').not('role', 'eq', 'dono').order('role', { ascending: true });
      if (e3 && e3.message.includes('permission denied')) setError("Sem permissão para ver equipe.");
      setUsuarios(profiles || []);

      const { data: prods } = await supabase.from('produtos').select('*').order('categoria', { ascending: true });
      setProdutos(prods || []);

      const { data: mses } = await supabase.from('mesas').select('*').order('numero', { ascending: true });
      setMesas(mses || []);

      const { data: rankingData } = await supabase.from('pedidos').select('total, mesa_id, garcom_id, profiles:garcom_id(full_name, role)').eq('status', 'finalizado');
      
      if (rankingData) {
        const stats: any = {};
        rankingData.forEach((p: any) => {
          const name = p.profiles?.full_name || 'Desconhecido';
          // Ignorar dono ou qualquer um que tenha Alair no nome para os gráficos de top garçom
          if (name.toLowerCase().includes('alair') || p.profiles?.role === 'dono') return;
          
          if (!stats[name]) stats[name] = { name, total: 0, count: 0, mesas: new Set() };
          stats[name].total += Number(p.total);
          stats[name].count += 1;
          stats[name].mesas.add(p.mesa_id);
        });

        // Adiciona 5 garçons fictícios à visualização para preencher gráficos de produtividade
        const mockWaiters = [
           { name: 'Lucas Silva', total: 650.00, count: 12, mesaCount: 4 },
           { name: 'Mariana Costa', total: 820.50, count: 15, mesaCount: 5 },
           { name: 'Pedro Santos', total: 430.00, count: 8, mesaCount: 3 },
           { name: 'Ana Oliveira', total: 540.00, count: 10, mesaCount: 4 },
           { name: 'Rafael Souza', total: 290.00, count: 6, mesaCount: 2 }
        ];

        let finalRanking = Object.values(stats)
           .map((s: any) => ({ 
             name: s.name, total: s.total, count: s.count, mesaCount: s.mesas.size 
           }));

        mockWaiters.forEach(mock => {
           if (!finalRanking.find(r => r.name === mock.name)) {
               finalRanking.push(mock);
           }
        });

        setWaiterRanking(finalRanking.sort((a: any, b: any) => b.total - a.total));
      }

      const { data: avs } = await supabase.from('avaliacoes').select('*').order('created_at', { ascending: false });
      setAvaliacoes(avs || []);

      const { data: recents } = await supabase.from('pedidos').select('*, mesas(numero), itens_pedido(quantidade, produtos(nome))').order('data_hora', { ascending: false }).limit(6);
      setRecentOrders(recents || []);


      const { data: allFinalizados } = await supabase.from('pedidos').select('*, mesas(numero)').eq('status', 'finalizado').order('finalizado_at', { ascending: false });
      setHistoricoCompleto(allFinalizados || []);

      const { data: turnos, error: turnosError } = await supabase
        .from('turnos_caixa')
        .select(`
          *, 
          profiles:operador_id(full_name),
          pedidos(*)
        `)
        .order('aberto_em', { ascending: false })
        .limit(100);
      
      if (turnosError) {
        console.error("Erro crítico ao buscar turnos:", turnosError);
        const { data: simpleTurnos } = await supabase
          .from('turnos_caixa')
          .select('*, profiles:operador_id(full_name)')
          .order('aberto_em', { ascending: false })
          .limit(50);
        setTurnosHistorico(simpleTurnos || []);
      } else {
        console.log("Turnos carregados com sucesso:", turnos?.length);
        setTurnosHistorico(turnos || []);
      }


      const { data: prepData } = await supabase.from('itens_pedido').select('id, preparo_inicio_at, preparo_fim_at, produtos (nome)').not('preparo_inicio_at', 'is', null).not('preparo_fim_at', 'is', null);
      if (prepData) {
        const times: any = {};
        prepData.forEach((i: any) => {
          const name = i.produtos?.nome || 'Item Desconhecido';
          const start = new Date(i.preparo_inicio_at).getTime();
          const end = new Date(i.preparo_fim_at).getTime();
          const diffMinutes = (end - start) / (1000 * 60);
          if (!times[name]) times[name] = { name, total: 0, count: 0 };
          times[name].total += diffMinutes;
          times[name].count += 1;
        });
        setAvgPrepTimes(Object.values(times).map((t: any) => ({
          name: t.name, minutos: (t.total / t.count).toFixed(1)
        })).sort((a,b) => Number(b.minutos) - Number(a.minutos)).slice(0, 10));
      }

    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateEstoque = async (id: string, current: number, delta: number) => {
    const newValue = Math.max(0, current + delta);
    const { error } = await supabase.from('produtos').update({ estoque: newValue }).eq('id', id);
    if (!error) {
      setProdutos(produtos.map(p => p.id === id ? { ...p, estoque: newValue } : p));
    }
  };

  const handleDirectStockInput = async (id: string, value: string) => {
    const newValue = parseInt(value);
    if (isNaN(newValue) || newValue < 0) return;
    const { error } = await supabase.from('produtos').update({ estoque: newValue }).eq('id', id);
    if (!error) {
      setProdutos(produtos.map(p => p.id === id ? { ...p, estoque: newValue } : p));
    }
  };

  const handleUpdatePreco = async (id: string, value: string) => {
    const newPreco = parseFloat(value.replace(',', '.'));
    if (isNaN(newPreco) || newPreco < 0) return;
    const { error } = await supabase.from('produtos').update({ preco: newPreco }).eq('id', id);
    if (!error) {
      setProdutos(produtos.map(p => p.id === id ? { ...p, preco: newPreco } : p));
    }
  };

  const handleCopyLink = (qrCode: string) => {
    const url = `https://www.trusteng.online/c/${qrCode}`;
    navigator.clipboard.writeText(url);

    alert("Link copiado para o clipboard! 🔗");
  };

  const handleGeneratePDF = (numero: number, qrCode: string) => {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });
      const url = `https://www.trusteng.online/c/${qrCode}`;
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&margin=0`;
      img.onload = () => {
        // Fundo com cor leve para destacar bordas
        doc.setFillColor(252, 252, 252); 
        doc.rect(0, 0, 105, 148, 'F');
        
        // Borda externa dourada (espessa)
        doc.setDrawColor(212, 175, 55); 
        doc.setLineWidth(1.5);
        doc.rect(5, 5, 95, 138);
        
        // Borda interna dourada (fina)
        doc.setLineWidth(0.3);
        doc.rect(7, 7, 91, 134);
        
        // Título Principal
        doc.setTextColor(212, 175, 55); 
        doc.setFontSize(18); 
        doc.setFont('helvetica', 'bold');
        doc.text('RESENHA DO MOURA', 52.5, 23, { align: 'center' });
        
        // Linha divisória ornamental
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.line(30, 27, 75, 27);
        
        // Fundo da Mesa (Pílula dourada)
        doc.setFillColor(212, 175, 55); 
        doc.roundedRect(32.5, 33, 40, 11, 4, 4, 'F');
        
        // Texto da Mesa (Branco vazado no fundo escuro)
        doc.setTextColor(255, 255, 255); 
        doc.setFontSize(16); 
        doc.setFont('helvetica', 'bold');
        doc.text(`MESA ${numero}`, 52.5, 40.5, { align: 'center' });
        
        // Moldura do QR Code
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(0.5);
        doc.roundedRect(24, 52, 57, 57, 4, 4, 'FD');
        
        // Logo/QR Code
        doc.addImage(img, 'PNG', 27.5, 55.5, 50, 50);
        
        // Textos inferiores
        doc.setTextColor(40, 40, 40); 
        doc.setFontSize(11); 
        doc.setFont('helvetica', 'bold');
        doc.text('Acesse nosso cardápio digital', 52.5, 120, { align: 'center' });
        
        doc.setTextColor(100, 100, 100); 
        doc.setFontSize(10); 
        doc.setFont('helvetica', 'normal');
        doc.text('Aponte a câmera do seu celular', 52.5, 127, { align: 'center' });
        doc.text('para o QR Code acima.', 52.5, 132, { align: 'center' });
        
        doc.save(`ResenhaMoura_Mesa_${numero}.pdf`);
      };
    });
  };

  const handleGenerateAllPDFs = () => {
    if (mesas.length === 0) {
      alert("Nenhuma mesa configurada!");
      return;
    }
    
    alert("Iniciando geração do PDF de todas as mesas. Isso pode levar alguns segundos devido à quantidade, por favor aguarde o download...");
    
    import('jspdf').then(async ({ default: jsPDF }) => {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });
      
      for (let i = 0; i < mesas.length; i++) {
        if (i > 0) doc.addPage();
        const m = mesas[i];
        const url = `https://www.trusteng.online/c/${m.qr_code}`;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&margin=0&t=${Date.now()}`;
        
        await new Promise((resolve) => {
          img.onload = () => {
            doc.setFillColor(252, 252, 252); doc.rect(0, 0, 105, 148, 'F');
            doc.setDrawColor(212, 175, 55); doc.setLineWidth(1.5); doc.rect(5, 5, 95, 138);
            doc.setLineWidth(0.3); doc.rect(7, 7, 91, 134);
            doc.setTextColor(212, 175, 55); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
            doc.text('RESENHA DO MOURA', 52.5, 23, { align: 'center' });
            doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.5); doc.line(30, 27, 75, 27);
            doc.setFillColor(212, 175, 55); doc.roundedRect(32.5, 33, 40, 11, 4, 4, 'F');
            doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
            doc.text(`MESA ${m.numero}`, 52.5, 40.5, { align: 'center' });
            doc.setFillColor(255, 255, 255); doc.setDrawColor(212, 175, 55); doc.setLineWidth(0.5);
            doc.roundedRect(24, 52, 57, 57, 4, 4, 'FD');
            doc.addImage(img, 'PNG', 27.5, 55.5, 50, 50);
            doc.setTextColor(40, 40, 40); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.text('Acesse nosso cardápio digital', 52.5, 120, { align: 'center' });
            doc.setTextColor(100, 100, 100); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
            doc.text('Aponte a câmera do seu celular', 52.5, 127, { align: 'center' });
            doc.text('para o QR Code acima.', 52.5, 132, { align: 'center' });
            resolve(true);
          };
          img.onerror = () => {
            console.error("Falha ao carregar QR code da mesa", m.numero);
            resolve(false);
          };
        });
        
        // Delay para evitar Rate Limiting da API pública
        await new Promise(r => setTimeout(r, 400));
      }
      doc.save(`ResenhaMoura_Todas_Mesas.pdf`);
    });
  };

  const handleAddProduto = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);
    const { error } = await supabase.from('produtos').insert({
      nome: data.nome, categoria: data.categoria, preco: parseFloat(data.preco as string), estoque: parseInt(data.estoque as string), ativo: true
    });
    if (!error) { fetchData(); (e.target as HTMLFormElement).reset(); }
  };

  const handleDeleteProduto = async (id: string) => {
    if (confirm("Excluir produto?")) {
      const { error } = await supabase.from('produtos').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handleAddMesa = async () => {
    const numero = prompt("Número da nova mesa:");
    if (!numero) return;
    const { error } = await supabase.from('mesas').insert({ numero: parseInt(numero), qr_code: `mesa-${numero}-qr`, status: 'livre' });
    if (!error) fetchData();
  };

  const handleDeleteMesa = async (id: string) => {
    if (confirm("Excluir mesa?")) {
      const { error } = await supabase.from('mesas').delete().eq('id', id);
      if (!error) fetchData();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_user_admin', {
        new_email: newUserEmail, new_password: newUserPassword, new_role: newUserRole, new_full_name: newUserName
      });
      if (rpcError || (rpcData && rpcData.error)) throw new Error(rpcError?.message || rpcData.error);
      setShowNewUser(false); setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); fetchData();
    } catch (err: any) { alert("Erro: " + err.message); } finally { setIsCreatingUser(false); }
  };



  const paymentTotals = useMemo(() => {
    const totals = { pix: 0, dinheiro: 0, debito: 0, credito: 0, outrosCartoes: 0 };
    historicoCompleto.forEach(p => {
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
            else if (type === 'CARTAO' || type === 'CARTÃO') totals.outrosCartoes += val;
          }
        });
      }
    });
    return totals;
  }, [historicoCompleto]);

  const dynamicChartData = useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Initialize last 7 days with 0
    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        dailyTotals[dateStr] = 0;
    }

    historicoCompleto.forEach(p => {
      const d = new Date(p.finalizado_at || p.data_hora);
      if (d >= sevenDaysAgo) {
        const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        if (dailyTotals[dateStr] !== undefined) {
           dailyTotals[dateStr] += Number(p.total);
        }
      }
    });

    const entries = Object.entries(dailyTotals).map(([name, valor]) => ({ name, valor }));
    entries.sort((a, b) => {
       const [da, ma] = a.name.split('/');
       const [db, mb] = b.name.split('/');
       return new Date(2025, parseInt(ma)-1, parseInt(da)).getTime() - new Date(2025, parseInt(mb)-1, parseInt(db)).getTime();
    });
    return entries;
  }, [historicoCompleto]);

  const renderDashboard = () => (
    <div className="animate-fade-in">
      <div className="d-flex justify-between items-center mb-8">
        <div>
          <h1 style={{ fontSize: '2rem', color: '#fff', fontWeight: 800 }}>Bem-vindo, {profile?.full_name || 'Gestor'}! ✨</h1>
          <p className="text-muted">Painel VIP - Controle Total do Estabelecimento.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <KPIItem title="Receita Bruta" value={`R$ ${faturamento.toFixed(2).replace('.', ',')}`} icon={<TrendingUp color="#d4af37" />} color="#d4af37" trend="+12%" />
        <KPIItem title="Equipe Resenha" value={usuarios.length.toString()} icon={<UsersIcon color="#10b981" />} color="#10b981" trend="Membros" />
        <KPIItem title="Pedidos Ativos" value={pedidosAtivosCount.toString()} icon={<Utensils color="#3b82f6" />} color="#3b82f6" trend="Cozinha" />
        <KPIItem title="Top Garçom" value={waiterRanking[0]?.name?.split(' ')[0] || '---'} icon={<Star color="#8b5cf6" />} color="#8b5cf6" trend="Destaque" />
      </div>
      
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff' }}>Receita por Forma de Pagamento</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <KPIItem title="PIX" value={`R$ ${paymentTotals.pix.toFixed(2).replace('.', ',')}`} icon={<QrCode color="#10b981" />} color="#10b981" trend="Digital" />
        <KPIItem title="DINHEIRO" value={`R$ ${paymentTotals.dinheiro.toFixed(2).replace('.', ',')}`} icon={<Banknote color="#f59e0b" />} color="#f59e0b" trend="Cédulas" />
        <KPIItem title="DÉBITO" value={`R$ ${paymentTotals.debito.toFixed(2).replace('.', ',')}`} icon={<CreditCard color="#3b82f6" />} color="#3b82f6" trend="Cartão" />
        <KPIItem title="CRÉDITO" value={`R$ ${paymentTotals.credito.toFixed(2).replace('.', ',')}`} icon={<CreditCard color="#8b5cf6" />} color="#8b5cf6" trend="Cartão" />
        {paymentTotals.outrosCartoes > 0 && <KPIItem title="CARTÕES ANTIGOS" value={`R$ ${paymentTotals.outrosCartoes.toFixed(2).replace('.', ',')}`} icon={<CreditCard color="#888" />} color="#888" trend="Legado" />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', gridColumn: '1 / -1' }}>
           <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Vendas Diárias (Últimos 7 dias)</h3>
           <div style={{ height: '250px' }}>
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={dynamicChartData}>
                 <XAxis dataKey="name" fontSize={10} />
                 <YAxis fontSize={10} tickFormatter={(value) => `R$${value}`} />
                 <Tooltip formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Vendas']} />
                 <Area type="monotone" dataKey="valor" stroke="#d4af37" fill="rgba(212,175,55,0.2)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
           <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Produtividade: Mesas por Garçom</h3>
           <div style={{ height: '250px' }}>
             <ResponsiveContainer width="100%" height="100%"><BarChart data={waiterRanking}><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Bar dataKey="mesaCount" fill="#10b981" /></BarChart></ResponsiveContainer>
           </div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
           <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Fluxo de Pedidos Recentes</h3>
           <div className="d-flex flex-col gap-3">
             {recentOrders.map((o: any) => (
               <div key={o.id} className="d-flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                 <div>
                   <span style={{ fontWeight: 600 }}>MESA {o.mesas?.numero || 'S/N'}</span>
                   <div className="d-flex flex-col gap-1 mt-1">
                      {o.itens_pedido?.map((item: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.65rem', opacity: 0.5, whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.quantidade}x {item.produtos?.nome}
                        </div>
                      ))}
                   </div>
                 </div>
                 <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>R$ {Number(o.total).toFixed(2)}</span>
               </div>
             ))}
           </div>

        </div>
      </div>
    </div>
  );

  const renderUsuarios = () => (
    <div className="animate-fade-in">
      <div className="d-flex justify-between items-center mb-6">
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Gestão de Equipe ({usuarios.length})</h2>
        <button className="btn-success" onClick={() => setShowNewUser(!showNewUser)} style={{ width: 'auto' }}>{showNewUser ? 'Cancelar' : '+ Cadastrar Usuário'}</button>
      </div>
      {showNewUser && (
        <div className="card mb-6">
          <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Nome" required className="input-field" />
            <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="E-mail" required className="input-field" />
            <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Senha" required className="input-field" />
            <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="input-field">
              <option value="garcom">Garçom</option>
              <option value="caixa">Caixa</option>
              <option value="cozinha">Cozinha</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className="btn-primary" disabled={isCreatingUser}>{isCreatingUser ? 'Criando...' : 'Criar'}</button>
          </form>
        </div>
      )}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}><th style={{ padding: '1rem' }}>Nome</th><th style={{ padding: '1rem' }}>Função</th><th style={{ padding: '1rem' }}>Ações</th></tr></thead>
          <tbody>{usuarios.map(u => (<tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}><td style={{ padding: '1rem' }}>{u.full_name}</td><td style={{ padding: '1rem' }}>{u.role.toUpperCase()}</td><td style={{ padding: '1rem' }}><button style={{ color: 'var(--danger-color)' }}>Remover</button></td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );

  const renderProdutos = () => (
    <div className="animate-fade-in">
      <h2 className="mb-6" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Produtos & Estoque</h2>
      <div className="card mb-6">
        <form onSubmit={handleAddProduto} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <input name="nome" placeholder="Nome" required className="input-field" />
          <select name="categoria" className="input-field">
            <option value="PETISCO">PETISCO</option>
            <option value="BEBIDAS">BEBIDAS</option>
            <option value="COQUETÉIS">COQUETÉIS</option>
            <option value="DESTILADOS (DOSE)">DESTILADOS (DOSE)</option>
          </select>
          <input name="preco" type="number" step="0.01" placeholder="R$" required className="input-field" />
          <input name="estoque" type="number" placeholder="Estoque" required className="input-field" />
          <button type="submit" className="btn-primary">Adicionar</button>
        </form>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}><th style={{ padding: '1rem' }}>Item</th><th style={{ padding: '1rem' }}>Preço</th><th style={{ padding: '1rem' }}>Estoque</th><th style={{ padding: '1rem' }}>Ações</th></tr></thead>
          <tbody>{produtos.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <td style={{ padding: '1rem' }}>{p.nome}</td>
              <td style={{ padding: '1rem' }}>
                <div className="d-flex items-center gap-1">
                  <span style={{color: 'var(--text-muted)'}}>R$</span>
                  <input type="number" step="0.01" defaultValue={p.preco} onBlur={(e) => handleUpdatePreco(p.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUpdatePreco(p.id, (e.target as HTMLInputElement).value)} style={{ width: '80px', padding: '4px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white' }} />
                </div>
              </td>
              <td style={{ padding: '1rem' }}>
                <div className="d-flex items-center gap-2">
                   <button onClick={() => handleUpdateEstoque(p.id, p.estoque, -1)} className="btn-outline" style={{width: '28px'}}>-</button>
                   <input type="number" defaultValue={p.estoque} onBlur={(e) => handleDirectStockInput(p.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleDirectStockInput(p.id, (e.target as HTMLInputElement).value)} style={{ width: '60px', padding: '4px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', color: p.estoque < 10 ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 'bold' }} />
                   <button onClick={() => handleUpdateEstoque(p.id, p.estoque, 1)} className="btn-outline" style={{width: '28px'}}>+</button>
                </div>
              </td>
              <td style={{ padding: '1rem' }}><button onClick={() => handleDeleteProduto(p.id)} style={{ color: 'var(--danger-color)' }}>Excluir</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );

  const renderMesas = () => (
    <div className="animate-fade-in">
      <div className="d-flex justify-between items-center mb-6">
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Controle de Mesas</h2>
        <div className="d-flex gap-2">
          <button className="btn-outline" onClick={handleGenerateAllPDFs} style={{ width: 'auto', borderColor: '#d4af37', color: '#d4af37' }}>
            Imprimir Todos QR Codes
          </button>
          <button className="btn-primary" onClick={handleAddMesa} style={{ width: 'auto' }}>+ Nova Mesa</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
        {mesas.map(m => (
          <div key={m.id} className="card text-center">
            <button onClick={() => handleDeleteMesa(m.id)} style={{ float: 'right' }}>✕</button>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary-color)' }}>{m.numero}</div>
            <div className="d-flex flex-col gap-2 mt-4 px-3 pb-3">
              <button onClick={() => handleGeneratePDF(m.numero, m.qr_code)} className="btn-primary" style={{ fontSize: '0.7rem' }}>Gerar QRCode</button>
              <button onClick={() => handleCopyLink(m.qr_code)} className="btn-outline" style={{ fontSize: '0.7rem' }}>Copiar Link</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAvaliacoes = () => {
    const avgAtend = avaliacoes.length ? (avaliacoes.reduce((acc, a) => acc + a.nota_atendimento, 0) / avaliacoes.length).toFixed(1) : 0;
    const avgComida = avaliacoes.length ? (avaliacoes.reduce((acc, a) => acc + a.nota_comida, 0) / avaliacoes.length).toFixed(1) : 0;
    const avgAmb = avaliacoes.length ? (avaliacoes.reduce((acc, a) => acc + a.nota_ambiente, 0) / avaliacoes.length).toFixed(1) : 0;

    return (
      <div className="animate-fade-in">
        <h2 className="mb-6" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Avaliações</h2>
        
        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <KPIItem title="⭐ Média Atendimento" value={avgAtend} icon={<UsersIcon size={20} color="#d4af37"/>} color="#d4af37" trend="Geral" />
          <KPIItem title="🍱 Média Comida" value={avgComida} icon={<Utensils size={20} color="#10b981"/>} color="#10b981" trend="Sabor" />
          <KPIItem title="🕯️ Média Ambiente" value={avgAmb} icon={<Star size={20} color="#3b82f6"/>} color="#3b82f6" trend="Vibe" />
        </div>

        <div className="d-flex flex-col gap-4">
          {avaliacoes.map(av => (
            <div key={av.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary-color)' }}>
              <div className="d-flex justify-between items-start mb-4">
                <div>
                   <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Mesa {av.mesa_numero}</div>
                   <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(av.created_at).toLocaleString()}</div>
                </div>
                <div className="d-flex gap-3" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                   <span style={{ color: '#d4af37' }}>ATEND: {av.nota_atendimento}/5</span>
                   <span style={{ color: '#10b981' }}>COMIDA: {av.nota_comida}/5</span>
                   <span style={{ color: '#3b82f6' }}>AMBI: {av.nota_ambiente}/5</span>
                </div>
              </div>
              {av.sugestoes ? (
                <p style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', fontStyle: 'italic', color: '#eee', margin: 0 }}>
                  "{av.sugestoes}"
                </p>
              ) : (
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Sem comentários adicionais.</span>
              )}
            </div>
          ))}
          {avaliacoes.length === 0 && <p className="text-muted text-center pt-8">Nenhuma avaliação recebida ainda.</p>}
        </div>
      </div>
    );
  };

  const renderRendimentos = () => {
    const totalBruto = historicoCompleto.reduce((acc, p) => acc + Number(p.total), 0);
    const totalTaxa = historicoCompleto.reduce((acc, p) => p.mesa_id ? acc + (Number(p.total) / 11) : acc, 0);
    const totalLiquido = totalBruto - totalTaxa;

    const handleImprimirRendimentos = () => {
       import('jspdf').then(({ default: jsPDF }) => {
          const doc = new jsPDF();
          doc.setFontSize(18); doc.text('Relatório de Rendimentos - Resenha do Moura', 105, 15, { align: 'center' });

          doc.setFontSize(12); doc.text(`Data: ${new Date().toLocaleDateString()}`, 10, 25);
          doc.text('--- RESUMO FINANCEIRO ---', 10, 35);
          doc.text(`Total Bruto Geral: R$ ${totalBruto.toFixed(2)}`, 10, 45);
          doc.text(`Total Consumo (Pedidos): R$ ${totalLiquido.toFixed(2)}`, 10, 52);
          doc.text(`Total Taxa de Serviço: R$ ${totalTaxa.toFixed(2)}`, 10, 59);
          doc.line(10, 65, 200, 65); doc.text('LISTA DE PEDIDOS', 10, 75);
          
          let y = 85; doc.setFontSize(10);
          doc.text('ID', 10, y); doc.text('TIPO', 40, y); doc.text('TAXA', 80, y); doc.text('PEDIDO', 120, y); doc.text('TOTAL', 160, y);
          doc.line(10, y+2, 200, y+2); y += 8;

          historicoCompleto.forEach(v => {
             const taxa = v.mesa_id ? (Number(v.total) / 11) : 0;
             const liquido = Number(v.total) - taxa;
             doc.text(v.id.split('-')[0].toUpperCase(), 10, y);
             doc.text(v.mesa_id ? `Mesa ${v.mesas?.numero}` : 'Balcão', 40, y);
             doc.text(`R$ ${taxa.toFixed(2)}`, 80, y);
             doc.text(`R$ ${liquido.toFixed(2)}`, 120, y);
             doc.text(`R$ ${Number(v.total).toFixed(2)}`, 160, y);
             y += 6; if (y > 270) { doc.addPage(); y = 20; }
          });
          doc.save(`Rendimentos_Resenha_${Date.now()}.pdf`);
       });
    };

    return (
      <div className="animate-fade-in">
        <div className="d-flex justify-between items-center mb-6">
           <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Rendimentos & Fechamentos</h2>
           <button className="btn-primary" onClick={handleImprimirRendimentos} style={{ width: 'auto' }}>📄 Baixar PDF Rendimentos</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
           <KPIItem title="Faturamento Bruto" value={`R$ ${totalBruto.toFixed(2)}`} icon={<TrendingUp color="#d4af37" />} color="#d4af37" trend="Total" />
           <KPIItem title="Consumo (Pedidos)" value={`R$ ${totalLiquido.toFixed(2)}`} icon={<Package color="#10b981" />} color="#10b981" trend="Líquido" />
           <KPIItem title="Taxa de Serviço (10%)" value={`R$ ${totalTaxa.toFixed(2)}`} icon={<Star color="#3b82f6" />} color="#3b82f6" trend="Garçom" />
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr><th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem' }}>ID</th><th style={{ padding: '1rem', textAlign: 'left' }}>TIPO</th><th style={{ padding: '1rem', textAlign: 'left' }}>CONSUMO</th><th style={{ padding: '1rem', textAlign: 'left' }}>TAXA SERV.</th><th style={{ padding: '1rem', textAlign: 'right' }}>TOTAL</th></tr>
              </thead>
              <tbody>
                {historicoCompleto.map(v => {
                   const taxa = v.mesa_id ? (Number(v.total || 0) / 11) : 0;
                   const consumo = Number(v.total || 0) - taxa;
                   const displayId = v.id ? v.id.split('-')[0].toUpperCase() : '---';
                   return (
                     <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                       <td style={{ padding: '1rem', fontSize: '0.7rem', opacity: 0.6, fontFamily: 'monospace' }}>#{displayId}</td>
                       <td style={{ padding: '1rem' }}>{v.mesa_id ? <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>MESA {v.mesas?.numero}</span> : <span style={{ color: 'var(--success-color)', fontWeight: 700 }}>BALCÃO</span>}</td>
                       <td style={{ padding: '1rem' }}>R$ {consumo.toFixed(2)}</td>
                       <td style={{ padding: '1rem', color: v.mesa_id ? '#d4af37' : 'inherit' }}>{v.mesa_id ? `R$ ${taxa.toFixed(2)}` : '---'}</td>
                       <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 800 }}>R$ {Number(v.total || 0).toFixed(2)}</td>
                     </tr>
                   );
                })}
              </tbody>
           </table>
        </div>
      </div>
    );
  };


  const paymentTotalsForCaixa = useMemo(() => {
    const totals = { pix: 0, dinheiro: 0, debito: 0, credito: 0 };
    historicoCompleto.forEach(p => {
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
  }, [historicoCompleto]);

  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedOS, setExpandedOS] = useState<string | null>(null);

  // 1. Agrupar turnos por data de forma robusta (Movido para o topo para seguir as regras de Hooks)
  const turnosPorData = useMemo(() => {
      try {
          if (!turnosHistorico || turnosHistorico.length === 0) return [];
          
          const groups: Record<string, any[]> = {};
          
          // Ordenar por data decrescente antes de agrupar
          const sorted = [...turnosHistorico].sort((a, b) => {
              const dateA = a.aberto_em ? new Date(a.aberto_em).getTime() : 0;
              const dateB = b.aberto_em ? new Date(b.aberto_em).getTime() : 0;
              return dateB - dateA;
          });

          sorted.forEach(t => {
              if (!t.aberto_em) return;
              try {
                  const dateObj = new Date(t.aberto_em);
                  if (isNaN(dateObj.getTime())) return;
                  const dateStr = dateObj.toLocaleDateString('pt-BR');
                  if (!groups[dateStr]) groups[dateStr] = [];
                  groups[dateStr].push(t);
              } catch (e) {
                  console.warn("Erro ao processar data do turno:", t.id);
              }
          });

          return Object.entries(groups);
      } catch (err) {
          console.error("Erro crítico no agrupamento do fluxo de caixa:", err);
          return [];
      }
  }, [turnosHistorico]);

  const renderCaixa = () => {
    // 0. Identificar turno aberto para o banner
    const turnoAberto = turnosHistorico.find(t => t.status === 'aberto');

    return (
      <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
        <div className="mb-8">
            <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Banco de fechamento de caixa</h2>
            <p className="text-muted">Gestão de turno atual e histórico organizado por pastas.</p>
        </div>

        {/* Turno Atual / Gestão em Tempo Real */}
        <div className="mb-8 p-6 card" style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <div className="d-flex justify-between items-center mb-6">
                <div className="d-flex items-center gap-3">
                    <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: turnoAberto ? '#10b981' : '#444',
                        boxShadow: turnoAberto ? '0 0 10px #10b981' : 'none',
                        animation: turnoAberto ? 'pulse 2s infinite' : 'none'
                    }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                        {turnoAberto ? 'TURNO EM ANDAMENTO' : 'CAIXA FECHADO'}
                    </h3>
                </div>
                {turnoAberto && (
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>OS ATUAL:</span>
                        <div style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary-color)' }}>#{turnoAberto.os_number || '---'}</div>
                    </div>
                )}
            </div>

            <FechamentoCaixa
                historicoVendas={historicoCompleto}
                paymentTotals={paymentTotalsForCaixa}
                onRefresh={fetchData}
            />
        </div>

        <div className="mb-4 d-flex items-center gap-2">
            <HistoryIcon size={18} opacity={0.5} />
            <span style={{ fontWeight: 800, fontSize: '0.8rem', opacity: 0.6, letterSpacing: '1px' }}>HISTÓRICO RECENTE</span>
        </div>

        <div className="d-flex flex-col gap-4">
            {turnosPorData.length === 0 && (
                <div className="card text-center" style={{ padding: '3rem', opacity: 0.5 }}>
                    Nenhum turno registrado no histórico.
                </div>
            )}
            {turnosPorData.map(([data, turnos]) => {
                const isDateExpanded = expandedDate === data;
                const totalDia = turnos.reduce((acc, t) => acc + (t.pedidos?.reduce((pAcc: number, p: any) => pAcc + Number(p.total), 0) || 0), 0);

                return (
                    <div key={data} className="card" style={{ padding: 0, overflow: 'hidden', border: isDateExpanded ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.05)' }}>
                        <div 
                            onClick={() => setExpandedDate(isDateExpanded ? null : data)}
                            style={{ 
                                padding: '1.2rem 1.5rem', 
                                background: isDateExpanded ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.01)', 
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div className="d-flex items-center gap-4">
                                <div style={{ background: 'rgba(212,175,55,0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <Folder size={24} color="#d4af37" fill="rgba(212,175,55,0.1)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>PASTA: {data}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 700 }}>{turnos.length} O.S. ARQUIVADA(S)</div>
                                </div>
                            </div>
                            <div className="d-flex items-center gap-6">
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>TOTAL DO DIA</div>
                                    <div style={{ fontWeight: 900, color: 'var(--primary-color)', fontSize: '1.1rem' }}>R$ {totalDia.toFixed(2)}</div>
                                </div>
                                {isDateExpanded ? <ChevronUp size={20} opacity={0.5} /> : <ChevronDown size={20} opacity={0.5} />}
                            </div>
                        </div>

                        {isDateExpanded && (
                            <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {turnos.map((t) => {
                                    const isOSExpanded = expandedOS === t.id;
                                    const fundo = Number(t.fundo_troco || 0);
                                    const declarado = Number(t.valor_declarado || 0);
                                    const esperado = fundo + (t.pedidos?.filter((p: any) => p.forma_pagamento?.includes('DINHEIRO')).reduce((acc: number, p: any) => {
                                        const match = p.forma_pagamento?.match(/DINHEIRO\s*\(R\$([0-9.]+)\)/i);
                                        return acc + (match ? parseFloat(match[1]) : 0);
                                    }, 0) || 0);
                                    
                                    const diferenca = t.status === 'fechado' ? declarado - esperado : 0;
                                    const statusColor = Math.abs(diferenca) < 0.1 ? '#10b981' : diferenca > 0 ? '#d4af37' : '#ef4444';
                                    
                                    const totalOS = t.pedidos?.reduce((acc: number, p: any) => acc + Number(p.total), 0) || 0;
                                    const totalTaxas = t.pedidos?.filter((p: any) => p.mesa_id).reduce((acc: number, p: any) => acc + (Number(p.total) / 11), 0) || 0;

                                    return (
                                        <div key={t.id} style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                                            <div 
                                                onClick={() => setExpandedOS(isOSExpanded ? null : t.id)}
                                                style={{ padding: '1rem 1.2rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                            >
                                                <div className="d-flex items-center gap-3">
                                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                                                        <FileText size={18} color={t.status === 'aberto' ? '#10b981' : '#fff'} opacity={0.6} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 900, fontSize: '0.95rem', color: t.status === 'aberto' ? '#10b981' : '#fff' }}>O.S. #{t.os_number || '---'}</div>
                                                        <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 700 }}>OPERADOR: {t.profiles?.full_name?.toUpperCase()} • {new Date(t.aberto_em).toLocaleTimeString('pt-BR')}</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex items-center gap-4">
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>FATURAMENTO</div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>R$ {totalOS.toFixed(2)}</div>
                                                    </div>
                                                    {isOSExpanded ? <ChevronUp size={16} opacity={0.3} /> : <ChevronDown size={16} opacity={0.3} />}
                                                </div>
                                            </div>

                                            {isOSExpanded && (
                                                <div style={{ padding: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                                        <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                            <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>VENDAS BRUTAS</div>
                                                            <div style={{ fontWeight: 800, color: 'var(--primary-color)' }}>R$ {totalOS.toFixed(2)}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                            <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>TAXAS (10%)</div>
                                                            <div style={{ fontWeight: 800, color: '#a78bfa' }}>R$ {totalTaxas.toFixed(2)}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                            <div style={{ fontSize: '0.6rem', opacity: 0.4 }}>FUNDO DE TROCO</div>
                                                            <div style={{ fontWeight: 800 }}>R$ {fundo.toFixed(2)}</div>
                                                        </div>
                                                        <div className="p-3 rounded-lg" style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}30` }}>
                                                            <div style={{ fontSize: '0.6rem', color: statusColor, fontWeight: 700 }}>{t.status === 'aberto' ? 'STATUS: ABERTO' : Math.abs(diferenca) < 0.1 ? 'CONFERE ✓' : diferenca > 0 ? `SOBRA: R$ ${diferenca.toFixed(2)}` : `QUEBRA: R$ ${Math.abs(diferenca).toFixed(2)}`}</div>
                                                            <div style={{ fontWeight: 900, fontSize: '0.9rem', color: statusColor }}>{t.status === 'fechado' ? `Declarado: R$ ${declarado.toFixed(2)}` : 'Em andamento...'}</div>
                                                        </div>
                                                    </div>

                                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '0.8rem', letterSpacing: '1px' }}>DETALHAMENTO DE VENDAS</h4>
                                                    <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                                                        <table style={{ width: '100%', fontSize: '0.75rem' }}>
                                                            <thead>
                                                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <th style={{ padding: '0.8rem', textAlign: 'left' }}>Cliente/Mesa</th>
                                                                    <th style={{ padding: '0.8rem', textAlign: 'left' }}>Pagamento</th>
                                                                    <th style={{ padding: '0.8rem', textAlign: 'right' }}>Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {t.pedidos?.map((p: any) => (
                                                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                        <td style={{ padding: '0.8rem' }}>{p.mesa_id ? `Mesa ${p.mesas?.numero || '?'}` : 'Balcão'}</td>
                                                                        <td style={{ padding: '0.8rem', fontSize: '0.65rem', opacity: 0.6 }}>{p.forma_pagamento}</td>
                                                                        <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 700 }}>R$ {Number(p.total).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                                {(!t.pedidos || t.pedidos.length === 0) && (
                                                                    <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>Nenhuma venda registrada neste turno.</td></tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'usuarios': return renderUsuarios();
      case 'produtos': return renderProdutos();
      case 'mesas': return renderMesas();
      case 'avaliacoes': return renderAvaliacoes();
      case 'caixa': return renderCaixa();
      default: return renderDashboard();
    }
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.4rem' }}>Resenha do Moura</h2>
        </div>
        <nav className="sidebar-nav">

          <SidebarItem active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Radar" onClick={() => setActiveTab('dashboard')} />
          <SidebarItem active={activeTab === 'produtos'} icon={<Package size={20}/>} label="Estoque" onClick={() => setActiveTab('produtos')} />
          <SidebarItem active={activeTab === 'mesas'} icon={<LayoutGrid size={20}/>} label="Mesas" onClick={() => setActiveTab('mesas')} />
          <SidebarItem active={activeTab === 'usuarios'} icon={<UsersIcon size={20}/>} label="Equipe" onClick={() => setActiveTab('usuarios')} />
          <SidebarItem active={activeTab === 'avaliacoes'} icon={<Star size={20}/>} label="Avaliações" onClick={() => setActiveTab('avaliacoes')} />


          <SidebarItem active={activeTab === 'caixa'} icon={<Lock size={20}/>} label="Banco de fechamento de caixa" onClick={() => setActiveTab('caixa')} />
        </nav>


        {/* Acesso Direto aos Painéis da Equipe */}
        <div style={{ margin: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.25)', padding: '0 8px', marginBottom: '6px' }}>
            PAINÉIS DA EQUIPE
          </div>
          {[
            { label: 'Garçom', path: '/garcom', emoji: '🍽️' },
            { label: 'Caixa', path: '/caixa', emoji: '💳' },
            { label: 'Cozinha / Bar', path: '/producao', emoji: '🍳' },
            { label: 'Administrador', path: '/admin', emoji: '⚙️' },
          ].map(({ label, path, emoji }) => (
            <button key={path} onClick={() => navigate(path)} style={{
              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
              background: 'none', border: 'none', cursor: 'pointer', padding: '9px 8px',
              borderRadius: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem',
              textAlign: 'left', transition: 'all 0.15s'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,175,55,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#d4af37'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'; }}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <SidebarItem active={false} icon={<LogOut size={20}/>} label="Sair" onClick={() => signOut()} color="var(--danger-color)" />
      </aside>
      <main className="main-content">
        <div className="container">{renderContent()}</div>
      </main>
    </div>
  );
};
