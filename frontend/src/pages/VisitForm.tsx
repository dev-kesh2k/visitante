import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, CalendarDays, ClipboardList, FileText, IdCard, Mail, Phone, Plus, Search, User, UserRound, Users, X } from 'lucide-react';
import { api, useApi, type Host, type Visit } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, Field, Modal, PageHeader, Spinner } from '../ui';
import { localDay } from '../util';

type Mode = 'new' | 'preregister' | 'edit';

interface FormState {
  type: 'individual' | 'group';
  groupSize: string;
  visitorName: string;
  phone: string;
  email: string;
  company: string;
  document: string;
  purpose: string;
  notes: string;
  hostId: string;
  hostLabel: string;
  visitDate: string;
}

const EMPTY: FormState = {
  type: 'individual',
  groupSize: '2',
  visitorName: '',
  phone: '',
  email: '',
  company: '',
  document: '',
  purpose: '',
  notes: '',
  hostId: '',
  hostLabel: '',
  visitDate: '',
};

export default function VisitForm({ mode }: { mode: Mode }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { config } = useAuth();
  const existing = useApi<{ visit: Visit }>(mode === 'edit' ? `/visits/${id}` : null);
  const [f, setF] = useState<FormState>(() => ({ ...EMPTY, visitDate: mode === 'preregister' ? localDay() : '' }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const v = existing.data?.visit;
    if (!v) return;
    setF({
      type: v.type,
      groupSize: String(v.groupSize),
      visitorName: v.visitorName,
      phone: v.phone,
      email: v.email,
      company: v.company,
      document: v.document,
      purpose: v.purpose,
      notes: v.notes,
      hostId: v.hostId || '',
      hostLabel: v.hostName,
      visitDate: v.visitDate,
    });
  }, [existing.data]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
  const editingPending = mode === 'edit' && existing.data?.visit.status === 'pending';
  const showDate = mode === 'preregister' || editingPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.hostId && !f.hostLabel) return setError('Selecione o anfitrião (quem será visitado)');
    setBusy(true);
    setError('');
    const body = {
      type: f.type,
      groupSize: Number(f.groupSize),
      visitorName: f.visitorName,
      phone: f.phone,
      email: f.email,
      company: f.company,
      document: f.document,
      purpose: f.purpose,
      notes: f.notes,
      hostId: f.hostId || undefined,
      hostName: f.hostId ? undefined : f.hostLabel,
      ...(showDate ? { visitDate: f.visitDate } : {}),
    };
    try {
      if (mode === 'edit') {
        await api.put(`/visits/${id}`, body);
        nav(`/visitas/${id}`, { replace: true });
      } else {
        const r = await api.post<{ visit: Visit }>('/visits', { ...body, mode: mode === 'preregister' ? 'preregister' : 'checkin' });
        nav(mode === 'preregister' ? `/visitas/${r.visit.id}?novo=1` : `/visitas/${r.visit.id}/sucesso`, { replace: true });
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (mode === 'edit' && !existing.data)
    return existing.error ? <ErrorBox message={existing.error} onRetry={existing.reload} /> : <Spinner />;

  const title = mode === 'new' ? 'Registrar visitante' : mode === 'preregister' ? 'Pré-registrar visitante' : 'Editar visita';
  const purposes = config.purposes.includes(f.purpose) || !f.purpose ? config.purposes : [f.purpose, ...config.purposes];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={title} back />
      {mode === 'new' && <p className="-mt-2 mb-4 text-sm text-[#64748b]">O check-in é feito automaticamente ao salvar.</p>}
      {mode === 'preregister' && <p className="-mt-2 mb-4 text-sm text-[#64748b]">O visitante recebe um QR Code para entrar no dia agendado.</p>}

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-[#eef2f8] p-1">
        {(['individual', 'group'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => set('type', t)}
            className={`min-h-[44px] rounded-xl text-sm font-semibold transition ${f.type === t ? 'bg-brand text-white shadow' : 'text-[#475569]'}`}
          >
            {t === 'individual' ? 'Individual' : 'Grupo'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-4 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field icon={<User className="h-5 w-5" />} label={f.type === 'group' ? 'Responsável pelo grupo' : 'Nome completo'}>
            <input className="input" placeholder="Nome do visitante" value={f.visitorName} onChange={(e) => set('visitorName', e.target.value)} autoComplete="off" required maxLength={100} />
          </Field>
          {f.type === 'group' && (
            <Field icon={<Users className="h-5 w-5" />} label="Total de pessoas">
              <input className="input" type="number" inputMode="numeric" min={2} max={200} value={f.groupSize} onChange={(e) => set('groupSize', e.target.value)} required />
            </Field>
          )}
          <Field icon={<Phone className="h-5 w-5" />} label="Telefone">
            <input className="input" type="tel" inputMode="tel" placeholder="(11) 91234-5678" value={f.phone} onChange={(e) => set('phone', e.target.value)} maxLength={30} />
          </Field>
          <Field icon={<Mail className="h-5 w-5" />} label="E-mail">
            <input className="input" type="email" inputMode="email" placeholder="opcional" value={f.email} onChange={(e) => set('email', e.target.value)} maxLength={160} />
          </Field>
          <Field icon={<Building2 className="h-5 w-5" />} label="Empresa">
            <input className="input" placeholder="Nome da empresa" value={f.company} onChange={(e) => set('company', e.target.value)} maxLength={100} />
          </Field>
          <Field icon={<IdCard className="h-5 w-5" />} label="Documento (RG/CPF)">
            <input className="input" placeholder="opcional" value={f.document} onChange={(e) => set('document', e.target.value)} maxLength={40} />
          </Field>
          <Field icon={<ClipboardList className="h-5 w-5" />} label="Motivo da visita">
            <select className="input appearance-none" value={f.purpose} onChange={(e) => set('purpose', e.target.value)} required>
              <option value="">Selecione o motivo</option>
              {purposes.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          {showDate && (
            <Field icon={<CalendarDays className="h-5 w-5" />} label="Data da visita">
              <input className="input" type="date" min={localDay()} value={f.visitDate} onChange={(e) => set('visitDate', e.target.value)} required />
            </Field>
          )}
        </div>
        <Field icon={<UserRound className="h-5 w-5" />} label="Anfitrião / funcionário visitado">
          <HostPicker
            value={f.hostLabel}
            onChange={(hostId, label) => setF((s) => ({ ...s, hostId, hostLabel: label }))}
          />
        </Field>
        <Field icon={<FileText className="h-5 w-5" />} label="Observações">
          <textarea className="input min-h-[88px] resize-y" placeholder="opcional" value={f.notes} onChange={(e) => set('notes', e.target.value)} maxLength={500} />
        </Field>
        <ErrorBox message={error} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Salvando…' : mode === 'new' ? 'Fazer check-in' : mode === 'preregister' ? 'Pré-registrar' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}

function HostPicker({ value, onChange }: { value: string; onChange: (hostId: string, label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const { data, error, loading, reload } = useApi<{ hosts: Host[] }>(open ? `/hosts?q=${encodeURIComponent(q.trim())}` : null);

  const pick = (h: Host) => {
    onChange(h.id, h.department ? `${h.name} (${h.department})` : h.name);
    setOpen(false);
    setQ('');
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="input flex items-center gap-2 text-left">
        <span className={`min-w-0 flex-1 truncate ${value ? '' : 'text-[#94a3b8]'}`}>{value || 'Buscar funcionário'}</span>
        <Search className="h-5 w-5 shrink-0 text-[#94a3b8]" />
      </button>
      {open && (
        <Modal title="Quem será visitado?" onClose={() => setOpen(false)}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" />
            <input className="input pl-11" autoFocus placeholder="Nome ou departamento" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="mt-3 flex max-h-[45dvh] flex-col overflow-y-auto">
            <ErrorBox message={error} onRetry={reload} />
            {loading && !data && <Spinner />}
            {data?.hosts.map((h) => (
              <button key={h.id} type="button" onClick={() => pick(h)} className="flex min-h-[52px] items-center gap-3 rounded-xl px-2 text-left hover:bg-[#f4f7fc]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                  <UserRound className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{h.name}</span>
                  {h.department && <span className="block truncate text-xs text-[#64748b]">{h.department}</span>}
                </span>
              </button>
            ))}
            {data && data.hosts.length === 0 && <p className="py-4 text-center text-sm text-[#64748b]">Nenhum funcionário encontrado.</p>}
          </div>
          <button type="button" onClick={() => setAdding(true)} className="btn-soft mt-3 w-full">
            <Plus className="h-5 w-5" /> Cadastrar funcionário
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('', '');
                setOpen(false);
              }}
              className="btn-outline mt-2 w-full"
            >
              <X className="h-5 w-5" /> Limpar seleção
            </button>
          )}
        </Modal>
      )}
      {adding && (
        <HostModal
          initialName={q}
          onClose={() => setAdding(false)}
          onSaved={(h) => {
            setAdding(false);
            pick(h);
          }}
        />
      )}
    </>
  );
}

export function HostModal({ host, initialName = '', onClose, onSaved }: { host?: Host; initialName?: string; onClose: () => void; onSaved: (h: Host) => void }) {
  const [name, setName] = useState(host?.name || initialName);
  const [department, setDepartment] = useState(host?.department || '');
  const [email, setEmail] = useState(host?.email || '');
  const [phone, setPhone] = useState(host?.phone || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    setError('');
    try {
      const body = { name, department, email, phone };
      const r = host ? await api.put<{ host: Host }>(`/hosts/${host.id}`, body) : await api.post<{ host: Host }>('/hosts', body);
      onSaved(r.host);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={host ? 'Editar funcionário' : 'Novo funcionário'} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <label>
          <span className="label">Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus />
        </label>
        <label>
          <span className="label">Departamento</span>
          <input className="input" placeholder="ex.: TI, Financeiro" value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={80} />
        </label>
        <label>
          <span className="label">E-mail</span>
          <input className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
        </label>
        <label>
          <span className="label">Telefone / ramal</span>
          <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
        </label>
        <ErrorBox message={error} />
        <button className="btn-primary mt-1 w-full" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </Modal>
  );
}
