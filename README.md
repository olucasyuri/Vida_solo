# 💰 Vida Financeira

App de finanças pessoais moderno, elegante e PWA — inspirado no Nubank, Organizze e Mobills.

## ✨ Funcionalidades

- 📊 Dashboard com saldo, receitas, despesas e gráficos
- ➕ Cadastro de receitas e despesas
- 🏷️ Categorias personalizáveis com cores
- ⏰ Controle de contas a pagar (pendentes)
- ✅ Histórico de contas pagas
- 📈 Relatórios mensais com gráficos de área, barras e pizza
- 🔍 Filtros por mês, categoria, tipo e status
- 🔐 Autenticação de usuários (Supabase Auth)
- 📱 PWA — instalável no celular e desktop
- 🌙 Design dark premium

## 🚀 Como configurar

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o SQL que está em `/src/lib/supabase.js` (nos comentários)
3. Copie sua **URL** e **anon key** do painel do projeto

### 2. Variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com seus dados do Supabase
```

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

### 4. Build para produção

```bash
npm run build
# Arquivos em /dist — faça deploy na Vercel, Netlify, etc.
```

## 📱 Instalar como PWA

**Android:** Menu do Chrome → "Adicionar à tela inicial"  
**iPhone:** Compartilhar → "Adicionar à Tela de Início"  
**Desktop:** Ícone na barra de endereço do Chrome

## 🗄️ Estrutura Supabase

- `profiles` — dados do usuário
- `categories` — categorias (por usuário, com RLS)
- `transactions` — lançamentos (por usuário, com RLS)

Todas as tabelas têm **Row Level Security** ativado — cada usuário vê apenas seus próprios dados.

## 🛠 Stack

- React 18 + Vite
- Supabase (Auth + Database)
- Recharts (gráficos)
- Lucide React (ícones)
- date-fns (datas)
- vite-plugin-pwa (PWA)
