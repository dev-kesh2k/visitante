import type { Visit, VisitStatus } from './api';

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export const STATUS: Record<VisitStatus, { label: string; cls: string }> = {
  pending: { label: 'Aguardando', cls: 'bg-[#fff7e6] text-[#d97706]' },
  checked_in: { label: 'Presente', cls: 'bg-[#e8f8ef] text-[#16a34a]' },
  checked_out: { label: 'Saiu', cls: 'bg-[#fdecef] text-[#e11d48]' },
  cancelled: { label: 'Cancelada', cls: 'bg-[#f1f5f9] text-[#64748b]' },
};

export const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

export function fmtDay(day: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR', opts).replace(/\./g, '');
}

export const fmtDateTime = (iso: string | null) =>
  iso ? `${fmtTime(iso)} · ${new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')}` : '—';

export function fmtDuration(minutes: number) {
  if (minutes < 1) return 'menos de 1 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}min` : `${m} min`;
}

/** Minutos de permanência (até agora, se ainda estiver presente). */
export function visitMinutes(v: Visit, now = Date.now()) {
  if (!v.checkInAt) return null;
  const end = v.checkOutAt ? new Date(v.checkOutAt).getTime() : now;
  return Math.max(0, Math.round((end - new Date(v.checkInAt).getTime()) / 60000));
}

/** Data local (YYYY-MM-DD) do aparelho. */
export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function relativeDayLabel(day: string) {
  const today = localDay();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (day === today) return 'Hoje';
  if (day === localDay(y)) return 'Ontem';
  const s = fmtDay(day, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'agora';
  if (diff < 60) return `${Math.floor(diff)} min`;
  if (diff < 60 * 24 && new Date(iso).getDate() === new Date().getDate()) return fmtTime(iso);
  if (diff < 60 * 48) return 'Ontem';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Gera e baixa um CSV (Excel pt-BR usa ";"). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
