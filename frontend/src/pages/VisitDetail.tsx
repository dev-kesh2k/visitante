import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileText,
  IdCard,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Share2,
  Trash2,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { api, useApi, type Visit } from '../api';
import { useAuth } from '../auth';
import { Avatar, ErrorBox, Modal, PageHeader, Spinner, StatusBadge, Toast } from '../ui';
import { fmtDateTime, fmtDay, fmtDuration, visitMinutes } from '../util';

export default function VisitDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { data, error, loading, reload, setData } = useApi<{ visit: Visit }>(`/visits/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null);
  const [toast, setToast] = useState(params.get('novo') ? 'Pré-registro criado! Envie o QR Code ao visitante.' : '');
  const [, tick] = useState(0);

  // Atualiza a duração enquanto o visitante está presente.
  useEffect(() => {
    if (data?.visit.status !== 'checked_in') return;
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [data?.visit.status]);

  if (!data) return error ? <ErrorBox message={error} onRetry={reload} /> : loading ? <Spinner /> : null;
  const v = data.visit;
  const minutes = visitMinutes(v);

  const act = async (path: string, after?: (v: Visit) => void) => {
    setBusy(true);
    setActionError('');
    try {
      const r = await api.post<{ visit: Visit }>(`/visits/${v.id}/${path}`);
      setData({ visit: r.visit });
      after?.(r.visit);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.del(`/visits/${v.id}`);
      nav('/visitantes', { replace: true });
    } catch (e) {
      setActionError((e as Error).message);
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Detalhes do visitante"
        back
        right={
          v.status !== 'cancelled' && v.status !== 'checked_out' ? (
            <button className="icon-btn" onClick={() => nav(`/visitas/${v.id}/editar`)} aria-label="Editar">
              <Pencil className="h-5 w-5" />
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,18rem)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="card flex flex-col items-center p-5 text-center sm:flex-row sm:text-left">
            <Avatar name={v.visitorName} size={80} group={v.type === 'group'} />
            <div className="mt-3 min-w-0 sm:ml-4 sm:mt-0">
              <h2 className="break-words text-xl font-bold">{v.visitorName}</h2>
              {v.company && <p className="text-[#64748b]">{v.company}</p>}
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <StatusBadge status={v.status} />
                {v.type === 'group' && <span className="rounded-lg bg-[#f1f5f9] px-2.5 py-1 text-xs font-semibold text-[#475569]">Grupo de {v.groupSize}</span>}
              </div>
            </div>
          </div>

          <div className="card divide-y divide-[#f1f5f9] px-4">
            {v.phone && <Info icon={<Phone />} label="Telefone" value={<a href={`tel:${v.phone}`} className="text-brand">{v.phone}</a>} />}
            {v.email && <Info icon={<Mail />} label="E-mail" value={<a href={`mailto:${v.email}`} className="break-all text-brand">{v.email}</a>} />}
            {v.document && <Info icon={<IdCard />} label="Documento" value={v.document} />}
            {v.company && <Info icon={<Building2 />} label="Empresa" value={v.company} />}
            <Info icon={<Briefcase />} label="Motivo" value={v.purpose} />
            <Info icon={<UserRound />} label="Anfitrião" value={v.hostName} />
            <Info icon={<CalendarDays />} label={v.status === 'pending' ? 'Agendada para' : 'Data'} value={fmtDay(v.visitDate, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} />
            {v.checkInAt && <Info icon={<LogIn />} label="Check-in" value={fmtDateTime(v.checkInAt)} />}
            {v.checkOutAt && <Info icon={<LogOut />} label="Check-out" value={fmtDateTime(v.checkOutAt)} />}
            {minutes !== null && <Info icon={<Clock />} label={v.checkOutAt ? 'Permanência' : 'No local há'} value={fmtDuration(minutes)} />}
            {v.notes && <Info icon={<FileText />} label="Observações" value={v.notes} />}
            {v.type === 'group' && <Info icon={<Users />} label="Pessoas" value={String(v.groupSize)} />}
            <Info icon={<ClipboardList />} label="Registrado por" value={`${v.createdBy?.name || '—'}${v.preRegistered ? ' (pré-registro)' : ''}`} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          {(v.status === 'pending' || v.status === 'checked_in') && <QrCard visit={v} onToast={setToast} />}
          <ErrorBox message={actionError} />
          {v.status === 'pending' && (
            <>
              <button className="btn-primary w-full" disabled={busy} onClick={() => act('checkin', (nv) => nav(`/visitas/${nv.id}/sucesso`, { replace: true }))}>
                <LogIn className="h-5 w-5" /> Fazer check-in
              </button>
              <button className="btn-outline w-full" disabled={busy} onClick={() => setConfirm('cancel')}>
                <XCircle className="h-5 w-5" /> Cancelar visita
              </button>
            </>
          )}
          {v.status === 'checked_in' && (
            <button className="btn-primary w-full" onClick={() => nav(`/visitas/${v.id}/checkout`)}>
              <LogOut className="h-5 w-5" /> Fazer check-out
            </button>
          )}
          {v.status === 'checked_out' && (
            <div className="flex items-center gap-2 rounded-xl bg-[#e8f8ef] p-3 text-sm font-medium text-[#15803d]">
              <CheckCircle2 className="h-5 w-5 shrink-0" /> Visita encerrada.
            </div>
          )}
          {user?.role === 'admin' && (
            <button className="btn-danger w-full" disabled={busy} onClick={() => setConfirm('delete')}>
              <Trash2 className="h-5 w-5" /> Excluir registro
            </button>
          )}
        </div>
      </div>

      {confirm && (
        <Modal title={confirm === 'cancel' ? 'Cancelar visita?' : 'Excluir registro?'} onClose={() => setConfirm(null)}>
          <p className="text-sm text-[#475569]">
            {confirm === 'cancel'
              ? `A visita de ${v.visitorName} será cancelada e o QR Code deixará de funcionar.`
              : 'O registro será apagado definitivamente e sairá dos relatórios.'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => setConfirm(null)}>
              Voltar
            </button>
            <button className="btn-danger" disabled={busy} onClick={() => (confirm === 'cancel' ? act('cancel') : remove())}>
              {confirm === 'cancel' ? 'Cancelar' : 'Excluir'}
            </button>
          </div>
        </Modal>
      )}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[#64748b] [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#64748b]">{label}</p>
        <div className="break-words text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function QrCard({ visit, onToast }: { visit: Visit; onToast: (m: string) => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    QRCode.toDataURL(`VISITANTE:${visit.code}`, { width: 512, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setUrl)
      .catch(() => setUrl(''));
  }, [visit.code]);

  const message = `Olá, ${visit.visitorName}! Sua visita está agendada para ${fmtDay(visit.visitDate)}. Apresente este QR Code na recepção. Código: ${visit.code}`;

  const share = async () => {
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `visita-${visit.code}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: message });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text: message });
        return;
      }
      await navigator.clipboard.writeText(message);
      onToast('Mensagem copiada para a área de transferência');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') onToast('Não foi possível compartilhar');
    }
  };

  return (
    <div className="card flex flex-col items-center p-4 text-center">
      <p className="text-sm font-semibold">QR Code de acesso</p>
      <div className="mt-3 w-full max-w-[13rem] rounded-2xl border-2 border-brand/30 p-2">
        {url ? <img src={url} alt={`QR Code ${visit.code}`} className="h-auto w-full" /> : <div className="aspect-square w-full animate-pulse rounded-xl bg-[#eef2f8]" />}
      </div>
      <p className="mt-2 font-mono text-xl font-bold tracking-[0.3em] text-brand">{visit.code}</p>
      {visit.status === 'pending' && (
        <div className="mt-3 grid w-full grid-cols-2 gap-2">
          <button className="btn-soft px-2 text-sm" onClick={share} disabled={!url}>
            <Share2 className="h-4 w-4" /> Enviar
          </button>
          <a className="btn-outline px-2 text-sm" href={url || undefined} download={`visita-${visit.code}.png`}>
            <Download className="h-4 w-4" /> Baixar
          </a>
        </div>
      )}
    </div>
  );
}
