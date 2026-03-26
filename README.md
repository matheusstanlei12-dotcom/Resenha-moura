# Resenha Moura - Sistema de Gestão para Bares e Karaoke

Sistema completo de gestão para estabelecimentos de entretenimento, com foco em autoatendimento via QR Code, controle de produção (KDS), gestão de equipe e frente de caixa.

## 🚀 Funcionalidades Principal

- **📍 Autoatendimento (QR Code)**: Clientes podem abrir o cardápio, adicionar itens ao carrinho e realizar pedidos sem garçom.
- **🍳 Painel de Produção (KDS)**: Cozinha e Bar com controle individual de status por item (Pendente, Em Preparo, Pronto).
- **📋 Gestão de Equipe**: Controle de acesso por níveis (Dono, Admin, Garçom, Cozinha, Caixa).
- **💰 Frente de Caixa**: Fechamento de contas simplificado com múltiplas formas de pagamento.
- **📊 Dashboard do Dono**: Visão em tempo real de faturamento, lucro estimado e volume de pedidos.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite
- **Estilização**: CSS Vanilla (Design Premium/Dark Mode)
- **Backend/DB**: Supabase (Auth, Database, Edge Functions)
- **Estado**: Zustand (Carrinho)
- **Roteamento**: React Router DOM

## 📦 Como rodar o projeto

1. Clone o repositório:
   ```bash
   git clone https://github.com/matheusstanlei12-dotcom/Resenha-moura.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente no `.env`:
   ```env
   VITE_SUPABASE_URL=seu_url
   VITE_SUPABASE_ANON_KEY=sua_chave
   ```
4. Inicie o servidor:
   ```bash
   npm run dev
   ```

## 📄 Licença

Este projeto é de uso exclusivo para **Resenha Moura**.

---
*Aqui a resenha é de verdade!*
