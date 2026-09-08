import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CloudDownload, CornerDownRight, FolderGit2, FolderPlus, GitBranch,
  GitCommitHorizontal, GitFork, Hammer, MessageCircle, Plus, X,
} from "lucide-react";
import { useSocket } from "../lib/hooks";
import { api, sendJson, postForm } from "../lib/api";
import { toast } from "../components/ui";

interface Commit { sha?: string; subject?: string }
interface Worktree { branch?: string }
interface PStatus {
  pr?: { pr_number?: number; head_sha?: string } | null;
  task?: { state?: string } | null;
  build?: { status?: string; repo?: string } | null;
  artifact?: { available?: boolean } | null;
  secrets?: { conflicts?: number; pending?: number };
  builder?: { available?: boolean };
  profiles?: { profile_name: string }[];
  manual_build_enabled?: boolean;
  build_repo?: string;
}
interface Project {
  name: string; branch: string; detached?: boolean; dirty?: boolean;
  worktrees?: Worktree[]; last_commit?: Commit | null; updated_at?: string; status?: PStatus;
}
interface RemoteAhead { branch?: string; head_sha?: string; pusher?: string; head_message?: string }

function relTime(iso?: string) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

export default function Projects() {
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [ahead, setAhead] = useState<Map<string, RemoteAhead>>(new Map());
  const [chatProject, setChatProject] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const navigate = useNavigate();

  const refreshStatus = async (name?: string) => {
    if (!name) return;
    try {
      const d = await api.get<{ projects: Project[] }>("/api/projects");
      const latest = (d.projects || []).find((p) => p.name === name);
      if (latest) setProjects((m) => new Map(m).set(name, latest));
    } catch { /* ignore */ }
  };

  const onEvent = useMemo(() => (ev: Record<string, unknown>) => {
    const type = ev.type as string;
    if (type === "snapshot") {
      const m = new Map<string, Project>();
      ((ev.projects as Project[]) || []).forEach((p) => m.set(p.name, p));
      setProjects(m);
    } else if (type === "project_added" || type === "project_updated") {
      const p = ev.project as Project;
      setProjects((prev) => new Map(prev).set(p.name, p));
    } else if (type === "project_removed") {
      setProjects((prev) => { const m = new Map(prev); m.delete(ev.name as string); return m; });
    } else if (type === "github_push") {
      const repo = ev.repo as string;
      setProjects((prev) => {
        const p = prev.get(repo);
        if (p && p.branch === (ev.branch as string)) setAhead((a) => new Map(a).set(repo, ev as RemoteAhead));
        return prev;
      });
    } else if (type === "project_pr_changed" || type === "build_changed" || type === "project_task_changed" || type === "secret_sync_changed") {
      refreshStatus((ev.repo as string) || ((ev.build as { repo?: string })?.repo));
    }
  }, []);

  const live = useSocket("/ws/projects", onEvent);
  const list = [...projects.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FolderGit2 className="w-8 h-8 text-[#06B6D4]" />
          <div>
            <h1 className="text-3xl font-semibold text-[#FAFAFA] leading-tight">Projects</h1>
            <p className="text-[#A1A1A1] text-sm mt-1">
              Repos locais em <code className="text-xs text-[#737373] bg-[#171717] px-1.5 py-0.5 rounded">~/projects</code> — branch e worktrees em tempo real.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`live-pill ${live ? "on" : ""}`}><span className="pulse" />{live ? "live" : "conectando…"}</span>
          <span className="text-xs text-[#525252]">{list.length ? `${list.length} ${list.length === 1 ? "projeto" : "projetos"}` : ""}</span>
          <button onClick={() => setWizard(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" />Add project</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.length === 0 ? (
          <div className="col-span-full card p-10 text-center border-dashed">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#171717] border border-[#262626] flex items-center justify-center">
              <FolderPlus className="w-7 h-7 text-[#525252]" />
            </div>
            <p className="text-sm text-[#A1A1A1] mb-1">Nenhum projeto local detectado</p>
            <p className="text-xs text-[#737373]">Projetos aparecem aqui quando são provisionados em <code>~/projects</code>.</p>
          </div>
        ) : list.map((p) => (
          <ProjectCard key={p.name} p={p} ahead={ahead.get(p.name)} onNewChat={() => setChatProject(p.name)} onBuilt={() => refreshStatus(p.name)} />
        ))}
      </div>

      {chatProject && <NewChatModal project={chatProject} onClose={() => setChatProject(null)} navigate={navigate} />}
      {wizard && <AddProjectWizard onClose={() => setWizard(false)} onEvent={onEvent} />}
    </div>
  );
}

function ProjectCard({ p, ahead, onNewChat, onBuilt }: { p: Project; ahead?: RemoteAhead; onNewChat: () => void; onBuilt: () => void }) {
  const st = p.status || {};
  const pr = st.pr, task = st.task, build = st.build, artifact = st.artifact;
  const profiles = st.profiles || [];
  const badges: React.ReactNode[] = [];
  if (pr?.pr_number) badges.push(<span key="pr" className="status-badge info text-xs">PR #{pr.pr_number}</span>);
  if (task?.state) badges.push(<span key="task" className="status-badge warning text-xs">task {task.state}</span>);
  if (build?.status) badges.push(<span key="build" className={`status-badge ${build.status === "succeeded" ? "success" : build.status === "failed" ? "error" : "info"} text-xs`}>build {build.status}</span>);
  if (artifact?.available) badges.push(<span key="art" className="status-badge success text-xs">artifact available</span>);
  if (st.secrets?.conflicts) badges.push(<span key="sc" className="status-badge error text-xs">secret conflict</span>);
  else if (st.secrets?.pending) badges.push(<span key="sp" className="status-badge warning text-xs">secret sync</span>);
  if (st.builder && !st.builder.available) badges.push(<span key="bo" className="status-badge neutral text-xs">builder offline</span>);
  const wts = p.worktrees || [];
  const showAhead = ahead && ahead.branch === p.branch;

  const doBuild = async () => {
    try {
      const d = await sendJson<{ build: { status: string } }>("/api/builds", "POST", {
        repo: st.build_repo || p.name, profile_name: profiles[0]?.profile_name,
        pr_number: Number(pr?.pr_number), head_sha: pr?.head_sha,
      });
      toast(`Build ${d.build.status} para ${st.build_repo || p.name}`, "success");
      onBuilt();
    } catch (e) { toast(`Build não criado: ${(e as Error).message}`, "error"); }
  };

  return (
    <div className="card project-card" data-name={p.name}>
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center shrink-0">
            <FolderGit2 className="w-3.5 h-3.5 text-[#06B6D4]" />
          </div>
          <a href={`/projects/${encodeURIComponent(p.name)}`} className="text-sm font-semibold text-[#FAFAFA] truncate hover:text-[#06B6D4]">{p.name}</a>
        </div>
        <span className="flex items-center gap-1.5 shrink-0">
          {showAhead && <span className="status-badge info text-xs shrink-0" title={`push remoto de ${ahead?.pusher || "?"}`}><CloudDownload className="w-3 h-3" />remote ahead</span>}
          {p.dirty ? <span className="status-badge warning text-xs" title="mudanças não commitadas">dirty</span> : <span className="status-badge success text-xs">clean</span>}
        </span>
      </div>
      <div className="branch-row min-w-0">
        <span className="branch-chip">
          <GitBranch className={`w-3.5 h-3.5 ${p.detached ? "text-[#F59E0B]" : "text-[#06B6D4]"} shrink-0`} />
          <code className={`text-xs ${p.detached ? "text-[#F59E0B]" : "text-[#E5E5E5]"} truncate`} title={p.branch}>{p.branch}</code>
          {p.detached && <span className="text-[10px] text-[#F59E0B] shrink-0">detached</span>}
        </span>
      </div>
      {wts.length > 0 && (
        <div className="worktree-block">
          <div className="text-[10px] text-[#525252] uppercase tracking-wide mb-1 flex items-center gap-1"><GitFork className="w-3 h-3" />{wts.length} worktree{wts.length > 1 ? "s" : ""}</div>
          {wts.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-[#A1A1A1] py-0.5 min-w-0"><CornerDownRight className="w-3 h-3 text-[#404040] shrink-0" /><code className="truncate">{w.branch || "(detached)"}</code></div>
          ))}
        </div>
      )}
      <div className="card-footer-row min-w-0">
        {p.last_commit?.subject ? (
          <div className="flex items-center gap-1.5 text-xs text-[#737373] min-w-0" title={p.last_commit.subject}>
            <GitCommitHorizontal className="w-3.5 h-3.5 text-[#404040] shrink-0" />
            <code className="text-[#525252] shrink-0">{p.last_commit.sha || ""}</code>
            <span className="truncate">{p.last_commit.subject}</span>
          </div>
        ) : <span />}
        <span className="text-[10px] text-[#525252] shrink-0 ml-2">{relTime(p.updated_at)}</span>
      </div>
      {badges.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{badges}</div>}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={onNewChat}><MessageCircle className="w-3.5 h-3.5 text-[#06B6D4]" />New Chat</button>
        {st.manual_build_enabled && pr && profiles.length > 0 && (
          <button className="btn-primary text-xs flex items-center gap-1.5" onClick={doBuild}><Hammer className="w-3.5 h-3.5" />Build</button>
        )}
      </div>
    </div>
  );
}

function NewChatModal({ project, onClose, navigate }: { project: string; onClose: () => void; navigate: (to: string) => void }) {
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [dev, setDev] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const create = async () => {
    setBusy(true); setErr("");
    try {
      const d = await sendJson<{ chat_id: number }>("/api/chats/create", "POST", { title: title.trim(), repos: [project], message: msg.trim(), dev_mode: dev });
      navigate(`/chats`); onClose();
      toast("Chat criado.", "success");
      void d;
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };
  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box card">
        <div className="modal-header"><h2 className="text-lg font-semibold text-[#FAFAFA]">Novo chat · {project}</h2><button className="modal-close-btn" onClick={onClose}><X className="w-4 h-4" /></button></div>
        <div className="modal-body space-y-3">
          <input className="input-field" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className="input-field" rows={3} placeholder="Primeira mensagem (opcional)" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-[#A1A1A1]"><input type="checkbox" checked={dev} onChange={(e) => setDev(e.target.checked)} className="accent-[#06B6D4]" />DevMode</label>
          {err && <div className="text-sm text-[#EF4444]">{err}</div>}
          <div className="flex justify-end gap-2"><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={create}>Criar chat</button></div>
        </div>
      </div>
    </div>
  );
}

interface Repo { full_name: string; name: string; owner: string; installation_id: number; default_branch: string }
function AddProjectWizard({ onClose, onEvent }: { onClose: () => void; onEvent: (ev: Record<string, unknown>) => void }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | "error">(1);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [detail, setDetail] = useState("");
  const jobId = useRef<string | null>(null);

  useEffect(() => { api.get<{ repos: Repo[] }>("/api/github/repos").then((d) => setRepos(d.repos || [])).catch(() => {}); }, []);
  useSocket("/ws/projects", (ev) => {
    if (ev.type === "clone" && jobId.current && ev.job_id === jobId.current) {
      const s = ev.status as string;
      if (s === "cloning" || s === "checking_out") setDetail((ev.detail as string) || s);
      else if (s === "done") { setDetail((ev.detail as string) || ""); setStep(4); }
      else if (s === "error") { setDetail((ev.detail as string) || "erro"); setStep("error"); }
    }
    onEvent(ev);
  });

  const pickRepo = async (r: Repo) => {
    setRepo(r); setStep(2);
    try {
      const d = await api.get<{ branches: string[] }>(`/api/github/repos/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.name)}/branches`);
      setBranches(d.branches || []); setBranch(r.default_branch);
    } catch { setBranches([r.default_branch]); setBranch(r.default_branch); }
  };
  const clone = async () => {
    if (!repo) return;
    setStep(3); setDetail("iniciando…");
    try {
      const d = await postForm<{ job_id: string }>("/api/projects/clone", { owner: repo.owner, repo: repo.name, branch, installation_id: String(repo.installation_id || 0) });
      jobId.current = d.job_id;
    } catch (e) { setDetail((e as Error).message); setStep("error"); }
  };

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box card">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Add project</h2>
          <button className="modal-close-btn" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="modal-body">
          {step === 1 && (
            <div>
              <p className="text-sm text-[#A1A1A1] mb-3">Escolha um repositório para clonar.</p>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {repos.map((r) => (
                  <div key={r.full_name} className="repo-item" onClick={() => pickRepo(r)}>
                    <FolderGit2 className="w-4 h-4 text-[#06B6D4] shrink-0" />
                    <div className="min-w-0"><div className="text-sm text-[#FAFAFA] truncate">{r.full_name}</div><div className="text-xs text-[#525252]">{r.default_branch}</div></div>
                  </div>
                ))}
                {repos.length === 0 && <div className="text-sm text-[#737373] py-6 text-center">Carregando repositórios…</div>}
              </div>
            </div>
          )}
          {step === 2 && repo && (
            <div>
              <p className="text-sm text-[#A1A1A1] mb-3">Branch de <b className="text-[#FAFAFA]">{repo.full_name}</b>:</p>
              <div className="space-y-1 max-h-72 overflow-y-auto mb-4">
                {branches.map((b) => (
                  <div key={b} className={`branch-item ${branch === b ? "selected" : ""}`} onClick={() => setBranch(b)}>
                    <GitBranch className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" /><code className="text-xs truncate">{b}</code>
                  </div>
                ))}
              </div>
              <div className="flex justify-between"><button className="btn-secondary" onClick={() => setStep(1)}>Voltar</button><button className="btn-primary" onClick={clone}>Clonar {branch}</button></div>
            </div>
          )}
          {step === 3 && (
            <div className="text-center py-8"><div className="spinner mx-auto mb-4" /><p className="text-sm text-[#A1A1A1]">{detail}</p></div>
          )}
          {step === 4 && (
            <div className="text-center py-8"><div className="text-4xl mb-3">✅</div><p className="text-[#FAFAFA] font-medium">Projeto clonado!</p><p className="text-xs text-[#737373] mt-1">{detail}</p><button className="btn-primary mt-5" onClick={onClose}>Fechar</button></div>
          )}
          {step === "error" && (
            <div className="text-center py-8"><div className="text-4xl mb-3">⚠️</div><p className="text-[#EF4444] font-medium">Falha ao clonar</p><p className="text-xs text-[#737373] mt-1">{detail}</p><button className="btn-secondary mt-5" onClick={() => setStep(1)}>Tentar de novo</button></div>
          )}
        </div>
      </div>
    </div>
  );
}
