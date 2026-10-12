import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Home as HomeIcon, ScanLine, User, UserPlus, Users } from 'lucide-react';
import { useAuth } from './auth';
import { Avatar, Logo, Spinner } from './ui';
import Welcome from './pages/Welcome';
import { Login, Register } from './pages/AuthPages';
import Home from './pages/Home';
import Visitors from './pages/Visitors';
import VisitForm from './pages/VisitForm';
import VisitDetail from './pages/VisitDetail';
import CheckOut from './pages/CheckOut';
import CheckIn from './pages/CheckIn';
import Success from './pages/Success';
import History from './pages/History';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Account from './pages/Account';
import Settings from './pages/Settings';
import Hosts from './pages/Hosts';
import Team from './pages/Team';
import Help from './pages/Help';

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner className="min-h-[100dvh] items-center" />;

  if (!user)
    return (
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="*" element={<Navigate to="/entrar" replace />} />
      </Routes>
    );

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/visitantes" element={<Visitors />} />
        <Route path="/visitantes/novo" element={<VisitForm mode="new" />} />
        <Route path="/pre-registro" element={<VisitForm mode="preregister" />} />
        <Route path="/visitas/:id" element={<VisitDetail />} />
        <Route path="/visitas/:id/editar" element={<VisitForm mode="edit" />} />
        <Route path="/visitas/:id/checkout" element={<CheckOut />} />
        <Route path="/visitas/:id/sucesso" element={<Success />} />
        <Route path="/checkin" element={<CheckIn />} />
        <Route path="/historico" element={<History />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/notificacoes" element={<Notifications />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/perfil/conta" element={<Account />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="/anfitrioes" element={<Hosts />} />
        <Route path="/equipe" element={<Team />} />
        <Route path="/ajuda" element={<Help />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

const LINKS = [
  { to: '/', label: 'Início', icon: HomeIcon, end: true },
  { to: '/visitantes', label: 'Visitantes', icon: Users },
  { to: '/checkin', label: 'Check-in', icon: ScanLine },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/perfil', label: 'Perfil', icon: User },
];

const sideCls = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
    isActive ? 'bg-brand-light text-brand' : 'text-[#475569] hover:bg-[#f4f7fc]'
  }`;

function Layout() {
  const { user, unread, config } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  // Formulários e telas de confirmação ocupam a tela toda no celular.
  const focused = /\/(novo|editar|checkout|sucesso)$|^\/pre-registro$/.test(loc.pathname);

  return (
    <div className="min-h-[100dvh] md:flex">
      {/* Menu lateral (tablet/desktop) */}
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-[#e8edf5] bg-white p-5 md:flex">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={40} />
          <div className="min-w-0">
            <p className="text-xl font-bold leading-tight text-brand">Visitante</p>
            {config.companyName && <p className="truncate text-xs text-[#64748b]">{config.companyName}</p>}
          </div>
        </div>
        <button onClick={() => nav('/visitantes/novo')} className="btn-primary mb-6 w-full">
          <UserPlus className="h-5 w-5" /> Novo visitante
        </button>
        <nav className="flex flex-col gap-1">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={sideCls}>
              <l.icon className="h-5 w-5" /> {l.label}
            </NavLink>
          ))}
          <NavLink to="/notificacoes" className={sideCls}>
            <Bell className="h-5 w-5" /> Notificações
            {unread > 0 && <span className="ml-auto rounded-full bg-[#ef4444] px-2 py-0.5 text-xs text-white">{unread}</span>}
          </NavLink>
        </nav>
        {user && (
          <NavLink to="/perfil" className="mt-auto flex items-center gap-3 rounded-xl p-2 hover:bg-[#f4f7fc]">
            <Avatar name={user.name} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-[#64748b]">{user.jobTitle || user.email}</p>
            </div>
          </NavLink>
        )}
      </aside>

      <main
        className={`mx-auto w-full min-w-0 max-w-4xl flex-1 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 md:pb-10 md:pt-8 ${
          focused ? 'pb-[max(2rem,env(safe-area-inset-bottom))]' : 'pb-28'
        }`}
      >
        <Outlet />
      </main>

      {/* Barra inferior (celular) */}
      {!focused && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8edf5] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold min-[360px]:text-[11px] ${
                    isActive ? 'text-brand' : 'text-[#94a3b8]'
                  }`
                }
              >
                <l.icon className="h-5 w-5" />
                <span className="max-w-full truncate">{l.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
