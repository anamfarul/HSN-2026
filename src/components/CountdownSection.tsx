import React, { useState, useEffect } from 'react';
import { Clock, Bell, Sparkles } from 'lucide-react';

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export const CountdownSection: React.FC = () => {
  const targetDate = new Date('2026-10-22T07:00:00+07:00').getTime();

  const calculateTimeLeft = (): CountdownState => {
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isPast: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownState>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeCards = [
    { label: 'HARI', value: timeLeft.days, color: '#00D9F5' },
    { label: 'JAM', value: timeLeft.hours, color: '#008F72' },
    { label: 'MENIT', value: timeLeft.minutes, color: '#D9B45B' },
    { label: 'DETIK', value: timeLeft.seconds, color: '#F2C96D' },
  ];

  return (
    <section id="countdown" className="relative py-12 px-4 sm:px-6 lg:px-8 z-20 -mt-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl p-6 sm:p-8 glass-panel-gold border border-[#D9B45B]/30 shadow-2xl shadow-[#031525]/80 overflow-hidden">
          {/* Subtle Ambient Pattern & Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00D9F5]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#006B4F]/15 rounded-full blur-3xl pointer-events-none" />
          
          {/* Section Header */}
          <div className="relative text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#006B4F]/30 border border-[#00D9F5]/20 text-[11px] font-bold tracking-widest text-[#00D9F5] uppercase mb-2">
              <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '10s' }} />
              <span>HITUNG MUNDUR HISTORIS</span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F2C96D] to-[#00D9F5]">
              MENUJU PUNCAK HARI SANTRI NASIONAL 2026
            </h2>
            <p className="text-xs sm:text-sm text-[#DDE7E8]/80 mt-1">
              Kamis, 22 Oktober 2026 • Lapangan Utama Poncokusumo, Malang
            </p>
          </div>

          {/* 4 Futuristic Glassmorphism Countdown Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 relative z-10">
            {timeCards.map((card) => (
              <div
                key={card.label}
                className="relative group rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-[#031525]/90 via-[#006B4F]/15 to-[#031525] border border-white/10 hover:border-[#00D9F5]/40 transition-all duration-300 shadow-xl flex flex-col items-center justify-center text-center"
              >
                {/* Tech corner accents */}
                <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 border-t border-l border-[#00D9F5]/60" />
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 border-t border-r border-[#00D9F5]/60" />
                <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 border-b border-l border-[#00D9F5]/60" />
                <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 border-b border-r border-[#00D9F5]/60" />

                <div 
                  className="font-mono text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-[0_0_15px_rgba(0,217,245,0.3)] transition-all"
                  style={{ color: card.color }}
                >
                  {String(card.value).padStart(2, '0')}
                </div>
                <div className="mt-2 text-[10px] sm:text-xs font-heading font-bold tracking-widest text-[#DDE7E8]/90 uppercase">
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Reminder Banner */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-[#DDE7E8]/80">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              <span>Registrasi dan Pengumpulan Karya Terbuka Hingga Pertengahan Oktober 2026</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#F2C96D] font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Persiapkan Santri Lembaga Anda!</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
