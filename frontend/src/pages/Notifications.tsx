import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarPlus, CheckCheck, LogIn, LogOut, ShieldCheck, Sparkles, Trash2, XCircle } from 'lucide-react';
import { api, useApi, type Notification } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorBox, Menu, PageHeader, Skeleton } from '../ui';
import { timeAgo } from '../util';

const TABS = [
  { id: '', label: 'Todas' },
  { id: 'system', label: 'Sistema' },
  { id: 'visitor', label: 'Visitantes' },
];

const KIND: Record<string, { icon: typeof Bell; cls: string }> = {
  checkin: { icon: LogIn, cls: 'bg-brand-light text-brand' },
  checkout: { icon: LogOut, cls: 'bg-[#e8f8ef] text-[#16a34a]' },
  prereg: { icon: CalendarPlus, cls: 'bg-[#f3e8ff] text-[#9333ea]' },
  cancel: { icon: XCircle, cls: 'bg-[#fdecef] text-[#e11d48]' },
  welcome: { icon: Sparkles, cls: 'bg-[#fff7e6] text-[#d97706]' },
  security: { icon: ShieldCheck, cls: 'bg-brand-light text-brand' },
};

export default function Notifications() {
  const nav = useNavigate();
  const { refreshUnread } = useAuth();
  const [tab, setTab] = useState('');
  const { data, error, loading, reload, setData } = useApi<{ notifications: Notification[] }>(`/notifications${tab ? `?type=${tab}` : ''}`);

  useEffect(() => {
    refreshUnread();
  }, [data, refreshUnread]);

  const open = async (n: Notification) => {
    if (!n.read) {
      setData((d) => d && { notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)) });
      await api.post(`/notifications/${n.id}/read`).catch(() => {});
      refreshUnread();
    }
    if (n.visitId) nav(`/visitas/${n.visitId}`);
  };

  const readAll = async () => {
    await api.post('/notifications/read-all').catch(() => {});
    reload();
  };
  const clearAll = async () => {
    await api.del('/notifications').catch(() => {});
    reload();
  };

  return (
    <div>
      <PageHeader
        title="Notificações"
        back
        right={
          <Menu
            items={[
              { label: 'Marcar todas como lidas', icon: <CheckCheck className="h-4 w-4" />, onClick: readAll },
              { label: 'Limpar todas', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: clearAll },
            ]}
          />
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-2 sm:flex">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab ${tab === t.id ? 'tab-on' : 'tab-off'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data && <Skeleton />}
      {data?.notifications.length === 0 && <Empty icon={<Bell className="h-7 w-7" />} title="Nenhuma notificação" />}
      <div className="card divide-y divide-[#f1f5f9] overflow-hidden">
        {data?.notifications.map((n) => {
          const k = KIND[n.kind] || KIND.security;
          return (
            <button key={n.id} onClick={() => open(n)} className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#f7f9fc] ${n.read ? '' : 'bg-[#f6f9ff]'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.cls}`}>
                <k.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className={`min-w-0 text-sm ${n.read ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                  <span className="shrink-0 text-[11px] text-[#94a3b8]">{timeAgo(n.createdAt)}</span>
                </span>
                {n.body && <span className="mt-0.5 block break-words text-xs text-[#64748b]">{n.body}</span>}
              </span>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
