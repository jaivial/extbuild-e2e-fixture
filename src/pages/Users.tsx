import { useEffect, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, CircleCheckBig, KeyRound, Link as LinkIcon, Lock,
  LogOut, RefreshCw, Settings2, Shield, ShieldCheck, Trash2, UserCheck,
  UserPlus, Users as UsersIcon, X,
} from "lucide-react";
import { useUser } from "../components/Layout";
import { api, postForm } from "../lib/api";
import { GithubIcon, Modal, ModalShell, toast } from "../components/ui";
import type { ApprovalRequest, UserRow } from "../lib/types";

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
  catch { return iso; }
};

type ModalState =
  | null
  | { kind: "promote"; id: number; name: string }
  | { kind: "reset"; id: number; name: string }
  | { kind: "delete"; id: number; name: string }
  | { kind: "decline"; id: number; name: string }
  | { kind: "invite" };

export default function Users() {
  const me = useUser();
  const [tab, setTab] = useState<"approvals" | "users">(
    location.hash === "#users" ? "users" : "approvals",
  );
  const [users, setUsers] = useState<UserRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [pts, setPts] = useState<Record<number, string>>({});

  const loadUsers = () =>
    api.get<{ users: UserRow[] }>("/api/users").then((d) => {
      setUsers(d.users);
      const p: Record<number, string> = {};
      d.users.forEach((u) => (p[u.id] = String(u.role_points)));
      setPts(p);
    }).catch((e) => toast("Falha ao carregar usuários: " + e.message, "error"));
  const loadApprovals = () =>
    api.get<{ requests: ApprovalRequest[] }>("/api/users/approvals?status=pending")
      .then((d) => setApprovals(d.requests || []))
      .catch((e) => toast("Falha ao carregar: " + e.message, "error"));

  useEffect(() => { loadUsers(); loadApprovals(); }, []);
  const switchTab = (t: "approvals" | "users") => {
    setTab(t); history.replaceState(null, "", t === "users" ? "#users" : "#approvals");
    if (t === "approvals") loadApprovals(); else loadUsers();
  };

  async function decide(id: number, decision: "approve" | "decline", note = "") {
    try {
      await postForm(`/api/users/${id}/approval`, { decision, note });
      setModal(null);
      toast(decision === "approve" ? "Conta aprovada. O usuário já pode entrar." : "Solicitação recusada.", "success", { title: "Fila atualizada" });
      loadApprovals(); loadUsers();
    } catch (e) { toast((e as Error).message, "error"); }
  }
  async function setRole(id: number, is_admin: string, okMsg: string) {
    try { await postForm(`/api/users/${id}/admin`, { is_admin }); setModal(null); toast(okMsg, "success", { title: "Papel atualizado" }); loadUsers(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  async function savePoints(id: number) {
    try { const d = await postForm<{ user: { role_points: number } }>(`/api/users/${id}/points`, { points: pts[id] }); toast(`Pontos ajustados para ${d.user.role_points}.`, "success", { title: "Hierarquia" }); loadUsers(); }
    catch (e) { toast((e as Error).message, "error"); }
  }
  async function revoke(id: number, name: string) {
    if (!confirm(`Derrubar todas as sessões de ${name}?`)) return;
    try { const d = await postForm<{ sessions_removed: number }>(`/api/users/${id}/revoke-sessions`); toast(`${d.sessions_removed} sessão(ões) derrubada(s).`, "success", { title: "Sessões revogadas" }); loadUsers(); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  const pending = approvals.length;

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-8 h-8 text-[#06B6D4]" />
          <div>
            <h1 className="text-3xl font-semibold text-[#FAFAFA] leading-tight">Usuários</h1>
            <p className="text-[#A1A1A1] text-sm mt-1">
              Gestão de contas do dashboard · hierarquia por pontos
              <span className="status-badge neutral ml-2">seus pontos: {me.role_points}</span>
            </p>
          </div>
        </div>
        <button onClick={() => setModal({ kind: "invite" })} className="btn-primary"><UserPlus className="w-4 h-4" />Convidar</button>
      </header>

      <div className="admin-tabs" role="tablist">
        <button className={`admin-tab ${tab === "approvals" ? "active" : ""}`} onClick={() => switchTab("approvals")}>
          <UserCheck className="w-4 h-4" /> Aprovações <span className="tab-count">{pending}</span>
        </button>
        <button className={`admin-tab ${tab === "users" ? "active" : ""}`} onClick={() => switchTab("users")}>
          <Settings2 className="w-4 h-4" /> Todos os usuários
        </button>
      </div>

      {tab === "approvals" ? (
        <section>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-semibold text-[#FAFAFA]">Fila de aprovação</h2>
              <p className="text-sm text-[#737373] mt-1">Solicitações feitas pelo dashboard e pelo fluxo verificado do Discord.</p>
            </div>
            <button className="btn-secondary" onClick={loadApprovals}><RefreshCw className="w-4 h-4" />Atualizar</button>
          </div>
          {pending === 0 ? (
            <div className="card p-8 text-center text-[#737373]">
              <CircleCheckBig className="w-7 h-7 mx-auto mb-2 text-[#22C55E]" />
              Nenhuma solicitação pendente.
            </div>
          ) : (
            <div className="approval-grid">
              {approvals.map((u) => (
                <article key={u.id} className="card approval-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[#FAFAFA] font-medium">{u.username}</div>
                      <div className="text-xs text-[#737373] mt-1">solicitação #{u.id}</div>
                    </div>
                    <span className="status-badge warning">pendente</span>
                  </div>
                  <dl className="approval-meta">
                    <dt>Origem</dt><dd>{(u as { registration_source?: string }).registration_source || "dashboard"}</dd>
                    <dt>Discord</dt><dd>{u.discord_username ? "@" + u.discord_username : "não vinculado"}</dd>
                    <dt>Solicitado</dt><dd>{fmtDate(u.requested_at || (u as { created_at?: string }).created_at)}</dd>
                  </dl>
                  <div className="approval-actions">
                    <button className="approve-button" onClick={() => decide(u.id!, "approve")}><Check className="w-4 h-4" />Aprovar</button>
                    <button className="decline-button" onClick={() => setModal({ kind: "decline", id: u.id!, name: u.username || "" })}><X className="w-4 h-4" />Recusar</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <div className="card p-4 mb-6 text-xs text-[#A1A1A1] flex items-start gap-2">
            <Shield className="w-4 h-4 text-[#06B6D4] flex-shrink-0 mt-0.5" />
            <div>
              <b className="text-[#FAFAFA]">Hierarquia:</b> cada admin tem 1–100 pontos.
              Você só gerencia outro <b>admin</b> se tiver <b>mais pontos</b> que ele.
              Usuários comuns são geridos por qualquer admin.
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#404040] text-left text-xs text-[#737373] uppercase tracking-wider">
                    <th className="px-5 py-3">Usuário</th><th className="px-5 py-3">Discord</th>
                    <th className="px-5 py-3">Papel</th><th className="px-5 py-3">Pontos</th>
                    <th className="px-5 py-3">Sessões</th><th className="px-5 py-3">Último login</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const self = u.id === me.id;
                    const locked = !u.manageable && !self;
                    return (
                      <tr key={u.id} className="border-b border-[#262626] hover:bg-[#141414] transition-colors">
                        <td className="px-5 py-3">
                          <div className="text-[#FAFAFA] font-medium">{u.username}{self && <span className="text-xs text-[#06B6D4]"> (você)</span>}
                            {u.approval_status === "pending" && <span className="status-badge warning ml-1">pendente</span>}
                            {u.approval_status === "declined" && <span className="status-badge error ml-1">recusado</span>}
                          </div>
                          <div className="text-xs text-[#737373]">#{u.id} · criado {fmtDate(u.created_at)}</div>
                        </td>
                        <td className="px-5 py-3 text-[#A1A1A1]">@{u.discord_username || "?"}{u.github_connected ? <GithubIcon className="w-3.5 h-3.5 inline ml-1 text-[#737373]" /> : null}</td>
                        <td className="px-5 py-3">{u.is_admin ? <span className="status-badge neutral">admin</span> : <span className="text-xs text-[#737373]">user</span>}</td>
                        <td className="px-5 py-3">
                          {u.is_admin && u.manageable ? (
                            <span className="inline-flex items-center gap-1">
                              <input type="number" min={1} max={100} value={pts[u.id] ?? ""} onChange={(e) => setPts({ ...pts, [u.id]: e.target.value })} className="points-input" />
                              <button className="row-action" onClick={() => savePoints(u.id)} title="salvar pontos"><Check className="w-3 h-3" /></button>
                            </span>
                          ) : <span className={`font-mono ${u.is_admin ? "text-[#FAFAFA]" : "text-[#737373]"}`}>{u.role_points}</span>}
                        </td>
                        <td className="px-5 py-3 font-mono text-[#A1A1A1]">{u.active_sessions}</td>
                        <td className="px-5 py-3 text-[#A1A1A1] text-xs">{fmtDate(u.last_login_at)}</td>
                        <td className="px-5 py-3 text-right space-x-1 whitespace-nowrap">
                          {self ? (
                            <span className="text-xs text-[#737373]">você · <a href="/account" className="text-[#06B6D4] hover:underline">/account</a></span>
                          ) : locked ? (
                            <span className="inline-flex items-center gap-1 text-xs text-[#737373]" title={(u as { manage_block_reason?: string }).manage_block_reason}><Lock className="w-3.5 h-3.5" /> hierarquia</span>
                          ) : (
                            <>
                              {u.is_admin ? (
                                <button className="row-action danger" onClick={() => { if (confirm(`Rebaixar ${u.username} pra usuário comum?`)) setRole(u.id, "0", `${u.username} rebaixado para usuário comum.`); }} title="rebaixar"><ArrowDown className="w-3 h-3" />rebaixar</button>
                              ) : (
                                <button className="row-action" onClick={() => setModal({ kind: "promote", id: u.id, name: u.username })} title="promover a admin"><ArrowUp className="w-3 h-3" />promover</button>
                              )}
                              <button className="row-action" onClick={() => setModal({ kind: "reset", id: u.id, name: u.username })} title="resetar senha"><KeyRound className="w-3 h-3" />senha</button>
                              <button className="row-action" onClick={() => revoke(u.id, u.username)} title="derrubar sessões"><LogOut className="w-3 h-3" />sessões</button>
                              <button className="row-action danger" onClick={() => setModal({ kind: "delete", id: u.id, name: u.username })} title="apagar conta"><Trash2 className="w-3 h-3" /></button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-[#737373]">nenhum usuário</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <UserModals modal={modal} onClose={() => setModal(null)}
        decide={decide} setRole={setRole} loadUsers={loadUsers} />
    </div>
  );
}

function UserModals({ modal, onClose, decide, setRole, loadUsers }: {
  modal: ModalState; onClose: () => void;
  decide: (id: number, d: "approve" | "decline", note?: string) => void;
  setRole: (id: number, is_admin: string, okMsg: string) => void;
  loadUsers: () => void;
}) {
  const [text, setText] = useState("");
  const [inv, setInv] = useState({ id: "", name: "" });
  useEffect(() => { setText(""); setInv({ id: "", name: "" }); }, [modal]);
  if (!modal) return null;

  return (
    <Modal open onClose={onClose}>
      {modal.kind === "decline" && (
        <ModalShell title={`Recusar ${modal.name}`}>
          <p className="text-sm text-[#A1A1A1] mb-3">Opcionalmente registre o motivo interno da decisão.</p>
          <textarea maxLength={500} className="input-field" rows={3} placeholder="Motivo da recusa" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex justify-end mt-3"><button className="decline-button" style={{ flex: "none", padding: "0 .9rem" }} onClick={() => decide(modal.id, "decline", text)}>Recusar solicitação</button></div>
        </ModalShell>
      )}
      {modal.kind === "promote" && (
        <ModalShell title={`Alterar papel de ${modal.name}`}>
          <p className="text-sm text-[#A1A1A1] mb-3">Promover a <b>Admin</b> concede acesso total ao painel.</p>
          <div className="flex items-center gap-3"><button className="btn-primary" onClick={() => setRole(modal.id, "1", "Usuário promovido a admin.")}><ShieldCheck className="w-4 h-4" />Aplicar admin</button></div>
        </ModalShell>
      )}
      {modal.kind === "reset" && (
        <ModalShell title={`Resetar senha de ${modal.name}`}>
          <p className="text-sm text-[#A1A1A1] mb-3">Define uma senha nova (mín. 8) e <b>derruba todas as sessões</b>.</p>
          <div className="flex items-center gap-3">
            <input type="password" minLength={8} placeholder="nova senha" className="points-input" style={{ width: "14rem" }} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn-primary" onClick={async () => { try { await postForm(`/api/users/${modal.id}/reset-password`, { new_password: text }); onClose(); toast("Senha redefinida e sessões derrubadas.", "success", { title: "Senha resetada" }); loadUsers(); } catch (e) { toast((e as Error).message, "error"); } }}><KeyRound className="w-4 h-4" />Resetar</button>
          </div>
        </ModalShell>
      )}
      {modal.kind === "delete" && (
        <ModalShell title={`Apagar ${modal.name}`}>
          <p className="text-sm text-[#A1A1A1] mb-3">Remove a conta, sessões e conexão GitHub. <b className="text-[#EF4444]">Irreversível.</b> Digite <code className="font-mono text-[#06B6D4]">{modal.name}</code> pra confirmar.</p>
          <div className="flex items-center gap-3">
            <input type="text" placeholder={modal.name} className="points-input" style={{ width: "12rem" }} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn-primary" style={{ background: "#EF4444" }} onClick={async () => { if (text !== modal.name) { toast("A confirmação não confere.", "warning"); return; } try { await postForm(`/api/users/${modal.id}/delete`); onClose(); toast(`Conta de ${modal.name} apagada.`, "success", { title: "Usuário removido" }); loadUsers(); } catch (e) { toast((e as Error).message, "error"); } }}><Trash2 className="w-4 h-4" />Apagar</button>
          </div>
        </ModalShell>
      )}
      {modal.kind === "invite" && (
        <ModalShell title="Convidar usuário">
          <p className="text-sm text-[#A1A1A1] mb-3">Gera um link de registro de uso único (expira em ~60 min), vinculado ao Discord ID informado.</p>
          <div className="space-y-2">
            <input type="text" placeholder="Discord ID (numérico)" className="points-input" style={{ width: "100%" }} value={inv.id} onChange={(e) => setInv({ ...inv, id: e.target.value })} />
            <input type="text" placeholder="Discord username" className="points-input" style={{ width: "100%" }} value={inv.name} onChange={(e) => setInv({ ...inv, name: e.target.value })} />
            <button className="btn-primary" onClick={async () => { try { const d = await postForm<{ register_url: string }>("/api/users/invite", { discord_id: inv.id.trim(), discord_username: inv.name.trim() }); const url = location.origin + d.register_url; onClose(); try { await navigator.clipboard.writeText(url); } catch { /* ignore */ } toast(`<a href="${url}">${url}</a>`, "success", { title: "Link de registro gerado", html: true, duration: 0 }); } catch (e) { toast((e as Error).message, "error"); } }}><LinkIcon className="w-4 h-4" />Gerar link</button>
          </div>
        </ModalShell>
      )}
    </Modal>
  );
}
