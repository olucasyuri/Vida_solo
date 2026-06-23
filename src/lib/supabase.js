import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.warn('⚠️ Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

/*
=== SQL para criar as tabelas (execute no Supabase SQL Editor) ===

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receita','despesa')),
  color TEXT DEFAULT '#6C47FF',
  icon TEXT DEFAULT 'tag',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own categories" ON public.categories FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receita','despesa')),
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  status TEXT DEFAULT 'pago' CHECK (status IN ('pago','pendente','cancelado')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- Auto-create categories on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name) VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  INSERT INTO public.categories (user_id, name, type, color) VALUES
    (NEW.id, 'Salário', 'receita', '#10B981'),
    (NEW.id, 'Freelance', 'receita', '#6C47FF'),
    (NEW.id, 'Investimentos', 'receita', '#F59E0B'),
    (NEW.id, 'Outros (Receita)', 'receita', '#06B6D4'),
    (NEW.id, 'Alimentação', 'despesa', '#EF4444'),
    (NEW.id, 'Moradia', 'despesa', '#F97316'),
    (NEW.id, 'Transporte', 'despesa', '#8B5CF6'),
    (NEW.id, 'Saúde', 'despesa', '#EC4899'),
    (NEW.id, 'Educação', 'despesa', '#3B82F6'),
    (NEW.id, 'Lazer', 'despesa', '#14B8A6'),
    (NEW.id, 'Vestuário', 'despesa', '#F59E0B'),
    (NEW.id, 'Outros', 'despesa', '#6B7280');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
*/
