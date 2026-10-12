import { useState, type FormEvent } from 'react';
import { KeyRound, Plus, Shield, Trash2, UserCog } from 'lucide-react';
import { api, useApi, type User } from '../api';
import { useAuth } from '../auth';
import { Avatar, ErrorBox, Modal, PageHeader, Skeleton, Toast } from '../ui';

export default function Team() {
  const { user: me } = useAuth();
  const { data, error, loading, reload } = useApi<{ users: User[] }>(me?.role === 'admin' ? '/users' : null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [removing, setRemoving] = useState<User | null>(null);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  if (me?.role !== 'admin') return <ErrorBox message="Apenas administradores podem gerenciar a equipe." />;

  const doRemove = async () => {
    if (!removing) return;
    try {
      await api.del(`/users/${removing.id}`);
      setRemoving(null);
      reload();
    } catch (e) {
      setErr((e as Error).message);
      setRemoving(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Equipe"
        sub="Quem pode acessar o Visitante"
        back
        right={
          <button className="btn-primary min-h-[44px] px-3 sm:px-4" onClick={() => setAdding(true)} aria-label="Novo usuário">
            <Plus className="h-5 w-5" /> <span className="hidden sm:inline">Novo</span>
          </button>
        }
      />
      <ErrorBox message={error || err} onRetry={reload} />
      {loading && !data && <Skeleton rows={3} />}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.users.map((u) => (
          <div key={u.id} className="card flex items-center gap-3 p-4">
            <Avatar name={u.name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {u.name} {u.id === me.id && <span className="font-normal text-[#94a3b8]">(você)</span>}
              </p>
              <p className="truncate text-xs text-[#64748b]">{u.email}</p>
              <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${u.role === 'admin' ? 'bg-brand-light text-brand' : 'bg-[#f1f5f9] text-[#475569]'}`}>
                {u.role === 'admin' ? 'Administrador' : 'Recepção'}
              </span>
            </div>
            <button className="icon-btn" onClick={() => setEditing(u)} aria-label="Editar acesso">
              <UserCog className="h-5 w-5" />
            </button>
            {u.id !== me.id && (
              <button className="icon-btn text-[#dc2626]" onClick={() => setRemoving(u)} aria-label="Excluir">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <UserModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setToast('Usuário criado');
            reload();
          }}
        />
      )}
      {editing && (
        <UserModal
          user={editing}
          self={editing.id === me.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setToast('Acesso atualizado');
            reload();
          }}
        />
      )}
      {removing && (
        <Modal title="Excluir usuário?" onClose={() => setRemoving(null)}>
          <p className="text-sm text-[#475569]">{removing.name} perderá o acesso. As visitas registradas por ele(a) são mantidas.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => setRemoving(null)}>
              Cancelar
            </button>
            <button className="btn-danger" onClick={doRemove}>
              Excluir
            </button>
          </div>
        </Modal>
      )}
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}

function UserModal({ user, self, onClose, onSaved }: { user?: User; self?: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [role, setRole] = useState<User['role']>(user?.role || 'staff');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (user) await api.put(`/users/${user.id}`, { role, jobTitle, ...(password ? { password } : {}) });
      else await api.post('/users', { name, email, jobTitle, role, password });
      onSaved();
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal title={user ? user.name : 'Novo usuário'} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        {!user && (
          <>
            <label>
              <span className="label">Nome</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
            </label>
            <label>
              <span className="label">E-mail</span>
              <input className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
          </>
        )}
        <label>
          <span className="label">Cargo</span>
          <input className="input" placeholder="ex.: Recepcionista, Segurança" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={80} />
        </label>
        <div>
          <span className="label">Permissão</span>
          <div className="grid grid-cols-2 gap-2">
            {(['staff', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                disabled={self && r === 'staff'}
                onClick={() => setRole(r)}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border text-sm font-semibold disabled:opacity-40 ${
                  role === r ? 'border-brand bg-brand-light text-brand' : 'border-[#e2e8f0] text-[#475569]'
                }`}
              >
                {r === 'admin' ? <Shield className="h-4 w-4" /> : <UserCog className="h-4 w-4" />}
                {r === 'admin' ? 'Administrador' : 'Recepção'}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span className="label flex items-center gap-1">
            <KeyRound className="h-4 w-4" /> {user ? 'Redefinir senha (opcional)' : 'Senha inicial'}
          </span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!user}
            minLength={8}
            autoComplete="new-password"
            placeholder="mínimo 8 caracteres"
          />
        </label>
        <ErrorBox message={err} />
        <button className="btn-primary mt-1 w-full" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </Modal>
  );
}
