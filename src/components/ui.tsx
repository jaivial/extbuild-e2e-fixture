import { useSyncExternalStore, type ReactNode } from "react";
import { AlertTriangle, type LucideIcon } from "lucide-react";

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} />;
}

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[#737373] text-sm py-10 justify-center">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-6 flex items-center gap-3 text-[#EF4444] text-sm">
      <AlertTriangle className="w-5 h-5 shrink-0" /> {message}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: ReactNode }) {
  return (
    <div className="card p-10 text-center">
      {icon && <div className="flex justify-center mb-3 text-[#525252]">{icon}</div>}
      <p className="text-[#FAFAFA] font-medium">{title}</p>
      {hint && <p className="text-sm text-[#737373] mt-2">{hint}</p>}
    </div>
  );
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8 text-[#06B6D4]" />
        <div>
          <h1 className="text-3xl font-semibold text-[#FAFAFA] leading-tight">{title}</h1>
          {subtitle && <p className="text-[#A1A1A1] text-sm mt-1">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="stat-card">
      <Icon className="stat-icon" />
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {meta && <div className="stat-meta">{meta}</div>}
    </div>
  );
}

type Tone = "success" | "warning" | "error" | "info" | "neutral";
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

/** Format an epoch-seconds uptime into a compact d/h/m string. */
export function uptime(n?: number): string {
  n = Number(n || 0);
  if (!n) return "—";
  const d = Math.floor(n / 86400);
  const h = Math.floor((n % 86400) / 3600);
  const m = Math.floor((n % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

/** GitHub mark (lucide-react dropped the brand icon). */
export function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.57.1.78-.25.78-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.78 1.05.78 2.12v3.14c0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z"/>
    </svg>
  );
}

// ── Minimal toast store (mirrors window.toast in the v2 pages) ──
type Toast = { id: number; title?: string; msg: string; type: "success" | "error" | "warning" | "info"; html?: boolean; duration?: number };
let _toasts: Toast[] = [];
const _subs = new Set<() => void>();
let _tid = 1;
function _emit() { _toasts = [..._toasts]; _subs.forEach((f) => f()); }
export function toast(msg: string, type: Toast["type"] = "info", opts: { title?: string; html?: boolean; duration?: number } = {}) {
  const id = _tid++;
  _toasts.push({ id, msg, type, ...opts });
  _emit();
  const dur = opts.duration === 0 ? 0 : opts.duration ?? 4200;
  if (dur > 0) setTimeout(() => { _toasts = _toasts.filter((t) => t.id !== id); _emit(); }, dur);
}
export function Toaster() {
  const toasts = useSyncExternalStore(
    (cb) => { _subs.add(cb); return () => _subs.delete(cb); },
    () => _toasts,
  );
  const color = (t: Toast["type"]) => t === "success" ? "#22C55E" : t === "error" ? "#EF4444" : t === "warning" ? "#F59E0B" : "#06B6D4";
  return (
    <div style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 100, display: "flex", flexDirection: "column", gap: ".5rem", maxWidth: "min(24rem, calc(100vw - 2rem))" }}>
      {toasts.map((t) => (
        <div key={t.id} className="card p-3 text-sm" style={{ borderLeft: `3px solid ${color(t.type)}` }}>
          {t.title && <div className="font-semibold text-[#FAFAFA]">{t.title}</div>}
          {t.html ? <div className="text-[#A1A1A1]" dangerouslySetInnerHTML={{ __html: t.msg }} /> : <div className="text-[#A1A1A1]">{t.msg}</div>}
        </div>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box card p-6">{children}</div>
    </div>
  );
}
export function ModalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#FAFAFA] mb-3">{title}</h3>
      {children}
    </div>
  );
}
