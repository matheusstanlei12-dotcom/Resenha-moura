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
      <div className="no-scrollbar" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
        {categories.map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveTab(cat)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '20px', whiteSpace: 'nowrap', textTransform: 'capitalize',
              backgroundColor: activeTab === cat ? 'var(--primary-color)' : 'var(--surface-color)',
              color: activeTab === cat ? '#000' : 'var(--text-main)',
              fontWeight: activeTab === cat ? 700 : 400
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="d-flex flex-col gap-3">
        {filtered.map(product => (
          <div key={product.id} className="card d-flex justify-between items-center" style={{ padding: '1rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{product.nome}</h4>
              <p style={{ color: 'var(--primary-color)', fontWeight: 'bold', margin: '0.25rem 0' }}>
                R$ {product.preco.toFixed(2).replace('.', ',')}
              </p>
              {product.estoque <= 0 && <span style={{ color: 'var(--danger-color)', fontSize: '0.8rem', fontWeight: 'bold' }}>ESGOTADO</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
