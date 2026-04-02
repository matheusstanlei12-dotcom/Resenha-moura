import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

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

  useEffect(() => {
    supabase.from('produtos').select('*').eq('ativo', true)
      .then(({ data }) => {
        if (data && data.length > 0) setProducts(data);
      });
  }, []);

  const categories = Array.from(new Set(products.map(p => p.categoria.toUpperCase())));
  const filtered = products.filter(p => p.categoria.toUpperCase() === activeTab);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Categoria Tabs - Mobile Optimized Scroll */}
      <div className="no-scrollbar" style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        overflowX: 'auto', 
        WebkitOverflowScrolling: 'touch', 
        marginBottom: '1.5rem', 
        padding: '0.5rem 0',
        position: 'sticky',
        top: '65px',
        backgroundColor: 'rgba(18, 18, 18, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        margin: '0 -1.25rem 1.5rem -1.25rem',
        paddingLeft: '1.25rem',
        borderBottom: '1px solid rgba(212, 175, 55, 0.1)'
      }}>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveTab(cat)}
            style={{
              padding: '0.6rem 1.2rem', 
              borderRadius: '10px', 
              whiteSpace: 'nowrap', 
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '1px',
              backgroundColor: activeTab === cat ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)',
              color: activeTab === cat ? '#000' : 'var(--text-muted)',
              border: activeTab === cat ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.05)',
              fontWeight: 800,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de Itens Vertical */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map(product => (
          <div key={product.id} className="card" style={{ 
            padding: '1.25rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ flex: 1, paddingRight: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{product.nome}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                 <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{product.categoria}</span>
              </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                color: 'var(--primary-color)', 
                fontWeight: 900, 
                fontSize: '1.1rem',
                letterSpacing: '-0.5px'
              }}>
                R$ {product.preco.toFixed(2).replace('.', ',')}
              </div>
              {product.estoque <= 0 && (
                <div style={{ color: 'var(--danger-color)', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', marginTop: '4px' }}>
                  ESGOTADO
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
