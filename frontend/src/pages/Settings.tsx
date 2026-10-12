import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, HelpCircle, Info, Lock, UserCog, UserRound, Users } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, MenuRow, PageHeader, Toast } from '../ui';

export default function Settings() {
  const { user, config, reloadConfig } = useAuth();
  const nav = useNavigate();
  const admin = user?.role === 'admin';
  const [companyName, setCompanyName] = useState(config.companyName);
  const [allowRegister, setAllowRegister] = useState(config.allowRegister);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    setCompanyName(config.companyName);
    setAllowRegister(config.allowRegister);
  }, [config.companyName, config.allowRegister]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api.put('/settings', { companyName, allowRegister });
      reloadConfig();
      setToast('Configurações salvas');
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Configurações" back />

      {admin ? (
        <form onSubmit={save} className="card flex flex-col gap-4 p-4 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold">
            <Building2 className="h-5 w-5 text-brand" /> Perfil da empresa
          </h2>
          <label>
            <span className="label">Nome da empresa</span>
            <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required maxLength={100} />
          </label>
          <label className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Permitir cadastro público</span>
              <span className="block text-xs text-[#64748b]">Qualquer pessoa com o link poderá criar uma conta de recepção.</span>
            </span>
            <input type="checkbox" className="peer sr-only" checked={allowRegister} onChange={(e) => setAllowRegister(e.target.checked)} />
            <span className="relative h-7 w-12 shrink-0 rounded-full bg-[#cbd5e1] transition after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:bg-brand peer-checked:after:translate-x-5" />
          </label>
          <ErrorBox message={err} />
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </form>
      ) : (
        <div className="card flex items-center gap-3 p-4">
          <Building2 className="h-5 w-5 shrink-0 text-brand" />
          <div className="min-w-0">
            <p className="text-xs text-[#64748b]">Empresa</p>
            <p className="truncate font-semibold">{config.companyName}</p>
          </div>
        </div>
      )}

      <div className="card mt-4 divide-y divide-[#f1f5f9] overflow-hidden">
        <MenuRow icon={<UserRound className="h-5 w-5" />} label="Conta" sub="Nome, e-mail e cargo" onClick={() => nav('/perfil/conta')} />
        <MenuRow icon={<Lock className="h-5 w-5" />} label="Segurança" sub="Alterar senha" onClick={() => nav('/perfil/conta#senha')} />
        <MenuRow icon={<Users className="h-5 w-5" />} label="Anfitriões" sub="Funcionários que recebem visitas" onClick={() => nav('/anfitrioes')} />
        {admin && <MenuRow icon={<UserCog className="h-5 w-5" />} label="Equipe" sub="Usuários e permissões" onClick={() => nav('/equipe')} />}
        <MenuRow icon={<HelpCircle className="h-5 w-5" />} label="Ajuda e suporte" onClick={() => nav('/ajuda')} />
        <MenuRow icon={<Info className="h-5 w-5" />} label="Sobre o app" sub="Visitante 1.0" onClick={() => nav('/ajuda#sobre')} />
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
