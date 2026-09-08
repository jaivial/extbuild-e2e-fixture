import { useSearchParams } from "react-router-dom";
import {
  AlertCircle, Calendar, CheckCircle, Fingerprint, Info, KeyRound,
  MessageCircle, Settings2, ShieldCheck, TriangleAlert, Unlink, User,
} from "lucide-react";
import { useApi } from "../lib/hooks";
import { GithubIcon, Loading } from "../components/ui";

interface GhConn { github_login: string; avatar_url?: string; installation_ids: number[] }
interface AccountData {
  user: { id: number; username: string; discord_username?: string; is_admin: boolean };
  created_at?: string;
  gh_configured: boolean;
  gh_conn: GhConn | null;
  csrf: string;
}

export default function Account() {
  const { data, loading } = useApi<AccountData>("/api/account");
  const [params] = useSearchParams();
  const connected = params.get("connected");
  const error = params.get("error");

  if (loading || !data) return <div className="max-w-3xl mx-auto"><Loading /></div>;
  const { user, created_at, gh_configured, gh_conn, csrf } = data;
  const installs = gh_conn?.installation_ids?.length ?? 0;

  const errorText =
    error === "oauth_state" ? "Sessão OAuth inválida ou expirada. Tente conectar de novo."
    : error === "oauth_exchange" ? "Falha ao trocar o código OAuth com o GitHub. Tente de novo."
    : error === "github_app_not_configured" ? "GitHub App não configurado no servidor (.env)."
    : error;

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <User className="w-8 h-8 text-[#06B6D4]" />
        <div>
          <h1 className="text-3xl font-semibold text-[#FAFAFA] leading-tight">Conta</h1>
          <p className="text-[#A1A1A1] text-sm mt-1">Informações do usuário e integrações OAuth.</p>
        </div>
      </header>

      {connected === "github" && (
        <div className="account-toast card p-4 mb-6 !border-[#22C55E]/40 flex items-center gap-3 text-sm text-[#22C55E]">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-medium">GitHub conectado com sucesso</div>
            <div className="text-xs text-[#A1A1A1] mt-0.5">Já pode adicionar projetos na página <a href="/projects" className="text-[#06B6D4] hover:underline">Projects</a>.</div>
          </div>
        </div>
      )}
      {error && (
        <div className="account-toast card p-4 mb-6 !border-[#EF4444]/40 flex items-center gap-3 text-sm text-[#EF4444]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-medium">Algo deu errado</div>
            <div className="text-xs text-[#A1A1A1] mt-0.5">{errorText}</div>
          </div>
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="account-avatar">{user.username.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-[#FAFAFA] truncate">{user.username}</h2>
              {user.is_admin && (
                <span className="status-badge info text-xs"><ShieldCheck className="w-3 h-3" />admin</span>
              )}
            </div>
            {user.discord_username && (
              <div className="flex items-center gap-1.5 text-xs text-[#737373] mt-1">
                <MessageCircle className="w-3.5 h-3.5" />{user.discord_username}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#262626]">
          <div className="info-row">
            <span className="text-xs text-[#737373] uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />Membro desde
            </span>
            <span className="text-sm text-[#A1A1A1]">{created_at ? created_at.slice(0, 10) : "—"}</span>
          </div>
          <div className="info-row">
            <span className="text-xs text-[#737373] uppercase tracking-wide flex items-center gap-2">
              <Fingerprint className="w-3.5 h-3.5" />User ID
            </span>
            <span className="text-sm text-[#A1A1A1] font-mono">#{user.id}</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-medium text-[#FAFAFA] flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#06B6D4]" />Integrações OAuth
          </h2>
        </div>
        <p className="text-xs text-[#737373] mb-5">
          Conecte contas externas pra habilitar clone, PRs e alterações nos seus repositórios.
        </p>

        <div className={`oauth-provider ${gh_conn ? "connected" : ""}`}>
          <div className="flex items-center gap-3 min-w-0">
            {gh_conn?.avatar_url ? (
              <img src={gh_conn.avatar_url} alt={`avatar de ${gh_conn.github_login}`} className="gh-avatar" />
            ) : (
              <div className="gh-avatar-placeholder"><GithubIcon className="w-5 h-5 text-[#A1A1A1]" /></div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#FAFAFA]">GitHub</span>
                {gh_conn && <span className="status-badge success text-[10px]"><CheckCircle className="w-2.5 h-2.5" />conectado</span>}
              </div>
              {gh_conn ? (
                <div className="text-xs text-[#A1A1A1] mt-0.5 truncate">
                  <a href={`https://github.com/${gh_conn.github_login}`} target="_blank" rel="noopener" className="hover:text-[#06B6D4] transition-colors">@{gh_conn.github_login}</a>
                  <span className="text-[#525252]"> · </span>
                  {installs} installation{installs !== 1 ? "s" : ""}
                </div>
              ) : !gh_configured ? (
                <div className="text-xs text-[#F59E0B] mt-0.5 flex items-center gap-1"><TriangleAlert className="w-3 h-3" />App não configurado no servidor</div>
              ) : (
                <div className="text-xs text-[#737373] mt-0.5">Clone, PRs, diffs e push nos seus repos</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {gh_conn ? (
              <>
                <a href="https://github.com/settings/installations" target="_blank" rel="noopener" className="btn-secondary !text-xs !px-3 !py-1.5" title="Gerenciar repositórios da installation no GitHub">
                  <Settings2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Gerenciar</span>
                </a>
                <form method="post" action="/api/oauth/github/disconnect"
                  onSubmit={(e) => { if (!confirm("Desconectar o GitHub desta conta?\n\nOs projetos já clonados continuam no disco.")) e.preventDefault(); }}>
                  <input type="hidden" name="csrf" value={csrf} />
                  <button type="submit" className="btn-danger-ghost" title="Remover conexão">
                    <Unlink className="w-3.5 h-3.5" /><span className="hidden sm:inline">Desconectar</span>
                  </button>
                </form>
              </>
            ) : gh_configured ? (
              <a href="/api/oauth/github/start" className="btn-github"><GithubIcon className="w-4 h-4" />Conectar</a>
            ) : null}
          </div>
        </div>

        {gh_conn && (
          <div className="flex items-start gap-2 text-xs text-[#525252] mt-4">
            <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>Pra adicionar ou remover repositórios acessíveis, use <b className="text-[#737373]">Gerenciar</b> — as mudanças sincronizam aqui automaticamente via webhook.</span>
          </div>
        )}
      </div>
    </div>
  );
}
