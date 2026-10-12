import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../auth';
import { ErrorBox, Logo, Modal } from '../ui';

function Shell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const { config } = useAuth();
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-[#f4f8ff] to-white px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <span className="text-[clamp(1.5rem,6.5vw,1.9rem)] font-bold text-brand">Visitante</span>
          </div>
          {config.companyName && <p className="mt-1 text-sm text-[#64748b]">{config.companyName}</p>}
          <h1 className="mt-8 text-[clamp(1.3rem,5.5vw,1.6rem)] font-bold">{title}</h1>
          <p className="mt-1 text-sm text-[#64748b]">{sub}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function IconInput({ icon, ...props }: { icon: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]">{icon}</span>
      <input {...props} className="input pl-11" />
    </div>
  );
}

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" />
      <input
        type={show ? 'text' : 'password'}
        className="input pl-11 pr-12"
        placeholder="Senha"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[#64748b]"
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

export function Login() {
  const { login, config } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <Shell title="Bem-vindo de volta" sub="Entre para acessar sua conta">
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <IconInput
          icon={<Mail className="h-5 w-5" />}
          type="email"
          inputMode="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        <ErrorBox message={error} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <button type="button" onClick={() => setForgot(true)} className="mx-auto min-h-[44px] text-sm font-semibold text-brand">
          Esqueceu a senha?
        </button>
      </form>
      {config.allowRegister && (
        <p className="mt-6 text-center text-sm text-[#64748b]">
          Não tem conta?{' '}
          <Link to="/cadastro" className="inline-flex min-h-[44px] items-center font-semibold text-brand">
            Cadastre-se
          </Link>
        </p>
      )}
      {forgot && (
        <Modal title="Esqueceu a senha?" onClose={() => setForgot(false)}>
          <p className="text-sm text-[#475569]">
            Peça a um administrador do Visitante para redefinir sua senha em <b>Perfil → Equipe</b>. Depois de entrar, troque-a em{' '}
            <b>Perfil → Alterar senha</b>.
          </p>
          <button className="btn-primary mt-5 w-full" onClick={() => setForgot(false)}>
            Entendi
          </button>
        </Modal>
      )}
    </Shell>
  );
}

export function Register() {
  const { register, config } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('A senha deve ter pelo menos 8 caracteres');
    setBusy(true);
    setError('');
    try {
      await register(name, email, password);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (!config.allowRegister)
    return (
      <Shell title="Cadastro fechado" sub="Peça ao administrador para criar seu acesso.">
        <Link to="/entrar" className="btn-primary mt-8 w-full">
          Voltar para o login
        </Link>
      </Shell>
    );

  return (
    <Shell title="Criar conta" sub="Cadastre-se para registrar visitantes">
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <IconInput icon={<User className="h-5 w-5" />} placeholder="Nome completo" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        <IconInput
          icon={<Mail className="h-5 w-5" />}
          type="email"
          inputMode="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        <ErrorBox message={error} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Criando…' : 'Criar conta'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#64748b]">
        Já tem conta?{' '}
        <Link to="/entrar" className="inline-flex min-h-[44px] items-center font-semibold text-brand">
          Entrar
        </Link>
      </p>
    </Shell>
  );
}
