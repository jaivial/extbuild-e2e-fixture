import { useEffect, useRef, useState } from "react";
import type { Instance } from "../lib/types";

const BOT_ACC: Record<string, string> = { idle: "#34d399", working: "#22d3ee", planning: "#a78bfa", awaiting: "#fbbf24", offline: "#7d8aa0", maestro: "#fcd34d" };
const rttCls = (ms?: number | null) => ms == null ? "" : ms < 100 ? "ok" : ms < 500 ? "mid" : "hot";
const hbCls = (a?: number | null) => a == null ? "" : a < 15 ? "ok" : a < 60 ? "mid" : "hot";
const fmtAge = (s?: number | null) => s == null ? "?" : s < 60 ? Math.round(s) + "s" : s < 3600 ? Math.round(s / 60) + "min" : (s / 3600).toFixed(1) + "h";
const cssId = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, "_");

/** Robot pet SVG — faithful port of panel.html robotSVG(state). */
export function robotSVG(state: string): string {
  const acc = BOT_ACC[state] || "#34d399";
  const off = state === "offline";
  const eyes = off
    ? `<rect class="eye" x="26" y="23.4" width="5" height="1.7" rx="0.85"/><rect class="eye" x="33" y="23.4" width="5" height="1.7" rx="0.85"/>`
    : `<circle class="eye" cx="28.5" cy="24" r="2.5"/><circle class="eye" cx="35.5" cy="24" r="2.5"/>`;
  const eyesTransform = state === "working" ? ` transform="translate(0 1.6)"` : "";
  const mouth = state === "idle"
    ? `<circle class="whistle" cx="32" cy="28.4" r="1.5" fill="none" stroke="${acc}" stroke-width="1"/>`
    : `<rect x="30" y="28" width="4" height="1.3" rx="0.65" fill="#3a4a63"/>`;
  const baton = state === "maestro" ? `<line x1="47.5" y1="49" x2="55" y2="42" stroke="#efe6c4" stroke-width="1.6" stroke-linecap="round"/>` : "";
  const bowtie = state === "maestro" ? `<path d="M29,36 L32,37.6 L35,36 L35,39.5 L32,37.9 L29,39.5 Z" fill="${acc}"/>` : "";
  let props = "";
  if (state === "idle" || state === "maestro") {
    const nm = state === "maestro" ? "nm" : "";
    props += `<text class="note ${nm}2" x="46" y="20" font-size="7" fill="${acc}">♪</text><text class="note n2 ${nm}3" x="49" y="15" font-size="6" fill="${acc}">♫</text>`;
    if (state === "maestro") props += `<text class="note nm3" x="12" y="18" font-size="7" fill="${acc}">♪</text>`;
  }
  if (state === "working") {
    props += `<rect x="23" y="47" width="18" height="3.4" rx="1.2" class="metal-d"/><rect x="25.5" y="40" width="13" height="7.5" rx="1.5" class="screen"/><rect x="27" y="42" width="9" height="1.2" rx="0.6" fill="${acc}" opacity="0.7"/><rect x="27" y="44.3" width="6" height="1.2" rx="0.6" fill="${acc}" opacity="0.5"/><text class="bit" x="28" y="39" font-size="6" fill="${acc}">1</text><text class="bit b2" x="33" y="39" font-size="6" fill="${acc}">0</text><text class="bit b3" x="31" y="37" font-size="6" fill="${acc}">1</text>`;
  }
  if (state === "planning") {
    props += `<g class="book"><path d="M24,42 Q32,39 32,40.5 L32,50 Q24,48.5 24,50 Z" fill="#e6ecf7" stroke="#9fb0cc" stroke-width="0.6"/><path d="M40,42 Q32,39 32,40.5 L32,50 Q40,48.5 40,50 Z" fill="#f2f6fc" stroke="#9fb0cc" stroke-width="0.6"/></g><circle class="think" cx="46" cy="14" r="2.2" fill="${acc}"/>`;
  }
  if (state === "awaiting") {
    props += `<g><circle cx="49" cy="24" r="6" fill="#eef2fa" stroke="${acc}" stroke-width="1.4"/><circle cx="49" cy="24" r="0.9" fill="#3a4a63"/><line class="clock-hand" x1="49" y1="24" x2="49" y2="20" stroke="#3a4a63" stroke-width="1" stroke-linecap="round"/><line x1="49" y1="24" x2="52" y2="24" stroke="#6b7a94" stroke-width="0.8" stroke-linecap="round"/></g><path class="sweat" d="M43,15 Q45,18 43,19 Q41,18 43,15 Z" fill="${acc}"/>`;
  }
  if (off) props += `<text class="zzz" x="44" y="16" font-size="6" fill="#8a97ad">z</text><text class="zzz z2" x="47" y="12" font-size="7" fill="#8a97ad">z</text><text class="zzz z3" x="50" y="8" font-size="8" fill="#8a97ad">z</text>`;
  return `<svg class="bot ${state}" viewBox="0 0 64 64" style="--acc:${acc}" xmlns="http://www.w3.org/2000/svg">${props}<g class="body-grp"><line class="accs" x1="32" y1="14" x2="32" y2="7.5" stroke-width="1.8"/><circle class="antenna-tip acc" cx="32" cy="6" r="2.5"/><rect class="metal-d" x="15" y="20" width="4" height="8" rx="2"/><rect class="metal-d" x="45" y="20" width="4" height="8" rx="2"/><rect class="metal" x="18" y="13" width="28" height="22" rx="8"/><rect class="screen" x="21.5" y="17" width="21" height="13" rx="5"/><g class="eyes-grp"${eyesTransform}>${eyes}</g>${mouth}<rect class="metal" x="22" y="36.5" width="20" height="16.5" rx="6"/>${bowtie}<rect class="metal-d" x="27" y="41" width="10" height="6" rx="2" opacity="0.55"/><g class="arm-l"><rect class="metal-d" x="14.5" y="37" width="5" height="13" rx="2.5"/></g><g class="arm-r"><rect class="metal-d" x="44.5" y="37" width="5" height="13" rx="2.5"/>${baton}</g><rect class="foot-l metal-d" x="25" y="52.5" width="6" height="4" rx="2"/><rect class="foot-r metal-d" x="33" y="52.5" width="6" height="4" rx="2"/></g></svg>`;
}

interface Pos { x: number; y: number }
interface Particle { t: number; dir: number; speed: number; size: number; busy: boolean }

export default function MeshGraph({ instances, selected, onSelect }: {
  instances: Instance[]; selected: string | null; onSelect: (id: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [positions, setPositions] = useState<Map<string, Pos>>(new Map());
  const posRef = useRef<Map<string, Pos>>(new Map());
  const instRef = useRef<Instance[]>(instances);
  const hubRef = useRef<Pos>({ x: 0, y: 0 });
  const particles = useRef<Map<string, Particle[]>>(new Map());
  const spawnAcc = useRef<Map<string, number>>(new Map());
  instRef.current = instances;

  useEffect(() => {
    const root = rootRef.current, canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, DPR = 1, raf = 0, lastFrame = performance.now();

    const layout = () => {
      const list = instRef.current;
      const ids = list.map((i) => i.instance_id).sort();
      const n = ids.length; if (!n) { setPositions(new Map()); posRef.current = new Map(); return; }
      const HUB = hubRef.current;
      const rx = Math.min(W * 0.34, 480), ry = Math.min(H * 0.29, 300);
      const next = new Map<string, Pos>();
      ids.forEach((iid, k) => {
        let x: number, y: number;
        if (n === 1) {
          if (W < 640) { x = HUB.x; y = Math.min(H - 125, HUB.y + 225); }
          else { x = Math.min(W - 150, HUB.x + 305); y = HUB.y; }
        } else {
          const ang = -Math.PI / 2 + (k * 2 * Math.PI / n);
          x = HUB.x + rx * Math.cos(ang); y = HUB.y + ry * Math.sin(ang);
        }
        next.set(iid, { x, y });
      });
      posRef.current = next; setPositions(next);
    };

    const resize = () => {
      DPR = window.devicePixelRatio || 1;
      W = root.clientWidth; H = root.clientHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      hubRef.current = { x: W / 2, y: H * 0.52 };
      layout();
    };

    const linkColor = (inst: Instance & { respawn_pending?: boolean }) => {
      if (!inst.online) return { line: "rgba(248,113,113,0.22)", glow: "rgba(248,113,113,0.10)", dash: true };
      if (inst.respawn_pending) return { line: "rgba(251,191,36,0.32)", glow: "rgba(251,191,36,0.14)", dash: false };
      if ((inst.in_flight || 0) > 0) return { line: "rgba(34,211,238,0.42)", glow: "rgba(34,211,238,0.20)", dash: false };
      return { line: "rgba(52,211,153,0.30)", glow: "rgba(52,211,153,0.12)", dash: false };
    };
    const ctrlPoint = (a: Pos, b: Pos, k: number) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, side = k % 2 === 0 ? 1 : -1;
      return { x: mx + (-dy / d) * d * 0.10 * side, y: my + (dx / d) * d * 0.10 * side };
    };
    const qpoint = (a: Pos, c: Pos, b: Pos, t: number) => { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; };

    const stepParticles = (dt: number) => {
      instRef.current.forEach((inst) => {
        const iid = inst.instance_id;
        if (!particles.current.has(iid)) particles.current.set(iid, []);
        if (!spawnAcc.current.has(iid)) spawnAcc.current.set(iid, 0);
        const arr = particles.current.get(iid)!;
        let rate = 0; if (inst.online) rate = 0.8 + (inst.in_flight || 0) * 2.7;
        let acc = spawnAcc.current.get(iid)! + rate * dt;
        while (acc >= 1) { acc -= 1; const toHub = Math.random() < 0.72; arr.push({ t: toHub ? 0 : 1, dir: toHub ? 1 : -1, speed: 0.22 + Math.random() * 0.30, size: 1.4 + Math.random() * 1.8, busy: (inst.in_flight || 0) > 0 }); }
        spawnAcc.current.set(iid, acc);
        for (let i = arr.length - 1; i >= 0; i--) { arr[i].t += arr[i].dir * arr[i].speed * dt; if (arr[i].t < 0 || arr[i].t > 1) arr.splice(i, 1); }
      });
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const HUB = hubRef.current;
      instRef.current.forEach((inst, k) => {
        const pos = posRef.current.get(inst.instance_id); if (!pos) return;
        const col = linkColor(inst as any), c = ctrlPoint(pos, HUB, k);
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y); ctx.quadraticCurveTo(c.x, c.y, HUB.x, HUB.y);
        ctx.strokeStyle = col.line; ctx.lineWidth = 1.4; ctx.setLineDash(col.dash ? [5, 7] : []);
        ctx.shadowColor = col.glow; ctx.shadowBlur = 8; ctx.stroke(); ctx.setLineDash([]); ctx.shadowBlur = 0;
        const rtt = (inst as any).rtt_ms;
        if (inst.online && rtt != null) { const mid = qpoint(pos, c, HUB, 0.5); ctx.font = "600 10px Menlo, monospace"; ctx.fillStyle = rtt < 100 ? "rgba(52,211,153,0.85)" : rtt < 500 ? "rgba(251,191,36,0.85)" : "rgba(248,113,113,0.85)"; ctx.textAlign = "center"; ctx.fillText(rtt + "ms", mid.x, mid.y - 6); }
        const arr = particles.current.get(inst.instance_id) || [];
        for (const p of arr) {
          const pt = qpoint(pos, c, HUB, p.t);
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, p.size * 3.2);
          const core = p.busy ? "rgba(34,211,238," : "rgba(52,211,153,";
          grad.addColorStop(0, core + "0.95)"); grad.addColorStop(0.4, core + "0.35)"); grad.addColorStop(1, core + "0)");
          ctx.beginPath(); ctx.arc(pt.x, pt.y, p.size * 3.2, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        }
      });
    };
    const frame = (now: number) => { const dt = Math.min((now - lastFrame) / 1000, 0.1); lastFrame = now; stepParticles(dt); draw(); raf = requestAnimationFrame(frame); };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(resize); ro.observe(root);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); ro.disconnect(); };
  }, []);

  useEffect(() => {
    // relayout when the fleet changes
    const root = rootRef.current; if (!root) return;
    const W = root.clientWidth, H = root.clientHeight;
    const ids = instances.map((i) => i.instance_id).sort(), n = ids.length;
    const HUB = { x: W / 2, y: H * 0.52 }; hubRef.current = HUB;
    if (!n) { setPositions(new Map()); posRef.current = new Map(); return; }
    const rx = Math.min(W * 0.34, 480), ry = Math.min(H * 0.29, 300);
    const next = new Map<string, Pos>();
    ids.forEach((iid, k) => {
      let x: number, y: number;
      if (n === 1) { if (W < 640) { x = HUB.x; y = Math.min(H - 125, HUB.y + 225); } else { x = Math.min(W - 150, HUB.x + 305); y = HUB.y; } }
      else { const ang = -Math.PI / 2 + (k * 2 * Math.PI / n); x = HUB.x + rx * Math.cos(ang); y = HUB.y + ry * Math.sin(ang); }
      next.set(iid, { x, y });
    });
    posRef.current = next; setPositions(next);
  }, [instances]);

  return (
    <div ref={rootRef} className="relative rounded-lg overflow-hidden border border-[#404040] bg-[#0b0f14]" style={{ height: "72vh", minHeight: 460 }}>
      <canvas ref={canvasRef} id="mesh" />
      <div id="hub">
        <div className="ring-outer" /><div className="ring-mid" />
        <div className="core"><div className="name">STUDIO</div><div className="role">coordinator</div></div>
      </div>
      {instances.map((inst) => {
        const pos = positions.get(inst.instance_id); if (!pos) return null;
        const online = !!inst.online, busy = online && (inst.in_flight || 0) > 0;
        const pending = !!(inst as any).respawn_pending;
        const act = (inst as any).activity || (!online ? "offline" : busy ? "working" : "idle");
        const cls = "node" + (online ? " online" : " offline") + (busy ? " busy" : "") + (pending ? " pending" : "") + (selected === inst.instance_id ? " selected" : "");
        const rtt = (inst as any).rtt_ms, hb = (inst as any).age_seconds;
        return (
          <div key={inst.instance_id} id={"node-" + cssId(inst.instance_id)} className={cls}
            style={{ left: pos.x, top: pos.y }} onClick={() => onSelect(inst.instance_id)}>
            <div className="orb"><div className="emoji" dangerouslySetInnerHTML={{ __html: robotSVG(act) }} /><div className="load">{inst.in_flight || 0}/{inst.capacity || 1}</div></div>
            <div className="tag"><div className="n">{inst.instance_id}</div>
              <div className="m">{rtt != null ? <span className={rttCls(rtt)}>{rtt}ms</span> : "—"} · hb <span className={hbCls(hb)}>{fmtAge(hb)}</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
