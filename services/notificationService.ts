
import { supabase, supabaseKey } from './supabaseClient';
import { User, Appointment, Service } from '../types';

export const notificationService = {
  
  // Envia E-mail (Via Supabase Edge Function - Backend Seguro)
  async sendEmailNotification(toName: string, toEmail: string, subject: string, message: string) {
    try {
      // Formato HTML Básico
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: 0 auto;">
           <h2 style="color: #D4AF37;">Peaky Blinders Barbearia</h2>
           <p>Olá, <strong>${toName}</strong>!</p>
           <p>${message.replace(/\n/g, '<br>')}</p>
           <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
           <p style="font-size: 12px; color: #777;">Esta é uma mensagem automática. Por favor, não responda.</p>
        </div>
      `;

      // Chama a Edge Function 'send-email'
      // IMPORTANTE: Forçamos o header Authorization com a chave ANON.
      // Isso evita que um token de usuário expirado/inválido (devido à rotação de chaves) cause erro 401.
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: toEmail,
          subject: subject,
          html: html
        },
        headers: {
            Authorization: `Bearer ${supabaseKey}`
        }
      });

      if (error) {
        // LOG DETALHADO DO ERRO PARA DIAGNÓSTICO (Mantido apenas erros reais)
        console.error('ERRO DETALHADO EDGE FUNCTION:', error);
        
        // Tenta extrair informações úteis do erro
        if (error instanceof Error) {
            console.error('Mensagem:', error.message);
        }
        
        // Se o Supabase retornar um objeto com contexto de resposta (comum em erros HTTP)
        try {
            // @ts-ignore
            if (error.context && typeof error.context.text === 'function') {
                // @ts-ignore
                const body = await error.context.text();
                console.error('Corpo da Resposta do Servidor:', body);
            }
        } catch (e) {
            // Silencioso
        }
      } 
      // Sucesso silencioso

    } catch (error) {
      console.error('[EXCEÇÃO CRÍTICA NO SERVIÇO DE EMAIL]', error);
    }
  },

  // Gera Link WhatsApp (Semi-Automático)
  // Retorna a URL para ser usada em window.open()
  generateWhatsappLink(phone: string, message: string): string | null {
    if (!phone) return null;
    
    // Limpa o telefone (remove caracteres não numéricos)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Validação básica (Brasil - 55 + DDD + Numero)
    // Se o usuário não colocar DDI, assumimos 55 se tiver 10 ou 11 dígitos
    let finalPhone = cleanPhone;
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
        finalPhone = `55${cleanPhone}`;
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${finalPhone}?text=${encodedMessage}`;
  },

  // Helpers de Mensagem
  formatAppointmentMessage(type: 'created' | 'confirmed' | 'cancelled' | 'reminder', appt: Appointment, serviceName: string, reason?: string) {
    const date = new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR');
    
    switch (type) {
        case 'created':
            return `Olá ${appt.customerName}, recebemos sua solicitação de agendamento para *${serviceName}* no dia *${date} às ${appt.time}*. Aguarde a confirmação do barbeiro.`;
        case 'confirmed':
            return `Confirmado, ${appt.customerName}! Seu corte (*${serviceName}*) está agendado para *${date} às ${appt.time}*. Te esperamos na Peaky Blinders! 💈`;
        case 'cancelled':
            return `Olá ${appt.customerName}, infelizmente seu agendamento para *${date} às ${appt.time}* foi cancelado. ${reason ? `Motivo: ${reason}` : ''}`;
        case 'reminder':
            return `Lembrete Peaky Blinders: Você tem um horário marcado hoje às *${appt.time}*. Não se atrase, por ordem dos Peaky Blinders!`;
        default:
            return '';
    }
  },

  formatChatMessage(senderName: string, messageText: string) {
      return `Você recebeu uma nova mensagem de <b>${senderName}</b>:\n\n"${messageText}"\n\nAcesse o aplicativo da Peaky Blinders para responder.`;
  }
};
