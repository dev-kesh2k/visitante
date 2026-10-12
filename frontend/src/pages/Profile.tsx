import { useNavigate } from 'react-router-dom';
import { Bell, Building2, HelpCircle, History, Lock, LogOut, Settings, UserCog, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth';
import { Avatar, MenuRow, Modal, PageHeader } from '../ui';

export default function Profile() {
  const { user, logout, config, unread } = useAuth();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  if (!user) return null;
  const admin = user.role === 'admin';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Perfil"
        right={
          <button className="icon-btn" onClick={() => nav('/configuracoes')} aria-label="Configurações">
            <Settings className="h-6 w-6" />
          </button>
        }
      />
      <div className="flex flex-col items-center text-center">
        <Avatar name={user.name} size={88} />
        <h2 className="mt-3 break-words text-xl font-bold">{user.name}</h2>
        <p className="text-sm text-[#64748b]">{user.jobTitle || (admin ? 'Administrador' : 'Recepção')}</p>
        {config.companyName && <p className="text-xs text-[#94a3b8]">{config.companyName}</p>}
      </div>

      <div className="card mt-6 divide-y divide-[#f1f5f9] overflow-hidden">
        <MenuRow icon={<UserRound className="h-5 w-5" />} label="Informações pessoais" sub={user.email} onClick={() => nav('/perfil/conta')} />
        <MenuRow icon={<Lock className="h-5 w-5" />} label="Alterar senha" onClick={() => nav('/perfil/conta#senha')} />
        <MenuRow
          icon={<Bell className="h-5 w-5" />}
          label="Notificações"
          right={unread > 0 ? <span className="rounded-full bg-[#ef4444] px-2 py-0.5 text-xs font-semibold text-white">{unread}</span> : undefined}
          onClick={() => nav('/notificacoes')}
        />
        <MenuRow icon={<History className="h-5 w-5" />} label="Todos os visitantes" onClick={() => nav('/historico')} />
        <MenuRow icon={<Users className="h-5 w-5" />} label="Anfitriões (funcionários)" onClick={() => nav('/anfitrioes')} />
        {admin && <MenuRow icon={<UserCog className="h-5 w-5" />} label="Equipe e acessos" onClick={() => nav('/equipe')} />}
        <MenuRow icon={<Building2 className="h-5 w-5" />} label="Configurações" sub={config.companyName} onClick={() => nav('/configuracoes')} />
        <MenuRow icon={<HelpCircle className="h-5 w-5" />} label="Ajuda e suporte" onClick={() => nav('/ajuda')} />
        <MenuRow icon={<LogOut className="h-5 w-5" />} label="Sair" danger onClick={() => setConfirm(true)} />
      </div>

      {confirm && (
        <Modal title="Sair da conta?" onClose={() => setConfirm(false)}>
          <p className="text-sm text-[#475569]">Você precisará entrar novamente para registrar visitantes.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn-outline" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
            <button className="btn-danger" onClick={logout}>
              Sair
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
