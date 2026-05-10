import { useEffect, useState, useMemo } from 'react';



import { useNavigate } from 'react-router-dom';



import { supabase } from '../lib/supabase';



import { useAuth } from '../contexts/AuthContext';



import { 



  BarChart, Bar, XAxis, YAxis, Tooltip, Tooltip as RechartsTooltip, ResponsiveContainer, 



  AreaChart, Area, PieChart, Pie, Cell, Legend, ComposedChart, Line



} from 'recharts';



import { motion, AnimatePresence } from 'framer-motion';



import { 



  TrendingUp, TrendingDown, Users as UsersIcon, Package, Utensils, 



  Clock, Star, LogOut, LayoutDashboard,



  PieChart as PieIcon, LayoutGrid,



  QrCode, Banknote, CreditCard, Lock, History as HistoryIcon,



  ChevronDown, ChevronUp, Folder, FileText, Trash2, Search, Plus, CreditCard as CreditCardIcon,



  Zap, BarChart3, Check, MoreVertical



} from 'lucide-react';



import { FechamentoCaixa } from '../components/FechamentoCaixa';



type TabType = 'dashboard' | 'usuarios' | 'produtos' | 'mesas' | 'avaliacoes' | 'comandas' | 'caixa' | 'ganhos_mensais' | 'gastos_mensais';



const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];



const KPIItem = ({ title, value, icon, color, trend, onClick }: any) => (



  <div className="card" onClick={onClick} style={{ padding: '1.25rem', position: 'relative', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.3s ease' }}>



    <div style={{ position: 'absolute', top: 0, left: 0, height: '3px', width: '100%', background: color }}></div>



    <div className="d-flex justify-between items-start mb-3">



       <div style={{ background: `${color}11`, padding: '8px', borderRadius: '10px' }}>{icon}</div>



       <span style={{ fontSize: '0.6rem', padding: '3px 7px', background: `${color}11`, borderRadius: '20px', color }}>{trend}</span>



    </div>



    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>



    <div style={{ fontSize: 'clamp(1.2rem, 5vw, 1.8rem)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>



  </div>



);



const formatCurrency = (val) => {



  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);



};



const SidebarItem = ({ active, icon, label, onClick, color }: any) => (



  <div className={`sidebar-item ${active ? 'active' : ''}`} onClick={onClick} style={{ color: color || (active ? 'var(--primary-color)' : 'var(--text-muted)') }}>



    {icon} <span>{label}</span>



  </div>



);



const adjustColor = (col: string, amt: number) => {



  let usePound = false;



  if (col[0] === "#") { col = col.slice(1); usePound = true; }



  const num = parseInt(col, 16);



  let r = (num >> 16) + amt;



  if (r > 255) r = 255; else if (r < 0) r = 0;



  let b = ((num >> 8) & 0x00FF) + amt;



  if (b > 255) b = 255; else if (b < 0) b = 0;



  let g = (num & 0x0000FF) + amt;



  if (g > 255) g = 255; else if (g < 0) g = 0;



  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);



};



const getBrandLogo = (bandeira: string) => {



  const b = bandeira.toLowerCase();



  if (b.includes('visa')) return <span style={{ fontWeight: 900, fontStyle: 'italic', fontSize: '1.2rem', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>VISA</span>;



  if (b.includes('master')) return (



    <div className="d-flex items-center">



      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#eb001b', marginRight: '-8px', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />



      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f79e1b', opacity: 0.8, boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />



    </div>



  );



  if (b.includes('elo')) return (



      <div style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px', display: 'flex', gap: '2px' }}>



          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ed1c24' }} />



          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00a1e4' }} />



          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffcb05' }} />



      </div>



  );



  return <CreditCardIcon size={20} color="#fff" />;



};



const BANK_DESIGNS: any = {



  nubank: {



    logo: <div style={{ fontSize: '1.4rem', fontWeight: 300, color: '#fff', opacity: 0.9 }}>nu</div>,



    logoPos: 'bottom-left',



    brandPos: 'top-right',



    color: '#8a05be',



    defaultBrand: 'Mastercard'



  },



  bb: {



    logo: (



      <div style={{ display: 'flex', gap: '2px' }}>



        <div style={{ width: '12px', height: '12px', background: '#0038a8', borderRadius: '2px' }} />



        <div style={{ width: '12px', height: '12px', background: '#facc15', borderRadius: '2px' }} />



      </div>



    ),



    logoPos: 'top-left',



    brandPos: 'bottom-right',



    text: 'ourocard',



    color: '#facc15',



    textColor: '#0038a8',



    defaultBrand: 'Visa'



  },



  neon: {



    logo: <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px' }}>Neon</div>,



    logoPos: 'top-left',



    brandPos: 'bottom-right',



    color: '#22d3ee',



    defaultBrand: 'Visa'



  },



  bradesco: {



    logo: <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>Bradesco</div>,



    logoPos: 'top-left',



    brandPos: 'bottom-right',



    color: '#e11d48',



    defaultBrand: 'Visa'



  },



  itau: {



    logo: <div style={{ background: '#fff', color: '#ec6608', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, fontSize: '0.7rem' }}>itaú</div>,



    logoPos: 'top-left',



    brandPos: 'bottom-right',



    color: '#003399',



    defaultBrand: 'Mastercard'



  },



  inter: {



    logo: <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>inter</div>,



    logoPos: 'top-left',



    brandPos: 'bottom-right',



    color: '#f97316',



    defaultBrand: 'Mastercard'



  },



  santander: {



    logo: <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>Santander</div>,



    logoPos: 'top-left',



    brandPos: 'bottom-right',



    color: '#ef4444',



    defaultBrand: 'Mastercard'



  }



};



const getBankDesign = (card: any) => {



  const name = (card.banco || card.nome || '').toLowerCase();



  if (name.includes('nubank')) return BANK_DESIGNS.nubank;



  if (name.includes('banco do brasil') || name.includes('ourocard') || name.includes('bb')) return BANK_DESIGNS.bb;



  if (name.includes('neon')) return BANK_DESIGNS.neon;



  if (name.includes('bradesco')) return BANK_DESIGNS.bradesco;



  if (name.includes('itau') || name.includes('itaú')) return BANK_DESIGNS.itau;



  if (name.includes('inter')) return BANK_DESIGNS.inter;



  if (name.includes('santander')) return BANK_DESIGNS.santander;



  return null;



};



const VisualCard = ({ card, onDelete, profile, isSelected, onClick }: any) => {



  const design = getBankDesign(card);



  const mainColor = design?.color || card.cor || '#334155';



  const textColor = design?.textColor || '#fff';



  return (



    <div 



      className={`visual-card ${isSelected ? 'selected' : ''}`}



      onClick={onClick}



      style={{ 



        flex: '0 0 280px', 



        height: '170px', 



        background: `linear-gradient(135deg, ${mainColor}, ${adjustColor(mainColor, -40)})`,



        borderRadius: '20px',



        padding: '1.5rem',



        position: 'relative',



        boxShadow: isSelected ? `0 0 0 3px var(--primary-color), 0 15px 35px rgba(0,0,0,0.6)` : '0 15px 35px rgba(0,0,0,0.4)',



        overflow: 'hidden',



        scrollSnapAlign: 'start',



        border: isSelected ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',



        display: 'flex',



        flexDirection: 'column',



        justifyContent: 'space-between',



        cursor: onClick ? 'pointer' : 'default',



        transform: isSelected ? 'scale(1.05) translateY(-5px)' : 'none',



        zIndex: isSelected ? 2 : 1,



        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'



      }}



    >



      {/* Efeito de Reflexo Premium */}



      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 50%)', pointerEvents: 'none' }} />



      {/* LINHA SUPERIOR */}



      <div className="d-flex justify-between items-start">



        {design?.logoPos === 'top-left' ? design.logo : (



            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: textColor, textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>



                {design?.text || card.banco || card.nome}



            </div>



        )}



        <div style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>



            {design?.brandPos === 'top-right' ? getBrandLogo(card.bandeira) : (design ? <div style={{ fontSize: '0.9rem', fontWeight: 900, fontStyle: 'italic', color: 'rgba(0,0,0,0.15)', textTransform: 'lowercase' }}>{design.text}</div> : getBrandLogo(card.bandeira))}



        </div>



      </div>



      {/* MEIO (Chip) */}



      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>



          {/* Chip do Cartão em Relevo */}



          <div style={{ width: '38px', height: '28px', background: 'linear-gradient(135deg, #e0e0e0, #bdbdbd)', borderRadius: '6px', position: 'relative', border: '1px solid rgba(0,0,0,0.2)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.5)' }}>



              <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: 'rgba(0,0,0,0.3)' }} />



              <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'rgba(0,0,0,0.3)' }} />



              <div style={{ position: 'absolute', top: '25%', left: 0, width: '100%', height: '1px', background: 'rgba(0,0,0,0.2)' }} />



              <div style={{ position: 'absolute', top: '75%', left: 0, width: '100%', height: '1px', background: 'rgba(0,0,0,0.2)' }} />



          </div>



          <Zap size={18} color={textColor} opacity={0.6} />



      </div>



      {/* LINHA INFERIOR */}



      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>



          <div>



              {design?.logoPos === 'bottom-left' ? (



                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>



                      {design.logo}



                      <div style={{ color: textColor, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>{profile?.full_name || 'TITULAR'}</div>



                  </div>



              ) : (



                  <div style={{ color: textColor, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>{profile?.full_name || 'TITULAR'}</div>



              )}



          </div>



          <div style={{ textAlign: 'right' }}>



               {design?.brandPos === 'bottom-right' ? getBrandLogo(card.bandeira) : (design ? null : null)}



          </div>



      </div>



      {onDelete && (

        <button 

          onMouseDown={(e) => { 

            e.stopPropagation(); 

            console.log("Botão excluir presisonado (onMouseDown) para ID:", card.id);

          }}

          onClick={(e) => { 

            e.stopPropagation(); 

            console.log("Botão excluir clicado (onClick) para ID:", card.id);

            if (onDelete) onDelete(card.id); 

          }} 

          className="delete-btn-card"

          style={{ 

            position: 'absolute', 

            top: '0.5rem', 

            right: '0.5rem', 

            background: '#ef4444', 

            border: '2px solid white',

            color: '#fff', 

            padding: '8px', 

            borderRadius: '50%', 

            cursor: 'pointer', 

            display: 'flex', 

            alignItems: 'center', 

            justifyContent: 'center', 

            zIndex: 9999,

            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'

          }}

        >

           <Trash2 size={20} />

        </button>

      )}



      {isSelected && (



          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--primary-color)', color: '#000', borderRadius: '50%', padding: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>



              <Check size={20} strokeWidth={3} />



          </div>



      )}



    </div>



  );



};



export const Dono = () => {



  const { signOut, profile } = useAuth();



  const navigate = useNavigate();



  const [activeTab, setActiveTab] = useState<TabType>('dashboard');



  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);



  useEffect(() => {



    const handleResize = () => setIsMobile(window.innerWidth <= 768);



    window.addEventListener('resize', handleResize);



    return () => window.removeEventListener('resize', handleResize);



  }, []);



  const [faturamento, setFaturamento] = useState(0);



  const [faturamentoHoje, setFaturamentoHoje] = useState(0);



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



  const [pedidosAtivos, setPedidosAtivos] = useState<any[]>([]);



  const [auditoriaExclusoes, setAuditoriaExclusoes] = useState<any[]>([]);



  const [error, setError] = useState<string | null>(null);



  // Estados de Auditoria de Exclusão



  const [itemParaExcluirAtu, setItemParaExcluirAtu] = useState<any>(null);



  const [motivoExclusaoAtu, setMotivoExclusaoAtu] = useState('');



  const [isExcluindoAtu, setIsExcluindoAtu] = useState(false);



  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<string | null>(null);



  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);



  const [detailSearch, setDetailSearch] = useState('');



  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);



  const [gastos, setGastos] = useState<any[]>([]);



  const [showAddGasto, setShowAddGasto] = useState(false);



  const [novoGasto, setNovoGasto] = useState<any>({ descricao: '', valor: '', categoria: 'Fornecedores', forma_pagamento: 'PIX', cartao_id: '', data: new Date().toISOString().split('T')[0] });



  const [gastosMonthFilter, setGastosMonthFilter] = useState<string>(new Date().toISOString().substring(0, 7));



  const [cartoes, setCartoes] = useState<any[]>([]);



  const [showAddCartao, setShowAddCartao] = useState(false);



  const [novoCartao, setNovoCartao] = useState<any>({ nome: '', bandeira: 'Visa', banco: '', cor: '#3b82f6', bancoPersonalizado: '' });



  // Modal Novo Colaborador



  const [showNewUser, setShowNewUser] = useState(false);



  const [newUserName, setNewUserName] = useState('');



  const [newUserEmail, setNewUserEmail] = useState('');



  const [newUserPassword, setNewUserPassword] = useState('');



  const [newUserRole, setNewUserRole] = useState('garcom');



  const [isCreatingUser, setIsCreatingUser] = useState(false);



  // Estados para troca de senha e remoção



  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);



  const [selectedUserForPassword, setSelectedUserForPassword] = useState<any>(null);



  const [newPasswordForUser, setNewPasswordForUser] = useState('');



  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);



  // Estados para troca de função



  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);



  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null);



  const [newRoleForUser, setNewRoleForUser] = useState('');



  const [isUpdatingRole, setIsUpdatingRole] = useState(false);



  // Estados para troca de nome



  const [isNameModalOpen, setIsNameModalOpen] = useState(false);



  const [selectedUserForName, setSelectedUserForName] = useState<any>(null);



  const [newNameForUser, setNewNameForUser] = useState('');



  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const [cardToDelete, setCardToDelete] = useState<any>(null);

    const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);



  const [searchTermEstoque, setSearchTermEstoque] = useState('');



  const filteredProdutosEstoque = useMemo(() => {



    const normalizeStr = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();



    const searchLower = normalizeStr(searchTermEstoque);



    return produtos.filter(p => {



      const matchesSearch = normalizeStr(p.nome).includes(searchLower) || normalizeStr(p.categoria).includes(searchLower);



      return searchTermEstoque ? matchesSearch : true;



    });



  }, [produtos, searchTermEstoque]);



  const totalGastosMes = useMemo(() => {



    const startOfMonth = new Date();



    startOfMonth.setDate(1);



    startOfMonth.setHours(0, 0, 0, 0);



    return gastos.filter(g => new Date(g.data_gasto) >= startOfMonth)



                 .reduce((acc, g) => acc + Number(g.valor), 0);



  }, [gastos]);



  const lucroLiquido = useMemo(() => faturamento - totalGastosMes, [faturamento, totalGastosMes]);



  const fetchData = async () => {



    try {



      const today = new Date();



      today.setHours(0, 0, 0, 0);



      const todayStart = today.toISOString();



      const startOfMonth = new Date();



      startOfMonth.setDate(1);



      startOfMonth.setHours(0, 0, 0, 0);



      const startOfMonthISO = startOfMonth.toISOString();



      const { data: allFinalizadosStatus } = await supabase.from('pedidos')



        .select('total')



        .eq('status', 'finalizado')



        .gte('finalizado_at', startOfMonthISO);



      const revTotal = allFinalizadosStatus?.reduce((acc, p) => acc + Number(p.total), 0) || 0;



      setFaturamento(revTotal);



      // Buscar gastos do mês atual



      const { data: gastosMes } = await supabase.from('gastos')



        .select('valor')



        .gte('data_gasto', startOfMonthISO);



      const expTotal = gastosMes?.reduce((acc, g) => acc + Number(g.valor), 0) || 0;



      // Podemos armazenar isso em um novo estado se quisermos, ou calcular no render.



      // Vou usar o estado 'gastos' que já existe para o filtro do mês atual.



      const { data: pFinalizadosHoje } = await supabase.from('pedidos')



        .select('total')



        .eq('status', 'finalizado')



        .gte('finalizado_at', todayStart);



      setFaturamentoHoje(pFinalizadosHoje?.reduce((acc, p) => acc + Number(p.total), 0) || 0);



      const { count } = await supabase.from('pedidos')



        .select('id', { count: 'exact' })



        .neq('status', 'finalizado');



      setPedidosAtivosCount(count || 0);



      // Buscar todos os perfis, inclusive o dono



      const { data: profiles, error: e3 } = await supabase.from('profiles').select('*').order('role', { ascending: true });



      if (e3 && e3.message.includes('permission denied')) setError("Sem permissão para ver equipe.");



      setUsuarios(profiles || []);



      const { data: prods } = await supabase.from('produtos').select('*').order('categoria', { ascending: true });



      setProdutos(prods || []);



      const { data: mses } = await supabase.from('mesas').select('*').order('numero', { ascending: true });



      setMesas(mses || []);



      const { data: rankingData } = await supabase.from('pedidos')



        .select('total, mesa_id, garcom_id, profiles:garcom_id(full_name, role)')



        .eq('status', 'finalizado')



        .gte('finalizado_at', todayStart);



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



        let finalRanking = Object.values(stats)



           .map((s: any) => ({ 



             name: s.name, total: s.total, count: s.count, mesaCount: s.mesas.size 



           }));



        setWaiterRanking(finalRanking.sort((a: any, b: any) => b.total - a.total));



      }



      const { data: avs } = await supabase.from('avaliacoes').select('*').order('created_at', { ascending: false });



      setAvaliacoes(avs || []);



      const { data: recents } = await supabase.from('pedidos').select('*, mesas(numero), itens_pedido(quantidade, produtos(nome))').order('data_hora', { ascending: false }).limit(6);



      setRecentOrders(recents || []);



      const { data: allFinalizados } = await supabase



        .from('pedidos')



        .select('*, mesas(numero), itens_pedido(quantidade, preco_unitario, produtos(nome))')



        .eq('status', 'finalizado')



        .order('finalizado_at', { ascending: false });



      setHistoricoCompleto(allFinalizados || []);



      const { data: turnos, error: turnosError } = await supabase



        .from('turnos_caixa')



        .select(`



          *, 



          profiles:operador_id(full_name),



          pedidos(*, mesas(numero))



        `)



        .order('aberto_em', { ascending: false })



        .limit(100);



      if (turnosError) {



        console.error("Erro crítico ao buscar turnos:", turnosError);



        const { data: simpleTurnos } = await supabase



          .from('turnos_caixa')



          .select('*, profiles:operador_id(full_name), pedidos(*, mesas(numero))')



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



      const { data: pAtivos } = await supabase.from('pedidos')



        .select('*, mesas(numero), itens_pedido(*, produtos(nome, categoria))')



        .neq('status', 'finalizado');



      setPedidosAtivos(pAtivos || []);



      const { data: audits } = await supabase.from('auditoria_exclusoes')



        .select('*')



        .order('criado_em', { ascending: false })



        .limit(100);



      setAuditoriaExclusoes(audits || []);



      const { data: cartoesData } = await supabase.from('cartoes_gastos').select('*').order('nome', { ascending: true });



      setCartoes(cartoesData || []);



      const { data: gastosData } = await supabase.from('gastos').select('*, cartoes_gastos(*)').order('data_gasto', { ascending: false });



      setGastos(gastosData || []);



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



    const url = `${window.location.origin}/c/${qrCode}`;



    navigator.clipboard.writeText(url);



    alert("Link copiado para o clipboard! 🔗");



  };



  const handleGeneratePDF = (numero: number, qrCode: string) => {



    import('jspdf').then(({ default: jsPDF }) => {



      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a6' });



      const url = `${window.location.origin}/c/${qrCode}`;



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



        const url = `${window.location.origin}/c/${m.qr_code}`;



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



  const handleDeleteUser = async (user: any) => {



    if (user.role === 'dono' && usuarios.filter(u => u.role === 'dono').length <= 1) {



      alert("Não é possível remover o único proprietário do sistema!");



      return;



    }



    if (confirm(`Tem certeza que deseja remover permanentemente o acesso de ${user.full_name}?`)) {



      try {



        const { data, error } = await supabase.rpc('delete_user_admin', { user_id: user.id });



        if (error || (data && data.error)) throw new Error(error?.message || data.error);



        alert("Usurio removido com sucesso!");



        fetchData();



      } catch (err: any) {



        alert("Erro ao remover: " + err.message);



      }



    }



  };



  const handleUpdatePassword = async () => {



    if (!selectedUserForPassword || !newPasswordForUser) return;



    setIsUpdatingPassword(true);



    try {



      const { data, error } = await supabase.rpc('update_user_password_admin', {



        user_id: selectedUserForPassword.id,



        new_password: newPasswordForUser



      });



      if (error || (data && data.error)) throw new Error(error?.message || data.error);



      alert(`Senha de ${selectedUserForPassword.full_name} alterada com sucesso!`);



      setIsPasswordModalOpen(false);



      setNewPasswordForUser('');



      setSelectedUserForPassword(null);



    } catch (err: any) {



      alert("Erro ao alterar senha: " + err.message);



    } finally {



      setIsUpdatingPassword(false);



    }



  };



  const handleUpdateRole = async () => {



    if (!selectedUserForRole || !newRoleForUser) return;



    setIsUpdatingRole(true);



    try {



      const { error } = await supabase



        .from('profiles')



        .update({ role: newRoleForUser })



        .eq('id', selectedUserForRole.id);



      if (error) throw error;



      alert(`Função de ${selectedUserForRole.full_name} alterada para ${newRoleForUser.toUpperCase()}!`);



      setIsRoleModalOpen(false);



      fetchData();



    } catch (err: any) {



      alert("Erro ao alterar função: " + err.message);



    } finally {



      setIsUpdatingRole(false);



    }



  };



  const handleUpdateName = async () => {



    if (!selectedUserForName || !newNameForUser.trim()) return;



    setIsUpdatingName(true);



    try {



      const { error } = await supabase



        .from('profiles')



        .update({ full_name: newNameForUser.trim() })



        .eq('id', selectedUserForName.id);



      if (error) throw error;



      alert("Nome atualizado com sucesso!");



      setIsNameModalOpen(false);



      fetchData();



    } catch (err: any) {



      alert("Erro ao alterar nome: " + err.message);



    } finally {



      setIsUpdatingName(false);



    }



  };



  const handleLiberarMesa = async (mesaId: string) => {



    if (!confirm("Deseja realmente liberar esta mesa vazia?")) return;



    try {



      await supabase.from('mesas').update({ status: 'livre', precisa_garcom: false }).eq('id', mesaId);



      fetchData();



      alert("Mesa liberada com sucesso!");



    } catch (err) {



      alert("Erro ao liberar mesa.");



    }



  };



  const handleExcluirItemComanda = async (item: any, motivo: string = 'Exclusão Direta') => {



    if (!item.id) return;



    setIsExcluindoAtu(true);



    try {



      const pId = item.pedido_id || item.pedidos?.id;



      if (!pId) throw new Error("ID do pedido não identificado.");



      // 1. Salvar na Auditoria



      const { error: auditError } = await supabase.from('auditoria_exclusoes').insert({



        pedido_id: pId,



        produto_nome: item.produtos?.nome || 'Item',



        quantidade: item.quantidade,



        valor_removido: Number(item.preco_unitario) * item.quantidade,



        motivo: motivo,



        usuario_nome: profile?.full_name || 'Proprietário',



        mesa_numero: item.pedidos?.mesas?.numero || 0,



        turno_id: item.turno_id



      });



      if (auditError) throw auditError;



      // 2. Excluir o item principal



      const { error: deleteError } = await supabase.from('itens_pedido').delete().eq('id', item.id);



      if (deleteError) throw deleteError;



      // 3. Atualizar total do pedido



      const { data: currentPedido } = await supabase.from('pedidos').select('total').eq('id', pId).single();



      if (currentPedido) {



        const subtotalItem = Number(item.preco_unitario) * item.quantidade;



        const novoTotal = Math.max(0, Number(currentPedido.total) - subtotalItem);



        await supabase.from('pedidos').update({ total: novoTotal }).eq('id', pId);



      }



      setItemParaExcluirAtu(null);



      setMotivoExclusaoAtu('');



      fetchData();



      alert("Exclusão realizada e auditada com sucesso!");



    } catch (err: any) {



      console.error("ERRO CRíTICO NA EXCLUSíƒO (DONO):", err);



      alert("⚠️ ï¸ FALHA NA EXCLUSíƒO:\n\n" + (err.message || 'Erro desconhecido. Verifique se a tabela de auditoria foi criada.'));



    } finally {



      setIsExcluindoAtu(false);



    }



  };



  const paymentTotals = useMemo(() => {



    const totals = { pix: 0, dinheiro: 0, debito: 0, credito: 0, outrosCartoes: 0 };



    const currentMonth = new Date().getMonth();



    const currentYear = new Date().getFullYear();



    historicoCompleto.forEach(p => {



      const d = new Date(p.finalizado_at || p.data_hora);



      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {



        if (!p.forma_pagamento) return;



        const matches = p.forma_pagamento.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTíO)\s*\(R\$([0-9.]+)\)/gi);



        if (matches) {



          matches.forEach((m: string) => {



            const typeMatch = m.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTíO)/i);



            const valMatch = m.match(/R\$([0-9.]+)/);



            if (typeMatch && valMatch) {



              const type = typeMatch[1].toUpperCase();



              const val = parseFloat(valMatch[1]);



              if (type === 'PIX') totals.pix += val;



              else if (type === 'DINHEIRO') totals.dinheiro += val;



              else if (type === 'DÉBITO' || type === 'DEBITO') totals.debito += val;



              else if (type === 'CRÉDITO' || type === 'CREDITO') totals.credito += val;



              else if (type === 'CARTAO' || type === 'CARTíO') totals.outrosCartoes += val;



            }



          });



        }



      }



    });



    return totals;



  }, [historicoCompleto]);



  const ordersByPaymentMethod = useMemo(() => {



    const groups: Record<string, any[]> = { 



      'PIX': [], 



      'DINHEIRO': [], 



      'DÉBITO': [], 



      'CRÉDITO': [], 



      'CARTí•ES ANTIGOS': [] 



    };



    historicoCompleto.forEach(order => {



      if (!order.forma_pagamento) return;



      const matches = order.forma_pagamento.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTíO)\s*\(R\$([0-9.]+)\)/gi);



      if (matches) {



        matches.forEach((m: string) => {



          const typeMatch = m.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTíO)/i);



          if (typeMatch) {



            const type = typeMatch[1].toUpperCase();



            let key = type;



            if (type === 'DEBITO') key = 'DÉBITO';



            if (type === 'CREDITO') key = 'CRÉDITO';



            if (type === 'CARTAO' || type === 'CARTíO') key = 'CARTí•ES ANTIGOS';



            if (groups[key]) {



               const matchesSearch = !detailSearch || 



                 (order.cliente_nome?.toLowerCase().includes(detailSearch.toLowerCase())) ||



                 (order.mesas?.numero?.toString().includes(detailSearch)) ||



                 (order.id?.toLowerCase().includes(detailSearch.toLowerCase()));



               if (matchesSearch && !groups[key].find((o: any) => o.id === order.id)) {



                 groups[key].push(order);



               }



            }



          }



        });



      }



    });



    Object.keys(groups).forEach(key => {



      groups[key].sort((a, b) => new Date(b.finalizado_at || b.data_hora).getTime() - new Date(a.finalizado_at || a.data_hora).getTime());



    });



    return groups;



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



  const cashFlowData = useMemo(() => {



    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];



    const currentYear = new Date().getFullYear();



    return months.map((m, i) => {



      const rev = historicoCompleto.filter(p => {



        const d = new Date(p.finalizado_at || p.data_hora);



        return d.getMonth() === i && d.getFullYear() === currentYear;



      }).reduce((acc, p) => acc + Number(p.total), 0);



      const exp = gastos.filter(g => {



        const d = new Date(g.data_gasto);



        return d.getMonth() === i && d.getFullYear() === currentYear;



      }).reduce((acc, g) => acc + Number(g.valor), 0);



      return { name: m, receita: rev, gastos: exp, lucro: rev - exp };



    });



  }, [historicoCompleto, gastos]);



  const KPIItem = ({ title, value, icon, color, trend, onClick }: any) => (



    <div className="card h-full" onClick={onClick} style={{ 



      cursor: onClick ? 'pointer' : 'default',



      border: '1px solid rgba(255,255,255,0.03)',



      transition: 'all 0.2s ease',



      display: 'flex',



      flexDirection: 'column',



      justifyContent: 'space-between',



      minHeight: '140px'



    }}>



      <div className="d-flex justify-between items-start mb-4">



        <div style={{ background: `${color}15`, padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>



          {icon}



        </div>



        {trend && (



          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '20px' }}>



            {trend.toUpperCase()}



          </span>



        )}



      </div>



      <div>



        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '4px' }}>{title}</div>



        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{value}</div>



      </div>



    </div>



  );



  const renderDashboard = () => (



    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>



      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>



        <div>



           <div style={{ color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '2px', marginBottom: '6px' }}>CENTRAL DE COMANDO</div>



           <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Olá, {profile?.full_name?.split(' ')[0] || 'Gestor'}! 👑</h1>



           <p className="text-muted" style={{ fontSize: '0.9rem' }}>Aqui está o resumo financeiro do seu negócio hoje.</p>



        </div>



        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>



           <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800 }}>STATUS DO SISTEMA</div>



           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>



              <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}></div> Online



           </div>



        </div>



      </div>



      {/* Métricas Rápidas do Dia - AGORA NO TOPO */}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>

        <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.1)' }}>

            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>VENDAS HOJE</div>

            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>R$ {formatCurrency(faturamentoHoje)}</div>

        </div>

        <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(59, 130, 246, 0.1)' }}>

            <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 800 }}>PEDIDOS ATIVOS</div>

            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{pedidosAtivosCount}</div>

        </div>

        <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>

            <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800 }}>MESAS OCUPADAS</div>

            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{mesas.filter(m => m.status === 'ocupada').length}</div>

        </div>

        <div className="card" style={{ padding: '1.25rem', border: '1px solid rgba(139, 92, 246, 0.1)' }}>

            <div style={{ fontSize: '0.7rem', color: '#8b5cf6', fontWeight: 800 }}>AVALIAÇÕES</div>

            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{avaliacoes.length}</div>

        </div>

      </div>



      {/* KPIs Financeiros de Elite */}

      <div className="stat-grid mb-8">

        <KPIItem 

            title="RECEITA BRUTA (MÊS)" 

            value={`R$ ${formatCurrency(faturamento)}`} 

            icon={<TrendingUp size={24} color="#d4af37" />} 

            color="#d4af37" 

            trend="Faturamento total" 

        />

        <KPIItem 

            title="GASTOS TOTAIS (MÊS)" 

            value={`R$ ${formatCurrency(totalGastosMes)}`} 

            icon={<TrendingDown size={24} color="#ef4444" />} 

            color="#ef4444" 

            trend="Despesas operacionais" 

        />

        <KPIItem 

            title="LUCRO LÍQUIDO" 

            value={`R$ ${formatCurrency(lucroLiquido)}`} 

            icon={<Zap size={24} color={lucroLiquido >= 0 ? "#10b981" : "#ef4444"} />} 

            color={lucroLiquido >= 0 ? "#10b981" : "#ef4444"} 

            trend="Resultado final" 

        />

        <KPIItem 

            title="TICKET MÉDIO" 

            value={`R$ ${formatCurrency(historicoCompleto.length > 0 ? faturamento / historicoCompleto.length : 0)}`} 

            icon={<BarChart3 size={24} color="#3b82f6" />} 

            color="#3b82f6" 

            trend="Média por pedido" 

        />

      </div>



      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#fff' }}>Receita por Forma de Pagamento</h3>



      <div className="stat-grid mb-6">



        <KPIItem 



          title="PIX" 



          value={`R$ ${formatCurrency(paymentTotals.pix)}`} 



          icon={<QrCode color="#10b981" />} 



          color="#10b981" 



          trend="Digital" 



          onClick={() => setSelectedPaymentDetail(selectedPaymentDetail === 'PIX' ? null : 'PIX')}



        />



        <KPIItem 



          title="DINHEIRO" 



          value={`R$ ${formatCurrency(paymentTotals.dinheiro)}`} 



          icon={<Banknote color="#f59e0b" />} 



          color="#f59e0b" 



          trend="Cédulas" 



          onClick={() => setSelectedPaymentDetail(selectedPaymentDetail === 'DINHEIRO' ? null : 'DINHEIRO')}



        />



        <KPIItem 



          title="DÉBITO" 



          value={`R$ ${formatCurrency(paymentTotals.debito)}`} 



          icon={<CreditCard color="#3b82f6" />} 



          color="#3b82f6" 



          trend="Cartão" 



          onClick={() => setSelectedPaymentDetail(selectedPaymentDetail === 'DÉBITO' ? null : 'DÉBITO')}



        />



        <KPIItem 



          title="CRÉDITO" 



          value={`R$ ${formatCurrency(paymentTotals.credito)}`} 



          icon={<CreditCard color="#8b5cf6" />} 



          color="#8b5cf6" 



          trend="Cartão" 



          onClick={() => setSelectedPaymentDetail(selectedPaymentDetail === 'CRÉDITO' ? null : 'CRÉDITO')}



        />



        {paymentTotals.outrosCartoes > 0 && 



          <KPIItem 



            title="CARTí•ES ANTIGOS" 



            value={`R$ ${formatCurrency(paymentTotals.outrosCartoes)}`} 



            icon={<CreditCard color="#888" />} 



            color="#888" 



            trend="Legado" 



            onClick={() => setSelectedPaymentDetail(selectedPaymentDetail === 'CARTí•ES ANTIGOS' ? null : 'CARTí•ES ANTIGOS')}



          />



        }



      </div>



      <AnimatePresence>



        {selectedPaymentDetail && (



          <motion.div 



            initial={{ opacity: 0, height: 0 }}



            animate={{ opacity: 1, height: 'auto' }}



            exit={{ opacity: 0, height: 0 }}



            className="mb-10"



            style={{ overflow: 'hidden' }}



          >



            <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--primary-color)22' }}>



              <div className="d-flex justify-between items-center mb-6">



                <div className="d-flex items-center gap-3">



                  <div style={{ background: 'var(--primary-color)22', padding: '10px', borderRadius: '12px' }}>



                    <Folder color="var(--primary-color)" size={24} />



                  </div>



                  <div>



                    <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>DETALHAMENTO: {selectedPaymentDetail}</h3>



                  </div>



                </div>



                <div className="d-flex flex-wrap items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">



                   <div className="d-flex items-center gap-2" style={{ position: 'relative' }}>



                      <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }} />



                      <input 



                        type="text"



                        placeholder="Buscar cliente..."



                        value={detailSearch}



                        onChange={(e) => setDetailSearch(e.target.value)}



                        className="search-input-fix"



                        style={{ border: 'none', background: 'rgba(255,255,255,0.05)', padding: '8px 12px 8px 2.5rem', fontSize: '0.8rem', width: isMobile ? '120px' : '180px', margin: 0, borderRadius: '8px', color: '#fff' }}



                      />



                   </div>



                   <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />



                   <div className="d-flex items-center gap-3">



                      <input 



                        type="date" 



                        value={filterDate}



                        onChange={(e) => setFilterDate(e.target.value)}



                        className="date-input-custom" 



                        style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', width: 'auto', margin: 0, color: 'var(--primary-color)', fontWeight: 800, height: '32px', display: 'flex', alignItems: 'center', outline: 'none' }} 



                      />



                      <style>{`



                        .date-input-custom::-webkit-calendar-picker-indicator {



                          filter: brightness(0) invert(1);



                          transform: scale(1.5);



                          cursor: pointer;



                          margin-right: 10px;



                          padding: 0;



                          position: relative;



                          top: 0;



                        }



                        .date-input-custom {



                           display: flex;



                           align-items: center;



                        }



                      `}</style>



                      <button 



                        onClick={() => setFilterDate(new Date().toISOString().split('T')[0])}



                        className="btn-outline"



                        style={{ width: 'auto', padding: '6px 12px', fontSize: '0.7rem', borderColor: filterDate === new Date().toISOString().split('T')[0] ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', background: filterDate === new Date().toISOString().split('T')[0] ? 'var(--primary-color)11' : 'transparent', borderRadius: '20px' }}



                      >



                        HOJE



                      </button>



                    </div>



                   <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />



                   <button 



                     onClick={() => {



                       setSelectedPaymentDetail(null);



                       setDetailSearch('');



                     }}



                     className="btn-outline" 



                     style={{ width: 'auto', padding: '6px 16px', fontSize: '0.75rem', background: '#ef4444', color: '#fff', borderColor: 'transparent', fontWeight: 700, borderRadius: '8px' }}



                   >



                     FECHAR



                   </button>



                </div>



              </div>



              {ordersByPaymentMethod[selectedPaymentDetail]?.length === 0 ? (



                <div className="text-center py-10 opacity-50">Nenhum pedido encontrado para este método.</div>



              ) : (



                <div className="d-flex flex-col gap-4">



                  {ordersByPaymentMethod[selectedPaymentDetail]?.map((order: any) => (



                    <div key={order.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>



                      <details className="group">



                        <summary className="d-flex justify-between items-center p-4 cursor-pointer hover:bg-white/5 transition-colors">



                          <div className="d-flex items-center gap-4">



                            <div style={{ background: 'var(--primary-color)22', padding: '8px 12px', borderRadius: '8px', color: 'var(--primary-color)', fontWeight: 800 }}>



                              MESA {order.mesas?.numero || 'S/N'}



                            </div>



                            <div className="d-flex flex-col">



                              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date(order.finalizado_at || order.data_hora).toLocaleString('pt-BR')}</span>



                              <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{order.cliente_nome || 'Cliente não identificado'}</span>



                            </div>



                          </div>



                          <div className="d-flex items-center gap-4">



                            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary-color)' }}>



                              R$ {Number(order.total).toFixed(2).replace('.', ',')}



                            </span>



                            <ChevronDown className="group-open:rotate-180 transition-transform opacity-50" />



                          </div>



                        </summary>



                        <div className="p-4 pt-0 border-t border-white/5 bg-black/20">



                          <table style={{ width: '100%', fontSize: '0.85rem', marginTop: '1rem' }}>



                            <thead>



                              <tr style={{ opacity: 0.5 }}>



                                <th style={{ textAlign: 'left', padding: '8px 0' }}>Produto</th>



                                <th style={{ textAlign: 'center', padding: '8px 0' }}>Qtd</th>



                                <th style={{ textAlign: 'right', padding: '8px 0' }}>Subtotal</th>



                              </tr>



                            </thead>



                            <tbody>



                              {order.itens_pedido?.map((item: any, idx: number) => (



                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>



                                  <td style={{ padding: '8px 0' }}>{item.produtos?.nome || 'Item Desconhecido'}</td>



                                  <td style={{ padding: '8px 0', textAlign: 'center' }}>{item.quantidade}x</td>



                                  <td style={{ padding: '8px 0', textAlign: 'right' }}>R$ {(Number(item.preco_unitario || 0) * item.quantidade).toFixed(2).replace('.', ',')}</td>



                                </tr>



                              ))}



                            </tbody>



                            <tfoot>



                              <tr>



                                <td colSpan={2} style={{ padding: '15px 0 5px', fontWeight: 700 }}>Total do Pedido</td>



                                <td style={{ padding: '15px 0 5px', textAlign: 'right', fontWeight: 800 }}>R$ {Number(order.total).toFixed(2).replace('.', ',')}</td>



                              </tr>



                              <tr>



                                <td colSpan={3} style={{ fontSize: '0.7rem', opacity: 0.4, fontStyle: 'italic' }}>



                                  Pagamento: {order.forma_pagamento}



                                </td>



                              </tr>



                            </tfoot>



                          </table>



                        </div>



                      </details>



                    </div>



                  ))}



                </div>



              )}



            </div>



          </motion.div>



        )}



      </AnimatePresence>



      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>



        <div className="card" style={{ padding: '1.5rem', gridColumn: isMobile ? 'span 1' : '1 / -1', border: '1px solid rgba(255,255,255,0.03)' }}>



           <div className="d-flex justify-between items-center mb-6">



              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Fluxo de Caixa Anual</h3>



              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Comparativo Mensal: Receita vs Despesas</div>



           </div>



           <div style={{ height: isMobile ? '250px' : '320px' }}>



             <ResponsiveContainer width="100%" height="100%">



               <ComposedChart data={cashFlowData}>



                 <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} stroke="rgba(255,255,255,0.3)" />



                 <YAxis fontSize={11} axisLine={false} tickLine={false} stroke="rgba(255,255,255,0.3)" tickFormatter={(val) => `R$${val}`} />



                 <RechartsTooltip 



                    contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }} 



                    formatter={(val: any) => 'R$ ' + formatCurrency(val)}



                 />



                 <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '20px' }} />



                 <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[6, 6, 0, 0]} barSize={25} />



                 <Bar dataKey="gastos" name="Despesas" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={25} />



                 <Line type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="var(--primary-color)" strokeWidth={4} dot={{ r: 5, fill: 'var(--primary-color)', strokeWidth: 2, stroke: '#000' }} />



               </ComposedChart>



             </ResponsiveContainer>



           </div>



        </div>



        <div className="card" style={{ padding: '1.5rem', minHeight: '350px', display: 'flex', flexDirection: 'column' }}>



           <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Produtividade: Mesas por Garçom</h3>



           <div style={{ flex: 1, minHeight: '250px' }}>



             {waiterRanking.length > 0 ? (



               <div style={{ width: '100%', height: '250px' }}>



                 <ResponsiveContainer width="99%" height="100%" debounce={50}>



                   <BarChart data={waiterRanking}>



                     <XAxis dataKey="name" fontSize={10} />



                     <YAxis fontSize={10} />



                     <Tooltip />



                     <Bar dataKey="mesaCount" fill="#10b981" />



                   </BarChart>



                 </ResponsiveContainer>



               </div>



             ) : (



               <div className="d-flex items-center justify-center h-full opacity-40" style={{ height: '100%', fontSize: '0.8rem' }}>



                 Nenhuma venda registrada por garçons hoje.



               </div>



             )}



           </div>



        </div>



        <div className="card" style={{ padding: '1.25rem' }}>



           <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem' }}>Fluxo de Pedidos Recentes</h3>



           <div className="d-flex flex-col gap-2">



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



                 <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>R$ {formatCurrency(o.total)}</span>



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



        <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 800 }}>Gestão de Equipe ({usuarios.length})</h2>



        <button className="btn-success" onClick={() => setShowNewUser(!showNewUser)} style={{ width: 'auto', padding: isMobile ? '8px 12px' : '1rem', fontSize: isMobile ? '0.8rem' : '1rem' }}>{showNewUser ? 'Cancelar' : '+ Cadastrar Usurio'}</button>



      </div>



      {showNewUser && (



        <div className="card mb-6">



          <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>



            <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Nome" required className="input-field" />



            <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="E-mail" required className="input-field" />



            <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Senha" required className="input-field" />



            <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="input-field" style={{ background: '#111', color: '#fff' }}>



              <option value="garcom">Garçom</option>



              <option value="caixa">Caixa</option>



              <option value="cozinha">Cozinha</option>



              <option value="admin">Admin</option>



              <option value="dono">Dono (Proprietário)</option>



            </select>



            <button type="submit" className="btn-primary" disabled={isCreatingUser}>{isCreatingUser ? 'Criando...' : 'Criar'}</button>



          </form>



        </div>



      )}



      {isMobile ? (



        <div className="mobile-card-view">



          {usuarios.map(u => (



            <div key={u.id} className="mobile-card-item">



              <div className="d-flex justify-between items-start mb-3">



                <div>



                  <span className="mobile-label">Nome</span>



                  <div className="mobile-value">{u.full_name}</div>



                </div>



                <span style={{ 



                  fontSize: '0.6rem', 



                  padding: '3px 8px', 



                  borderRadius: '10px', 



                  background: u.role === 'dono' ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.05)',



                  color: u.role === 'dono' ? 'var(--primary-color)' : '#fff',



                  fontWeight: 800



                }}>



                  {u.role.toUpperCase()}



                </span>



              </div>



              <div className="mb-4">



                <span className="mobile-label">E-mail</span>



                <div className="mobile-value" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{u.email || '---'}</div>



              </div>



              <div className="d-flex flex-wrap gap-2">



                <button onClick={() => { setSelectedUserForName(u); setNewNameForUser(u.full_name); setIsNameModalOpen(true); }} className="btn-outline" style={{ fontSize: '0.65rem', padding: '6px 10px', width: 'auto' }}>Nome</button>



                <button onClick={() => { setSelectedUserForPassword(u); setIsPasswordModalOpen(true); }} className="btn-outline" style={{ fontSize: '0.65rem', padding: '6px 10px', width: 'auto' }}>Senha</button>



                <button onClick={() => { setSelectedUserForRole(u); setNewRoleForUser(u.role); setIsRoleModalOpen(true); }} className="btn-outline" style={{ fontSize: '0.65rem', padding: '6px 10px', width: 'auto', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>Função</button>



                <button onClick={() => handleDeleteUser(u)} className="btn-outline" style={{ color: 'var(--danger-color)', borderColor: 'rgba(220,53,69,0.2)', fontSize: '0.65rem', padding: '6px 10px', width: 'auto' }}>Remover</button>



              </div>



            </div>



          ))}



        </div>



      ) : (



        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>



          <table style={{ width: '100%', borderCollapse: 'collapse' }}>



            <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}><th style={{ padding: '1rem', textAlign: 'left' }}>Nome</th><th style={{ padding: '1rem', textAlign: 'left' }}>E-mail</th><th style={{ padding: '1rem', textAlign: 'left' }}>Função</th><th style={{ padding: '1rem', textAlign: 'center' }}>Ações</th></tr></thead>



            <tbody>{usuarios.map(u => (



              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>



                <td style={{ padding: '1rem' }}>{u.full_name}</td>



                <td style={{ padding: '1rem', fontSize: '0.8rem', opacity: 0.7 }}>{u.email || '---'}</td>



                <td style={{ padding: '1rem' }}>



                  <span style={{ 



                    fontSize: '0.65rem', 



                    padding: '4px 8px', 



                    borderRadius: '10px', 



                    background: u.role === 'dono' ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.05)',



                    color: u.role === 'dono' ? 'var(--primary-color)' : '#fff',



                    fontWeight: 800



                  }}>



                    {u.role.toUpperCase()}



                  </span>



                </td>



                <td style={{ padding: '1rem' }}>



                  <div className="d-flex gap-2 justify-center">



                    <button onClick={() => { setSelectedUserForName(u); setNewNameForUser(u.full_name); setIsNameModalOpen(true); }} className="btn-outline" style={{ fontSize: '0.7rem', padding: '5px 10px', width: 'auto' }}>Alterar Nome</button>



                    <button onClick={() => { setSelectedUserForPassword(u); setIsPasswordModalOpen(true); }} className="btn-outline" style={{ fontSize: '0.7rem', padding: '5px 10px', width: 'auto' }}>Alterar Senha</button>



                    <button onClick={() => { setSelectedUserForRole(u); setNewRoleForUser(u.role); setIsRoleModalOpen(true); }} className="btn-outline" style={{ fontSize: '0.7rem', padding: '5px 10px', width: 'auto', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>Função</button>



                    <button onClick={() => handleDeleteUser(u)} className="btn-outline" style={{ color: 'var(--danger-color)', borderColor: 'rgba(220,53,69,0.2)', fontSize: '0.7rem', padding: '5px 10px', width: 'auto' }}>Remover</button>



                  </div>



                </td>



              </tr>



            ))}</tbody>



          </table>



        </div>



      )}



    </div>



  );



  const renderProdutos = () => (



    <div className="animate-fade-in">



      <h2 className="mb-6" style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 800 }}>Produtos & Estoque</h2>



      <div className="card mb-6">



        <form onSubmit={handleAddProduto} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>



          <input name="nome" placeholder="Nome" required className="input-field" />



          <select name="categoria" className="input-field">



            <option value="PETISCO">PETISCO</option>



            <option value="BEBIDAS">BEBIDAS</option>



            <option value="COQUETÉIS">COQUETÉIS</option>



            <option value="DESTILADOS (DOSE)">DESTILADOS (DOSE)</option>



            <option value="OUTROS">OUTROS</option>



          </select>



          <input name="preco" type="number" step="0.01" placeholder="R$" required className="input-field" />



          <input name="estoque" type="number" placeholder="Estoque" required className="input-field" />



          <button type="submit" className="btn-primary">Adicionar</button>



        </form>



      </div>



      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>



        <input 



          type="text" 



          placeholder="ðŸ” Buscar no estoque (nome ou categoria)..." 



          value={searchTermEstoque} 



          onChange={(e) => setSearchTermEstoque(e.target.value)}



          className="input-field"



          style={{ paddingLeft: '2.8rem', background: 'rgba(255,255,255,0.05)' }}



        />



      </div>



      {isMobile ? (



        <div className="mobile-card-view">



          {filteredProdutosEstoque.map(p => (



            <div key={p.id} className="mobile-card-item">



              <div className="d-flex justify-between items-center mb-4">



                <div>



                  <span className="mobile-label">Item</span>



                  <div className="mobile-value">{p.nome} <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>({p.categoria})</span></div>



                </div>



                <button onClick={() => handleDeleteProduto(p.id)} style={{ color: 'var(--danger-color)', padding: '8px' }}>



                  <Trash2 size={18} />



                </button>



              </div>



              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>



                <div>



                  <span className="mobile-label">Preço</span>



                  <div className="d-flex items-center gap-1">



                    <span style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>R$</span>



                    <input 



                      key={p.id + '-preco-mob-' + p.preco}



                      type="number" 



                      step="0.01" 



                      defaultValue={p.preco} 



                      onBlur={(e) => handleUpdatePreco(p.id, e.target.value)} 



                      style={{ width: '100%', padding: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '1rem' }} 



                    />



                  </div>



                </div>



                <div>



                  <span className="mobile-label">Estoque</span>



                  <div className="d-flex items-center gap-2">



                    <button onClick={() => handleUpdateEstoque(p.id, p.estoque, -1)} className="btn-outline" style={{width: '36px', height: '36px', padding: 0}}>-</button>



                    <input 



                      key={p.id + '-estoque-mob-' + p.estoque}



                      type="number" 



                      defaultValue={p.estoque} 



                      onBlur={(e) => handleDirectStockInput(p.id, e.target.value)} 



                      style={{ width: '100%', padding: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center', color: p.estoque < 10 ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 'bold' }} 



                    />



                    <button onClick={() => handleUpdateEstoque(p.id, p.estoque, 1)} className="btn-outline" style={{width: '36px', height: '36px', padding: 0}}>+</button>



                  </div>



                </div>



              </div>



            </div>



          ))}



        </div>



      ) : (



        <div className="card" style={{ padding: 0 }}>



          <table style={{ width: '100%', borderCollapse: 'collapse' }}>



            <thead><tr style={{ borderBottom: '1px solid var(--border-color)' }}><th style={{ padding: '1rem' }}>Item</th><th style={{ padding: '1rem' }}>Preço</th><th style={{ padding: '1rem' }}>Estoque</th><th style={{ padding: '1rem' }}>Ações</th></tr></thead>



            <tbody>



              {filteredProdutosEstoque.map(p => (



              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>



                <td style={{ padding: '1rem' }}>{p.nome}</td>



                <td style={{ padding: '1rem' }}>



                  <div className="d-flex items-center gap-1">



                    <span style={{color: 'var(--text-muted)'}}>R$</span>



                    <input 



                      key={p.id + '-preco-' + p.preco}



                      type="number" 



                      step="0.01" 



                      defaultValue={p.preco} 



                      onBlur={(e) => handleUpdatePreco(p.id, e.target.value)} 



                      onKeyDown={(e) => e.key === 'Enter' && handleUpdatePreco(p.id, (e.target as HTMLInputElement).value)} 



                      style={{ width: '80px', padding: '4px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'white' }} 



                    />



                  </div>



                </td>



                <td style={{ padding: '1rem' }}>



                  <div className="d-flex items-center gap-2">



                    <button onClick={() => handleUpdateEstoque(p.id, p.estoque, -1)} className="btn-outline" style={{width: '28px'}}>-</button>



                    <input 



                      key={p.id + '-estoque-' + p.estoque}



                      type="number" 



                      defaultValue={p.estoque} 



                      onBlur={(e) => handleDirectStockInput(p.id, e.target.value)} 



                      onKeyDown={(e) => e.key === 'Enter' && handleDirectStockInput(p.id, (e.target as HTMLInputElement).value)} 



                      style={{ width: '60px', padding: '4px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '4px', textAlign: 'center', color: p.estoque < 10 ? 'var(--danger-color)' : 'var(--success-color)', fontWeight: 'bold' }} 



                    />



                    <button onClick={() => handleUpdateEstoque(p.id, p.estoque, 1)} className="btn-outline" style={{width: '28px'}}>+</button>



                  </div>



                </td>



                <td style={{ padding: '1rem' }}><button onClick={() => handleDeleteProduto(p.id)} style={{ color: 'var(--danger-color)' }}>Excluir</button></td>



              </tr>



            ))}</tbody>



          </table>



        </div>



      )}



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



            <button onClick={() => handleDeleteMesa(m.id)} style={{ float: 'right' }}>✖</button>



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



          <KPIItem title="🌟 Média Ambiente" value={avgAmb} icon={<Star size={20} color="#3b82f6"/>} color="#3b82f6" trend="Vibe" />



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



              {av.sugestáoes ? (



                <p style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', fontStyle: 'italic', color: '#eee', margin: 0 }}>



                  "{av.sugestáoes}"



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



  const renderComandas = () => (



    <div className="animate-fade-in">



      <h2 style={{ fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>Comandas por Mesa</h2>



      <p style={{ color: 'var(--text-muted)', marginBottom: isMobile ? '1rem' : '2rem', fontSize: isMobile ? '0.8rem' : '1rem' }}>Visualização detalhada de todos os itens lançados em mesas abertas.</p>



      {mesas.filter(m => m.status !== 'livre').length === 0 ? (



        <div className="card text-center" style={{ padding: '5rem' }}>



          <Utensils size={48} color="var(--text-muted)" style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />



          <h3 className="text-muted">Nenhuma mesa ocupada no momento.</h3>



        </div>



      ) : (



        <div className="d-flex flex-col gap-6">



          {mesas.filter(m => m.status !== 'livre').map(mesa => {



            const pedidoMesa = pedidosAtivos.find(p => p.mesa_id === mesa.id);



            const itemsMesa = pedidoMesa?.itens_pedido || [];



            const totalMesa = Number(pedidoMesa?.total || 0);



            return (



              <div key={mesa.id} className="card" style={{ padding: '0', borderLeft: '4px solid var(--primary-color)' }}>



                <div style={{ padding: isMobile ? '1rem' : '1.5rem', background: 'rgba(212,175,55,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>



                  <div className="d-flex items-center gap-3">



                    <div style={{ width: isMobile ? '40px' : '50px', height: isMobile ? '40px' : '50px', borderRadius: '10px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: isMobile ? '1.1rem' : '1.3rem' }}>



                      {mesa.numero}



                    </div>



                    <div>



                      <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.2rem' }}>Mesa {mesa.numero}</h3>



                      <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-color)' }}>Status: {mesa.status}</span>



                    </div>



                  </div>



                  <div style={{ textAlign: 'right' }}>



                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL</div>



                    <div style={{ fontSize: isMobile ? '1.2rem' : '1.6rem', fontWeight: 900, color: 'var(--primary-color)' }}>R$ {formatCurrency(totalMesa)}</div>



                  </div>



                </div>



                <div style={{ padding: isMobile ? '0' : '1rem' }}>



                  {isMobile ? (



                    <div className="d-flex flex-col">



                      {itemsMesa.map((item, idx) => (



                        <div key={item.id} style={{ padding: '12px 1rem', borderBottom: idx === itemsMesa.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>



                          <div className="d-flex items-center gap-3">



                            <div style={{ fontWeight: 800, color: 'var(--primary-color)', minWidth: '30px' }}>{item.quantidade}x</div>



                            <div>



                              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.produtos?.nome}</div>



                              <span style={{ 



                                fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, 



                                background: item.status === 'pronto' ? 'rgba(16,185,129,0.1)' : item.status === 'em preparo' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',



                                color: item.status === 'pronto' ? 'var(--success-color)' : item.status === 'em preparo' ? 'var(--warning-color)' : 'var(--text-muted)'



                              }}>



                                {item.status.toUpperCase()}



                              </span>



                            </div>



                          </div>



                          <div className="d-flex items-center gap-4">



                            <div style={{ textAlign: 'right' }}>



                              <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>R$ {formatCurrency((Number(item.preco_unitario) * item.quantidade))}</div>



                              <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>R$ {formatCurrency(item.preco_unitario)} un.</div>



                            </div>



                            <button 



                              onClick={() => {



                                if(confirm(`Excluir ${item.quantidade}x ${item.produtos?.nome}?`)) {



                                  handleExcluirItemComanda({ ...item, pedido_id: pedidoMesa?.id });



                                }



                              }} 



                              style={{ color: 'var(--danger-color)', opacity: 0.6, padding: '4px' }}



                            >



                              <Trash2 size={18} />



                            </button>



                          </div>



                        </div>



                      ))}



                      {itemsMesa.length === 0 && (



                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Nenhum item lançado.</div>



                      )}



                    </div>



                  ) : (



                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>



                      <thead>



                        <tr style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>



                          <th style={{ padding: '12px 10px' }}>Qtd</th>



                          <th style={{ padding: '12px 10px' }}>Produto</th>



                          <th style={{ padding: '12px 10px' }}>Status</th>



                          <th style={{ padding: '12px 10px' }}>Valor</th>



                          <th style={{ padding: '12px 10px' }}>Total</th>



                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>Ações</th>



                        </tr>



                      </thead>



                      <tbody>



                        {itemsMesa.map(item => (



                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>



                            <td style={{ padding: '12px 10px', fontWeight: 800 }}>{item.quantidade}x</td>



                            <td style={{ padding: '12px 10px' }}>{item.produtos?.nome}</td>



                            <td style={{ padding: '12px 10px' }}>



                              <span style={{ 



                                fontSize: '0.65rem', padding: '4px 10px', borderRadius: '20px', fontWeight: 800, 



                                background: item.status === 'pronto' ? 'rgba(16,185,129,0.1)' : item.status === 'em preparo' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.05)',



                                color: item.status === 'pronto' ? 'var(--success-color)' : item.status === 'em preparo' ? 'var(--warning-color)' : 'var(--text-muted)'



                              }}>



                                {item.status.toUpperCase()}



                              </span>



                            </td>



                            <td style={{ padding: '12px 10px', fontSize: '0.85rem', opacity: 0.6 }}>R$ {formatCurrency(item.preco_unitario)}</td>



                            <td style={{ padding: '12px 10px', fontWeight: 700 }}>R$ {formatCurrency((Number(item.preco_unitario) * item.quantidade))}</td>



                            <td style={{ padding: '12px 10px', textAlign: 'right' }}>



                              <button 



                                onClick={() => {



                                  if(confirm(`Excluir ${item.quantidade}x ${item.produtos?.nome}?`)) {



                                    handleExcluirItemComanda({ ...item, pedido_id: pedidoMesa?.id });



                                  }



                                }} 



                                className="btn-outline" 



                                style={{ padding: '6px', color: 'var(--danger-color)', borderColor: 'rgba(220,53,69,0.2)', width: 'auto' }}



                              >



                                <Trash2 size={16} />



                              </button>



                            </td>



                          </tr>



                        ))}



                      </tbody>



                    </table>



                  )}



                  {totalMesa === 0 && (



                    <div style={{ padding: '1rem', borderTop: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none', textAlign: 'center' }}>



                      <button 



                        onClick={() => handleLiberarMesa(mesa.id)}



                        className="btn-outline"



                        style={{ fontSize: '0.7rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)', width: 'auto', padding: '4px 15px' }}



                      >



                        Liberar Mesa Vazia



                      </button>



                    </div>



                  )}



                </div>



              </div>



            );



          })}



        </div>



      )}



    </div>



  );



  const renderRendimentos = () => {



    const totalBruto = historicoCompleto.reduce((acc, p) => acc + Number(p.total), 0);



    const totalLiquido = totalBruto;



    const handleImprimirRendimentos = () => {



       import('jspdf').then(({ default: jsPDF }) => {



          const doc = new jsPDF();



          doc.setFontSize(18); doc.text('Relatório de Rendimentos - Resenha do Moura', 105, 15, { align: 'center' });



          doc.setFontSize(12); doc.text(`Data: ${new Date().toLocaleDateString()}`, 10, 25);



          doc.text('--- RESUMO FINANCEIRO ---', 10, 35);



          doc.text(`Total Faturamento: R$ {formatCurrency(totalBruto)}`, 10, 45);



          doc.text(`Total Pedidos: R$ {formatCurrency(totalLiquido)}`, 10, 52);



          doc.line(10, 60, 200, 60); doc.text('LISTA DE PEDIDOS', 10, 70);



          let y = 80; doc.setFontSize(10);



          doc.text('ID', 10, y); doc.text('TIPO', 60, y); doc.text('VALOR', 120, y); doc.text('TOTAL', 160, y);



          doc.line(10, y+2, 200, y+2); y += 8;



          historicoCompleto.forEach(v => {



             doc.text(v.id.split('-')[0].toUpperCase(), 10, y);



             doc.text(v.mesa_id ? `Mesa ${v.mesas?.numero}` : 'Balcão', 60, y);



             doc.text(`R$ ${formatCurrency(v.total)}`, 120, y);



             doc.text(`R$ ${formatCurrency(v.total)}`, 160, y);



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



           <KPIItem title="Faturamento Total" value={`R$ ${formatCurrency(totalBruto)}`} icon={<TrendingUp color="#d4af37" />} color="#d4af37" trend="Total" />



           <KPIItem title="Consumo Real" value={`R$ ${formatCurrency(totalLiquido)}`} icon={<Package color="#10b981" />} color="#10b981" trend="Vendas" />



        </div>



        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>



           <table style={{ width: '100%', borderCollapse: 'collapse' }}>



              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>



                <tr><th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem' }}>ID</th><th style={{ padding: '1rem', textAlign: 'left' }}>TIPO</th><th style={{ padding: '1rem', textAlign: 'left' }}>CONSUMO</th><th style={{ padding: '1rem', textAlign: 'right' }}>TOTAL</th></tr>



              </thead>



              <tbody>



                {historicoCompleto.map(v => {



                    const consumo = Number(v.total || 0);



                    const displayId = v.id ? v.id.split('-')[0].toUpperCase() : '---';



                    return (



                      <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>



                        <td style={{ padding: '1rem', fontSize: '0.7rem', opacity: 0.6, fontFamily: 'monospace' }}>#{displayId}</td>



                        <td style={{ padding: '1rem' }}>{v.mesa_id ? <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>MESA {v.mesas?.numero}</span> : <span style={{ color: 'var(--success-color)', fontWeight: 700 }}>BALCíƒO</span>}</td>



                        <td style={{ padding: '1rem' }}>R$ {formatCurrency(consumo)}</td>



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



      const matches = p.forma_pagamento.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTíO)\s*\(R\$([0-9.]+)\)/gi);



      if (matches) {



        matches.forEach((m: string) => {



          const typeMatch = m.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTíO)/i);



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



  const currentShiftOrders = useMemo(() => {



    const turnoAberto = turnosHistorico.find(t => t.status === 'aberto');



    if (!turnoAberto) return [];



    return historicoCompleto.filter(p => p.turno_id === turnoAberto.id);



  }, [historicoCompleto, turnosHistorico]);



  const currentShiftPaymentTotals = useMemo(() => {



    const totals = { pix: 0, dinheiro: 0, debito: 0, credito: 0 };



    currentShiftOrders.forEach(p => {



      if (!p.forma_pagamento) return;



      const matches = p.forma_pagamento.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTíO)\s*\(R\$([0-9.]+)\)/gi);



      if (matches) {



        matches.forEach((m: string) => {



          const typeMatch = m.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTíO)/i);



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



  }, [currentShiftOrders]);



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



            <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Banco de fechamento de caixa</h2>



            <p className="text-muted" style={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>Gestão de turno atual e histórico organizado por pastas.</p>



        </div>



        {/* Turno Atual / Gestão em Tempo Real */}



        <div className="mb-8 p-4 p-md-6 card" style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.2)' }}>



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



                    <h3 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 800 }}>



                        {turnoAberto ? 'TURNO EM ANDAMENTO' : 'CAIXA FECHADO'}



                    </h3>



                </div>



                {turnoAberto && (



                    <div style={{ textAlign: 'right' }}>



                        <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>OS ATUAL:</span>



                        <div style={{ fontWeight: 900, fontSize: isMobile ? '1rem' : '1.2rem', color: 'var(--primary-color)' }}>#{turnoAberto.os_number || '---'}</div>



                    </div>



                )}



            </div>



            <FechamentoCaixa



                historicoVendas={currentShiftOrders}



                paymentTotals={currentShiftPaymentTotals}



                onRefresh={fetchData}



            />



        </div>



        <div className="mb-4 d-flex items-center gap-2 px-2">



            <HistoryIcon size={18} opacity={0.5} />



            <span style={{ fontWeight: 800, fontSize: '0.75rem', opacity: 0.6, letterSpacing: '1px' }}>HISTÓRICO RECENTE</span>



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



                                padding: isMobile ? '1rem' : '1.2rem 1.5rem', 



                                background: isDateExpanded ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.01)', 



                                cursor: 'pointer',



                                display: 'flex',



                                justifyContent: 'space-between',



                                alignItems: 'center'



                            }}



                        >



                            <div className="d-flex items-center gap-3 md:gap-4">



                                <div style={{ background: 'rgba(212,175,55,0.1)', padding: isMobile ? '8px' : '10px', borderRadius: '10px' }}>



                                    <Folder size={isMobile ? 20 : 24} color="#d4af37" fill="rgba(212,175,55,0.1)" />



                                </div>



                                <div>



                                    <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>PASTA: {data}</div>



                                    <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 700 }}>{turnos.length} O.S. ARQUIVADA(S)</div>



                                </div>



                            </div>



                            <div className="d-flex items-center gap-4 md:gap-6">



                                <div style={{ textAlign: 'right' }}>



                                    <div style={{ fontSize: '0.55rem', opacity: 0.4 }}>TOTAL</div>



                                    <div style={{ fontWeight: 900, color: 'var(--primary-color)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>R$ {formatCurrency(totalDia)}</div>



                                </div>



                                {isDateExpanded ? <ChevronUp size={isMobile ? 16 : 20} opacity={0.5} /> : <ChevronDown size={isMobile ? 16 : 20} opacity={0.5} />}



                            </div>



                        </div>



                        {isDateExpanded && (



                            <div style={{ padding: isMobile ? '1rem' : '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>



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



                                    return (



                                        <div key={t.id} style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>



                                            <div 



                                                onClick={() => setExpandedOS(isOSExpanded ? null : t.id)}



                                                style={{ padding: '0.8rem 1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}



                                            >



                                                <div className="d-flex items-center gap-3">



                                                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px' }}>



                                                        <FileText size={16} color={t.status === 'aberto' ? '#10b981' : '#fff'} opacity={0.6} />



                                                    </div>



                                                    <div>



                                                        <div style={{ fontWeight: 900, fontSize: '0.85rem', color: t.status === 'aberto' ? '#10b981' : '#fff' }}>O.S. #{t.os_number || '---'}</div>



                                                        <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 700 }}>{t.profiles?.full_name?.split(' ')[0]} â€¢ {new Date(t.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>



                                                    </div>



                                                </div>



                                                <div className="d-flex items-center gap-3">



                                                    <div style={{ textAlign: 'right' }}>



                                                        <div style={{ fontSize: '0.55rem', opacity: 0.4 }}>VALOR</div>



                                                        <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#fff' }}>R$ {formatCurrency(totalOS)}</div>



                                                    </div>



                                                    {isOSExpanded ? <ChevronUp size={14} opacity={0.3} /> : <ChevronDown size={14} opacity={0.3} />}



                                                </div>



                                            </div>



                                            {isOSExpanded && (



                                                <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>



                                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.2rem' }}>



                                                        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>



                                                            <div style={{ fontSize: '0.5rem', opacity: 0.4 }}>VENDAS</div>



                                                            <div style={{ fontWeight: 800, color: 'var(--primary-color)', fontSize: '0.85rem' }}>R$ {formatCurrency(totalOS)}</div>



                                                        </div>



                                                        <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>



                                                            <div style={{ fontSize: '0.5rem', opacity: 0.4 }}>FUNDO</div>



                                                            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>R$ {formatCurrency(fundo)}</div>



                                                        </div>



                                                        <div className="p-2 rounded-lg" style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}30`, gridColumn: isMobile ? 'span 2' : 'auto' }}>



                                                            <div style={{ fontSize: '0.5rem', color: statusColor, fontWeight: 700 }}>{t.status === 'aberto' ? 'STATUS: ABERTO' : Math.abs(diferenca) < 0.1 ? 'CONFERE âœ“' : diferenca > 0 ? `SOBRA: R$ {formatCurrency(diferenca)}` : `QUEBRA: R$ {formatCurrency(Math.abs(diferenca))}`}</div>



                                                            <div style={{ fontWeight: 900, fontSize: '0.8rem', color: statusColor }}>{t.status === 'fechado' ? `Declarado: R$ {formatCurrency(declarado)}` : 'Em andamento...'}</div>



                                                        </div>



                                                    </div>



                                                    <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '0.6rem', letterSpacing: '1px' }}>VENDAS DETALHADAS</h4>



                                                    <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>



                                                        <table style={{ width: '100%', fontSize: '0.7rem' }}>



                                                            <thead>



                                                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>



                                                                    <th style={{ padding: '0.6rem', textAlign: 'left' }}>Mesa</th>



                                                                    <th style={{ padding: '0.6rem', textAlign: 'left' }}>Pag.</th>



                                                                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Total</th>



                                                                </tr>



                                                            </thead>



                                                            <tbody>



                                                                {t.pedidos?.map((p: any) => (



                                                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>



                                                                        <td style={{ padding: '0.6rem' }}>{p.mesa_id ? `Mesa ${p.mesas?.numero || '?'}` : 'Balcão'}</td>



                                                                        <td style={{ padding: '0.6rem', fontSize: '0.6rem', opacity: 0.6 }}>{p.forma_pagamento?.split(' ')[0]}</td>



                                                                        <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700 }}>R$ {formatCurrency(p.total)}</td>



                                                                    </tr>



                                                                ))}



                                                                {(!t.pedidos || t.pedidos.length === 0) && (



                                                                    <tr><td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', opacity: 0.4 }}>Sem vendas.</td></tr>



                                                                )}



                                                            </tbody>



                                                        </table>



                                                    </div>



                                                    {/* Auditoria de Exclusões */}



                                                    {auditoriaExclusoes.filter(a => a.turno_id === t.id).length > 0 && (



                                                        <div style={{ marginTop: '1.2rem' }}>



                                                             <h4 style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', marginBottom: '0.6rem', letterSpacing: '1px' }}>AUDITORIA: EXCLUSí•ES</h4>



                                                             <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.02)' }}>



                                                                <table style={{ width: '100%', fontSize: '0.7rem' }}>



                                                                    <thead>



                                                                        <tr style={{ background: 'rgba(239,68,68,0.05)', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>



                                                                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Item</th>



                                                                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Motivo Real</th>



                                                                            <th style={{ padding: '0.8rem', textAlign: 'left' }}>Autorizado</th>



                                                                            <th style={{ padding: '0.8rem', textAlign: 'right' }}>Vazamento</th>



                                                                        </tr>



                                                                    </thead>



                                                                    <tbody>



                                                                        {auditoriaExclusoes.filter(a => a.turno_id === t.id).map(audit => (



                                                                            <tr key={audit.id} style={{ borderBottom: '1px solid rgba(239,68,68,0.05)' }}>



                                                                                <td style={{ padding: '0.8rem' }}>{audit.quantidade}x {audit.produto_nome} (Mesa {audit.mesa_numero})</td>



                                                                                <td style={{ padding: '0.8rem' }}>



                                                                                    <div style={{ fontStyle: 'italic', color: '#fff', opacity: 0.9 }}>"{audit.motivo}"</div>



                                                                                </td>



                                                                                <td style={{ padding: '0.8rem' }}>{audit.usuario_nome}</td>



                                                                                <td style={{ padding: '0.8rem', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>- R$ {formatCurrency(audit.valor_removido)}</td>



                                                                            </tr>



                                                                        ))}



                                                                    </tbody>



                                                                </table>



                                                             </div>



                                                        </div>



                                                    )}



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



  const ganhosMensais = useMemo(() => {



    const groups: Record<string, { total: number, pedidos: any[], payments: any }> = {};



    historicoCompleto.forEach(p => {



      const d = new Date(p.finalizado_at || p.data_hora);



      if (isNaN(d.getTime())) return;



      const monthStr = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();



      if (!groups[monthStr]) {



        groups[monthStr] = { 



          total: 0, 



          pedidos: [], 



          payments: { pix: 0, dinheiro: 0, debito: 0, credito: 0 } 



        };



      }



      const val = Number(p.total);



      groups[monthStr].total += val;



      groups[monthStr].pedidos.push(p);



      if (p.forma_pagamento) {



          const typeMatch = p.forma_pagamento.match(/(PIX|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO)/i);



          const valMatch = p.forma_pagamento.match(/R\$([0-9.]+)/);



          if (typeMatch && valMatch) {



            const type = typeMatch[1].toUpperCase();



            const v = parseFloat(valMatch[1]);



            if (type === 'PIX') groups[monthStr].payments.pix += v;



            else if (type === 'DINHEIRO') groups[monthStr].payments.dinheiro += v;



            else if (type === 'DÉBITO' || type === 'DEBITO') groups[monthStr].payments.debito += v;



            else if (type === 'CRÉDITO' || type === 'CREDITO') groups[monthStr].payments.credito += v;



          }



      }



    });



    return Object.entries(groups).sort((a, b) => {



        const d1 = new Date(b[1].pedidos[0].finalizado_at || b[1].pedidos[0].data_hora);



        const d2 = new Date(a[1].pedidos[0].finalizado_at || a[1].pedidos[0].data_hora);



        return d1.getTime() - d2.getTime();



    });



  }, [historicoCompleto]);



  const renderGanhosMensais = () => {



    return (



      <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>



        <div className="mb-8">



            <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>Ganhos Mensais</h2>



            <p className="text-muted" style={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>Histórico completo de faturamento agrupado por mês.</p>



        </div>



        <div className="d-flex flex-col gap-4">



            {ganhosMensais.length === 0 && (



                <div className="card text-center" style={{ padding: '3rem', opacity: 0.5 }}>



                    Nenhum histórico encontrado.



                </div>



            )}



            {ganhosMensais.map(([monthStr, data]) => {



                const isExpanded = expandedMonth === monthStr;



                return (



                    <div key={monthStr} className="card" style={{ padding: 0, overflow: 'hidden', border: isExpanded ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.05)' }}>



                        <div 



                            onClick={() => setExpandedMonth(isExpanded ? null : monthStr)}



                            style={{ 



                                padding: isMobile ? '1rem' : '1.2rem 1.5rem', 



                                background: isExpanded ? 'rgba(212,175,55,0.05)' : 'rgba(255,255,255,0.01)', 



                                cursor: 'pointer',



                                display: 'flex',



                                justifyContent: 'space-between',



                                alignItems: 'center'



                            }}



                        >



                            <div className="d-flex items-center gap-3 md:gap-4">



                                <div style={{ background: 'rgba(212,175,55,0.1)', padding: isMobile ? '8px' : '10px', borderRadius: '10px' }}>



                                    <HistoryIcon size={isMobile ? 20 : 24} color="#d4af37" />



                                </div>



                                <div>



                                    <div style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>MÊS: {monthStr}</div>



                                    <div style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 700 }}>{data.pedidos.length} PEDIDOS ARQUIVADOS</div>



                                </div>



                            </div>



                            <div className="d-flex items-center gap-4 md:gap-6">



                                <div style={{ textAlign: 'right' }}>



                                    <div style={{ fontSize: '0.55rem', opacity: 0.4 }}>FATURAMENTO</div>



                                    <div style={{ fontWeight: 900, color: 'var(--primary-color)', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>R$ {formatCurrency(data.total)}</div>



                                </div>



                                {isExpanded ? <ChevronUp size={isMobile ? 16 : 20} opacity={0.5} /> : <ChevronDown size={isMobile ? 16 : 20} opacity={0.5} />}



                            </div>



                        </div>



                        {isExpanded && (



                            <div style={{ padding: isMobile ? '1rem' : '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>



                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '0.75rem' }}>



                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>



                                        <div style={{ fontSize: '0.55rem', opacity: 0.6, color: '#10b981', fontWeight: 800 }}>PIX</div>



                                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.9rem' }}>R$ {formatCurrency(data.payments.pix)}</div>



                                    </div>



                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>



                                        <div style={{ fontSize: '0.55rem', opacity: 0.6, color: '#f59e0b', fontWeight: 800 }}>DINHEIRO</div>



                                        <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.9rem' }}>R$ {formatCurrency(data.payments.dinheiro)}</div>



                                    </div>



                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>



                                        <div style={{ fontSize: '0.55rem', opacity: 0.6, color: '#3b82f6', fontWeight: 800 }}>DÉBITO</div>



                                        <div style={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.9rem' }}>R$ {formatCurrency(data.payments.debito)}</div>



                                    </div>



                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>



                                        <div style={{ fontSize: '0.55rem', opacity: 0.6, color: '#8b5cf6', fontWeight: 800 }}>CRÉDITO</div>



                                        <div style={{ fontWeight: 800, color: '#8b5cf6', fontSize: '0.9rem' }}>R$ {formatCurrency(data.payments.credito)}</div>



                                    </div>



                                </div>



                            </div>



                        )}



                    </div>



                );



            })}



        </div>



      </div>



    );



  };



  const handleAddGasto = async (e: React.FormEvent) => {



    e.preventDefault();



    if (!novoGasto.descricao || !novoGasto.valor) return;



    const { error } = await supabase.from('gastos').insert({



      descricao: novoGasto.descricao,



      valor: parseFloat(novoGasto.valor.toString().replace(',', '.')),



      categoria: novoGasto.categoria,



      forma_pagamento: novoGasto.forma_pagamento,



      cartao_id: novoGasto.cartao_id || null,



      data_gasto: new Date(novoGasto.data + 'T12:00:00').toISOString()



    });



    if (!error) {



      setShowAddGasto(false);



      setNovoGasto({ descricao: '', valor: '', categoria: 'Fornecedores', forma_pagamento: 'PIX', cartao_id: '', data: new Date().toISOString().split('T')[0] });



      fetchData();



    } else {



      alert("Erro ao adicionar gasto: " + error.message);



    }



  };



  const handleAddCartao = async (e: React.FormEvent) => {



    e.preventDefault();



    const { error } = await supabase.from('cartoes_gastos').insert(novoCartao);



    if (!error) {



      setShowAddCartao(false);



      setNovoCartao({ nome: '', bandeira: 'Visa', banco: '', cor: '#3b82f6' });



      fetchData();



    } else {



      alert("Erro ao adicionar cartão: " + error.message);



    }



  };



  const handleDeleteCartao = async (id: string) => {

    const card = cartoes.find(c => c.id === id);

    if (!card) return;

    setCardToDelete(card);

  };



  const confirmDeleteCartao = async () => {

    if (!cardToDelete) return;

    setIsDeletingCard(true);

    try {

      const { error } = await supabase.from('cartoes_gastos').delete().eq('id', cardToDelete.id);

      if (error) {

        if (error.message.includes('foreign key constraint')) {

          alert("Não é possível excluir este cartão pois existem gastos vinculados a ele. Exclua os gastos primeiro.");

        } else {

          alert("Erro ao excluir cartão: " + error.message);

        }

      } else {

        await fetchData();

        setCardToDelete(null);

      }

    } catch (err: any) {

      alert("Erro inesperado: " + err.message);

    } finally {

      setIsDeletingCard(false);

    }

  };



  const handleDeleteGasto = async (id: string) => {

    if (window.confirm("Tem certeza que deseja excluir este gasto?")) {

      const { error } = await supabase.from('gastos').delete().eq('id', id);

      if (error) alert("Erro: " + error.message);

      else fetchData();

    }

  };



  const renderGastosMensais = () => {



    const [yearStr, monthStr] = gastosMonthFilter.split('-');



    const currentMonthGastos = gastos.filter(g => {



        const d = new Date(g.data_gasto);



        return d.getFullYear() === parseInt(yearStr) && (d.getMonth() + 1) === parseInt(monthStr);



    });



    const totalGasto = currentMonthGastos.reduce((acc, g) => acc + Number(g.valor), 0);



    const categoryTotals = currentMonthGastos.reduce((acc: any, g) => {



        if (!acc[g.categoria]) acc[g.categoria] = 0;



        acc[g.categoria] += Number(g.valor);



        return acc;



    }, {});



    const chartData = Object.keys(categoryTotals).map(c => ({ name: c, valor: categoryTotals[c] }));



    const paymentTotals = currentMonthGastos.reduce((acc: any, g) => {



        const method = g.forma_pagamento || 'Outros';



        if (!acc[method]) acc[method] = 0;



        acc[method] += Number(g.valor);



        return acc;



    }, {});



    const paymentChartData = Object.keys(paymentTotals).map(p => ({ name: p, valor: paymentTotals[p] }));



    const dailyTotals = currentMonthGastos.reduce((acc: any, g) => {



        const d = new Date(g.data_gasto).getUTCDate().toString().padStart(2, '0');



        if (!acc[d]) acc[d] = 0;



        acc[d] += Number(g.valor);



        return acc;



    }, {});



    const dailyChartData = Object.keys(dailyTotals).sort().map(d => ({ dia: d, valor: dailyTotals[d] }));



    return (



      <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>



        {/* Header Elegante */}



        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '20px' }}>



          <div>



             <div style={{ color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '2px', marginBottom: '8px' }}>RELATÓRIO FINANCEIRO</div>



             <h2 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 900, letterSpacing: '-1px' }}>Gestão de Gastos</h2>



             <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>Controle detalhado de despesas e cartões ativos.</p>



          </div>



          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>



                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#111', borderRadius: '12px', padding: '0 12px', border: '1px solid #333' }}>



                    <input 



                        type="month" 



                        value={gastosMonthFilter} 



                        onChange={e => setGastosMonthFilter(e.target.value)}



                        style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px 0', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}



                    />



                </div>



                <button onClick={() => setShowAddCartao(true)} style={{ background: '#111', color: '#fff', border: '1px solid #333', padding: '12px 18px', borderRadius: '12px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-color)'} onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}>



                    <CreditCardIcon size={16} /> Cartões



                </button>



                <button className="btn-primary" onClick={() => setShowAddGasto(true)} style={{ width: 'auto', padding: '12px 24px', background: 'var(--danger-color)', borderRadius: '12px', fontWeight: 800, fontSize: '0.85rem', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)' }}>



                    + Lançar Gasto



                </button>



          </div>



        </div>



        {/* Cartões Ativos (Slider Visual) */}



        <div style={{ marginBottom: '2.5rem' }}>



            <div className="d-flex justify-between items-center mb-4 px-2">



                <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Meus Cartões Ativos</h3>



                <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: 700 }}>{cartoes.length} total</span>



            </div>



            <div className="card-slider no-scrollbar">



                {cartoes.length === 0 ? (



                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>



                        <p style={{ opacity: 0.5, fontSize: '0.9rem', margin: 0 }}>Nenhum cartão cadastrado ainda.</p>



                    </div>



                ) : cartoes.map(c => (



                    <VisualCard key={c.id} card={c} profile={profile} onDelete={handleDeleteCartao} />



                ))}



            </div>



        </div>



        {/* KPIs Premium */}



        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>



            {[



                { label: 'TOTAL DO MÊS', value: `R$ ${formatCurrency(totalGasto)}`, color: '#ef4444', icon: <TrendingDown size={18} /> },



                { label: 'Lançamentos', value: currentMonthGastos.length, color: '#f59e0b', icon: <FileText size={18} /> },



                { label: 'MÉDIA DIíRIA', value: `R$ ${(dailyChartData.length > 0 ? totalGasto / dailyChartData.length : 0).toFixed(2)}`, color: '#3b82f6', icon: <Clock size={18} /> },



            ].map((kpi, idx) => (



                <div key={idx} className="card" style={{ position: 'relative', overflow: 'hidden', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.03)' }}>



                    <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '4px', background: kpi.color }}></div>



                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>



                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>{kpi.label}</span>



                        <div style={{ color: kpi.color, opacity: 0.5 }}>{kpi.icon}</div>



                    </div>



                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: kpi.color }}>{kpi.value}</div>



                </div>



            ))}



        </div>



        {/* Gráficos em Grid */}



        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.2fr', gap: '1.5rem', marginBottom: '2rem' }}>



            <div className="card" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>



                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>



                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>



                    Categorias



                </h3>



                <div style={{ width: '100%', height: 240 }}>



                    {chartData.length > 0 ? (



                    <ResponsiveContainer>



                        <PieChart>



                            <Pie data={chartData} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} stroke="none">



                                {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}



                            </Pie>



                            <RechartsTooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }} formatter={(val: any) => 'R$ ' + formatCurrency(val)} />



                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />



                        </PieChart>



                    </ResponsiveContainer>



                    ) : (



                      <div className="d-flex items-center justify-center h-full text-muted opacity-30" style={{ fontSize: '0.9rem' }}>Nenhum dado registrado</div>



                    )}



                </div>



            </div>



            <div className="card" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>



                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>



                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>



                    Meios de Pagamento



                </h3>



                <div style={{ width: '100%', height: 240 }}>



                    {paymentChartData.length > 0 ? (



                    <ResponsiveContainer>



                        <PieChart>



                            <Pie data={paymentChartData} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} stroke="none">



                                {paymentChartData.map((_, index) => <Cell key={`cell-p-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />)}



                            </Pie>



                            <RechartsTooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }} formatter={(val: any) => 'R$ ' + formatCurrency(val)} />



                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />



                        </PieChart>



                    </ResponsiveContainer>



                    ) : (



                      <div className="d-flex items-center justify-center h-full text-muted opacity-30" style={{ fontSize: '0.9rem' }}>Nenhum dado registrado</div>



                    )}



                </div>



            </div>



            <div className="card" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>



                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>



                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>



                    Evolução Diria



                </h3>



                <div style={{ width: '100%', height: 240 }}>



                    {dailyChartData.length > 0 ? (



                    <ResponsiveContainer>



                        <BarChart data={dailyChartData}>



                            <XAxis dataKey="dia" stroke="#444" fontSize={10} axisLine={false} tickLine={false} />



                            <YAxis stroke="#444" fontSize={10} axisLine={false} tickLine={false} />



                            <RechartsTooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '12px' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(val: any) => 'R$ ' + formatCurrency(val)} />



                            <Bar dataKey="valor" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={20} />



                        </BarChart>



                    </ResponsiveContainer>



                    ) : (



                      <div className="d-flex items-center justify-center h-full text-muted opacity-30" style={{ fontSize: '0.9rem' }}>Nenhum dado registrado</div>



                    )}



                </div>



            </div>



        </div>



        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>



            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>



                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Lançamentos de {gastosMonthFilter.split('-').reverse().join('/')}</h3>



            </div>



            <div style={{ overflowX: 'auto' }}>



                <table style={{ width: '100%', fontSize: '0.9rem', minWidth: '600px' }}>



                  <thead style={{ opacity: 0.5, background: 'rgba(0,0,0,0.2)' }}>



                    <tr>



                      <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>DATA</th>



                      <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>DESCRIí‡íƒO</th>



                      <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>CATEGORIA</th>



                      <th style={{ textAlign: 'left', padding: '1rem 1.5rem' }}>PAGAMENTO</th>



                      <th style={{ textAlign: 'right', padding: '1rem 1.5rem' }}>VALOR</th>



                      <th style={{ padding: '1rem 1.5rem' }}></th>



                    </tr>



                  </thead>



                  <tbody>



                    {currentMonthGastos.length === 0 ? (



                        <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Nenhum gasto neste mês.</td></tr>



                    ) : currentMonthGastos.map(g => (



                      <tr key={g.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>



                        <td style={{ padding: '1rem 1.5rem' }}>{new Date(g.data_gasto).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>



                        <td style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>{g.descricao}</td>



                        <td style={{ padding: '1rem 1.5rem' }}>



                          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{g.categoria}</span>



                        </td>



                        <td style={{ padding: '1rem 1.5rem', opacity: 0.7 }}>



                          <div className="d-flex items-center gap-2">



                            {g.cartoes_gastos ? (



                              <>



                                <div style={{ background: g.cartoes_gastos.cor, padding: '4px', borderRadius: '4px', color: '#fff', display: 'flex' }}>



                                  <CreditCardIcon size={12} />



                                </div>



                                <span style={{ fontWeight: 700, color: '#fff' }}>{g.cartoes_gastos.nome}</span>



                                <span style={{ opacity: 0.5 }}>â€¢ {g.forma_pagamento}</span>



                              </>



                            ) : (



                              <>



                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px', borderRadius: '4px', color: 'var(--text-muted)', display: 'flex' }}>



                                  <Banknote size={12} />



                                </div>



                                {g.forma_pagamento || 'Outros'}



                              </>



                            )}



                          </div>



                        </td>



                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: 'var(--danger-color)', fontWeight: 900 }}>- R$ {formatCurrency(g.valor)}</td>



                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>



                          <button onClick={() => handleDeleteGasto(g.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', color: '#ef4444' }}>



                            <Trash2 size={16} />



                          </button>



                        </td>



                      </tr>



                    ))}



                  </tbody>



                </table>



            </div>



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



      case 'comandas': return renderComandas();



      case 'avaliacoes': return renderAvaliacoes();



      case 'caixa': return renderCaixa();



      case 'ganhos_mensais': return renderGanhosMensais();



      case 'gastos_mensais': return renderGastosMensais();



      default: return renderDashboard();



    }



  };



  return (



        <div className="layout-container">
      {/* Botão flutuante do menu mobile */}
      <div className="desktop-hide" style={{ position: 'fixed', top: '15px', right: '15px', zIndex: 100003 }}>
        <button 
          onClick={() => setShowMobileMenu(true)} 
          style={{ 
            background: 'var(--primary-color)', 
            color: '#000', 
            width: '45px', 
            height: '45px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
            border: '2px solid rgba(0,0,0,0.1)'
          }}
        >
          <MoreVertical size={24} />
        </button>
      </div>

      <AnimatePresence>
        {showMobileMenu && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100004 }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            />
            <motion.aside 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ 
                position: 'absolute', right: 0, top: 0, bottom: 0, width: '280px', 
                background: 'var(--bg-color)', borderLeft: '1px solid var(--border-color)',
                padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '0 0.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-color)', margin: 0 }}>Menu</h2>
                <button onClick={() => setShowMobileMenu(false)} style={{ color: 'var(--text-muted)' }}>
                  <MoreVertical size={24} style={{ transform: 'rotate(90deg)' }} />
                </button>
              </div>

              <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <SidebarItem active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Radar" onClick={() => { setActiveTab('dashboard'); setShowMobileMenu(false); }} />
                <SidebarItem active={activeTab === 'produtos'} icon={<Package size={20}/>} label="Estoque" onClick={() => { setActiveTab('produtos'); setShowMobileMenu(false); }} />
                <SidebarItem active={activeTab === 'mesas'} icon={<LayoutGrid size={20}/>} label="Mesas" onClick={() => { setActiveTab('mesas'); setShowMobileMenu(false); }} />
                <SidebarItem active={activeTab === 'comandas'} icon={<FileText size={20}/>} label="Comandas" onClick={() => { setActiveTab('comandas'); setShowMobileMenu(false); }} />
                <SidebarItem active={activeTab === 'usuarios'} icon={<UsersIcon size={20}/>} label="Equipe" onClick={() => { setActiveTab('usuarios'); setShowMobileMenu(false); }} />
                <SidebarItem active={activeTab === 'avaliacoes'} icon={<Star size={20}/>} label="Avaliações" onClick={() => { setActiveTab('avaliacoes'); setShowMobileMenu(false); }} />
                <SidebarItem active={activeTab === 'caixa'} icon={<Lock size={20}/>} label="Caixa" onClick={() => { setActiveTab('caixa'); setShowMobileMenu(false); }} />
                <SidebarItem active={activeTab === 'ganhos_mensais'} icon={<HistoryIcon size={20}/>} label="Ganhos Mensais" onClick={() => { setActiveTab('ganhos_mensais'); setShowMobileMenu(false); }} />
                <SidebarItem active={activeTab === 'gastos_mensais'} icon={<TrendingDown size={20}/>} label="Gastos Mensais" onClick={() => { setActiveTab('gastos_mensais'); setShowMobileMenu(false); }} color="var(--danger-color)" />
              </nav>

              <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <SidebarItem active={false} icon={<LogOut size={20}/>} label="Sair" onClick={() => { signOut(); setShowMobileMenu(false); }} color="var(--danger-color)" />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <aside className="sidebar mobile-hide">



      <aside className="sidebar">



        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1.5rem 1rem' }}>



          <img src="/logo.png" alt="Logo" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'contain', border: '1px solid var(--primary-color)' }} />



          <h2 style={{ color: 'var(--primary-color)', margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Resenha do Moura</h2>



        </div>



        <nav className="sidebar-nav">



          <SidebarItem active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Radar" onClick={() => setActiveTab('dashboard')} />



          <SidebarItem active={activeTab === 'produtos'} icon={<Package size={20}/>} label="Estoque" onClick={() => setActiveTab('produtos')} />



          <SidebarItem active={activeTab === 'mesas'} icon={<LayoutGrid size={20}/>} label="Mesas" onClick={() => setActiveTab('mesas')} />



          <SidebarItem active={activeTab === 'comandas'} icon={<FileText size={20}/>} label="Comandas" onClick={() => setActiveTab('comandas')} />



          <SidebarItem active={activeTab === 'usuarios'} icon={<UsersIcon size={20}/>} label="Equipe" onClick={() => setActiveTab('usuarios')} />



          <SidebarItem active={activeTab === 'avaliacoes'} icon={<Star size={20}/>} label="Avaliações" onClick={() => setActiveTab('avaliacoes')} />



          <SidebarItem active={activeTab === 'caixa'} icon={<Lock size={20}/>} label="Caixa" onClick={() => setActiveTab('caixa')} />



          <SidebarItem active={activeTab === 'ganhos_mensais'} icon={<HistoryIcon size={20}/>} label="Ganhos Mensais" onClick={() => setActiveTab('ganhos_mensais')} />



          <SidebarItem active={activeTab === 'gastos_mensais'} icon={<TrendingDown size={20}/>} label="Gastos Mensais" onClick={() => setActiveTab('gastos_mensais')} color="var(--danger-color)" />



        </nav>



        {/* Acesso Direto aos Painéis da Equipe */}



        <div style={{ margin: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>



          <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.25)', padding: '0 8px', marginBottom: '6px' }}>



            PAINÉIS DA EQUIPE



          </div>



          {[



            { label: 'Garçom', path: '/garcom', emoji: '🤵' },



            { label: 'Caixa', path: '/caixa', emoji: '💳' },



            { label: 'Cozinha / Bar', path: '/producao', emoji: '🍳' },



            { label: 'Administrador', path: '/admin', emoji: '⚠️' },



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



      {/* Modal de Alteração de Senha */}



      <AnimatePresence>



        {isPasswordModalOpen && (



          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>



            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}



              style={{ background: '#111', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem' }}>



              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>Alterar Senha</h2>



              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem' }}>Defina uma nova senha para <b>{selectedUserForPassword?.full_name}</b>.</p>



              <div className="mb-6">



                <label className="label-field">NOVA SENHA</label>



                <input 



                  type="password" 



                  value={newPasswordForUser} 



                  onChange={e => setNewPasswordForUser(e.target.value)} 



                  placeholder="Mínimo 6 caracteres" 



                  className="input-field"



                  autoFocus



                />



              </div>



              <div className="d-flex gap-3">



                <button onClick={() => { setIsPasswordModalOpen(false); setNewPasswordForUser(''); }} className="btn-outline">Cancelar</button>



                <button onClick={handleUpdatePassword} className="btn-primary" disabled={isUpdatingPassword || newPasswordForUser.length < 6}>



                  {isUpdatingPassword ? 'Salvando...' : 'Salvar Senha'}



                </button>



              </div>



            </motion.div>



          </div>



        )}



      </AnimatePresence>



      {/* Modal de Alteração de Função */}



      <AnimatePresence>



        {isRoleModalOpen && (



          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>



            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}



              style={{ background: '#111', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem' }}>



              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>Alterar Função</h2>



              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem' }}>Especifique o novo nível de acesso para <b>{selectedUserForRole?.full_name}</b>.</p>



              <div className="mb-6">



                <label className="label-field">SELECIONE A NOVA FUNí‡íƒO</label>



                <select 



                  value={newRoleForUser} 



                  onChange={e => setNewRoleForUser(e.target.value)} 



                  className="input-field"



                  style={{ background: '#222', color: '#fff', border: '1px solid #333' }}



                >



                  <option value="garcom">Garçom</option>



                  <option value="caixa">Caixa</option>



                  <option value="cozinha">Cozinha</option>



                  <option value="admin">Administrador</option>



                  <option value="dono">Dono (Proprietário)</option>



                </select>



              </div>



              <div className="d-flex gap-3">



                <button onClick={() => { setIsRoleModalOpen(false); setSelectedUserForRole(null); }} className="btn-outline">Cancelar</button>



                <button onClick={handleUpdateRole} className="btn-primary" disabled={isUpdatingRole}>



                  {isUpdatingRole ? 'Atualizando...' : 'Atualizar Função'}



                </button>



              </div>



            </motion.div>



          </div>



        )}



        {isNameModalOpen && (



          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>



            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}



              style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem' }}>



              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>Alterar Nome</h2>



              <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '1.5rem' }}>Especifique o novo nome completo para <b>{selectedUserForName?.full_name}</b>.</p>



              <div className="mb-6">



                <label className="label-field">NOVO NOME</label>



                <input 



                  type="text"



                  value={newNameForUser} 



                  onChange={e => setNewNameForUser(e.target.value)} 



                  className="input-field"



                  placeholder="Digite o nome completo"



                  style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border-color)' }}



                />



              </div>



              <div className="d-flex gap-3">



                <button onClick={() => { setIsNameModalOpen(false); setSelectedUserForName(null); }} className="btn-outline">Cancelar</button>



                <button onClick={handleUpdateName} className="btn-primary" disabled={isUpdatingName}>



                  {isUpdatingName ? 'Atualizando...' : 'Atualizar Nome'}



                </button>



              </div>



            </motion.div>



          </div>



        )}



      </AnimatePresence>



      {/* Modal Lançar Gasto */}



      <AnimatePresence>



        {showAddGasto && (



          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>



            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}



              style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem' }}>



              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '1.5rem' }}>Lançar Gasto</h2>



              <form onSubmit={handleAddGasto}>



                <div className="mb-4">



                  <label className="label-field">DESCRIí‡íƒO</label>



                  <input type="text" value={novoGasto.descricao} onChange={e => setNovoGasto({...novoGasto, descricao: e.target.value})} className="input-field" required placeholder="Ex: Fornecedor de Carnes" />



                </div>



                <div className="mb-4">



                  <label className="label-field">VALOR (R$)</label>



                  <input type="number" step="0.01" value={novoGasto.valor} onChange={e => setNovoGasto({...novoGasto, valor: e.target.value})} className="input-field" required placeholder="0.00" />



                </div>



                <div className="mb-4">



                  <label className="label-field">CATEGORIA</label>



                  <select value={novoGasto.categoria} onChange={e => setNovoGasto({...novoGasto, categoria: e.target.value})} className="input-field" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>



                    <option value="Fornecedores">Fornecedores / Insumos</option>



                    <option value="Funcionários">Funcionários / Dirias</option>



                    <option value="Contas">Contas (ígua, Luz, Aluguel, etc)</option>



                    <option value="Equipamentos">Equipamentos / Manutenção</option>



                    <option value="Impostos">Impostos / Taxas</option>



                    <option value="Outros">Outros</option>



                  </select>



                </div>



                <div className="mb-4">



                  <label className="label-field">FORMA DE PAGAMENTO</label>



                  <select value={novoGasto.forma_pagamento} onChange={e => setNovoGasto({...novoGasto, forma_pagamento: e.target.value})} className="input-field" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>



                    <option value="PIX">PIX</option>



                    <option value="Dinheiro">Dinheiro</option>



                    <option value="Cartão de Crédito">Cartão de Crédito</option>



                    <option value="Cartão de Débito">Cartão de Débito</option>



                    <option value="Boleto">Boleto / Transferência</option>



                    <option value="Outros">Outros</option>



                  </select>



                </div>



                {novoGasto.forma_pagamento.includes('Cartão') && (



                  <div className="mb-6 animate-fade-in">



                    <label className="label-field mb-3" style={{ display: 'block' }}>SELECIONE O CARTíO</label>



                    <div className="card-slider no-scrollbar" style={{ padding: '10px 5px 20px', margin: '0 -10px' }}>



                      {cartoes.length === 0 ? (



                        <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>



                            <p style={{ opacity: 0.5, fontSize: '0.8rem', margin: 0 }}>Nenhum cartão cadastrado.</p>



                            <button type="button" onClick={() => setShowAddCartao(true)} style={{ color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 700, marginTop: '8px' }}>+ Cadastrar Agora</button>



                        </div>



                      ) : cartoes.map(c => (



                        <div key={c.id} style={{ transform: 'scale(0.85)', transformOrigin: 'left center', marginRight: '-30px' }}>



                            <VisualCard 



                                card={c} 



                                profile={profile} 



                                isSelected={novoGasto.cartao_id === c.id}



                                onClick={() => setNovoGasto({...novoGasto, cartao_id: c.id})}



                            />



                        </div>



                      ))}



                    </div>



                    {cartoes.length > 0 && !novoGasto.cartao_id && (



                        <p style={{ fontSize: '0.7rem', color: 'var(--warning-color)', marginTop: '-10px', textAlign: 'center' }}>Escolha um cartão para continuar</p>



                    )}



                  </div>



                )}



                <div className="mb-6">



                  <label className="label-field">DATA DO GASTO</label>



                  <input type="date" value={novoGasto.data} onChange={e => setNovoGasto({...novoGasto, data: e.target.value})} className="input-field" required />



                </div>



                <div className="d-flex gap-3">



                  <button type="button" onClick={() => setShowAddGasto(false)} className="btn-outline">Cancelar</button>



                  <button type="submit" className="btn-primary" style={{ background: 'var(--danger-color)', color: '#fff' }}>Registrar Gasto</button>



                </div>



              </form>



            </motion.div>



          </div>



        )}



      </AnimatePresence>



      {/* Modal Gerenciar Cartões */}



      <AnimatePresence>



        {showAddCartao && (



          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>



            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}



              style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>



              <div className="d-flex justify-between items-center mb-6">



                <h2 style={{ fontSize: '1.4rem', fontWeight: 900 }}>Meus Cartões</h2>



                <button onClick={() => setShowAddCartao(false)} className="btn-outline" style={{ width: 'auto', padding: '5px 10px' }}>Fechar</button>



              </div>



              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>



                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary-color)' }}>CADASTRAR NOVO CARTíO</h4>



                <form onSubmit={handleAddCartao}>



                  <div className="mb-3">



                    <label className="label-field">NOME DO CARTíO (Ex: Nubank Matheus)</label>



                    <input type="text" value={novoCartao.nome} onChange={e => setNovoCartao({...novoCartao, nome: e.target.value})} className="input-field" required placeholder="Nome para identificação" />                  </div>



                  <div className="mb-3">



                    <label className="label-field">BANCO</label>



                    <select 



                      value={novoCartao.banco} 



                      onChange={e => {



                        const bank = e.target.value;



                        let bankKey = bank.toLowerCase();



                        if (bankKey === 'banco do brasil') bankKey = 'bb';



                        if (bankKey === 'itaú') bankKey = 'itau';



                        const design = BANK_DESIGNS[bankKey];



                        setNovoCartao({



                          ...novoCartao, 



                          banco: bank,



                          cor: design?.color || (bank === 'Outro' ? novoCartao.cor : '#3b82f6'),



                          bandeira: design?.defaultBrand || novoCartao.bandeira



                        });



                      }} 



                      className="input-field"



                      style={{ 



                        background: 'rgba(0,0,0,0.3)', 



                        color: '#fff',



                        border: novoCartao.banco && novoCartao.banco !== 'Outro' ? `1px solid ${BANK_DESIGNS[novoCartao.banco.toLowerCase() === 'banco do brasil' ? 'bb' : novoCartao.banco.toLowerCase() === 'itaú' ? 'itau' : novoCartao.banco.toLowerCase()]?.color || 'var(--border-color)'}` : '1px solid var(--border-color)'



                      }}



                      required



                    >



                      <option value="">Selecione o Banco...</option>



                      <option value="Nubank">Nubank</option>



                      <option value="Banco do Brasil">Banco do Brasil</option>



                      <option value="Neon">Neon</option>



                      <option value="Bradesco">Bradesco</option>



                      <option value="Itaú">Itaú</option>



                      <option value="Inter">Inter</option>



                      <option value="Santander">Santander</option>



                      <option value="Outro">Outro / Personalizado</option>



                    </select>



                  </div>



                  {novoCartao.banco === 'Outro' && (



                    <div className="mb-4 animate-fade-in">



                      <label className="label-field">BANDEIRA</label>



                      <select value={novoCartao.bandeira} onChange={e => setNovoCartao({...novoCartao, bandeira: e.target.value})} className="input-field" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>



                        <option value="Visa">Visa</option>



                        <option value="Mastercard">Mastercard</option>



                        <option value="Elo">Elo</option>



                        <option value="Amex">Amex</option>



                        <option value="Hipercard">Hipercard</option>



                        <option value="Outra">Outra</option>



                      </select>



                    </div>



                  )}



                  {novoCartao.banco === 'Outro' && (



                    <div className="mb-4 animate-fade-in" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>



                      <div className="mb-3">



                        <label className="label-field">NOME DO BANCO PERSONALIZADO</label>



                        <input 



                          type="text" 



                          value={novoCartao.bancoPersonalizado || ''} 



                          onChange={e => setNovoCartao({...novoCartao, bancoPersonalizado: e.target.value})} 



                          className="input-field" 



                          placeholder="Digite o nome do banco" 



                        />



                      </div>



                      <div>



                        <label className="label-field">ESCOLHA UMA COR PARA O CARTíO</label>



                        <input type="color" value={novoCartao.cor} onChange={e => setNovoCartao({...novoCartao, cor: e.target.value})} className="input-field" style={{ height: '42px', padding: '5px' }} />



                      </div>



                    </div>



                  )}



                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>+ Salvar Cartão</button>



                </form>



              </div>



              <div>



                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>



                  <CreditCardIcon size={16} /> MEUS CARTí•ES ATIVOS



                </h4>



                <div className="card-slider no-scrollbar">



                  {cartoes.length === 0 ? (



                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '16px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>



                        <p style={{ opacity: 0.5, fontSize: '0.9rem', margin: 0 }}>Nenhum cartão cadastrado ainda.</p>



                    </div>



                  ) : cartoes.map(c => (



                    <VisualCard key={c.id} card={c} profile={profile} onDelete={handleDeleteCartao} />



                  ))}



                </div>



              </div>



            </motion.div>



          </div>



        )}



      </AnimatePresence>



      <AnimatePresence>

        {cardToDelete && (

          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}

              style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '24px', width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>

              <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ef4444' }}>

                <Trash2 size={30} />

              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>Excluir Cartão?</h2>

              <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '2rem' }}>

                Tem certeza que deseja remover o cartão <strong>{cardToDelete.nome}</strong>? 

                <br/><br/>

                <span style={{ color: 'var(--warning-color)' }}>Gastos vinculados a ele impedirão a exclusão.</span>

              </p>

              <div className="d-flex gap-3">

                <button onClick={() => setCardToDelete(null)} className="btn-outline" style={{ flex: 1 }}>Cancelar</button>

                <button onClick={confirmDeleteCartao} className="btn-primary" disabled={isDeletingCard} style={{ flex: 1, background: '#ef4444', color: '#fff' }}>

                  {isDeletingCard ? 'Excluindo...' : 'Sim, Excluir'}

                </button>

              </div>

            </motion.div>

          </div>

        )}

      </AnimatePresence>



    </div>



  );



};



