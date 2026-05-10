import { useState, useEffect, useMemo } from 'react';

import { supabase } from '../../lib/supabase';

const formatCurrency = (val: number | string) => {

  const num = typeof val === "string" ? parseFloat(val) : val;

  if (isNaN(num)) return "0,00";

  return new Intl.NumberFormat("pt-BR", {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  }).format(num);

};

// Helper mock array in case DB isn't seeded yet

const MOCK_PRODUCTS = [

  { id: '1', nome: 'Frango a Passarinho', categoria: 'PETISCO', preco: 29.90, estoque: 99 },

  { id: '2', nome: 'Batata Turbinada', categoria: 'PETISCO', preco: 29.90, estoque: 99 },

  { id: '3', nome: 'Heineken Long Neck', categoria: 'BEBIDAS', preco: 12.00, estoque: 99 },

  { id: '4', nome: 'Caipirinha Cachaça', categoria: 'COQUETÉIS', preco: 15.00, estoque: 99 },

  { id: '5', nome: 'Johnnie Walker', categoria: 'DESTILADOS (DOSE)', preco: 15.00, estoque: 99 }

];

export const Menu = () => {

  const [products, setProducts] = useState(MOCK_PRODUCTS);

  const [activeTab, setActiveTab] = useState('PETISCO');

  const [searchTerm, setSearchTerm] = useState('');

  const fetchProducts = async () => {

    const { data } = await supabase.from('produtos').select('*').eq('ativo', true).order('nome', { ascending: true });

    if (data && data.length > 0) {

      setProducts(data);

    }

  };

  useEffect(() => {

    fetchProducts();

    // Polling de 10 segundos para garantir preços atualizados

    const interval = setInterval(fetchProducts, 10000);

    // Inscrição em tempo real para mudanças nos produtos

    const channel = supabase

      .channel('menu-products-realtime')

      .on('postgres_changes', 

        { event: '*', schema: 'public', table: 'produtos' }, 

        () => {

          fetchProducts();

        }

      )

      .subscribe();

    return () => {

      clearInterval(interval);

      supabase.removeChannel(channel);

    };

  }, []);

  const categories = Array.from(new Set(products.map(p => p.categoria.toUpperCase())));

  const filtered = useMemo(() => {

    const normalizeStr = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const searchLower = normalizeStr(searchTerm);

    return products.filter(p => {

      const matchesSearch = normalizeStr(p.nome).includes(searchLower) || normalizeStr(p.categoria).includes(searchLower);

      const matchesCategory = p.categoria.toUpperCase() === activeTab;

      return searchTerm ? matchesSearch : matchesCategory;

    });

  }, [products, searchTerm, activeTab]);

  // Garantir que a aba ativa existe nas categorias se elas mudarem

  useEffect(() => {

    if (categories.length > 0 && !categories.includes(activeTab)) {

      setActiveTab(categories[0]);

    }

  }, [categories]);

  return (

    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>

      {/* Barra de Pesquisa Global */}

      <div style={{ marginBottom: '1rem' }}>

        <input 

          type="text" 

          placeholder="🔍 O que você procura?" 

          value={searchTerm} 

          onChange={(e) => setSearchTerm(e.target.value)}

          style={{

            width: '100%',

            padding: '0.8rem 1.2rem',

            background: 'var(--surface-color)',

            border: '1px solid var(--border-color)',

            borderRadius: '12px',

            color: '#fff',

            fontSize: '0.9rem',

            outline: 'none',

            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'

          }}

        />

      </div>

      {/* Categoria Tabs - Estilo Screenshot (Arredondado) */}

      <div className="no-scrollbar" style={{ 

        display: 'flex', 

        gap: '0.6rem', 

        overflowX: 'auto', 

        WebkitOverflowScrolling: 'touch', 

        marginBottom: '1.2rem', 

        padding: '0.5rem 0',

        position: 'sticky',

        top: '70px',

        zIndex: 10,

        margin: '0 -0.8rem 1rem -0.8rem',

        paddingLeft: '0.8rem'

      }}>

        {categories.map(cat => (

          <button 

            key={cat} 

            onClick={() => setActiveTab(cat)}

            style={{

              padding: '0.6rem 1.2rem', 

              borderRadius: '16px', 

              whiteSpace: 'nowrap', 

              textTransform: 'uppercase',

              fontSize: '0.75rem',

              letterSpacing: '0.5px',

              backgroundColor: activeTab === cat ? '#facc15' : 'rgba(255,255,255,0.1)',

              color: activeTab === cat ? '#000' : '#fff',

              fontWeight: 800,

              boxShadow: activeTab === cat ? '0 4px 12px rgba(250, 204, 21, 0.3)' : 'none',

              transition: 'all 0.2s'

            }}

          >

            {cat}

          </button>

        ))}

      </div>

      {/* Grid de Itens (Cards mais compactos para mobile) */}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

        {filtered.map(product => (

          <div key={product.id} className="card" style={{ 

            padding: '1rem', 

            background: 'var(--surface-color)',

            border: '1px solid var(--border-color)',

            borderRadius: '16px',

            position: 'relative',

            overflow: 'hidden',

            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'

          }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

              <div style={{ flex: 1, paddingRight: '1rem' }}>

                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '2px', lineHeight: '1.2' }}>{product.nome}</h4>

                <div style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{product.categoria}</div>

              </div>

              <div style={{ textAlign: 'right', minWidth: 'fit-content' }}>

                <div style={{ 

                  color: 'var(--primary-color)', 

                  fontWeight: 900, 

                  fontSize: '1.1rem',

                  textShadow: '0 2px 10px rgba(0,0,0,0.3)'

                }}>

                  R$ {product.preco?.toFixed(2).replace('.', ',')}

                </div>

              </div>

            </div>

            {product.estoque <= 0 && (

              <div style={{ 

                marginTop: '8px', 

                color: 'var(--danger-color)', 

                fontSize: '0.6rem', 

                fontWeight: 900, 

                textTransform: 'uppercase',

                letterSpacing: '1px',

                background: 'rgba(239, 68, 68, 0.1)',

                padding: '2px 6px',

                borderRadius: '4px',

                display: 'inline-block'

              }}>

                Esgotado

              </div>

            )}

          </div>

        ))}

      </div>

    </div>

  );

};