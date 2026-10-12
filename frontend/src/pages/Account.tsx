import { useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { api, type User } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, PageHeader, Toast } from '../ui';

export default function Account() {
  const { user, setUser } = useAuth();
  const loc = useLocation();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [current, setCurrent] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [perr, setPerr] = useState('');
  const [pbusy, setPbusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (loc.hash === '#senha') document.getElementById('senha')?.scrollIntoView({ behavior: 'smooth' });
  }, [loc.hash]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const r = await api.put<{ user: User }>('/me', { name, email, jobTitle, phone });
      setUser(r.user);
      setToast('Dados salvos');
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pass !== pass2) return setPerr('As senhas não conferem');
    setPbusy(true);
    setPerr('');
    try {
      await api.put('/me/password', { current, password: pass });
      setCurrent('');
      setPass('');
      setPass2('');
      setToast('Senha alterada');
    } catch (x) {
      setPerr((x as Error).message);
    } finally {
      setPbusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Minha conta" back />
      <form onSubmit={saveProfile} className="card grid gap-4 p-4 sm:p-6 md:grid-cols-2">
        <h2 className="font-bold md:col-span-2">Informações pessoais</h2>
        <label>
          <span className="label">Nome</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
        </label>
        <label>
          <span className="label">E-mail</span>
          <input className="input" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          <span className="label">Cargo</span>
          <input className="input" placeholder="ex.: Recepcionista" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={80} />
        </label>
        <label>
          <span className="label">Telefone</span>
          <input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} autoComplete="tel" />
        </label>
        <div className="md:col-span-2">
          <ErrorBox message={err} />
        </div>
        <button className="btn-primary md:col-span-2" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar dados'}
        </button>
      </form>

      <form id="senha" onSubmit={savePassword} className="card mt-4 grid scroll-mt-4 gap-4 p-4 sm:p-6">
        <h2 className="font-bold">Alterar senha</h2>
        <label>
          <span className="label">Senha atual</span>
          <input className="input" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Nova senha</span>
            <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            <span className="label">Confirmar nova senha</span>
            <input className="input" type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} required minLength={8} autoComplete="new-password" />
          </label>
        </div>
        <ErrorBox message={perr} />
        <button className="btn-primary" disabled={pbusy}>
          {pbusy ? 'Alterando…' : 'Alterar senha'}
        </button>
      </form>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
