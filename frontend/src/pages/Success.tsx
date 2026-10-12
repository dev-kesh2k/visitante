import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useApi, type Visit } from '../api';
import { Avatar, ErrorBox, Spinner } from '../ui';
import { fmtDateTime, fmtDuration, visitMinutes } from '../util';

/** Confirmação após check-in ou check-out. */
export default function Success() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading, reload } = useApi<{ visit: Visit }>(`/visits/${id}`);

  if (!data) return error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Spinner /> : null;
  const v = data.visit;
  const out = v.status === 'checked_out';

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center py-6 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#22c55e] text-white shadow-[0_10px_30px_rgba(34,197,94,0.4)]">
        <Check className="h-11 w-11" strokeWidth={3} />
      </div>
      <h1 className="mt-5 text-[clamp(1.35rem,6vw,1.7rem)] font-bold text-brand">{out ? 'Check-out realizado!' : 'Check-in realizado!'}</h1>

      <div className="mt-6 flex flex-col items-center">
        <Avatar name={v.visitorName} size={76} group={v.type === 'group'} />
        <p className="mt-3 break-words text-lg font-bold">{v.visitorName}</p>
        {v.company && <p className="text-[#64748b]">{v.company}</p>}
        <p className="mt-3 text-sm text-[#64748b]">{out ? 'Horário de saída' : 'Horário de entrada'}</p>
        <p className="font-semibold">{fmtDateTime(out ? v.checkOutAt : v.checkInAt)}</p>
        {out ? (
          <p className="mt-1 text-sm text-[#64748b]">Permanência: {fmtDuration(visitMinutes(v) ?? 0)}</p>
        ) : (
          <p className="mt-1 text-sm text-[#64748b]">Anfitrião: {v.hostName}</p>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button className="btn-primary w-full" onClick={() => nav('/', { replace: true })}>
          OK
        </button>
        <button className="btn-outline w-full" onClick={() => nav(`/visitas/${v.id}`, { replace: true })}>
          Ver detalhes
        </button>
      </div>
    </div>
  );
}
