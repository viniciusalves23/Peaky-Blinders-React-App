import React from 'react';
import { Star } from 'lucide-react';

interface LoyaltyCardProps {
  stamps: number;
}

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ stamps }) => {
  const totalSlots = 10;

  return (
    <div className="w-full bg-gradient-to-br from-charcoal-900 to-black border border-gold-500/30 rounded-xl p-6 shadow-2xl relative overflow-hidden">
      {/* Background Texture Effect */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #D4AF37 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-gold-500 font-serif text-2xl font-bold tracking-widest uppercase">Clube Fidelidade</h3>
            <p className="text-zinc-500 text-xs tracking-wider uppercase mt-1">Por ordem dos Peaky Blinders</p>
          </div>
          <div className="bg-gold-500/10 border border-gold-500/50 rounded-full px-3 py-1">
            <span className="text-gold-500 text-xs font-bold">{stamps}/{totalSlots} Cortes</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: totalSlots }).map((_, index) => {
            const isStamped = index < stamps;
            return (
              <div 
                key={index}
                className={`aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isStamped 
                    ? 'bg-gold-500 border-gold-400 shadow-[0_0_10px_rgba(212,175,55,0.4)]' 
                    : 'bg-zinc-900 border-zinc-800 border-dashed'
                }`}
              >
                {isStamped ? (
                  <Star className="text-black fill-black w-4 h-4" />
                ) : (
                  <span className="text-zinc-700 text-[10px] font-medium">{index + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
          <p className="text-zinc-400 text-xs">
            {stamps >= 10 
              ? "Corte Grátis Desbloqueado! Resgate na próxima visita." 
              : `Faltam ${10 - stamps} cortes para seu serviço gratuito.`}
          </p>
        </div>
      </div>
    </div>
  );
};