
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.1";

// Declaração para evitar erros de lint no editor
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// [FIX] HARDCODED CREDENTIALS (DEBUGGING)
// Usando as chaves fornecidas para garantir que a função tenha acesso ao banco
// Em produção final, recomenda-se mover isso para 'Supabase Secrets'
const SUPABASE_URL = 'https://zsedlaigklqyrqviitdl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZWRsYWlna2xxeXJxdmlpdGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQzMTAxOSwiZXhwIjoyMDgyMDA3MDE5fQ.l0yOhROqKb0EBD1yRIuajG4YrPOO5amQxatvmQPEXQQ';

serve(async (req) => {
  // Tratamento de CORS (Preflight Request)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = await req.json();

    console.log(`Tentando enviar email para: ${to}`);

    // 1. Conecta no Supabase com CHAVES EXPLÍCITAS
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Busca configurações no banco
    const { data: configData, error: configError } = await supabaseClient
      .from('app_config')
      .select('key, value');

    if (configError) {
        console.error("Erro ao buscar app_config:", configError);
        throw new Error(`Falha no Banco de Dados: ${configError.message}`);
    }

    // Converte para objeto
    const config = (configData || []).reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});

    // Valida credenciais do Gmail
    if (!config.smtp_email || !config.smtp_password) {
      console.error("Configurações encontradas:", config); // Log para debug (cuidado com senhas em prod real)
      throw new Error("Credenciais SMTP (smtp_email/smtp_password) não encontradas na tabela 'app_config'.");
    }

    // 3. Configura Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtp_email,
        pass: config.smtp_password,
      },
    });

    // 4. Dispara o E-mail
    const info = await transporter.sendMail({
      from: `"${config.sender_name || 'Barbearia'}" <${config.smtp_email}>`,
      to: to,
      subject: subject,
      html: html,
    });

    console.log("Email enviado com sucesso!", info.messageId);

    return new Response(JSON.stringify(info), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("CRITICAL ERROR in send-email function:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro desconhecido na Edge Function',
      details: error 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Retorna 400 para que o frontend saiba que falhou
    });
  }
});
