import { useEffect, useState } from "react";
import { AlertTriangle, Bot, Cloud, Globe, HardDriveUpload, RotateCw, Save, Settings as SettingsIcon } from "lucide-react";
import { api, sendJson } from "../lib/api";
import { toast } from "../components/ui";

interface DiscordCfg {
  use_database: boolean; source: string; token_set: boolean; exists: boolean; ready: boolean;
  channel_id: string; planning_channel_id: string; audit_channel_id: string;
  errors_channel_id: string; working_channel_id: string;
}
interface BunnyCfg { storage_zone_id: string; region_endpoint: string; password: string; password_set: boolean }
interface PreviewCfg {
  timeout_sec: number; base_domain: string; cloudflare_ready: boolean;
  cloudflare: { enabled: boolean; account_id: string; zone: string; tunnel_name: string; api_token: string; api_token_set: boolean };
}

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="block text-xs text-[#A1A1A1] uppercase tracking-wider mb-1.5">{children}</label>
);

export default function Settings() {
  return (
    <div>
      <header className="mb-8 flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-[#06B6D4]" />
        <div>
          <h1 className="text-3xl font-semibold text-[#FAFAFA] leading-tight">Settings</h1>
          <p className="text-[#A1A1A1] text-sm mt-1">
            Project-global configuration · visible to every admin
            <span className="status-badge neutral ml-2">admin only</span>
          </p>
        </div>
      </header>
      <DiscordSection />
      <BunnySection />
      <PreviewSection />
    </div>
  );
}

function DiscordSection() {
  const [cfg, setCfg] = useState<DiscordCfg | null>(null);
  const [useDb, setUseDb] = useState(false);
  const [f, setF] = useState({ token: "", channel_id: "", planning_channel_id: "", audit_channel_id: "", errors_channel_id: "", working_channel_id: "" });
  const fill = (d: DiscordCfg) => {
    setCfg(d); setUseDb(!!d.use_database);
    setF({ token: "", channel_id: d.channel_id || "", planning_channel_id: d.planning_channel_id || "", audit_channel_id: d.audit_channel_id || "", errors_channel_id: d.errors_channel_id || "", working_channel_id: d.working_channel_id || "" });
  };
  useEffect(() => { api.get<DiscordCfg>("/api/settings/discord").then(fill).catch(() => {}); }, []);
  const save = async () => {
    const body: Record<string, unknown> = { use_database: useDb, channel_id: f.channel_id.trim(), planning_channel_id: f.planning_channel_id.trim(), audit_channel_id: f.audit_channel_id.trim(), errors_channel_id: f.errors_channel_id.trim(), working_channel_id: f.working_channel_id.trim() };
    if (f.token.trim()) body.token = f.token.trim();
    try { fill(await sendJson<DiscordCfg>("/api/settings/discord", "PUT", body)); toast("Discord settings saved; restart the bot to apply", "success"); }
    catch (e) { toast("Save failed: " + (e as Error).message, "error"); }
  };
  const del = async () => {
    if (!confirm("Delete the encrypted Discord credentials and switch back to .env?")) return;
    try { fill(await sendJson<DiscordCfg>("/api/settings/discord", "DELETE")); toast("Deleted; using .env", "success"); }
    catch (e) { toast("Delete failed: " + (e as Error).message, "error"); }
  };

  return (
    <section className="card p-6 max-w-2xl mb-6">
      <div className="flex items-start gap-3 mb-5">
        <Bot className="w-5 h-5 text-[#06B6D4] mt-0.5" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Discord bot credentials</h2>
          <p className="text-[#A1A1A1] text-xs mt-1">Choose whether the bot starts with credentials from <span className="font-mono">.env</span> or the encrypted settings database.</p>
        </div>
        <span className="status-badge neutral">{cfg ? cfg.source : "loading"}</span>
      </div>
      <div className="space-y-4">
        <label className="flex items-center justify-between gap-4 rounded-lg border border-[#262626] p-4 cursor-pointer">
          <span>
            <span className="block text-sm font-medium text-[#FAFAFA]">Use database credentials</span>
            <span className="block text-xs text-[#737373] mt-1">Off: Discord credentials are read from .env.</span>
          </span>
          <input type="checkbox" role="switch" checked={useDb} onChange={(e) => setUseDb(e.target.checked)} className="w-5 h-5 accent-[#06B6D4] flex-shrink-0" />
        </label>
        {useDb && (
          <div className="space-y-4">
            <div>
              <Label>Bot token</Label>
              <input className="input-field" type="password" placeholder="Leave blank to keep the configured token" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} autoComplete="new-password" />
              {cfg?.token_set && <p className="text-[11px] text-[#737373] mt-1">A token is already configured and encrypted. Leave blank to keep it.</p>}
            </div>
            <div>
              <Label>Main channel ID <span className="text-[#F87171]">*</span></Label>
              <input className="input-field font-mono" value={f.channel_id} onChange={(e) => setF({ ...f, channel_id: e.target.value })} placeholder="e.g. 123456789012345678" />
            </div>
            <div className="border-t border-[#262626] pt-4">
              <h3 className="text-sm font-semibold text-[#FAFAFA]">Optional channel overrides</h3>
              <p className="text-[11px] text-[#737373] mt-1 mb-3">Empty values fall back to the main channel.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(["planning_channel_id", "audit_channel_id", "errors_channel_id", "working_channel_id"] as const).map((k) => (
                  <div key={k}>
                    <Label>{k.replace("_channel_id", "").replace(/^\w/, (c) => c.toUpperCase())} channel ID</Label>
                    <input className="input-field font-mono" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <p className="text-[11px] text-[#F59E0B] flex items-start gap-1.5"><RotateCw className="w-3.5 h-3.5 flex-shrink-0 mt-px" />Saving changes the startup source. Restart the Discord bot process to apply it.</p>
        <div className="flex items-center gap-3 pt-2">
          <button className="btn-primary" onClick={save}><Save className="w-4 h-4" />Save</button>
          <button className="btn-secondary" disabled={!cfg?.exists} onClick={del}>Delete database credentials</button>
        </div>
      </div>
    </section>
  );
}

function BunnySection() {
  const [cfg, setCfg] = useState<BunnyCfg | null>(null);
  const [f, setF] = useState({ storage_zone_id: "", password: "", region_endpoint: "" });
  const fill = (d: BunnyCfg) => { setCfg(d); setF({ storage_zone_id: d.storage_zone_id || "", password: "", region_endpoint: d.region_endpoint || "" }); };
  useEffect(() => { api.get<BunnyCfg>("/api/settings/bunny-storage").then(fill).catch(() => {}); }, []);
  const save = async () => {
    const body: Record<string, unknown> = { storage_zone_id: f.storage_zone_id.trim(), region_endpoint: f.region_endpoint.trim() };
    if (f.password.trim()) body.password = f.password.trim();
    try { fill(await sendJson<BunnyCfg>("/api/settings/bunny-storage", "PUT", body)); toast("BunnyCDN settings saved", "success"); }
    catch (e) { toast("Save failed: " + (e as Error).message, "error"); }
  };
  return (
    <section className="card p-6 max-w-2xl mb-6">
      <div className="flex items-start gap-3 mb-5">
        <HardDriveUpload className="w-5 h-5 text-[#06B6D4] mt-0.5" />
        <div><h2 className="text-lg font-semibold text-[#FAFAFA]">BunnyCDN storage zone</h2>
          <p className="text-[#A1A1A1] text-xs mt-1">Where build artifacts are uploaded. Shared across the project — changes affect every build.</p></div>
      </div>
      <div className="space-y-4">
        <div><Label>Storage zone ID</Label><input className="input-field" value={f.storage_zone_id} onChange={(e) => setF({ ...f, storage_zone_id: e.target.value })} placeholder="e.g. my-artifacts-zone" /></div>
        <div>
          <Label>Password</Label>
          <input className="input-field" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="•••••••• leave blank to keep current" autoComplete="new-password" />
          <p className="text-[11px] text-[#F59E0B] mt-1.5 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />Use the storage zone <b>write</b> password — <b>not</b> the read-only password.</p>
          {cfg?.password_set && <p className="text-[11px] text-[#737373] mt-1">Current: <span className="font-mono">{cfg.password}</span> · leave blank to keep it unchanged.</p>}
        </div>
        <div><Label>Storage zone region endpoint</Label><input className="input-field" value={f.region_endpoint} onChange={(e) => setF({ ...f, region_endpoint: e.target.value })} placeholder="e.g. storage.bunnycdn.com" />
          <p className="text-[11px] text-[#737373] mt-1">Falkenstein/default is <span className="font-mono">storage.bunnycdn.com</span>.</p></div>
        <div className="flex items-center gap-3 pt-2"><button className="btn-primary" onClick={save}><Save className="w-4 h-4" />Save</button></div>
      </div>
    </section>
  );
}

function PreviewSection() {
  const [cfg, setCfg] = useState<PreviewCfg | null>(null);
  const [f, setF] = useState({ timeout_sec: "", base_domain: "", cf_enabled: false, cf_account_id: "", cf_zone: "", cf_tunnel_name: "", cf_api_token: "" });
  const fill = (d: PreviewCfg) => {
    setCfg(d); const c = d.cloudflare;
    setF({ timeout_sec: String(d.timeout_sec ?? ""), base_domain: d.base_domain || "", cf_enabled: !!c.enabled, cf_account_id: c.account_id || "", cf_zone: c.zone || "", cf_tunnel_name: c.tunnel_name || "", cf_api_token: "" });
  };
  useEffect(() => { api.get<PreviewCfg>("/api/settings/preview").then(fill).catch(() => {}); }, []);
  const save = async () => {
    const body: Record<string, unknown> = { timeout_sec: Number(f.timeout_sec), base_domain: f.base_domain.trim(), cf_enabled: f.cf_enabled, cf_account_id: f.cf_account_id.trim(), cf_zone: f.cf_zone.trim(), cf_tunnel_name: f.cf_tunnel_name.trim() };
    if (f.cf_api_token.trim()) body.cf_api_token = f.cf_api_token.trim();
    try { fill(await sendJson<PreviewCfg>("/api/settings/preview", "PUT", body)); toast("Preview settings saved", "success"); }
    catch (e) { toast("Save failed: " + (e as Error).message, "error"); }
  };
  return (
    <section className="card p-6 max-w-2xl">
      <div className="flex items-start gap-3 mb-5">
        <Globe className="w-5 h-5 text-[#06B6D4] mt-0.5" />
        <div><h2 className="text-lg font-semibold text-[#FAFAFA]">Global preview settings</h2>
          <p className="text-[#A1A1A1] text-xs mt-1">Defaults for build preview sessions. Shared across the project — changes affect every preview.</p></div>
      </div>
      <div className="space-y-4">
        <div><Label>Preview session timeout (seconds)</Label>
          <input className="input-field" type="number" min={300} max={86400} value={f.timeout_sec} onChange={(e) => setF({ ...f, timeout_sec: e.target.value })} placeholder="14400" />
          <p className="text-[11px] text-[#F59E0B] mt-1.5 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />Changing this does <b>not</b> affect preview sessions already running.</p></div>
        <div><Label>Preview base domain</Label><input className="input-field" value={f.base_domain} onChange={(e) => setF({ ...f, base_domain: e.target.value })} placeholder="e.g. preview.example.com" /></div>
        <div className="border-t border-[#262626] pt-4">
          <div className="flex items-center gap-2 mb-3"><Cloud className="w-4 h-4 text-[#06B6D4]" /><h3 className="text-sm font-semibold text-[#FAFAFA]">Cloudflare tunnel</h3>
            <span className={`status-badge ${cfg?.cloudflare_ready ? "success" : "neutral"}`}>{cfg ? (cfg.cloudflare_ready ? "ready" : "off") : "unknown"}</span></div>
          <label className="flex items-center gap-2 text-sm text-[#E5E5E5] mb-3"><input type="checkbox" checked={f.cf_enabled} onChange={(e) => setF({ ...f, cf_enabled: e.target.checked })} className="accent-[#06B6D4]" />Enabled</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Account ID</Label><input className="input-field" value={f.cf_account_id} onChange={(e) => setF({ ...f, cf_account_id: e.target.value })} /></div>
            <div><Label>Zone</Label><input className="input-field" value={f.cf_zone} onChange={(e) => setF({ ...f, cf_zone: e.target.value })} /></div>
            <div><Label>Tunnel name</Label><input className="input-field" value={f.cf_tunnel_name} onChange={(e) => setF({ ...f, cf_tunnel_name: e.target.value })} /></div>
            <div><Label>API token</Label><input className="input-field" type="password" value={f.cf_api_token} onChange={(e) => setF({ ...f, cf_api_token: e.target.value })} placeholder="•••••••• leave blank to keep current" autoComplete="new-password" />
              {cfg?.cloudflare.api_token_set && <p className="text-[11px] text-[#737373] mt-1">Current: <span className="font-mono">{cfg.cloudflare.api_token}</span> · leave blank to keep it.</p>}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2"><button className="btn-primary" onClick={save}><Save className="w-4 h-4" />Save</button></div>
      </div>
    </section>
  );
}
