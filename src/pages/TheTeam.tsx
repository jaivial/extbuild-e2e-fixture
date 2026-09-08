import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Cpu, KeyRound, RefreshCw, ShieldCheck, UsersRound, Workflow, XCircle } from "lucide-react";
import { useApi } from "../lib/hooks";
import { postForm } from "../lib/api";
import { Badge, Card, ErrorState, Loading, toast } from "../components/ui";
import CharacterStage, { type RoleDef } from "../components/CharacterStage";
import type { Gateway } from "../lib/types";

const ROLE_DEFS: RoleDef[] = [
  { key: "senior", label: "Senior", sub: "Orquestrador / Advisor", color: "#06B6D4", glb: "/static/models/senior.glb", sizeMul: 0.85 },
  { key: "junior", label: "Junior", sub: "Dev — escreve código", color: "#F59E0B", glb: "/static/models/junior.glb", sizeMul: 0.82 },
  { key: "planner", label: "Planner", sub: "Planejamento", color: "#10B981", glb: "/static/models/planner.glb", sizeMul: 0.80 },
  { key: "reviewer", label: "Reviewer", sub: "Code review", color: "#A78BFA", glb: "/static/models/reviewer.glb", sizeMul: 0.82 },
  { key: "sage", label: "SAGE", sub: "Chat — agente conversacional", color: "#EC4899", glb: "/static/models/mascot.glb", sizeMul: 0.85 },
];

interface EnginesData {
  current: { engine: string; forced_by_env: boolean };
  engines: string[];
  providers: { cli_route: string; cli_route_forced_by_env: boolean; sage_provider: string; sage_provider_forced_by_env: boolean; minimax_configured: boolean };
}
interface Preflight { install_required: boolean; checks: { name: string; status: string; ok: boolean; detail: string }[] }

export default function TheTeam() {
  const [tab, setTab] = useState<"team" | "pipeline">("team");
  return (
    <div data-testid="team-page">
      <div className="flex justify-center px-4 pt-1 pb-6">
        <div className="team-tabs" role="tablist">
          <button className={`team-tab ${tab === "team" ? "active" : ""}`} onClick={() => setTab("team")}><UsersRound className="w-4 h-4" />Team</button>
          <button className={`team-tab ${tab === "pipeline" ? "active" : ""}`} onClick={() => setTab("pipeline")}><Workflow className="w-4 h-4" />Pipeline</button>
        </div>
      </div>
      {tab === "team" ? <TeamView /> : <PipelineView />}
    </div>
  );
}

function TeamView() {
  const engines = useApi<EnginesData>("/api/engines");
  const roleModels = useApi<{ models_by_provider: Record<string, string[]> }>("/api/proxy/role-models");
  const gateways = useApi<{ gateways: Gateway[] }>("/api/proxy/oauth/gateways", 30000);
  const preflight = useApi<Preflight>("/api/engines/preflight");

  const providers = useMemo(() => Object.keys(roleModels.data?.models_by_provider ?? {}), [roleModels.data]);
  const [roleIdx, setRoleIdx] = useState(0);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  useEffect(() => { if (providers.length && !provider) setProvider(providers[0]); }, [providers, provider]);
  const models = roleModels.data?.models_by_provider[provider] ?? [];
  const role = ROLE_DEFS[roleIdx];

  const engine = engines.data?.current.engine;
  const setEngine = async (e: string) => {
    try { await postForm("/api/engines/set", { engine: e }); toast(`Engine → ${e}`, "success"); engines.reload(); }
    catch (err) { toast((err as Error).message, "error"); }
  };
  const applyModel = async () => {
    try { await postForm("/api/proxy/set-role-model", { role: role.key, provider, model }); toast(`${role.label}: ${model || "default"}`, "success", { title: "Modelo definido" }); }
    catch (err) { toast((err as Error).message, "error"); }
  };

  return (
    <div className="space-y-6">
      {/* ═══ 3D role carousel hero ═══ */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <CharacterStage roles={ROLE_DEFS} selected={roleIdx} onSelect={setRoleIdx} />
        <div className="flex justify-center px-4 py-3 bg-[#0b0f14] border-t border-white/5">
          <div className="team-tabs" role="tablist" aria-label="Team roles">
            {ROLE_DEFS.map((r, i) => (
              <button key={r.key} className={`team-tab ${roleIdx === i ? "active" : ""}`} onClick={() => setRoleIdx(i)}
                style={roleIdx === i ? { color: r.color, background: `${r.color}22` } : undefined}>{r.label}</button>
            ))}
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-[#A1A1A1]">Modelo do</span>
              <span className="text-sm font-semibold px-2 py-0.5 rounded" style={{ color: role.color, background: `${role.color}22` }}>{role.label}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#A1A1A1] uppercase tracking-wider mb-1.5">Provider</label>
                <select className="input-field" value={provider} onChange={(e) => { setProvider(e.target.value); setModel(""); }}>
                  {providers.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#A1A1A1] uppercase tracking-wider mb-1.5">Modelo</label>
                <select className="input-field" value={model} onChange={(e) => setModel(e.target.value)}>
                  <option value="">(default)</option>
                  {models.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary mt-3 w-fit" onClick={applyModel}><ShieldCheck className="w-4 h-4" />Definir modelo</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Automation engine */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1"><Cpu className="w-5 h-5 text-[#06B6D4]" /><h2 className="text-lg font-semibold text-[#FAFAFA]">Automation Engine</h2>
            {engines.data?.current.forced_by_env && <Badge tone="warning">forced by env</Badge>}</div>
          <p className="text-xs text-[#737373] mb-4">Switch global entre Client SDK e Harness (CLI). Efeito imediato no próximo run.</p>
          {engines.loading ? <Loading /> : (
            <div className="grid grid-cols-2 gap-3">
              {[["client-sdk", "Client SDK", "AsyncAnthropic + MCP tools in-process"], ["harness", "Harness (CLI)", "claude -p / codex exec — orquestração de main"]].map(([id, title, desc]) => (
                <button key={id} onClick={() => setEngine(id)} className={`text-left rounded-lg border p-4 transition ${engine === id ? "border-[#06B6D4] bg-[#06B6D4]/10" : "border-[#404040] hover:border-[#525252]"}`}>
                  <div className="font-medium text-[#FAFAFA]">{title}</div>
                  <div className="text-xs text-[#737373] mt-1">{desc}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Provider efetivo */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-5 h-5 text-[#06B6D4]" /><h2 className="text-lg font-semibold text-[#FAFAFA]">Provider efetivo</h2></div>
          {engines.loading ? <Loading /> : engines.error ? <ErrorState message={engines.error} /> : (
            <div className="space-y-2 text-sm">
              <Row label="CLI route" value={engines.data?.providers.cli_route} forced={engines.data?.providers.cli_route_forced_by_env} />
              <Row label="SAGE provider" value={engines.data?.providers.sage_provider} forced={engines.data?.providers.sage_provider_forced_by_env} />
              <Row label="MiniMax" value={engines.data?.providers.minimax_configured ? "configurado" : "—"} />
            </div>
          )}
        </Card>

        {/* Prerequisites */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4"><RefreshCw className="w-5 h-5 text-[#06B6D4]" /><h2 className="text-lg font-semibold text-[#FAFAFA]">Pré-requisitos do Harness</h2></div>
          {preflight.loading ? <Loading /> : preflight.error ? <ErrorState message={preflight.error} /> : (
            <div className="space-y-1.5">
              {(preflight.data?.checks ?? []).map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  {c.ok ? <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" /> : <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />}
                  <b className="text-[#FAFAFA]">{c.name}</b><span className="text-[#737373] text-xs truncate">{c.detail}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* OAuth gateways */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4"><KeyRound className="w-5 h-5 text-[#06B6D4]" /><h2 className="text-lg font-semibold text-[#FAFAFA]">Assinaturas Claude (OAuth)</h2></div>
          {gateways.loading ? <Loading /> : gateways.error ? <ErrorState message={gateways.error} /> : (
            <div className="space-y-2 mb-4">
              {(gateways.data?.gateways ?? []).map((g) => (
                <div key={g.instance} className="rounded-lg border border-[#262626] bg-[#0F0F0F] px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-[#FAFAFA]">Gateway #{g.instance}<span className="mono text-xs text-[#737373]">:{g.port} · {g.unit}</span></div>
                    {g.email && <div className="text-xs text-[#A1A1A1] mt-0.5">{g.email}</div>}
                  </div>
                  <div className="flex items-center gap-3"><span className="text-xs text-[#737373]">{g.model_count} models</span><Badge tone={g.responding ? "success" : "error"}>{g.responding ? "online" : "offline"}</Badge></div>
                </div>
              ))}
            </div>
          )}
          <a href="/api/proxy/oauth/start" className="btn-primary"><KeyRound className="w-4 h-4" />Continue with Claude</a>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, forced }: { label: string; value?: string; forced?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-2">
      <span className="text-[#737373]">{label}</span>
      <span className="flex items-center gap-2 text-[#FAFAFA] mono">{value || "—"}{forced && <Badge tone="warning">env</Badge>}</span>
    </div>
  );
}

const STAGES = [
  { name: "Planner", desc: "gera o plano e aguarda aprovação" },
  { name: "Senior / Junior Dev", desc: "implementa as mudanças" },
  { name: "Reviewer", desc: "revisa o diff e aponta feedback" },
  { name: "Integrate", desc: "commit, push e abre o PR" },
];
function PipelineView() {
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6"><Workflow className="w-5 h-5 text-[#06B6D4]" /><h2 className="text-lg font-semibold text-[#FAFAFA]">Pipeline SAGE</h2></div>
        <div className="space-y-3">
          {STAGES.map((s, i) => (
            <div key={s.name} className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full grid place-items-center border border-[#06B6D4]/40 bg-[#06B6D4]/10 text-[#06B6D4] font-semibold shrink-0">{i + 1}</div>
              <div><div className="text-[#FAFAFA] font-medium">{s.name}</div><div className="text-xs text-[#737373]">{s.desc}</div></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
