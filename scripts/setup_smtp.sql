
-- Cria tabela de configurações do sistema (Chave-Valor)
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilita RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Política: Apenas leitura pública (para o servidor pegar as configs, ou admins lerem)
-- Na prática, para segurança máxima, o ideal é que apenas o Service Role leia a senha, 
-- mas para este app permitir edição no front, vamos permitir leitura/escrita para autenticados.
-- Num cenário real de produção, a senha nunca deveria descer para o frontend, apenas subir.
-- Mas para atender o requisito "editável na tela do admin":

DROP POLICY IF EXISTS "Enable read access for all users" ON app_config;
CREATE POLICY "Enable read access for all users" ON app_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert/update for authenticated users only" ON app_config;
CREATE POLICY "Enable insert/update for authenticated users only" ON app_config FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Inserir Credenciais Iniciais (Fornecidas pelo usuário)
INSERT INTO app_config (key, value) VALUES 
('smtp_email', 'viniciussouzaalves@gmail.com'),
('smtp_password', 'udnt aino nasv wtsr'),
('sender_name', 'Peaky Blinders Barbearia')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
