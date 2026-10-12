import { useCallback, useEffect, useState } from 'react';

const BASE = `${import.meta.env.BASE_URL}api`;
const TOKEN_KEY = 'visitante:token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error || `Erro ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b: unknown = {}) => request<T>('POST', p, b),
  put: <T>(p: string, b: unknown) => request<T>('PUT', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

/** Carrega um recurso da API; `reload` busca de novo sem piscar a tela. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!path);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api.get<T>(path));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

// ---------- Tipos ----------
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  jobTitle: string;
  phone: string;
  createdAt: string;
}

export interface Config {
  companyName: string;
  allowRegister: boolean;
  purposes: string[];
}

export interface Host {
  id: string;
  name: string;
  department: string;
  email: string;
  phone: string;
  _count?: { visits: number };
}

export type VisitStatus = 'pending' | 'checked_in' | 'checked_out' | 'cancelled';

export interface Visit {
  id: string;
  code: string;
  type: 'individual' | 'group';
  groupSize: number;
  visitorName: string;
  phone: string;
  email: string;
  company: string;
  document: string;
  purpose: string;
  notes: string;
  hostId: string | null;
  hostName: string;
  host: { id: string; name: string; department: string } | null;
  status: VisitStatus;
  visitDate: string;
  preRegistered: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Dashboard {
  today: string;
  companyName: string;
  total: number;
  waiting: number;
  checkedIn: number;
  checkedOut: number;
  inside: number;
  upcoming: number;
  recent: Visit[];
}

export interface Metric {
  value: number;
  previous: number;
  change: number | null;
}

export interface Report {
  period: 'daily' | 'weekly' | 'monthly';
  from: string;
  to: string;
  previous: { from: string; to: string };
  metrics: Record<'total' | 'people' | 'checkedIn' | 'checkedOut' | 'pending' | 'avgMinutes', Metric>;
  perDay: { day: string; count: number }[];
  byPurpose: { purpose: string; count: number }[];
}

export interface Notification {
  id: string;
  type: 'visitor' | 'system';
  kind: string;
  title: string;
  body: string;
  visitId: string | null;
  read: boolean;
  createdAt: string;
}
