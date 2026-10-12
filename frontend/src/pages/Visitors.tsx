import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Search, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi, type Visit } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorBox, PageHeader, Skeleton, VisitRow } from '../ui';

const FILTERS = [
  { id: '', label: 'Todos' },
  { id: 'checked_in', label: 'Presentes' },
  { id: 'pending', label: 'Aguardando' },
  { id: 'checked_out', label: 'Saíram' },
  { id: 'cancelled', label: 'Cancelados' },
];

export default function Visitors() {
  const nav = useNavigate();
  const { unread } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const range = params.get('range') || '';
  const [q, setQ] = useState(params.get('q') || '');
  const [debounced, setDebounced] = useState(q);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (range) qs.set('range', range);
  if (debounced) qs.set('q', debounced);
  const { data, error, loading, reload } = useApi<{ visits: Visit[] }>(`/visits?${qs.toString()}`);

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    setParams(p, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Visitantes"
        sub={range === 'today' ? 'Somente hoje' : undefined}
        right={
          <Link to="/notificacoes" className="icon-btn relative md:hidden" aria-label="Notificações">
            <Bell className="h-6 w-6" />
            {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#ef4444]" />}
          </Link>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" />
        <input
          className="input pl-11"
          type="search"
          placeholder="Buscar nome, empresa ou código"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter('status', f.id)}
            className={`chip ${status === f.id ? 'bg-brand text-white' : 'border border-[#e5eaf2] bg-white text-[#475569]'}`}
          >
            {f.label}
          </button>
        ))}
        {range === 'today' && (
          <button onClick={() => setFilter('range', '')} className="chip border border-[#d6e4fd] bg-brand-light text-brand">
            Hoje ✕
          </button>
        )}
      </div>

      <div className="mt-4">
        <ErrorBox message={error} onRetry={reload} />
        {loading && !data && <Skeleton />}
        {data && data.visits.length === 0 && (
          <Empty
            icon={<Users className="h-7 w-7" />}
            title={debounced || status ? 'Nenhum visitante encontrado' : 'Nenhum visitante cadastrado'}
            text={debounced || status ? 'Tente outra busca ou filtro.' : 'Os visitantes registrados aparecem aqui.'}
            action={
              !debounced && !status ? (
                <button onClick={() => nav('/visitantes/novo')} className="btn-primary">
                  <UserPlus className="h-5 w-5" /> Novo visitante
                </button>
              ) : undefined
            }
          />
        )}
        <div className="grid gap-3 lg:grid-cols-2">
          {data?.visits.map((v) => (
            <VisitRow key={v.id} visit={v} onOpen={() => nav(`/visitas/${v.id}`)} showDay />
          ))}
        </div>
      </div>
    </div>
  );
}
