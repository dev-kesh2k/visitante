import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, QrCode, ShieldCheck, UserCheck } from 'lucide-react';
import { Logo } from '../ui';

const SLIDES = [
  {
    title: 'Visitas seguras, gestão inteligente',
    text: 'Cadastre, faça check-in e acompanhe os visitantes da sua empresa de forma fácil e segura.',
    icon: UserCheck,
    accent: ShieldCheck,
  },
  {
    title: 'Check-in com QR Code',
    text: 'Pré-registre visitas e receba o visitante lendo o QR Code na recepção, em segundos.',
    icon: QrCode,
    accent: UserCheck,
  },
  {
    title: 'Relatórios em tempo real',
    text: 'Saiba quem está no prédio agora e veja relatórios diários, semanais e mensais.',
    icon: BarChart3,
    accent: ShieldCheck,
  },
];

export default function Welcome() {
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const s = SLIDES[i];
  const next = () => (i < SLIDES.length - 1 ? setI(i + 1) : nav('/entrar'));

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-[#f4f8ff] to-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="flex items-center gap-3">
          <Logo size={48} />
          <span className="text-[clamp(1.6rem,7vw,2rem)] font-bold text-brand">Visitante</span>
        </div>

        <h1 className="mt-8 text-[clamp(1.4rem,6vw,1.9rem)] font-bold leading-tight">{s.title}</h1>
        <p className="mt-3 max-w-sm text-[#64748b]">{s.text}</p>

        <div className="relative mt-8 flex aspect-[4/3] w-full max-w-xs items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#e3edff] to-[#f5f9ff]">
          <div className="absolute -left-8 bottom-6 h-28 w-28 rounded-full bg-[#cfe0ff]" />
          <div className="absolute -right-6 top-4 h-20 w-20 rounded-full bg-[#dbe8ff]" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-[1.75rem] bg-brand text-white shadow-[0_16px_40px_rgba(23,102,242,0.4)]">
            <s.icon className="h-16 w-16" strokeWidth={1.6} />
          </div>
          <div className="absolute bottom-8 right-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#16a34a] shadow-lg">
            <s.accent className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-6 flex gap-2" role="tablist">
          {SLIDES.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Página ${k + 1}`}
              className="flex h-11 w-8 items-center justify-center"
            >
              <span className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-brand' : 'w-2 bg-[#cbd5e1]'}`} />
            </button>
          ))}
        </div>

        <button onClick={next} className="btn-primary mt-4 w-full">
          {i < SLIDES.length - 1 ? 'Continuar' : 'Começar'}
        </button>
        <p className="mt-4 text-sm text-[#64748b]">
          Já tem uma conta?{' '}
          <Link to="/entrar" className="inline-flex min-h-[44px] items-center font-semibold text-brand">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
