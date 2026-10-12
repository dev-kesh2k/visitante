import { useEffect, useState } from 'react';
import { Mail, Pencil, Phone, Plus, Search, Trash2, UserRound } from 'lucide-react';
import { api, useApi, type Host } from '../api';
import { Empty, ErrorBox, Modal, PageHeader, Skeleton } from '../ui';
import { HostModal } from './VisitForm';

export default function Hosts() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [edit, setEdit] = useState<Host | 'new' | null>(null);
  const [remove, setRemove] = useState<Host | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, loading, reload } = useApi<{ hosts: Host[] }>(`/hosts?q=${encodeURIComponent(debounced)}`);

  const doRemove = async () => {
    if (!remove) return;
    try {
      await api.del(`/hosts/${remove.id}`);
      setRemove(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Anfitriões"
        sub="Funcionários que recebem visitas"
        back
        right={
          <button className="btn-primary min-h-[44px] px-3 sm:px-4" onClick={() => setEdit('new')} aria-label="Novo anfitrião">
            <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Novo</span>
          </button>
        }
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" />
        <input className="input pl-11" type="search" placeholder="Buscar por nome ou departamento" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <ErrorBox message={error || err} onRetry={reload} />
        {loading && !data && <Skeleton rows={3} />}
        {data?.hosts.length === 0 && (
          <Empty
            icon={<UserRound className="h-7 w-7" />}
            title={debounced ? 'Nenhum anfitrião encontrado' : 'Nenhum anfitrião cadastrado'}
            text="Cadastre os funcionários que recebem visitas."
            action={
              <button className="btn-primary" onClick={() => setEdit('new')}>
                <Plus className="h-5 w-5" /> Cadastrar
              </button>
            }
          />
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {data?.hosts.map((h) => (
            <div key={h.id} className="card flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{h.name}</p>
                <p className="truncate text-xs text-[#64748b]">
                  {h.department || 'Sem departamento'} · {h._count?.visits ?? 0} visita(s)
                </p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[#64748b]">
                  {h.phone && (
                    <a href={`tel:${h.phone}`} className="flex items-center gap-1 text-brand">
                      <Phone className="h-3 w-3" /> {h.phone}
                    </a>
                  )}
                  {h.email && (
                    <a href={`mailto:${h.email}`} className="flex min-w-0 items-center gap-1 truncate text-brand">
                      <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{h.email}</span>
                    </a>
                  )}
                </div>
              </div>
              <button className="icon-btn" onClick={() => setEdit(h)} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </button>
              <button className="icon-btn text-[#dc2626]" onClick={() => setRemove(h)} aria-label="Remover">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {edit && (
        <HostModal
          host={edit === 'new' ? undefined : edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            reload();
          }}
        />
      )}
      {remove && (
        <Modal title="Remover anfitrião?" onClose={() => setRemove(null)}>
          <p className="text-sm text-[#475569]">{remove.name} não aparecerá mais na lista. O histórico de visitas é mantido.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => setRemove(null)}>
              Cancelar
            </button>
            <button className="btn-danger" onClick={doRemove}>
              Remover
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
