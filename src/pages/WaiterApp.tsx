import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Trash2 } from 'lucide-react';
import { OwnerViewBanner } from '../components/OwnerViewBanner';

export const Garcom = () => {
  const { signOut, profile } = useAuth();
  const [mesas, setMesas] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itensPedido, setItensPedido] = useState<any[]>([]);
  const [lastNotificationIds, setLastNotificationIds] = useState<Set<string>>(new Set());
  
  const [selectedMesa, setSelectedMesa] = useState<any | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('TODOS');
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetMesaId, setTargetMesaId] = useState<string>('');
  
  const { items, addItem, removeItem, clearCart, checkout } = useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const fetchData = async () => {
    try {
      // Buscar mesas
      const { data: mesasData } = await supabase.from('mesas').select('*').order('numero', { ascending: true });
      // Buscar pedidos não finalizados desta mesa ou de todas para cache
      const { data: pedidosData } = await supabase.from('pedidos').select('id, mesa_id, status, total').neq('status', 'finalizado');
      // Buscar produtos do cardápio
      const { data: prodsData } = await supabase.from('produtos').select('*').eq('ativo', true).order('categoria', { ascending: true });
      // Buscar itens prontos recentemente (últimos 15 minutos) para notificação
      const now = new Date();
      const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      if (mesasData) setMesas(mesasData);
      if (pedidosData) {
        setPedidos(pedidosData);
        // Buscar itens de todos os pedidos ativos
        const activeIds = pedidosData.map(p => p.id);
        if (activeIds.length > 0) {
          const { data: allItens } = await supabase.from('itens_pedido')
            .select('*, produtos(nome)')
            .in('pedido_id', activeIds);
          if (allItens) setItensPedido(allItens);
        } else {
          setItensPedido([]);
        }
      }
      if (prodsData) setProdutos(prodsData);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update selected mesa when mesas array updates
  useEffect(() => {
    if (selectedMesa) {
      const updated = mesas.find(m => m.id === selectedMesa.id);
      if (updated) setSelectedMesa(updated);
    }
  }, [mesas]);

  const [monitoringActive, setMonitoringActive] = useState(() => {
    return localStorage.getItem('garcom_monitoring_active') === 'true';
  });

  // Keep screen awake (only after manual activation)
  useEffect(() => {
    if (!monitoringActive) return;

    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLock !== null) wakeLock.release().catch(console.error);
    };
  }, [monitoringActive]);

  // ALARM SYSTEM (Apenas visual e vibração por solicitação)
  useEffect(() => {
    if (!monitoringActive) return;

    const precisaGarcom = mesas.some(m => m.precisaGarcom || m.precisa_garcom);
    const novosItensProntos = itensPedido.filter(i => i.status === 'pronto' && !lastNotificationIds.has(i.id));
    const temPedidoPronto = novosItensProntos.length > 0;
    
    if (precisaGarcom || temPedidoPronto) {
      // Alarme sonoro
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.volume = 0.5;
      audio.play().catch(() => {});

      // Vibração do celular
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification("🚨 ATENÇÃO!", {
            body: precisaGarcom ? "Mesa chamando atendimento!" : "Pedido pronto no balcão!",
            icon: "/favicon.svg",
            vibrate: [500, 200, 500]
          } as any);
        } catch (err) {
          console.error("Notifications are not supported in this context.", err);
        }
      }


      // Registrar que estes itens já foram notificados
      if (temPedidoPronto) {
        const newIds = new Set(lastNotificationIds);
        novosItensProntos.forEach(i => newIds.add(i.id));
        setLastNotificationIds(newIds);
      }
    }
  }, [mesas, itensPedido, monitoringActive]);

  const startMonitoring = async () => {
    // Salvar no localStorage ANTES de pedir permissão, pois o prompt pode recarregar a página
    localStorage.setItem('garcom_monitoring_active', 'true');
    setMonitoringActive(true);
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch (e) {
        // Ignorar erros de permissão silenciosamente
      }
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'livre') return 'var(--success-color)';
    if (status === 'aguardando conta') return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  const handleEntregarPedido = async (itemId: string) => {
    await supabase.from('itens_pedido').update({ 
      status: 'entregue'
    }).eq('id', itemId);
    fetchData();
  };


  const handleExcluirItem = async (itemId: string, item: any) => {
    if(!confirm(`🚨 TEM CERTEZA? \n\nVocê deseja excluir o item:\n"${item.produtos?.nome}"?`)) return;

    // 1. Excluir o item

    const { error: deleteError } = await supabase.from('itens_pedido').delete().eq('id', itemId);
    if (deleteError) {
      alert("Erro ao excluir item.");
      return;
    }

    // 2. Atualizar o total do pedido no banco
    const { data: currentPedido } = await supabase.from('pedidos').select('total').eq('id', item.pedido_id).single();
    if (currentPedido) {
      const novoTotal = Math.max(0, Number(currentPedido.total) - (Number(item.preco_unitario) * item.quantidade));
      await supabase.from('pedidos').update({ total: novoTotal }).eq('id', item.pedido_id);
    }

    fetchData();
  };


  const handleAbrirMesa = async (mesaId: string) => {
    // Limpeza de segurança: Garante que pedidos antigos não finalizados desta mesa sejam encerrados
    // para não "vazarem" para a nova sessão de uso.
    await supabase
      .from('pedidos')
      .update({ status: 'finalizado' })
      .eq('mesa_id', mesaId)
      .neq('status', 'finalizado');

    await supabase.from('mesas').update({ status: 'ocupada' }).eq('id', mesaId);
    fetchData();
  };

  const handleLiberarMesa = async (mesaId: string) => {
    if (!confirm("Deseja realmente liberar esta mesa vazia?")) return;
    await supabase.from('mesas').update({ status: 'livre', precisa_garcom: false }).eq('id', mesaId);
    setSelectedMesa(null);
    fetchData();
  };


  const handleAtenderChamado = async (mesaId: string) => {
    await supabase.from('mesas').update({ precisa_garcom: false }).eq('id', mesaId);
    fetchData();
  };

  const handlePedirConta = async (mesaId: string) => {
    const mesaItens = itensPedido.filter(i => {
       const p = pedidos.find(ped => ped.id === i.pedido_id);
       return p && p.mesa_id === mesaId;
    });

    const temPendencias = mesaItens.some(i => i.status !== 'entregue' && i.status !== 'finalizado');
    if (temPendencias) {
      alert("Não é possível pedir a conta enquanto houver itens em preparo ou aguardando entrega!");
      return;
    }

    if(!confirm("Enviar solicitação de fechamento para o caixa?")) return;
    await supabase.from('mesas').update({ status: 'aguardando conta' }).eq('id', mesaId);
    fetchData();
    setSelectedMesa(null);
  };

  const handleTransferMesa = async () => {
    if (!targetMesaId || !selectedMesa) return;
    
    if(!confirm("Confirmar transferência de mesa?")) return;

    // 1. Move all non-finalized orders
    await supabase.from('pedidos')
      .update({ mesa_id: targetMesaId })
      .eq('mesa_id', selectedMesa.id)
      .neq('status', 'finalizado');
      
    // 2. Swap statuses
    await supabase.from('mesas').update({ status: 'livre', precisa_garcom: false }).eq('id', selectedMesa.id);
    await supabase.from('mesas').update({ status: selectedMesa.status, precisa_garcom: selectedMesa.precisa_garcom }).eq('id', targetMesaId);
    
    alert(`Comandas e status transferidos com sucesso!`);
    setShowTransferModal(false);
    setTargetMesaId('');
    setSelectedMesa(null);
    fetchData();
  };

  const currentCartTotal = items.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  const handleLaunchOrder = async () => {
    if (items.length === 0) return;
    setIsCheckingOut(true);
    const success = await checkout(selectedMesa.id, profile?.id);
    if (success) {
      alert("Pedido enviado para cozinha/bar!");
      setShowAddMenu(false);
      fetchData();
    } else {
      alert("Erro ao lançar pedido.");
    }
    setIsCheckingOut(false);
  };

  if (loading) return <div className="container text-center"><p>Carregando panorama...</p></div>;

  // VIEWS DA MESA ESPECÍFICA
  if (selectedMesa) {
    const mesaPedidos = pedidos.filter(p => p.mesa_id === selectedMesa.id);
    const totalGasto = mesaPedidos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);


    
    return (
      <div className="container" style={{ paddingBottom: '10rem' }}>
         <OwnerViewBanner panelName="Garçom" />
         <header className="d-flex justify-between items-center mb-6">
           <button onClick={() => { setSelectedMesa(null); setShowAddMenu(false); clearCart(); }} className="btn-outline" style={{ display: 'inline', width: 'auto', padding: '0.4rem 0.8rem' }}>&larr; Voltar</button>
           <h2 className="page-title" style={{ margin: 0, border: 'none' }}>Mesa {selectedMesa.numero}</h2>
           <span style={{ fontSize: '0.8rem', padding: '4px 12px', borderRadius: '12px', background: `${getStatusColor(selectedMesa.status)}33`, color: getStatusColor(selectedMesa.status), fontWeight: 'bold', textTransform: 'uppercase' }}>
             {selectedMesa.status}
           </span>
         </header>

         {selectedMesa.status === 'livre' ? (
           <div className="card text-center" style={{ padding: '3rem 1rem' }}>
             <h3 className="mb-4">Mesa Livre</h3>
             <p className="text-muted mb-6">Os clientes chegaram?</p>
             <button className="btn-success" onClick={() => handleAbrirMesa(selectedMesa.id)} style={{ fontSize: '1.2rem', padding: '1rem' }}>Abrir Mesa Agora</button>
           </div>
         ) : (
           <>
            {/* Modal de Transferência */}
            {showTransferModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <div className="card w-100 animate-fade-in" style={{ padding: '2rem', border: '1px solid var(--warning-color)', maxWidth: '400px' }}>
                  <h4 className="mb-4 text-warning">Transferir para qual mesa?</h4>
                  <select 
                    value={targetMesaId} 
                    onChange={(e) => setTargetMesaId(e.target.value)}
                    style={{ width: '100%', padding: '1rem', backgroundColor: '#000', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '1.1rem' }}
                  >
                    <option value="">Selecione uma Mesa Livre...</option>
                    {mesas.filter(m => m.status === 'livre').map(m => (
                      <option key={m.id} value={m.id}>Mesa {m.numero}</option>
                    ))}
                  </select>
                  <div className="d-flex gap-3">
                    <button className="btn-outline" onClick={() => setShowTransferModal(false)} style={{ flex: 1, padding: '1rem' }}>Cancelar</button>
                    <button className="btn-warning" onClick={handleTransferMesa} disabled={!targetMesaId} style={{ flex: 1, padding: '1rem', fontWeight: 'bold' }}>Confirmar</button>
                  </div>
                </div>
              </div>
            )}

            {/* Lançamento de Pedidos */}
            <div className="d-flex justify-between items-center mb-4">
               <div>
                  <h3 style={{ margin: 0 }}>Comanda Atual</h3>
                  <div className="text-muted" style={{ fontSize: '0.9rem' }}>Total já pedido: R$ {(totalGasto || 0).toFixed(2).replace('.', ',')}</div>
               </div>
               <div className="d-flex gap-2">
                 <button className="btn-outline" onClick={() => setShowTransferModal(true)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                   ⇄ Transferir
                 </button>
                 <button className="btn-primary" onClick={() => setShowAddMenu(!showAddMenu)} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                   {showAddMenu ? 'Ver Comanda' : '✚ Lançar Produtos'}
                 </button>
               </div>
            </div>

            {showAddMenu ? (
              <div className="card" style={{ padding: '1rem 0' }}>
                 <h4 style={{ padding: '0 1rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>Cardápio Rápido</h4>
                 
                 {/* Carrinho Flutuante do Garçom */}
                 {items.length > 0 && (
                   <div style={{ padding: '1rem', borderBottom: '2px solid var(--border-color)', backgroundColor: 'rgba(212, 175, 55, 0.1)', marginBottom: '1rem' }}>
                     <h5 style={{ margin: '0 0 0.5rem 0' }}>Bandeja (A Lançar):</h5>
                     {items.map(it => (
                       <div key={it.id} className="d-flex justify-between items-center mb-2" style={{ fontSize: '0.9rem' }}>
                         <div className="d-flex items-center gap-2">
                           <button onClick={() => removeItem(it.id)} style={{ background: 'var(--danger-color)', color: 'white', border: 'none', width: '24px', height: '24px', borderRadius: '4px' }}>-</button>
                           <span>{it.quantidade}x</span>
                           <button onClick={() => addItem(it)} style={{ background: 'var(--success-color)', color: 'white', border: 'none', width: '24px', height: '24px', borderRadius: '4px' }}>+</button>
                         </div>
                         <div style={{ flex: 1, paddingLeft: '10px' }}>{it.nome}</div>
                         <div style={{ fontWeight: 'bold' }}>R$ {(it.preco * it.quantidade).toFixed(2)}</div>
                       </div>
                     ))}
                     <button className="btn-success mt-4" onClick={handleLaunchOrder} disabled={isCheckingOut}>
                       {isCheckingOut ? 'Enviando...' : `Confirmar Lançamento (R$ ${currentCartTotal.toFixed(2)})`}
                     </button>
                   </div>
                 )}

                 {/* Filtro de Categoria e Lista de Produtos */}
                 <div style={{ padding: '0 1rem', marginBottom: '1rem' }}>
                   <select 
                     value={activeCategory} 
                     onChange={(e) => setActiveCategory(e.target.value)}
                     style={{ width: '100%', padding: '0.8rem', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '1rem' }}
                   >
                     <option value="TODOS">Todas as Categorias</option>
                     {Array.from(new Set(produtos.map(p => p.categoria.toUpperCase()))).map(cat => (
                       <option key={cat as string} value={cat as string}>{cat}</option>
                     ))}
                   </select>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', padding: '0 1rem', maxHeight: '50vh', overflowY: 'auto' }}>
                   {produtos
                     .filter(p => activeCategory === 'TODOS' || p.categoria.toUpperCase() === activeCategory)
                     .map(p => (
                       <div key={p.id} onClick={() => p.estoque > 0 && addItem(p)} className="card text-center" style={{ padding: '1rem 0.5rem', cursor: p.estoque > 0 ? 'pointer' : 'not-allowed', opacity: p.estoque > 0 ? 1 : 0.5, border: '1px solid var(--border-color)', margin: 0 }}>
                         <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', lineHeight: 1.2 }}>{p.nome}</div>
                         <div style={{ color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>R$ {p.preco.toFixed(2)}</div>
                         {p.estoque <= 0 && <div style={{ color: 'var(--danger-color)', fontSize: '0.7rem', marginTop: '4px' }}>ESGOTADO</div>}
                       </div>
                   ))}
                 </div>
              </div>
            ) : (
              <>
                <div className="card d-flex flex-col gap-2 mb-6">
                  {mesaPedidos.length === 0 ? (
                    <p className="text-muted text-center" style={{ padding: '2rem 0' }}>Nenhum pedido lançado nesta mesa ainda.</p>
                  ) : (
                    mesaPedidos.map(pedido => (
                      <div key={pedido.id} className="d-flex flex-col gap-2" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', borderLeft: `3px solid ${pedido.status === 'entregue' ? 'var(--text-muted)' : 'var(--primary-color)'}` }}>
                        <div className="d-flex justify-between items-center">
                          <div>
                            <h4 style={{ margin: 0 }}>Pedido {pedido.id.split('-')[0]}</h4>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>STATUS: {pedido.status}</span>
                          </div>
                          <div style={{ fontWeight: 700 }}>R$ {(Number(pedido.total) || 0).toFixed(2)}</div>

                        </div>
                        
                        <div className="d-flex flex-col gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                           {itensPedido.filter(i => i.pedido_id === pedido.id).map(item => (
                             <div key={item.id} className="d-flex justify-between items-center" style={{ fontSize: '1.1rem', padding: '0.8rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{item.quantidade}x {item.produtos?.nome}</span>
                                {item.status === 'pendente' && (
                                   <button onClick={() => handleExcluirItem(item.id, item)} style={{ background: 'rgba(220, 53, 69, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.6rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                      <Trash2 size={14} /> Apagar
                                   </button>
                                )}
                             </div>
                           ))}
                        </div>

                      </div>
                    ))

                  )}
                </div>

                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'var(--surface-color)', borderTop: '1px solid var(--border-color)', zIndex: 100 }}>
                  {mesaPedidos.length === 0 ? (
                    <button className="btn-danger" style={{ fontSize: '1.2rem', padding: '1rem', color: '#fff', fontWeight: 'bold' }} onClick={() => handleLiberarMesa(selectedMesa.id)}>
                       Liberar Mesa (Vazia)
                    </button>
                  ) : (
                    <button className="btn-warning" style={{ fontSize: '1.2rem', padding: '1rem', color: '#fff', fontWeight: 'bold' }} onClick={() => handlePedirConta(selectedMesa.id)} disabled={selectedMesa.status === 'aguardando conta'}>
                       {selectedMesa.status === 'aguardando conta' ? 'Fechamento Solicitado...' : 'Solicitar Fechamento da Mesa'}
                    </button>
                  )}
                </div>

              </>
            )}
           </>
         )}
      </div>
    );
  }

  // VISÃO GERAL DE MESAS
  const countLivre = mesas.filter(m => m.status === 'livre').length;
  const countOcupada = mesas.filter(m => m.status !== 'livre').length;

  return (

    <div className="container animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <OwnerViewBanner panelName="Garçom" />
      <header className="d-flex justify-between items-center" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0, border: 'none' }}>Painel do Garçom</h2>
        </div>
        <div className="d-flex items-center gap-4">
          <div className="d-flex gap-2 text-muted" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--success-color)' }}>Livre ({countLivre})</span>
            <span style={{ color: 'var(--danger-color)' }}>Ocupada ({countOcupada})</span>
          </div>

          <button 
            onClick={() => signOut()} 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--danger-color)',
              background: 'none',
              border: 'none',
              padding: '0.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {!monitoringActive && (
        <div className="card mb-8" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', border: '1px solid var(--primary-color)', textAlign: 'center' }}>
          <h4 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Sistema de Alertas Desativado</h4>
          <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Para vibrar e tocar som no celular ao receber chamados, ative abaixo:</p>
          <button onClick={startMonitoring} className="btn-primary" style={{ width: 'auto', padding: '0.8rem 2rem' }}>
            🔔 Ativar Alarmes e Som
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {mesas.map(mesa => {
          const mesaPedidos = pedidos.filter(p => p.mesa_id === mesa.id);
          const hasProntos = mesaPedidos.some(p => p.status === 'pronto');

          return (
            <div key={mesa.id} onClick={() => setSelectedMesa(mesa)} className="card text-center hover-surface" style={{ cursor: 'pointer', borderTop: `4px solid ${getStatusColor(mesa.status)}`, position: 'relative', padding: '1.5rem 1rem' }}>
              <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0', color: 'var(--text-main)' }}>{mesa.numero}</h2>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: getStatusColor(mesa.status), fontWeight: 'bold', letterSpacing: '1px' }}>{mesa.status}</span>
              
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {mesaPedidos.length} Pedidos
              </div>
              
              {mesa.precisa_garcom && (
                <div className="animate-fade-in" style={{ marginTop: '1rem' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAtenderChamado(mesa.id); }} 
                    style={{ background: 'var(--danger-color)', color: 'white', padding: '0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', width: '100%', animation: 'pulse 1s infinite' }}
                  >
                    🔔 ATENDER CHAMADO
                  </button>
                </div>
              )}
              
              {hasProntos && (
                <div className="animate-fade-in" style={{ position: 'absolute', top: -5, right: -5, backgroundColor: 'var(--success-color)', color: 'white', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', animation: 'pulse 2s infinite' }}>!</div>
              )}
            </div>
          )
        })}
      </div>

      <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--primary-color)' }}>Prontos na Cozinha/Bar</h3>
      <div className="d-flex flex-col gap-2">
        {itensPedido.filter(i => i.status === 'pronto').length === 0 ? (
          <p className="text-muted card text-center">Nenhum item pronto no balcão.</p>
        ) : (
          itensPedido.filter(i => i.status === 'pronto').map(item => {
             const mesa = mesas.find(m => m.id === (pedidos.find(p => p.id === item.pedido_id)?.mesa_id));
             return (
              <div key={item.id} className="card d-flex justify-between items-center" style={{ padding: '1rem', borderLeft: '4px solid var(--success-color)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.2rem' }}>Mesa {mesa?.numero || '?'}</h4>
                  <div style={{ fontWeight: 800, color: 'var(--primary-color)', fontSize: '1rem' }}>{item.quantidade}x {item.produtos?.nome}</div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>ID {item.id.split('-')[0]}</span>
                </div>
                <button className="btn-success" style={{ width: 'auto', padding: '0.6rem 1rem', fontSize: '0.9rem', fontWeight: 'bold' }} onClick={() => handleEntregarPedido(item.id)}>Entregue ✓</button>
              </div>
             )
          })
        )}
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <Link to="/" className="btn-outline" style={{ display: 'inline-block', width: 'auto' }}>Sair do Painel</Link>
      </div>
    </div>
  );
};
