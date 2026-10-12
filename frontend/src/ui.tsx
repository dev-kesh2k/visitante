import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ChevronRight, Loader2, MoreVertical, Users, X } from 'lucide-react';
import type { Visit, VisitStatus } from './api';
import { STATUS, fmtTime, initials, relativeDayLabel } from './util';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center py-10 text-brand ${className}`}>
      <Loader2 className="h-7 w-7 animate-spin" />
    </div>
  );
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card flex items-center gap-3 p-4">
          <div className="h-11 w-11 animate-pulse rounded-full bg-[#e9eef6]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-[#e9eef6]" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-[#eef2f8]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3 text-sm text-[#b91c1c]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 break-words">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-semibold underline">
          Tentar de novo
        </button>
      )}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-[#64748b]">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const PALETTE = ['#1766f2', '#9333ea', '#16a34a', '#ea580c', '#e11d48', '#0891b2', '#ca8a04'];

export function Avatar({ name, size = 44, group = false }: { name: string; size?: number; group?: boolean }) {
  const color = PALETTE[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {group ? <Users style={{ width: size * 0.45, height: size * 0.45 }} /> : initials(name)}
    </div>
  );
}

export function StatusBadge({ status, className = '' }: { status: VisitStatus; className?: string }) {
  const s = STATUS[status];
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ${s.cls} ${className}`}>{s.label}</span>;
}

export function PageHeader({ title, back, right, sub }: { title: string; back?: boolean; sub?: string; right?: ReactNode }) {
  const nav = useNavigate();
  const goBack = () => (window.history.state?.idx > 0 ? nav(-1) : nav('/'));
  return (
    <header className="mb-4 flex min-h-[44px] items-center gap-2">
      {back && (
        <button onClick={goBack} className="icon-btn -ml-2" aria-label="Voltar">
          <ArrowLeft className="h-6 w-6" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className={`truncate font-bold ${back ? 'text-lg' : 'text-[clamp(1.35rem,5vw,1.75rem)]'}`}>{title}</h1>
        {sub && <p className="truncate text-sm text-[#64748b]">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

/** Linha de visitante (cartão) usada em listas. */
export function VisitRow({ visit, onOpen, showDay = false }: { visit: Visit; onOpen: () => void; showDay?: boolean }) {
  const time = visit.checkOutAt && visit.status === 'checked_out' ? visit.checkOutAt : visit.checkInAt;
  return (
    <button onClick={onOpen} className="card flex w-full items-center gap-3 px-4 py-3 text-left transition hover:border-[#d6e4fd] active:scale-[0.99]">
      <Avatar name={visit.visitorName} group={visit.type === 'group'} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {visit.visitorName}
          {visit.type === 'group' && <span className="font-normal text-[#64748b]"> +{visit.groupSize - 1}</span>}
        </p>
        <p className="truncate text-xs text-[#64748b]">{visit.company || visit.purpose}</p>
        <p className="mt-0.5 truncate text-xs text-[#94a3b8]">
          {showDay || visit.status === 'pending' ? `${relativeDayLabel(visit.visitDate)}${time ? ` · ${fmtTime(time)}` : ''}` : fmtTime(time)}
        </p>
      </div>
      <StatusBadge status={visit.status} />
    </button>
  );
}

export function MenuRow({
  icon,
  label,
  sub,
  right,
  onClick,
  danger,
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  right?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button onClick={onClick} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-[#f7f9fc]">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${danger ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-brand-light text-brand'}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${danger ? 'text-[#dc2626]' : ''}`}>{label}</span>
        {sub && <span className="block truncate text-xs text-[#64748b]">{sub}</span>}
      </span>
      {right}
      {!danger && <ChevronRight className="h-5 w-5 shrink-0 text-[#94a3b8]" />}
    </button>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  // Portal: o modal pode abrir de dentro de um <form> sem aninhar formulários.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-lg font-bold">{title}</h2>
          <button className="icon-btn -mr-2" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Logo({ size = 48 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}icon.svg`}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-[22%] shadow-[0_8px_20px_rgba(23,102,242,0.3)]"
      style={{ width: size, height: size }}
    />
  );
}

/** Campo com ícone à esquerda, como no layout de referência. */
export function Field({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-8 flex h-6 w-6 shrink-0 items-center justify-center text-[#64748b]">{icon}</span>
      <label className="min-w-0 flex-1">
        <span className="label">{label}</span>
        {children}
      </label>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
      <div className="max-w-full rounded-xl bg-[#0f172a] px-4 py-3 text-sm font-medium text-white shadow-xl">{message}</div>
    </div>
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick: () => void;
}

export function Menu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button className="icon-btn -mr-2 text-[#64748b]" onClick={() => setOpen((o) => !o)} aria-label="Mais opções">
        <MoreVertical className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-[200px] overflow-hidden rounded-xl border border-[#e5eaf2] bg-white py-1 shadow-xl">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={`flex min-h-[44px] w-full items-center gap-2 px-4 text-left text-sm font-medium hover:bg-[#f4f7fc] ${it.danger ? 'text-[#dc2626]' : ''}`}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
