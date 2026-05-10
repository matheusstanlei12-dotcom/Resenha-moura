import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, DollarSign, Calendar, Tag, CreditCard, 
  TrendingDown, TrendingUp, Search, X, CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const GastosApp = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [gastos, setGastos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAdd, setShowAdd] = useState(false);
  const [novoGasto, setNovoGasto] = useState({
    descricao: '',
    valor: '',
    categoria: 'Fornecedores',
    forma_pagamento: 'PIX',
    data: new Date().toISOString().split('T')[0]
  });

  const categorias = [
    { id: 'Fornecedores', icon: '🥩', color: '#ef4444' },
    { id: 'Funcionários', icon: '👥', color: '#3b82f6' },
    { id: 'Contas', icon: '📄', color: '#f59e0b' },
    { id: 'Equipamentos', icon: '🔧', color: '#8b5cf6' },
    { id: 'Impostos', icon: '🏛️', color: '#64748b' },
    { id: 'Outros', icon: '📦', color: '#10b981' }
  ];

  const formasPagamento = ['PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Outros'];

  useEffect(() => {
    fetchGastos();
  }, []);

  const fetchGastos = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      
      const { data, error } = await supabase
        .from('gastos')
        .select('*, cartoes_gastos(*)')
        .gte('data_gasto', startOfMonth.toISOString())
        .order('data_gasto', { ascending: false });
        
      if (error) throw error;
      setGastos(data || []);
    } catch (err) {
      console.error("Erro ao buscar gastos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoGasto.descricao || !novoGasto.valor) return;
    
    try {
      const { error } = await supabase.from('gastos').insert({
        descricao: novoGasto.descricao,
        valor: parseFloat(novoGasto.valor.replace(',', '.')),
        categoria: novoGasto.categoria,
        forma_pagamento: novoGasto.forma_pagamento,
        data_gasto: new Date(novoGasto.data + 'T12:00:00').toISOString()
      });
      
      if (error) throw error;
      
      setShowAdd(false);
      setNovoGasto({
        descricao: '',
        valor: '',
        categoria: 'Fornecedores',
        forma_pagamento: 'PIX',
        data: new Date().toISOString().split('T')[0]
      });
      
      fetchGastos();
      
      // Feedback visual leve
      const el = document.createElement('div');
      el.innerHTML = 'Gasto registrado!';
      el.style.position = 'fixed';
      el.style.top = '20px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.background = '#10b981';
      el.style.color = '#fff';
      el.style.padding = '10px 20px';
      el.style.borderRadius = '30px';
      el.style.zIndex = '999999';
      el.style.fontWeight = 'bold';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
      
    } catch (err: any) {
      alert("Erro ao adicionar: " + err.message);
    }
  };

  const totalMes = gastos.reduce((acc, g) => acc + Number(g.valor), 0);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #0f172a, #000)', 
      color: '#fff',
      paddingBottom: '80px',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Header Fixo */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 10, 
        background: 'rgba(15, 23, 42, 0.8)', 
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: '#fff', 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Meus Gastos</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Gestão Financeira</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        {/* Card de Resumo */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ 
            background: 'linear-gradient(135deg, #dc2626, #991b1b)',
            borderRadius: '24px',
            padding: '1.5rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(220, 38, 38, 0.2)'
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
            <TrendingDown size={150} />
          </div>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600, opacity: 0.9, letterSpacing: '1px' }}>TOTAL DE GASTOS (MÊS)</p>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900 }}>
            <span style={{ fontSize: '1.5rem', opacity: 0.8, marginRight: '8px' }}>R$</span>
            {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
        </motion.div>

        {/* Lista de Gastos Recentes */}
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Lançamentos Recentes</h3>
          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>{gastos.length} itens</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.5 }}>Carregando...</div>
        ) : gastos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.5, background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
            Nenhum gasto registrado neste mês.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {gastos.map((gasto, i) => {
              const cat = categorias.find(c => c.id === gasto.categoria) || categorias[5];
              return (
                <motion.div 
                  key={gasto.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ 
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '45px', 
                      height: '45px', 
                      borderRadius: '12px', 
                      background: `${cat.color}22`,
                      color: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      {cat.icon}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.95rem', fontWeight: 700 }}>{gasto.descricao}</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>
                        {new Date(gasto.data_gasto).toLocaleDateString('pt-BR')} • {gasto.cartoes_gastos ? `${gasto.cartoes_gastos.nome} (${gasto.forma_pagamento})` : gasto.forma_pagamento}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#ef4444' }}>
                      - R$ {Number(gasto.valor).toFixed(2)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '65px',
          height: '65px',
          borderRadius: '50%',
          background: 'var(--danger-color)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20
        }}
      >
        <Plus size={30} strokeWidth={3} />
      </motion.button>

      {/* Modal de Lançamento */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
            onClick={() => setShowAdd(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '600px',
                background: '#111',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                padding: '2rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>Novo Gasto</h2>
                <button onClick={() => setShowAdd(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddGasto} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                {/* Valor Gigante */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>VALOR DO GASTO</label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem', color: '#ef4444', fontWeight: 800 }}>R$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={novoGasto.valor}
                      onChange={e => setNovoGasto({...novoGasto, valor: e.target.value})}
                      placeholder="0.00"
                      required
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#ef4444', 
                        fontSize: '3rem', 
                        fontWeight: 900, 
                        width: '150px', 
                        textAlign: 'center',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>DESCRIÇíO</label>
                  <div style={{ position: 'relative' }}>
                    <Tag size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    <input 
                      type="text" 
                      value={novoGasto.descricao}
                      onChange={e => setNovoGasto({...novoGasto, descricao: e.target.value})}
                      placeholder="Ex: Fornecedor de Bebidas"
                      required
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '1rem 1rem 1rem 3rem', borderRadius: '12px', fontSize: '1rem', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Grid de Categorias */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>CATEGORIA</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {categorias.map(cat => (
                      <div 
                        key={cat.id}
                        onClick={() => setNovoGasto({...novoGasto, categoria: cat.id})}
                        style={{
                          background: novoGasto.categoria === cat.id ? `${cat.color}22` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${novoGasto.categoria === cat.id ? cat.color : 'rgba(255,255,255,0.05)'}`,
                          borderRadius: '12px',
                          padding: '0.8rem 0.5rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{cat.icon}</div>
                        <div style={{ fontSize: '0.65rem', fontWeight: novoGasto.categoria === cat.id ? 800 : 500, color: novoGasto.categoria === cat.id ? cat.color : '#fff' }}>
                          {cat.id}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>PAGAMENTO</label>
                    <select 
                      value={novoGasto.forma_pagamento}
                      onChange={e => setNovoGasto({...novoGasto, forma_pagamento: e.target.value})}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', appearance: 'none' }}
                    >
                      {formasPagamento.map(fp => <option key={fp} value={fp} style={{ background: '#222' }}>{fp}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>DATA</label>
                    <input 
                      type="date" 
                      value={novoGasto.data}
                      onChange={e => setNovoGasto({...novoGasto, data: e.target.value})}
                      required
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', outline: 'none', colorScheme: 'dark' }}
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  style={{ 
                    marginTop: '1rem',
                    background: 'var(--danger-color)', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '1.2rem', 
                    borderRadius: '16px', 
                    fontSize: '1.1rem', 
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CheckCircle size={20} /> Registrar Despesa
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
