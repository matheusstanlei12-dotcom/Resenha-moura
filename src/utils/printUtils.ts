export const silentPrint = (htmlContent: string) => {
  let printArea = document.getElementById('global-print-area');
  
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'global-print-area';
    document.body.appendChild(printArea);

    const style = document.createElement('style');
    style.innerHTML = `
      @media screen {
        #global-print-area { display: none !important; }
      }
      @media print {
        @page { margin: 0; }
        body * { visibility: hidden; }
        #global-print-area, #global-print-area * { visibility: visible; }
        #global-print-area { 
          position: absolute; left: 0; top: 0; width: 80mm; 
          font-family: 'Courier New', Courier, monospace; color: #000; background: #fff;
          font-size: 14px; padding: 5mm; 
        }
        #global-print-area h1, #global-print-area h2, #global-print-area h3, #global-print-area h4 { margin: 0 0 5px 0; padding: 0; text-align: center; font-weight: bold; }
        #global-print-area h1 { font-size: 20px; }
        #global-print-area h2 { font-size: 18px; }
        #global-print-area .divider { border-top: 1px dashed #000; margin: 8px 0; }
        #global-print-area .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
        #global-print-area .text-center { text-align: center; }
        #global-print-area .text-right { text-align: right; }
        #global-print-area .bold { font-weight: bold; }
        #global-print-area .mb-5 { margin-bottom: 5px; }
        #global-print-area .mb-10 { margin-bottom: 10px; }
        #global-print-area .table { width: 100%; border-collapse: collapse; }
        #global-print-area .table th, #global-print-area .table td { text-align: left; vertical-align: top; padding: 2px 0; }
        #global-print-area .table th.right, #global-print-area .table td.right { text-align: right; }
        #global-print-area .item-row { display: flex; margin-bottom: 4px; font-weight: bold; font-size: 16px; }
        #global-print-area .item-qtd { min-width: 30px; }
      }
    `;
    document.head.appendChild(style);
  }

  printArea.innerHTML = htmlContent;

  setTimeout(() => {
    window.print();
  }, 100);
};

export const printPetiscoTicket = (mesa: string, garcom: string, pedidosIds: string[], itens: Array<{ qtd: number, nome: string }>) => {
  const date = new Date().toLocaleDateString('pt-BR');
  const time = new Date().toLocaleTimeString('pt-BR');
  const pIds = pedidosIds.map(p => p.split('-')[0]).join(', '); // Pegar primeira parte do UUID se for muito longo

  const html = `
    <h1>COZINHA / BAR</h1>
    <h2>MESA ${mesa}</h2>
    <div class="divider"></div>
    <div class="flex-between" style="font-size: 12px;">
      <span>Data: ${date} ${time}</span>
    </div>
    <div class="flex-between mb-10" style="font-size: 12px;">
      <span>Garçom: ${garcom}</span>
    </div>
    <div class="divider"></div>
    
    <div class="mb-10">
      ${itens.map(item => `
        <div class="item-row">
          <div class="item-qtd">${item.qtd}x</div>
          <div>${item.nome}</div>
        </div>
      `).join('')}
    </div>
    
    <div class="divider"></div>
    <div class="text-center" style="font-size: 10px;">ID do Pedido: ${pIds}</div>
  `;

  silentPrint(html);
};

export const printFechamentoZ = (
  osNumber: string,
  operador: string,
  turnoInicio: string,
  paymentTotals: { pix: number; dinheiro: number; debito: number; credito: number },
  pedidosPorMetodo: { pix: any[]; dinheiro: any[]; debito: any[]; credito: any[] },
  totalVendas: number,
  vendasFinalizadasCount: number,
  ticketMedio: number,
  movimentacoes: Array<{tipo: string, motivo: string, hora: string, valor: number}>,
  fundoTroco: number,
  totalSangrias: number,
  totalSuprimentos: number,
  dinheiroEsperado: number,
  dinheiroDeclarado: number,
  diferenca: number
) => {
  
  const date = new Date().toLocaleDateString('pt-BR');
  const time = new Date().toLocaleTimeString('pt-BR');
  const inicioTime = new Date(turnoInicio).toLocaleTimeString('pt-BR');

  const status = diferenca === 0 ? 'CONFERE ✓' : diferenca > 0 ? `SOBRA: R$ ${diferenca.toFixed(2)}` : `QUEBRA: R$ ${Math.abs(diferenca).toFixed(2)}`;

  const html = `
    <h2>RESENHA DO MOURA</h2>
    <div class="text-center mb-5" style="font-size:10px;">CNPJ: 42.418.207/0001-20</div>
    <h3>LEITURA-Z / FECHAMENTO</h3>
    <div class="text-center bold mb-5">O.S. Nº: ${osNumber || '---'}</div>
    
    <div class="divider"></div>
    <div class="flex-between" style="font-size:11px;">
      <span>Data: ${date}</span>
      <span>Hora: ${time}</span>
    </div>
    <div class="mb-5" style="font-size:11px;">
      <div>Início Turno: ${inicioTime}</div>
      <div>Operador: ${operador.toUpperCase()}</div>
    </div>
    <div class="divider"></div>
    
    <h4 class="text-left">VENDAS POR MODALIDADE</h4>
    <table class="table" style="font-size: 12px; margin-bottom: 10px;">
      <tr>
        <td>DINHEIRO (${pedidosPorMetodo.dinheiro.length}):</td>
        <td class="right">R$ ${paymentTotals.dinheiro.toFixed(2)}</td>
      </tr>
      <tr>
        <td>PIX (${pedidosPorMetodo.pix.length}):</td>
        <td class="right">R$ ${paymentTotals.pix.toFixed(2)}</td>
      </tr>
      <tr>
        <td>DÉBITO (${pedidosPorMetodo.debito.length}):</td>
        <td class="right">R$ ${paymentTotals.debito.toFixed(2)}</td>
      </tr>
      <tr>
        <td>CRÉDITO (${pedidosPorMetodo.credito.length}):</td>
        <td class="right">R$ ${paymentTotals.credito.toFixed(2)}</td>
      </tr>
    </table>
    
    <div class="divider"></div>
    <div class="flex-between bold" style="font-size: 14px;">
      <span>TOTAL GERAL:</span>
      <span>R$ ${totalVendas.toFixed(2)}</span>
    </div>
    <div class="flex-between mb-10" style="font-size: 11px;">
      <span>Qtd Vendas: ${vendasFinalizadasCount}</span>
      <span>Tkt Médio: R$ ${ticketMedio.toFixed(2)}</span>
    </div>

    ${movimentacoes.length > 0 ? `
      <div class="divider"></div>
      <h4 class="text-left">MOVIMENTAÇÕES</h4>
      <div style="font-size: 11px; margin-bottom: 10px;">
        ${movimentacoes.map(m => `
          <div class="flex-between">
            <span>[${m.hora}] ${m.tipo.toUpperCase()}</span>
            <span>R$ ${m.valor.toFixed(2)}</span>
          </div>
          <div style="padding-bottom: 4px; opacity: 0.8; font-size: 10px;">- ${m.motivo}</div>
        `).join('')}
      </div>
    ` : ''}

    <div class="divider"></div>
    <h4 class="text-left">CONFERÊNCIA DE GAVETA</h4>
    <table class="table" style="font-size: 11px; margin-bottom: 5px;">
      <tr>
        <td>Fundo de Troco:</td>
        <td class="right">R$ ${fundoTroco.toFixed(2)}</td>
      </tr>
      <tr>
        <td>(+) Dinheiro Vendas:</td>
        <td class="right">R$ ${paymentTotals.dinheiro.toFixed(2)}</td>
      </tr>
      ${totalSuprimentos > 0 ? `
      <tr>
        <td>(+) Suprimentos:</td>
        <td class="right">R$ ${totalSuprimentos.toFixed(2)}</td>
      </tr>` : ''}
      ${totalSangrias > 0 ? `
      <tr>
        <td>(-) Sangrias:</td>
        <td class="right">R$ ${totalSangrias.toFixed(2)}</td>
      </tr>` : ''}
    </table>
    <div class="divider"></div>
    
    <div class="flex-between bold mb-5 text-right">
      <span>ESPERADO:</span>
      <span>R$ ${dinheiroEsperado.toFixed(2)}</span>
    </div>
    <div class="flex-between bold mb-10 text-right">
      <span>DECLARADO:</span>
      <span>R$ ${dinheiroDeclarado.toFixed(2)}</span>
    </div>

    <div class="divider"></div>
    <h3 class="text-center" style="margin-top: 10px;">${status}</h3>
    <div class="divider"></div>
    
    <div class="text-center" style="font-size: 10px; opacity: 0.8; margin-top: 20px;">
      Documento gerado automaticamente.<br/>
      Resenha do Moura
    </div>
    
    <!-- Espaço extra para cortar o papel corretamente -->
    <div style="height: 30px;"></div>
  `;

  silentPrint(html);
};

export const printContaMesa = (
  mesaNumero: string | null,
  itens: Array<{ nome: string; quantidade: number; preco: number }>,
  incluirTaxa: boolean
) => {
  const subtotal = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  const taxa = mesaNumero ? subtotal * 0.1 : 0;
  const total = subtotal + (mesaNumero && incluirTaxa ? taxa : 0);
  
  const date = new Date().toLocaleDateString('pt-BR');
  const time = new Date().toLocaleTimeString('pt-BR');

  const html = `
    <h2>RESENHA DO MOURA</h2>
    <div class="text-center" style="font-size:10px;">Gastronomia & Entretenimento</div>
    <div class="text-center mb-5" style="font-size:8px;">CNPJ: 42.418.207/0001-20</div>
    <div class="divider"></div>
    <div class="flex-between" style="font-size:11px;">
      <span>Data: ${date}</span>
      <span>Hora: ${time}</span>
    </div>
    <div class="bold mb-5" style="font-size: 14px; text-align: center;">
      ${mesaNumero ? `MESA: ${mesaNumero}` : 'VENDA DE BALCÃO'}
    </div>
    <div class="divider"></div>
    
    <table class="table" style="font-size: 11px;">
      <tr>
        <th style="width: 15%">QTD</th>
        <th style="width: 55%">ITEM</th>
        <th style="width: 30%" class="right">TOTAL</th>
      </tr>
      ${itens.map(item => `
        <tr>
          <td>${item.quantidade}x</td>
          <td>${item.nome.substring(0, 20)}</td>
          <td class="right">${(item.preco * item.quantidade).toFixed(2)}</td>
        </tr>
      `).join('')}
    </table>
    
    <div class="divider"></div>
    <table class="table" style="font-size: 11px;">
      <tr>
        <td>SUBTOTAL:</td>
        <td class="right">${subtotal.toFixed(2)}</td>
      </tr>
      ${mesaNumero && incluirTaxa && taxa > 0 ? `
      <tr>
        <td>TAXA SERV (10%):</td>
        <td class="right">${taxa.toFixed(2)}</td>
      </tr>
      ` : ''}
    </table>
    
    <div class="flex-between bold" style="font-size: 16px; margin-top: 5px;">
      <span>TOTAL:</span>
      <span>R$ ${total.toFixed(2)}</span>
    </div>
    
    <div class="divider"></div>
    <div class="text-center" style="font-size: 10px; margin-top: 15px;">
      Obrigado pela preferência!<br/>
      Volte sempre!
    </div>
    
    <!-- Espaço da guilhotina -->
    <div style="height: 30px;"></div>
  `;

  silentPrint(html);
};
