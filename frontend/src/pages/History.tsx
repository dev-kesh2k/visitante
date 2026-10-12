import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { CalendarDays, History as HistoryIcon } from 'lucide-react';
import { useApi, type Visit } from '../api';
import { Empty, ErrorBox, PageHeader, Skeleton, VisitRow } from '../ui';
import { relativeDayLabel } from '../util';

const RANGES = [
  { id: 'all', label: 'Todos' },
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mês' },
];

/** Todos os visitantes agrupados por data. */
export default function History() {
  const nav = useNavigate();
  const [range, setRange] = useState('all');
  const { data, error, loading, reload } = useApi<{ visits: Visit[] }>(`/visits?range=${range}&limit=300`);

  const groups: [string, Visit[]][] = [];
  for (const v of data?.visits || []) {
    const last = groups[groups.length - 1];
    if (last && last[0] === v.visitDate) last[1].push(v);
    else groups.push([v.visitDate, [v]]);
  }

  return (
    <div>
      <PageHeader title="Todos os visitantes" back />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {RANGES.map((r) => (
          <button key={r.id} onClick={() => setRange(r.id)} className={`tab ${range === r.id ? 'tab-on' : 'tab-off'}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <ErrorBox message={error} onRetry={reload} />
        {loading && !data && <Skeleton />}
        {data && groups.length === 0 && <Empty icon={<HistoryIcon className="h-7 w-7" />} title="Nenhuma visita no período" />}
        {groups.map(([day, list]) => (
          <section key={day} className="mb-5">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#334155]">
              <CalendarDays className="h-4 w-4 text-[#64748b]" /> {relativeDayLabel(day)}
              <span className="font-normal text-[#94a3b8]">· {list.length}</span>
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((v) => (
                <VisitRow key={v.id} visit={v} onOpen={() => nav(`/visitas/${v.id}`)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
