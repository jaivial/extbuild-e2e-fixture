import { useMemo, useState } from "react";
import MeshGraph from "../components/MeshGraph";
import {
  Activity, Archive, ClipboardList, Database, GitPullRequest,
  ListChecks, Radio, Server,
} from "lucide-react";
import { useApi, useControlCenterSocket } from "../lib/hooks";
import { Badge, Card, ErrorState, Loading, PageHeader, uptime } from "../components/ui";
import type { Instance } from "../lib/types";

type Tab = "mesh" | "instances" | "queue" | "plans" | "events" | "prs" | "banks" | "backups";
const TABS: { id: Tab; label: string; icon: typeof Server }[] = [
  { id: "mesh", label: "Mesh", icon: Radio },
  { id: "instances", label: "Instances", icon: Server },
  { id: "queue", label: "Queue", icon: ListChecks },
  { id: "plans", label: "Plans", icon: ClipboardList },
  { id: "events", label: "Events", icon: Activity },
  { id: "prs", label: "PRs", icon: GitPullRequest },
  { id: "banks", label: "Banks", icon: Database },
  { id: "backups", label: "Backups", icon: Archive },
];

function tone(s: string): "success" | "error" | "warning" | "info" | "neutral" {
  if (s === "done" || s === "succeeded") return "success";
  if (s === "failed") return "error";
  if (s === "awaiting_approval") return "warning";
  if (s === "running" || s === "claimed") return "info";
  return "neutral";
}

export default function ControlCenter() {
  const [tab, setTab] = useState<Tab>("mesh");
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selNode, setSelNode] = useState<string | null>(null);
  const live = useControlCenterSocket(["instances"], useMemo(() => (data: Record<string, unknown>) => {
    const sec = data["instances"] as { instances?: Instance[] } | undefined;
    if (sec?.instances) setInstances(sec.instances);
  }, []));
  const plansCount = useApi<{ cluster: unknown[] }>("/api/admin/control-center/plans");
  const nPlans = plansCount.data?.cluster?.length ?? 0;

  return (
    <div>
      <PageHeader icon={Activity} title="Control Center" subtitle="Frota, fila de tarefas e planos — telemetria ao vivo."
        actions={<Badge tone={live ? "success" : "neutral"}>{live ? "live" : "conectando…"}</Badge>} />
      <div className="flex items-center gap-1 mb-6 border-b border-[#262626] overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition ${tab === t.id ? "border-[#06B6D4] text-[#FAFAFA]" : "border-transparent text-[#737373] hover:text-[#A1A1A1]"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
            {t.id === "plans" && nPlans > 0 && <span className="tab-count">{nPlans}</span>}
          </button>
        ))}
      </div>

      {tab === "mesh" && <MeshTab instances={instances} selected={selNode} onSelect={setSelNode} />}
      {tab === "instances" && <InstancesTab instances={instances} />}
      {tab === "queue" && <QueueTab />}
      {tab === "plans" && <PlansTab />}
      {tab === "events" && <EventsTab />}
      {tab === "prs" && <PrsTab />}
      {tab === "banks" && <BanksTab />}
      {tab === "backups" && <BackupsTab />}
    </div>
  );
}

function MeshTab({ instances, selected, onSelect }: { instances: Instance[]; selected: string | null; onSelect: (id: string | null) => void }) {
  if (instances.length === 0) return <div className="text-sm text-[#737373]">Connecting to fleet…</div>;
  const inst = instances.find((i) => i.instance_id === selected) || null;
  const m = inst?.metrics || {};
  return (
    <div className="relative">
      <MeshGraph instances={instances} selected={selected} onSelect={(id) => onSelect(id === selected ? null : id)} />
      {inst && (
        <div className="absolute top-3 right-3 w-72 card p-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 font-semibold text-[#FAFAFA]"><span className={`status-dot ${inst.online ? "" : "!bg-[#EF4444]"}`} />{inst.instance_id}</div>
            <button className="btn-icon" onClick={() => onSelect(null)}>×</button>
          </div>
          <div className="text-xs text-[#737373] mb-3">{inst.online ? "connected" : "heartbeat unavailable"}</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-[#737373]">CPU</span><b className="block text-[#FAFAFA]">{m.cpu?.percent ?? "—"}%</b></div>
            <div><span className="text-[#737373]">RAM</span><b className="block text-[#FAFAFA]">{m.memory?.used_gb ?? "—"}/{m.memory?.total_gb ?? "—"} GB</b></div>
            <div><span className="text-[#737373]">In-flight</span><b className="block text-[#FAFAFA]">{inst.in_flight ?? 0}/{inst.capacity ?? 1}</b></div>
            <div><span className="text-[#737373]">Uptime</span><b className="block text-[#FAFAFA]">{uptime(m.uptime_seconds)}</b></div>
          </div>
        </div>
      )}
    </div>
  );
}

function InstancesTab({ instances }: { instances: Instance[] }) {
  if (instances.length === 0) return <div className="text-sm text-[#737373]">Connecting to fleet…</div>;
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {instances.map((i) => {
        const m = i.metrics || {}, cpu = m.cpu || {}, mem = m.memory || {};
        const isC = i.role === "coordinator";
        return (
          <article key={i.instance_id} className="rounded-lg border border-[#404040] bg-[#141414] p-4">
            <div className="flex justify-between gap-2">
              <div className="font-semibold text-[#FAFAFA] truncate">{i.instance_id}</div>
              <span className={`text-[10px] uppercase font-semibold ${isC ? "text-[#06B6D4]" : i.online ? "text-[#22C55E]" : "text-[#EF4444]"}`}>{isC ? "Coordinator" : i.online ? "Online" : "Offline"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div><span className="text-[#737373]">CPU</span><b className="block text-[#FAFAFA]">{cpu.percent ?? "—"}%</b></div>
              <div><span className="text-[#737373]">RAM</span><b className="block text-[#FAFAFA]">{mem.used_gb ?? "—"}/{mem.total_gb ?? "—"} GB</b></div>
              <div><span className="text-[#737373]">In-flight</span><b className="block text-[#FAFAFA]">{i.in_flight ?? 0}/{i.capacity ?? 1}</b></div>
              <div><span className="text-[#737373]">Uptime</span><b className="block text-[#FAFAFA]">{uptime(m.uptime_seconds)}</b></div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

interface TaskRow { task_id: string; state: string; label: string; repos?: string[]; pr_url?: string | null; error?: string }
function QueueTab() {
  const { data, loading, error } = useApi<{ active: TaskRow[]; recent: TaskRow[] }>("/api/admin/control-center/tasks", 10000);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} />;
  const Table = ({ title, rows }: { title: string; rows: TaskRow[] }) => rows.length === 0 ? null : (
    <div><h3 className="text-sm font-semibold text-[#A1A1A1] mb-2">{title}</h3>
      <Card className="overflow-hidden"><table className="min-w-full text-sm">
        <thead className="bg-[#0F0F0F] text-xs uppercase tracking-wider text-[#737373]"><tr className="text-left"><th className="px-4 py-3 font-medium">Task</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-4 py-3 font-medium">Repos</th><th className="px-4 py-3 font-medium">PR</th></tr></thead>
        <tbody className="divide-y divide-[#1f1f1f]">{rows.map((t) => (
          <tr key={t.task_id} className="hover:bg-[#141414]">
            <td className="px-4 py-3"><div className="text-[#FAFAFA]"><span className="mono text-xs text-[#737373] mr-1">{t.task_id.slice(0, 8)}</span>{(t.label || "").slice(0, 70)}</div>{t.error && <div className="text-xs text-[#EF4444] mt-0.5 truncate max-w-md">{t.error.slice(0, 100)}</div>}</td>
            <td className="px-4 py-3"><Badge tone={tone(t.state)}>{t.state}</Badge></td>
            <td className="px-4 py-3 text-xs text-[#A1A1A1]">{t.repos?.length ? t.repos.join(", ") : "—"}</td>
            <td className="px-4 py-3">{t.pr_url ? <a href={t.pr_url} target="_blank" rel="noopener" className="text-[#06B6D4] hover:underline text-xs">abrir ↗</a> : <span className="text-[#525252] text-xs">—</span>}</td>
          </tr>))}</tbody>
      </table></Card>
    </div>
  );
  return <div className="space-y-6"><Table title="Ativas" rows={data?.active ?? []} /><Table title="Recentes" rows={data?.recent ?? []} /></div>;
}

interface PlanRow { task_id: string; label: string; repos?: string[]; plan_text: string }
function PlansTab() {
  const { data, loading, error } = useApi<{ cluster: PlanRow[] }>("/api/admin/control-center/plans");
  if (loading) return <Loading />; if (error) return <ErrorState message={error} />;
  const plans = data?.cluster ?? [];
  if (plans.length === 0) return <Card className="p-10 text-center text-[#737373] text-sm">Nenhum plano aguardando aprovação.</Card>;
  return <div className="space-y-4">{plans.map((p) => (
    <Card key={p.task_id} className="p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap"><div className="font-semibold text-[#FAFAFA]">{p.label || p.task_id}</div>
        <div className="flex gap-2"><button className="btn-primary text-xs">✓ Aprovar</button><button className="btn-secondary text-xs">✗ Rejeitar</button></div></div>
      <pre className="mt-3 bg-[#0F0F0F] border border-[#262626] rounded-md p-3 text-xs text-[#A1A1A1] whitespace-pre-wrap overflow-auto max-h-80">{p.plan_text}</pre>
    </Card>))}</div>;
}

interface EventRow { id: number; kind: string; text: string; ts: number; assigned_instance?: string; label?: string }
function EventsTab() {
  const { data, loading, error } = useApi<{ events: EventRow[] }>("/api/admin/control-center/firehose", 5000);
  if (loading && !data) return <Loading />; if (error) return <ErrorState message={error} />;
  const events = data?.events ?? [];
  return (
    <Card className="p-0 overflow-hidden">
      <div className="max-h-[36rem] overflow-y-auto divide-y divide-[#1f1f1f]">
        {events.length === 0 ? <div className="p-6 text-center text-[#737373] text-sm">Sem eventos.</div> : events.map((e) => (
          <div key={e.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-[#141414]">
            <Badge tone={e.kind === "log" ? "neutral" : "info"}>{e.kind}</Badge>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-[#737373]">{e.assigned_instance || "—"} · {(e.label || "").slice(0, 60)}</div>
              <pre className="text-xs text-[#A1A1A1] whitespace-pre-wrap mono mt-0.5">{(e.text || "").slice(0, 300)}</pre>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface PrRow { repo: string; owner: string; pr_number: number; branch: string; base: string; url: string; in_progress: boolean; rebase_failures: number }
function PrsTab() {
  const { data, loading, error } = useApi<{ prs: PrRow[] }>("/api/admin/control-center/prs", 15000);
  if (loading && !data) return <Loading />; if (error) return <ErrorState message={error} />;
  const prs = data?.prs ?? [];
  if (prs.length === 0) return <Card className="p-10 text-center text-[#737373] text-sm">Nenhum PR monitorado.</Card>;
  return (
    <Card className="overflow-hidden"><table className="min-w-full text-sm">
      <thead className="bg-[#0F0F0F] text-xs uppercase tracking-wider text-[#737373]"><tr className="text-left"><th className="px-4 py-3 font-medium">Repo</th><th className="px-4 py-3 font-medium">PR</th><th className="px-4 py-3 font-medium">Branch</th><th className="px-4 py-3 font-medium">Estado</th></tr></thead>
      <tbody className="divide-y divide-[#1f1f1f]">{prs.map((p) => (
        <tr key={`${p.repo}#${p.pr_number}`} className="hover:bg-[#141414]">
          <td className="px-4 py-3 text-[#FAFAFA]">{p.repo}</td>
          <td className="px-4 py-3"><a href={p.url} target="_blank" rel="noopener" className="text-[#06B6D4] hover:underline">#{p.pr_number}</a></td>
          <td className="px-4 py-3"><code className="text-xs text-[#A1A1A1]">{p.branch} → {p.base}</code></td>
          <td className="px-4 py-3">{p.rebase_failures > 0 ? <Badge tone="error">rebase x{p.rebase_failures}</Badge> : p.in_progress ? <Badge tone="info">building</Badge> : <Badge tone="neutral">tracked</Badge>}</td>
        </tr>))}</tbody>
    </table></Card>
  );
}

function BanksTab() {
  const { data, loading, error } = useApi<{ memory: unknown[]; skill: unknown[]; rules: unknown[] }>("/api/admin/control-center/banks");
  if (loading) return <Loading />; if (error) return <ErrorState message={error} />;
  const kinds: [string, unknown[]][] = [["Memory", data?.memory ?? []], ["Skill", data?.skill ?? []], ["Rules", data?.rules ?? []]];
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {kinds.map(([k, arr]) => (
        <Card key={k} className="p-5"><div className="text-xs uppercase tracking-wide text-[#737373]">{k} bank</div>
          <div className="text-3xl mono font-semibold text-[#FAFAFA] mt-1">{arr.length}</div>
          <div className="text-xs text-[#737373] mt-2">documento(s)</div></Card>
      ))}
    </div>
  );
}

interface Backup { n: number; path: string; size: number; age_str: string }
function BackupsTab() {
  const { data, loading, error } = useApi<{ backups: Record<string, Backup[]> }>("/api/admin/control-center/backups");
  if (loading) return <Loading />; if (error) return <ErrorState message={error} />;
  const entries = Object.entries(data?.backups ?? {});
  return (
    <div className="space-y-4">
      {entries.map(([db, list]) => (
        <Card key={db} className="p-5">
          <div className="flex items-center gap-2 mb-3"><Database className="w-4 h-4 text-[#06B6D4]" /><h3 className="font-semibold text-[#FAFAFA]">{db}</h3><span className="text-xs text-[#737373]">{list.length} snapshots</span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {list.map((b) => (
              <div key={b.n} className="rounded-md border border-[#262626] bg-[#0F0F0F] px-3 py-2 text-xs">
                <div className="text-[#FAFAFA] mono">bak.{b.n}</div>
                <div className="text-[#737373]">{(b.size / 1024).toFixed(0)} KB · {b.age_str}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
