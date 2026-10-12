import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, CalendarDays, ChevronLeft, ChevronRight, Download, FileBarChart } from 'lucide-react';
import { api, useApi, type Metric, type Report, type Visit } from '../api';
import { ErrorBox, Modal, PageHeader, Skeleton, Spinner, StatusBadge } from '../ui';
import { STATUS, downloadCsv, fmtDay, fmtDuration, fmtTime, localDay, visitMinutes } from '../util';

type Period = Report['period'];
const PERIODS: { id: Period; label: string }[] = [
  { id: 'daily', label: 'Diário' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'monthly', label: 'Mensal' },
];

function shift(day: string, period: Period, dir: number) {
  const d = new Date(`${day}T12:00:00`);
  if (period === 'daily') d.setDate(d.getDate() + dir);
  else if (period === 'weekly') d.setDate(d.getDate() + 7 * dir);
  else {
    d.setDate(1);
    d.setMonth(d.getMonth() + dir);
  }
  return localDay(d);
}

function rangeLabel(r: Report) {
  if (r.period === 'daily') return fmtDay(r.from, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  if (r.period === 'monthly') {
    const s = fmtDay(r.from, { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return `${fmtDay(r.from, { day: '2-digit', month: 'short' })} – ${fmtDay(r.to, { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>('daily');
  const [day, setDay] = useState(localDay());
  const [detail, setDetail] = useState(false);
  const { data, error, loading, reload } = useApi<Report>(`/reports?period=${period}&date=${day}`);
  const isCurrent = data ? localDay() >= data.from && localDay() <= data.to : true;

  return (
    <div>
      <PageHeader title="Relatórios" />
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#eef2f8] p-1 sm:max-w-md">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`min-h-[44px] rounded-xl text-sm font-semibold transition ${period === p.id ? 'bg-brand text-white shadow' : 'text-[#475569]'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button className="icon-btn" onClick={() => setDay(shift(day, period, -1))} aria-label="Período anterior">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center text-sm font-semibold">
          <CalendarDays className="h-4 w-4 shrink-0 text-[#64748b]" />
          <span className="truncate">{data ? rangeLabel(data) : '…'}</span>
        </p>
        <button className="icon-btn disabled:opacity-30" disabled={isCurrent} onClick={() => setDay(shift(day, period, 1))} aria-label="Próximo período">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3">
        <ErrorBox message={error} onRetry={reload} />
        {loading && !data && <Skeleton rows={2} />}
      </div>

      {data && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total de visitas" m={data.metrics.total} />
            <MetricCard label="Check-ins" m={data.metrics.checkedIn} />
            <MetricCard label="Check-outs" m={data.metrics.checkedOut} />
            <MetricCard label="Aguardando" m={data.metrics.pending} invert />
            <MetricCard label="Pessoas" m={data.metrics.people} />
            <MetricCard label="Tempo médio" m={data.metrics.avgMinutes} format={(n) => (n ? fmtDuration(n) : '—')} neutral />
          </div>

          {data.perDay.length > 0 && (
            <div className="card mt-4 p-4">
              <h2 className="mb-3 font-bold">Visitas por dia</h2>
              <BarChart rows={data.perDay} />
            </div>
          )}

          <div className="card mt-4 p-4">
            <h2 className="mb-3 font-bold">Por motivo</h2>
            {data.byPurpose.length === 0 && <p className="text-sm text-[#64748b]">Sem visitas no período.</p>}
            <div className="flex flex-col gap-3">
              {data.byPurpose.map((p) => {
                const pct = data.metrics.total.value ? Math.round((p.count / data.metrics.total.value) * 100) : 0;
                return (
                  <div key={p.purpose}>
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{p.purpose}</span>
                      <span className="shrink-0 font-semibold">
                        {p.count} <span className="font-normal text-[#94a3b8]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#eef2f8]">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button className="btn-soft mt-4 w-full" onClick={() => setDetail(true)}>
            <FileBarChart className="h-5 w-5" /> Ver relatório detalhado
          </button>
        </>
      )}

      {detail && data && <DetailModal report={data} onClose={() => setDetail(false)} />}
    </div>
  );
}

function MetricCard({ label, m, invert, neutral, format }: { label: string; m: Metric; invert?: boolean; neutral?: boolean; format?: (n: number) => string }) {
  const up = (m.change ?? 0) > 0;
  const good = neutral ? null : invert ? !up : up;
  const color = m.change === 0 || m.change === null || good === null ? 'text-[#64748b]' : good ? 'text-[#16a34a]' : 'text-[#dc2626]';
  return (
    <div className="card min-w-0 p-4">
      <p className="truncate text-xs text-[#64748b]">{label}</p>
      <p className="mt-1 truncate text-[clamp(1.25rem,5vw,1.6rem)] font-bold">{format ? format(m.value) : m.value}</p>
      <p className={`mt-1 flex items-center gap-1 truncate text-xs font-semibold ${color}`}>
        {m.change === null ? (
          'novo'
        ) : m.change === 0 ? (
          'igual ao anterior'
        ) : (
          <>
            {up ? <ArrowUp className="h-3.5 w-3.5 shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 shrink-0" />}
            {Math.abs(m.change)}%
          </>
        )}
      </p>
    </div>
  );
}

function BarChart({ rows }: { rows: { day: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const many = rows.length > 10;
  return (
    <div className="flex h-40 items-end gap-[2px] sm:gap-1">
      {rows.map((r, i) => (
        <div key={r.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${fmtDay(r.day)}: ${r.count}`}>
          {!many && <span className="text-[10px] font-semibold text-[#475569]">{r.count || ''}</span>}
          <div className={`w-full rounded-t-md ${r.count ? 'bg-brand' : 'bg-[#e9eef6]'}`} style={{ height: `${Math.max(4, (r.count / max) * 100)}%` }} />
          <span className="h-3 text-[10px] leading-3 text-[#94a3b8]">
            {many ? (i % 5 === 0 ? Number(r.day.slice(8)) : '') : fmtDay(r.day, { weekday: 'short' }).slice(0, 3)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DetailModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const nav = useNavigate();
  const { data, error, loading, reload } = useApi<{ visits: Visit[] }>(`/visits?from=${report.from}&to=${report.to}&limit=500`);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = data || (await api.get<{ visits: Visit[] }>(`/visits?from=${report.from}&to=${report.to}&limit=500`));
      downloadCsv(`visitantes-${report.from}_${report.to}.csv`, [
        ['Data', 'Visitante', 'Pessoas', 'Empresa', 'Telefone', 'E-mail', 'Documento', 'Motivo', 'Anfitrião', 'Status', 'Entrada', 'Saída', 'Permanência (min)', 'Código'],
        ...r.visits.map((v) => [
          v.visitDate.split('-').reverse().join('/'),
          v.visitorName,
          v.groupSize,
          v.company,
          v.phone,
          v.email,
          v.document,
          v.purpose,
          v.hostName,
          STATUS[v.status].label,
          v.checkInAt ? fmtTime(v.checkInAt) : '',
          v.checkOutAt ? fmtTime(v.checkOutAt) : '',
          v.checkOutAt ? visitMinutes(v) ?? '' : '',
          v.code,
        ]),
      ]);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal title="Relatório detalhado" onClose={onClose}>
      <button className="btn-primary w-full" onClick={exportCsv} disabled={exporting || !data}>
        <Download className="h-5 w-5" /> Exportar CSV (Excel)
      </button>
      <div className="mt-4 flex flex-col divide-y divide-[#f1f5f9]">
        <ErrorBox message={error} onRetry={reload} />
        {loading && !data && <Spinner />}
        {data?.visits.length === 0 && <p className="py-4 text-center text-sm text-[#64748b]">Nenhuma visita no período.</p>}
        {data?.visits.map((v) => (
          <button key={v.id} onClick={() => nav(`/visitas/${v.id}`)} className="flex min-h-[56px] items-center gap-3 py-2 text-left">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{v.visitorName}</p>
              <p className="truncate text-xs text-[#64748b]">
                {v.visitDate.split('-').reverse().join('/')} · {fmtTime(v.checkInAt)}–{fmtTime(v.checkOutAt)} · {v.purpose}
              </p>
            </div>
            <StatusBadge status={v.status} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
