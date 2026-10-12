import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { CameraOff, ClipboardCheck, QrCode, ScanLine, Search, UserPlus } from 'lucide-react';
import { api, useApi, type Visit } from '../api';
import { ErrorBox, Modal, PageHeader, Spinner, VisitRow } from '../ui';

export default function CheckIn() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const checkInCode = useCallback(
    async (code: string) => {
      setBusy(true);
      setError('');
      try {
        const r = await api.post<{ visit: Visit }>('/visits/checkin-code', { code });
        nav(`/visitas/${r.visit.id}/sucesso`, { replace: true });
      } catch (e) {
        setError((e as Error).message);
        setBusy(false);
      }
    },
    [nav],
  );

  useEffect(() => {
    if (params.get('scan')) setScanning(true);
  }, [params]);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Check-in" />

      <div className="card flex flex-col items-center p-5 text-center">
        <div className="relative aspect-square w-full max-w-[18rem] overflow-hidden rounded-3xl bg-[#eef4ff]">
          {scanning ? (
            <Scanner
              onCode={(c) => {
                setScanning(false);
                checkInCode(c);
              }}
              onError={(m) => {
                setScanning(false);
                setError(m);
              }}
            />
          ) : busy ? (
            <Spinner className="h-full items-center" />
          ) : (
            <div className="flex h-full items-center justify-center text-brand">
              <QrCode className="h-1/2 w-1/2" strokeWidth={1.2} />
            </div>
          )}
          {/* Cantos da moldura */}
          <span className="pointer-events-none absolute left-4 top-4 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 border-brand" />
          <span className="pointer-events-none absolute right-4 top-4 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 border-brand" />
          <span className="pointer-events-none absolute bottom-4 left-4 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 border-brand" />
          <span className="pointer-events-none absolute bottom-4 right-4 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 border-brand" />
        </div>
        <h2 className="mt-5 text-lg font-bold">Ler QR Code</h2>
        <p className="mt-1 max-w-xs text-sm text-[#64748b]">Aponte a câmera para o QR Code do pré-registro que o visitante recebeu.</p>
      </div>

      <div className="mt-4">
        <ErrorBox message={error} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {scanning ? (
          <button className="btn-outline w-full" onClick={() => setScanning(false)}>
            <CameraOff className="h-5 w-5" /> Parar câmera
          </button>
        ) : (
          <button className="btn-primary w-full" disabled={busy} onClick={() => (setError(''), setScanning(true))}>
            <ScanLine className="h-5 w-5" /> Ler QR Code
          </button>
        )}
        <button className="btn-soft w-full" onClick={() => setManual(true)}>
          <ClipboardCheck className="h-5 w-5" /> Check-in manual
        </button>
        <button className="btn-outline w-full" onClick={() => nav('/visitantes/novo')}>
          <UserPlus className="h-5 w-5" /> Visitante sem agendamento
        </button>
      </div>

      {manual && <ManualCheckIn onClose={() => setManual(false)} onCode={(c) => (setManual(false), checkInCode(c))} />}
    </div>
  );
}

function Scanner({ onCode, onError }: { onCode: (code: string) => void; onError: (msg: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let done = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const loop = () => {
      const video = videoRef.current;
      if (done || !video || !ctx) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (found?.data) {
          done = true;
          navigator.vibrate?.(80);
          onCode(found.data);
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onError('Este navegador não permite usar a câmera. Use o check-in manual.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        const video = videoRef.current;
        // Desmontou enquanto pedia permissão: libera a câmera.
        if (done || !video) return stream.getTracks().forEach((t) => t.stop());
        video.srcObject = stream;
        await video.play();
        raf = requestAnimationFrame(loop);
      } catch (e) {
        if (done) return;
        const name = (e as Error).name;
        onError(
          name === 'NotAllowedError'
            ? 'Permissão da câmera negada. Libere o acesso nas configurações do navegador ou use o check-in manual.'
            : 'Não foi possível abrir a câmera. Use o check-in manual.',
        );
      }
    })();

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
      <span className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 animate-pulse bg-brand/80 shadow-[0_0_12px_rgba(23,102,242,0.8)]" />
    </>
  );
}

function ManualCheckIn({ onClose, onCode }: { onClose: () => void; onCode: (code: string) => void }) {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, loading, reload } = useApi<{ visits: Visit[] }>(`/visits?status=pending&limit=30${debounced ? `&q=${encodeURIComponent(debounced)}` : ''}`);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim()) onCode(code.trim());
  };

  return (
    <Modal title="Check-in manual" onClose={onClose}>
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input font-mono uppercase tracking-widest"
          placeholder="Código (6 letras)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={12}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <button className="btn-primary shrink-0 px-4" disabled={!code.trim()}>
          OK
        </button>
      </form>
      <p className="mb-2 mt-5 text-sm font-semibold text-[#334155]">Ou escolha um visitante aguardando</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94a3b8]" />
        <input className="input pl-11" type="search" placeholder="Buscar por nome ou empresa" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 flex max-h-[40dvh] flex-col gap-2 overflow-y-auto pb-1">
        <ErrorBox message={error} onRetry={reload} />
        {loading && !data && <Spinner />}
        {data?.visits.length === 0 && <p className="py-4 text-center text-sm text-[#64748b]">Nenhum visitante aguardando.</p>}
        {data?.visits.map((v) => (
          <VisitRow key={v.id} visit={v} showDay onOpen={() => (onClose(), nav(`/visitas/${v.id}`))} />
        ))}
      </div>
    </Modal>
  );
}
