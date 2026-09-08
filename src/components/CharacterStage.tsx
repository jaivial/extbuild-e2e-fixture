/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";

export interface RoleDef { key: string; label: string; sub: string; color: string; glb: string; sizeMul?: number }

/** Fortnite-style 3D role carousel — a faithful port of the v2 team hero. */
export default function CharacterStage({ roles, selected, onSelect }: {
  roles: RoleDef[]; selected: number; onSelect: (i: number) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const loadingTxtRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef<{ goTo: (i: number) => void; next: () => void; prev: () => void } | null>(null);
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const stage = stageRef.current, canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      // Runtime specifiers kept in vars so TS/Vite don't try to resolve them;
      // `three` resolves through the index.html importmap, the rest via /static.
      const P = (u: string) => import(/* @vite-ignore */ u);
      const THREE: any = await P("three");
      const { GLTFLoader }: any = await P("/static/vendor/GLTFLoader.js");
      const { DRACOLoader }: any = await P("/static/vendor/DRACOLoader.js");
      const { createEmoteRig }: any = await P("/static/js/agent-emotes.js");
      const { normalizeModel, startClipCycle }: any = await P("/static/js/model-utils.js?v=6");
      if (disposed) return;

      const loadingEl = loadingRef.current!, loadingTxt = loadingTxtRef.current!;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;

      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x0b0f14, 6, 14);
      const camera = new THREE.PerspectiveCamera(36, 2, 0.1, 50);
      let camZ = 6.0, camY = 1.28;
      camera.position.set(0, camY, camZ); camera.lookAt(0, 0.82, 0);

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2, 4, 3); scene.add(key);
      const rim = new THREE.DirectionalLight(0x66d9ff, 1.4); rim.position.set(-3, 2, -2); scene.add(rim);
      const fill = new THREE.DirectionalLight(0xffcf99, 0.5); fill.position.set(-2, 1, 3); scene.add(fill);

      const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshStandardMaterial({ color: 0x0e141a, roughness: 0.9, metalness: 0.1 }));
      floor.rotation.x = -Math.PI / 2; scene.add(floor);

      const N = roles.length, STEP = (Math.PI * 2) / N, RADIUS = 2.4;
      const ring = new THREE.Group(); ring.position.set(0, 0, -RADIUS); scene.add(ring);
      const slots: any[] = [];
      const loader = new GLTFLoader();
      const draco = new DRACOLoader(); draco.setDecoderPath("/static/vendor/draco/"); loader.setDRACOLoader(draco);
      let loadedCount = 0;

      for (let i = 0; i < N; i++) {
        const pivot = new THREE.Group(), inner = new THREE.Group(); pivot.add(inner);
        pivot.position.set(Math.sin(i * STEP) * RADIUS, 0, Math.cos(i * STEP) * RADIUS); ring.add(pivot);
        const glow = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(roles[i].color), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2; glow.position.y = 0.015; pivot.add(glow);
        const emoteRoot = new THREE.Group(); inner.add(emoteRoot);
        slots.push({ pivot, inner, emoteRoot, glow, rig: null, loaded: false });
        loader.load(roles[i].glb, (gltf: any) => {
          const obj = gltf.scene;
          normalizeModel(THREE, obj, 1.25 * (roles[i].sizeMul || 1));
          slots[i].emoteRoot.add(obj); slots[i].emoteRoot.position.set(0, 0, 0);
          const clips = gltf.animations || [];
          if (clips.length) { const mx = new THREE.AnimationMixer(obj); slots[i].skelMixer = mx; slots[i]._cycle = startClipCycle(THREE, mx, clips, 2000, 2000 + i * 1200); }
          else { slots[i].rig = createEmoteRig(THREE, slots[i].emoteRoot, roles[i].key); slots[i].rig.startRandom(10000); }
          slots[i].loaded = true; loadedCount++;
          loadingTxt.textContent = `carregando personagens… ${loadedCount}/${N}`;
          if (loadedCount >= 1) loadingEl.style.opacity = "0.65";
          if (loadedCount === N) loadingEl.style.display = "none";
        }, undefined, () => { loadedCount++; if (loadedCount === N) loadingEl.style.display = "none"; });
      }

      let theta = -selectedRef.current * STEP, vel = 0, dragging = false, lastX = 0, snapTarget = theta, springVel = 0;
      const DRAG_SENS = 0.006, FRICTION = 0.94, SPRING = 0.10, DAMP = 0.72;
      const nearestSnap = (t: number) => Math.round(t / STEP) * STEP;
      const idxFromTheta = (t: number) => ((Math.round(-t / STEP) % N) + N) % N;
      const announce = () => { const idx = idxFromTheta(dragging ? theta : snapTarget); if (idx !== selectedRef.current) { selectedRef.current = idx; onSelectRef.current(idx); } };

      const onDown = (e: PointerEvent) => { dragging = true; vel = 0; springVel = 0; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; };
      const onMove = (e: PointerEvent) => { if (!dragging) return; const dx = e.clientX - lastX; theta += dx * DRAG_SENS; vel = vel * 0.5 + dx * DRAG_SENS * 0.5; lastX = e.clientX; announce(); };
      const endDrag = () => { if (!dragging) return; dragging = false; canvas.style.cursor = "grab"; snapTarget = nearestSnap(theta + vel * 12); announce(); };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", endDrag);
      canvas.addEventListener("pointercancel", endDrag);
      canvas.addEventListener("pointerleave", endDrag);

      apiRef.current = {
        goTo(idx: number) { const want = -idx * STEP; const k = Math.round((theta - want) / (Math.PI * 2)); snapTarget = want + k * Math.PI * 2; dragging = false; },
        next() { snapTarget = nearestSnap(theta) - STEP; announce(); },
        prev() { snapTarget = nearestSnap(theta) + STEP; announce(); },
      };
      const onKey = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return; if (e.key === "ArrowRight") apiRef.current!.next(); if (e.key === "ArrowLeft") apiRef.current!.prev(); };
      document.addEventListener("keydown", onKey);

      let visible = true, running = false, raf = 0;
      const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting && !document.hidden; if (visible && !running) start(); });
      io.observe(stage);
      const onVis = () => { visible = !document.hidden; if (visible && !running) start(); };
      document.addEventListener("visibilitychange", onVis);

      const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (canvas.width !== w * renderer.getPixelRatio() || canvas.height !== h * renderer.getPixelRatio()) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); } };
      window.addEventListener("resize", resize);

      let lastFrame = performance.now();
      const frame = () => {
        if (!visible) { running = false; return; }
        running = true; raf = requestAnimationFrame(frame);
        const now = performance.now(), dt = Math.min((now - lastFrame) / 1000, 0.05); lastFrame = now; resize();
        if (dragging) { /* pointer-driven */ }
        else if (Math.abs(vel) > 0.003) { theta += vel; vel *= FRICTION; snapTarget = nearestSnap(theta); }
        else { const d = snapTarget - theta; springVel = springVel * DAMP + d * SPRING; theta += springVel; vel = 0; announce(); }
        ring.rotation.y = theta;
        const sel = selectedRef.current;
        const aSel = (((sel * STEP + theta) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const frontSel = (Math.cos(aSel) + 1) / 2, settle = Math.max(0, (frontSel - 0.85) / 0.15);
        const targetZ = 6.0 - settle * 2.8, targetY = 1.28 + settle * (0.97 - 1.28);
        camZ += (targetZ - camZ) * Math.min(1, dt * 4); camY += (targetY - camY) * Math.min(1, dt * 4);
        const lookY = 0.60 + settle * (0.42 - 0.60);
        camera.position.set(0, camY, camZ); camera.lookAt(0, lookY, 0);
        for (let i = 0; i < N; i++) {
          const a = (((i * STEP + theta) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const front = (Math.cos(a) + 1) / 2, s = 0.80 + front * 0.52;
          slots[i].pivot.scale.setScalar(s);
          slots[i].glow.material.opacity = Math.max(0, front - 0.55) * 1.8;
          slots[i].rig?.update(dt); slots[i].skelMixer?.update(dt); slots[i]._cycle?.update(dt);
          const emoting = slots[i].rig?.isEmoting, isSel = i === sel && front > 0.92;
          if (isSel && !emoting) slots[i].inner.rotation.y += dt * 0.5;
          else if (!emoting) slots[i].inner.rotation.y *= 0.92;
        }
        renderer.render(scene, camera);
      };
      const start = () => { lastFrame = performance.now(); raf = requestAnimationFrame(frame); };
      resize(); start();

      cleanup = () => {
        cancelAnimationFrame(raf); io.disconnect();
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", endDrag);
        canvas.removeEventListener("pointercancel", endDrag);
        canvas.removeEventListener("pointerleave", endDrag);
        renderer.dispose();
      };
    })().catch(() => { setFailed(true); if (loadingRef.current) loadingRef.current.style.display = "none"; });

    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  useEffect(() => { selectedRef.current = selected; apiRef.current?.goTo(selected); }, [selected]);

  const role = roles[selected];
  if (failed) return null;
  return (
    <section className="w-full">
      <div ref={stageRef} id="charStage" className="relative select-none touch-pan-y"
        style={{ height: 620, background: "radial-gradient(ellipse at 50% 30%, #16222c 0%, #0b0f14 60%, #060809 100%)" }}>
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab" />
        <div ref={loadingRef} className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="w-8 h-8 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
          <div className="text-xs text-[#737373] font-mono"><span ref={loadingTxtRef}>carregando personagens…</span></div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <div className="text-2xl font-bold tracking-wide drop-shadow-lg transition-colors duration-300" style={{ color: role.color }}>{role.label}</div>
          <div className="text-xs uppercase tracking-widest text-[#A1A1A1] mt-0.5">{role.sub}</div>
        </div>
        <button onClick={() => apiRef.current?.prev()} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-[#FAFAFA] text-xl leading-none flex items-center justify-center backdrop-blur transition-colors">‹</button>
        <button onClick={() => apiRef.current?.next()} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-[#FAFAFA] text-xl leading-none flex items-center justify-center backdrop-blur transition-colors">›</button>
      </div>
    </section>
  );
}
