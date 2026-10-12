import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, CalendarPlus, History, LogIn, ScanLine, UserPlus, Users } from 'lucide-react';
import { useEffect } from 'react';
import { useApi, type Dashboard } from '../api';
import { useAuth } from '../auth';
import { Avatar, Empty, ErrorBox, Skeleton, VisitRow } from '../ui';
import { greeting } from '../util';

const ACTIONS = [
  { to: '/checkin', label: 'Check-in', icon: LogIn },
  { to: '/pre-registro', label: 'Pré-registro', icon: CalendarPlus },
  { to: '/checkin?scan=1', label: 'Ler QR', icon: ScanLine },
  { to: '/historico', label: 'Todos', icon: History },
];

export default function Home() {
  const { user, unread, refreshUnread } = useAuth();
  const nav = useNavigate();
  const { data, error, loading, reload } = useApi<Dashboard>('/dashboard');

  // Atualiza o painel periodicamente (recepção costuma deixar a tela aberta).
  useEffect(() => {
    const id = setInterval(() => {
      reload();
      refreshUnread();
    }, 30_000);
    return () => clearInterval(id);
  }, [reload, refreshUnread]);

  return (
    <div>
      <header className="mb-5 flex items-center gap-3">
        <Link to="/perfil" aria-label="Perfil">
          <Avatar name={user?.name || '?'} size={46} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#64748b]">{greeting()},</p>
          <p className="truncate text-lg font-bold">{user?.name}</p>
        </div>
        <Link to="/notificacoes" className="icon-btn relative" aria-label="Notificações">
          <Bell className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>
      </header>

      <button
        onClick={() => nav('/visitantes?range=today')}
        className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#2a7bff] to-[#1257e0] p-5 text-left text-white shadow-[0_12px_30px_rgba(23,102,242,0.35)]"
      >
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/85">Visitantes de hoje</p>
            <p className="mt-1 text-[clamp(2.2rem,10vw,2.8rem)] font-bold leading-none">{data ? data.total : '–'}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
            <ArrowRight className="h-5 w-5" />
          </span>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/90">
          <span>
            <b>{data?.waiting ?? 0}</b> aguardando
          </span>
          <span>
            <b>{data?.inside ?? 0}</b> no local
          </span>
          <span>
            <b>{data?.checkedOut ?? 0}</b> saíram
          </span>
        </div>
      </button>

      <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
        {ACTIONS.map((a) => (
          <Link key={a.label} to={a.to} className="card flex min-w-0 flex-col items-center gap-2 px-1 py-3 text-center transition active:scale-95">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand">
              <a.icon className="h-5 w-5" />
            </span>
            <span className="w-full break-words text-[11px] font-semibold leading-tight text-[#334155] sm:text-xs">{a.label}</span>
          </Link>
        ))}
      </div>

      <button onClick={() => nav('/visitantes/novo')} className="btn-primary mt-4 w-full md:hidden">
        <UserPlus className="h-5 w-5" /> Novo visitante
      </button>

      {!!data?.upcoming && (
        <Link to="/visitantes?status=pending" className="mt-4 flex min-h-[44px] items-center gap-2 rounded-xl bg-[#fff7e6] px-4 text-sm font-medium text-[#b45309]">
          <CalendarPlus className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{data.upcoming} visita(s) pré-registrada(s) para os próximos dias</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="text-lg font-bold">Visitantes recentes</h2>
        <Link to="/visitantes" className="flex min-h-[44px] items-center text-sm font-semibold text-brand">
          Ver todos
        </Link>
      </div>

      <ErrorBox message={error} onRetry={reload} />
      {loading && !data && <Skeleton rows={3} />}
      {data && data.recent.length === 0 && (
        <Empty
          icon={<Users className="h-7 w-7" />}
          title="Nenhum visitante ainda"
          text="Registre o primeiro visitante ou faça um pré-registro."
          action={
            <Link to="/visitantes/novo" className="btn-primary">
              <UserPlus className="h-5 w-5" /> Novo visitante
            </Link>
          }
        />
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        {data?.recent.map((v) => (
          <VisitRow key={v.id} visit={v} onOpen={() => nav(`/visitas/${v.id}`)} showDay={v.visitDate !== data.today} />
        ))}
      </div>
    </div>
  );
}
