import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DoorOpen } from 'lucide-react';
import { api, useApi, type Visit } from '../api';
import { Avatar, ErrorBox, PageHeader, Spinner } from '../ui';
import { fmtDateTime, fmtDuration, visitMinutes } from '../util';

export default function CheckOut() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading, reload } = useApi<{ visit: Visit }>(`/visits/${id}`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!data) return error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Spinner /> : null;
  const v = data.visit;

  const confirm = async () => {
    setBusy(true);
    setErr('');
    try {
      await api.post(`/visits/${v.id}/checkout`);
      nav(`/visitas/${v.id}/sucesso`, { replace: true });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Check-out" back />
      <div className="flex flex-col items-center text-center">
        <div className="relative mt-2 flex h-32 w-32 items-center justify-center rounded-full bg-brand-light text-brand">
          <DoorOpen className="h-16 w-16" strokeWidth={1.5} />
        </div>
        <h2 className="mt-6 text-[clamp(1.2rem,5vw,1.4rem)] font-bold">Confirmar a saída deste visitante?</h2>
      </div>

      <div className="card mt-6 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={v.visitorName} size={52} group={v.type === 'group'} />
          <div className="min-w-0">
            <p className="truncate font-semibold">{v.visitorName}</p>
            <p className="truncate text-sm text-[#64748b]">{v.company || v.purpose}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#f1f5f9] pt-4 text-sm">
          <div className="min-w-0">
            <p className="text-xs text-[#64748b]">Check-in</p>
            <p className="font-medium">{fmtDateTime(v.checkInAt)}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs text-[#64748b]">Permanência</p>
            <p className="font-semibold text-brand">{fmtDuration(visitMinutes(v) ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ErrorBox message={err} />
      </div>
      {v.status !== 'checked_in' && <p className="mt-4 text-center text-sm text-[#64748b]">Este visitante não está presente.</p>}
      <div className="mt-6 flex flex-col gap-3">
        <button className="btn-primary w-full" disabled={busy || v.status !== 'checked_in'} onClick={confirm}>
          {busy ? 'Registrando…' : 'Fazer check-out'}
        </button>
        <button className="btn-outline w-full" onClick={() => nav(-1)}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
