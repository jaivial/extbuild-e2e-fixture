import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Bot, Compass, FolderGit2, GitPullRequest, LayoutDashboard,
  ListTodo, MessagesSquare, Server, UserCircle, Users, UsersRound, WandSparkles,
} from "lucide-react";
import { useUser } from "../components/Layout";
import { useApi, useControlCenterSocket } from "../lib/hooks";
import { Card, StatCard, uptime } from "../components/ui";
import type { Instance, OverviewStats, UserRow } from "../lib/types";

function Bar({ pct, color }: { pct?: number; color: string }) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <div className="progress-container mt-2">
      <div className={`progress-bar ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function LocalMetrics({ local }: { local: Instance | null }) {
  if (!local) return <div className="text-sm text-[#A1A1A1]">Local coordinator unavailable.</div>;
  const m = local.metrics || {};
  const cpu = m.cpu || {}, mem = m.memory || {}, dsk = m.disk || {}, gpu = m.gpu || {}, os = m.os || {};
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <div className="text-xs text-[#A1A1A1]">CPU {cpu.cores_logical ?? "?"} cores</div>
        <div className="text-2xl mono font-semibold text-[#FAFAFA]">{cpu.percent ?? 0}%</div>
        <Bar pct={cpu.percent} color="cyan" />
      </div>
      <div>
        <div className="text-xs text-[#A1A1A1]">RAM</div>
        <div className="text-2xl mono font-semibold text-[#FAFAFA]">{mem.used_gb ?? 0}/{mem.total_gb ?? 0} GB</div>
        <Bar pct={mem.percent} color="green" />
      </div>
      <div>
        <div className="text-xs text-[#A1A1A1]">Disco</div>
        <div className="text-2xl mono font-semibold text-[#FAFAFA]">{dsk.used_gb ?? 0}/{dsk.total_gb ?? 0} GB</div>
        <Bar pct={dsk.percent} color="purple" />
      </div>
      <div>
        <div className="text-xs text-[#A1A1A1]">Sistema</div>
        <div className="text-base font-semibold text-[#FAFAFA]">{os.mac_model || os.machine || "?"}</div>
        <div className="text-xs text-[#737373] mt-1">uptime: {uptime(m.uptime_seconds)} · {os.hostname || ""}</div>
        {gpu.name && <div className="text-xs text-[#06B6D4] mt-2">{gpu.name}</div>}
      </div>
    </div>
  );
}

function InstanceCard({ i }: { i: Instance }) {
  const m = i.metrics || {};
  const cpu = m.cpu || {}, mem = m.memory || {}, disk = m.disk || {}, gpu = m.gpu || {}, os = m.os || {};
  const isCoord = i.role === "coordinator";
  const state = isCoord ? "Coordinator" : i.online ? "Online" : "Offline";
  const color = isCoord ? "text-[#06B6D4]" : i.online ? "text-[#22C55E]" : "text-[#EF4444]";
  const tasks = (i.current_tasks || [])
    .map((t) => (typeof t === "object" ? t.label || t.id : t))
    .filter(Boolean);
  return (
    <article className="rounded-lg border border-[#404040] bg-[#141414] p-4 min-w-0">
      <div className="flex justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-[#FAFAFA] truncate">{i.instance_id}</div>
          <div className="text-[11px] text-[#737373] mono truncate">{i.advertise_ip || "local"} · {i.version || "—"}</div>
        </div>
        <span className={`${color} text-[10px] uppercase font-semibold`}>{state}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div><span className="text-[#737373]">CPU</span><b className="block text-[#FAFAFA]">{cpu.percent ?? "—"}% · {cpu.cores_logical || "?"}c</b></div>
        <div><span className="text-[#737373]">Memory</span><b className="block text-[#FAFAFA]">{mem.used_gb ?? "—"}/{mem.total_gb ?? "—"} GB</b></div>
        <div><span className="text-[#737373]">Disk</span><b className="block text-[#FAFAFA]">{disk.percent ?? "—"}%</b></div>
        <div><span className="text-[#737373]">Uptime</span><b className="block text-[#FAFAFA]">{uptime(m.uptime_seconds)}</b></div>
      </div>
      <div className="mt-3 pt-2 border-t border-[#262626] text-[11px] text-[#737373] truncate">
        {tasks.length ? `task: ${tasks.join(" · ")}` : `${os.mac_model || os.machine || i.role || "worker"} · idle`}
        {gpu.name ? ` · ${gpu.name}` : ""}
      </div>
    </article>
  );
}

export default function Overview() {
  const user = useUser();
  const admin = user.is_admin;
  const [instances, setInstances] = useState<Instance[]>([]);

  useControlCenterSocket(
    ["instances"],
    useMemo(
      () => (data: Record<string, unknown>) => {
        const section = data["instances"] as { instances?: Instance[] } | undefined;
        if (section?.instances) setInstances(section.instances);
      },
      [],
    ),
  );

  const overview = useApi<OverviewStats>(admin ? "/api/panel/overview" : null);
  const users = useApi<{ users: UserRow[] }>(admin ? "/api/users" : null);
  const prs = useApi<{ prs?: unknown[] }>(admin ? "/api/panel/prs" : null);

  const local = instances.find((i) => i.is_local || i.role === "coordinator") || null;
  const fleet = {
    online: instances.filter((i) => i.online || i.role === "coordinator").length,
    busy: instances.filter((i) => (i.in_flight || 0) > 0).length,
    offline: instances.filter((i) => !i.online && i.role !== "coordinator").length,
  };

  return (
    <div>
      <header className="mb-8 flex items-center gap-3">
        <LayoutDashboard className="w-8 h-8 text-[#06B6D4]" />
        <div>
          <h1 className="text-3xl font-semibold text-[#FAFAFA] leading-tight">Overview</h1>
          <p className="text-[#A1A1A1] text-sm mt-1">
            {admin ? "Estado operacional do SAGE." : "Seu espaço de trabalho no SAGE."}
          </p>
        </div>
      </header>

      <div className={`grid grid-cols-1 ${admin ? "md:grid-cols-4" : ""} gap-4 mb-8`}>
        {admin && (
          <>
            <StatCard
              icon={Users}
              label="Usuários dashboard"
              value={users.data?.users.length ?? "…"}
              meta={`${users.data?.users.reduce((a, u) => a + (u.active_sessions || 0), 0) ?? 0} sessão(ões) ativas`}
            />
            <StatCard
              icon={ListTodo}
              label="Fila de tarefas"
              value={overview.data?.stats.queued ?? 0}
              meta={
                <span className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${overview.data?.stats.running ? "bg-[#22C55E]" : "bg-[#525252]"}`} />
                  {overview.data?.stats.running ? `${overview.data.stats.running} em execução` : "nenhum em execução"}
                  {" · "}{overview.data?.stats.done ?? 0} concluídas
                </span>
              }
            />
            <StatCard
              icon={GitPullRequest}
              label="PRs monitorados"
              value={prs.data?.prs?.length ?? 0}
              meta="auto-rebase + feedback tracking"
            />
          </>
        )}
        <div className="stat-card">
          <UserCircle className="stat-icon" />
          <div className="stat-label">Sua conta</div>
          <div className="text-lg font-semibold text-[#FAFAFA] mt-2">{user.username}</div>
          <div className="text-xs text-[#737373] mt-1 truncate">
            Discord: <span className="text-[#06B6D4]">@{user.discord_username}</span>
          </div>
          {admin && <div className="mt-2"><span className="status-badge neutral">ADMIN</span></div>}
        </div>
      </div>

      {admin && (
        <>
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <WandSparkles className="w-5 h-5 text-[#06B6D4]" />
                <div>
                  <h2 className="text-lg font-semibold text-[#FAFAFA]">Orquestrador (local)</h2>
                  <p className="text-xs text-[#737373]">Live WebSocket telemetry · esta máquina</p>
                </div>
              </div>
              <span className="status-dot" />
            </div>
            <LocalMetrics local={local} />
          </Card>

          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[#06B6D4]" />
                <div>
                  <h2 className="text-lg font-semibold text-[#FAFAFA]">Live instances</h2>
                  <p className="text-xs text-[#737373]">WebSocket updates from coordinator and workers</p>
                </div>
              </div>
              <Link to="/admin/control-center" className="text-xs text-[#06B6D4] hover:text-[#22D3EE]">Open Control Center</Link>
            </div>
            {instances.length === 0 ? (
              <div className="text-sm text-[#737373]">Connecting to fleet…</div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {instances.map((i) => <InstanceCard key={i.instance_id} i={i} />)}
              </div>
            )}
          </Card>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {admin && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="w-5 h-5 text-[#06B6D4]" />
              <h2 className="text-lg font-semibold text-[#FAFAFA]">Frota SAGE</h2>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="text-2xl mono font-semibold text-[#22C55E]">{fleet.online}</div><div className="text-xs text-[#737373]">online</div></div>
              <div><div className="text-2xl mono font-semibold text-[#F59E0B]">{fleet.busy}</div><div className="text-xs text-[#737373]">ocupado</div></div>
              <div><div className="text-2xl mono font-semibold text-[#737373]">{fleet.offline}</div><div className="text-xs text-[#737373]">offline</div></div>
            </div>
            <Link to="/admin/control-center" className="mt-4 inline-flex items-center gap-2 text-[#06B6D4] hover:text-[#0891B2] transition text-sm">
              Open instances in Control Center <ArrowRight className="w-4 h-4" />
            </Link>
          </Card>
        )}
        <Card className={`p-6 ${!admin ? "lg:col-span-2" : ""}`}>
          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-5 h-5 text-[#06B6D4]" />
            <h2 className="text-lg font-semibold text-[#FAFAFA]">Quick access</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-2 text-sm">
            <Link to="/chats" className="btn-secondary justify-center"><MessagesSquare className="w-4 h-4" />Chats</Link>
            <Link to="/projects" className="btn-secondary justify-center"><FolderGit2 className="w-4 h-4" />Projects</Link>
            <Link to="/the-team" className="btn-secondary justify-center"><UsersRound className="w-4 h-4" />The Team</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
