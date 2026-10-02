import React from 'react';
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import timeline from '../public/timeline.json';
import { C, Ctx, Logo, MONO, Panel, SANS, ease } from './Panels';
import { PresenterArms, PresenterBody, blendPose, poseFor } from './Presenter';

type Line = { t: string; shot?: string; push?: boolean; g?: string; look?: string; r?: number; hl?: number | number[] | string; ar?: string; start: number; end: number };
type Scene = { id: string; panel: any; start: number; end: number; lines: Line[] };
const TL = timeline as unknown as { fps: number; durationInFrames: number; mouth: string; scenes: Scene[] };

const FLAT = TL.scenes.flatMap((s, si) => s.lines.map((l) => ({ ...l, si })));
const REVEAL: number[][] = TL.scenes.map((s) => {
  const rf: number[] = [];
  let prev = 0;
  for (const l of s.lines) {
    const r = l.r ?? 0;
    if (r > prev) {
      const n = r - prev, dur = l.end - l.start;
      for (let k = 0; k < n; k++) rf[prev + k] = l.start + Math.round((k / n) * dur * 0.85);
      prev = r;
    }
  }
  return rf;
});

const SHOTS: Record<string, { s: number; x: number; y: number; rot?: number }> = {
  wide: { s: 1.05, x: 960, y: 480 },
  med: { s: 1.2, x: 1000, y: 480 },
  mcu: { s: 2.0, x: 470, y: 425 },
  mon: { s: 1.62, x: 1290, y: 392 },
  side: { s: 1.18, x: 990, y: 470, rot: -3 },
  black: { s: 1, x: 960, y: 540 },
};

const mouthAt = (f: number) => {
  let s = 0, n = 0;
  for (let k = -1; k <= 1; k++) { const c = TL.mouth.charCodeAt(f + k); if (c >= 48 && c <= 57) { s += (c - 48) / 9; n++; } }
  return n ? s / n : 0;
};

const Studio: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    <div style={{ position: 'absolute', left: -500, top: -300, width: 2920, height: 1700, background: 'linear-gradient(180deg, #05080d 0%, #0a1019 45%, #070a10 100%)' }} />
    <div style={{ position: 'absolute', left: -500, top: 0, width: 2920, height: 760, background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 2px, transparent 2px, transparent 120px)' }} />
    {[-120, 1840].map((x) => (
      <div key={x} style={{ position: 'absolute', left: x, top: 40, width: 6, height: 640, background: C.cyan, opacity: 0.55, boxShadow: `0 0 40px 12px rgba(79,209,232,0.25)` }} />))}
    <div style={{ position: 'absolute', left: -500, top: 236, width: 2920, height: 2, background: 'rgba(79,209,232,0.25)', boxShadow: '0 0 18px 4px rgba(79,209,232,0.12)' }} />
    {[[180, 170, 60], [620, 140, 40], [1500, 90, 50], [1760, 300, 70], [90, 520, 46], [1650, 560, 36]].map(([x, y, r], i) => (
      <div key={i} style={{ position: 'absolute', left: x, top: y, width: r, height: r, borderRadius: r, background: i % 2 ? 'rgba(207,174,98,0.10)' : 'rgba(79,209,232,0.08)', filter: 'blur(14px)' }} />))}
    {/* back wall screen with faint gold chart */}
    <div style={{ position: 'absolute', left: 120, top: 110, width: 640, height: 340, borderRadius: 6, background: '#070c13', border: '1px solid #121b26', overflow: 'hidden', filter: 'blur(1.6px)', opacity: 0.85 }}>
      <svg width={640} height={340}>
        <polyline fill="none" stroke={C.gold} strokeWidth={2} opacity={0.45}
          points={Array.from({ length: 64 }, (_, i) => `${i * 10.2},${220 - i * 1.6 - Math.sin(i / 3 + frame / 90) * 18 - (i > 40 ? (i - 40) * 3 : 0)}`).join(' ')} />
        {[0, 1, 2, 3].map((g) => <line key={g} x1={0} x2={640} y1={60 + g * 70} y2={60 + g * 70} stroke="#132030" />)}
      </svg>
    </div>
    <div style={{ position: 'absolute', left: -500, top: 680, width: 2920, height: 120, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.5))' }} />
  </>
);

const Desk: React.FC = () => (
  <>
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <linearGradient id="deskTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#151b24" /><stop offset="100%" stopColor="#0d1118" /></linearGradient>
        <linearGradient id="deskFront" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b0e13" /><stop offset="100%" stopColor="#040507" /></linearGradient>
        <radialGradient id="spill" cx="50%" cy="0%" r="70%"><stop offset="0%" stopColor="rgba(79,209,232,0.16)" /><stop offset="100%" stopColor="rgba(79,209,232,0)" /></radialGradient>
      </defs>
      <path d="M-400,800 L-200,748 L2120,748 L2320,800 Z" fill="url(#deskTop)" />
      <ellipse cx={1290} cy={760} rx={520} ry={40} fill="url(#spill)" />
      <path d="M-400,800 L2320,800 L2320,1400 L-400,1400 Z" fill="url(#deskFront)" />
      <line x1={-400} x2={2320} y1={800} y2={800} stroke="rgba(79,209,232,0.35)" strokeWidth={1.5} />
      {/* keyboard */}
      <path d="M820,782 L850,760 L1100,760 L1120,782 Z" fill="#1a212c" stroke="#252e3b" />
      {/* mug */}
      <rect x={140} y={706} width={46} height={58} rx={6} fill="#1d232c" />
      <path d="M186,720 Q204,732 186,748" stroke="#1d232c" strokeWidth={6} fill="none" />
      {/* notebook */}
      <path d="M640,770 L660,752 L760,752 L748,770 Z" fill="#20262f" />
    </svg>
  </>
);

const Monitor: React.FC<{ ctx: Ctx; scene: Scene; frame: number }> = ({ ctx, scene, frame }) => {
  const fade = ease(ctx.local / 14);
  const secs = Math.floor(frame / 30);
  const clock = `14:${String(32 + Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  return (
    <>
      <div style={{ position: 'absolute', left: 1268, top: 650, width: 44, height: 105, background: 'linear-gradient(90deg,#10151c,#1b222c,#10151c)' }} />
      <div style={{ position: 'absolute', left: 1180, top: 746, width: 220, height: 16, borderRadius: 8, background: '#141a22' }} />
      <div style={{ position: 'absolute', left: 830, top: 120, width: 920, height: 540, borderRadius: 10, background: '#030406', padding: 10, boxSizing: 'border-box', boxShadow: '0 0 90px rgba(79,209,232,0.16), 0 30px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 4, background: `radial-gradient(ellipse at 50% 0%, #0b1420 0%, ${C.bg} 70%)`, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.35 }} />
          <div style={{ position: 'relative', height: 34, borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16 }}>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 13, letterSpacing: 3, color: C.white }}>VIRUS<span style={{ color: C.cyan }}> AI</span></div>
            <div style={{ width: 1, height: 14, background: C.line }} />
            <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 1.6, color: C.cyan, opacity: fade }}>{scene.panel.title || 'GLOBAL CAUSAL INTELLIGENCE'}</div>
            <div style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: C.muted, letterSpacing: 1.2 }}>
              <span style={{ color: C.green }}>●</span> RESEARCH MODE · XAUUSD · {clock} UTC
            </div>
          </div>
          <div style={{ position: 'relative', padding: '18px 20px 0', opacity: fade }}>
            <Panel ctx={ctx} />
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.035) 0%, transparent 35%)' }} />
        </div>
      </div>
    </>
  );
};

const ARCard: React.FC<{ text: string; p: number }> = ({ text, p }) => (
  <div style={{ position: 'absolute', left: 586, top: 150, opacity: p, transform: `scale(${0.92 + 0.08 * p})`, transformOrigin: 'right center' }}>
    <div style={{ border: `1px solid ${text.includes('BROKER') ? C.amber : C.cyan}88`, background: 'rgba(8,16,24,0.72)', backdropFilter: 'blur(6px)', borderRadius: 6, padding: '10px 14px', boxShadow: `0 0 24px rgba(79,209,232,0.18)` }}>
      <div style={{ fontFamily: MONO, fontSize: 15, letterSpacing: 1.6, color: text.includes('BROKER') ? C.amber : C.cyan }}>● {text}</div>
    </div>
    <div style={{ position: 'absolute', right: -60, top: 20, width: 60 * p, height: 1, background: C.cyan, opacity: 0.6 }} />
  </div>
);

const Final: React.FC<{ scene: Scene; frame: number }> = ({ scene, frame }) => {
  const rf = REVEAL[TL.scenes.indexOf(scene)];
  const rv = (i: number) => ease((frame - (rf[i] ?? 1e9)) / 14);
  const lines = ['UNDERSTAND THE MARKET.', 'UNDERSTAND THE CAUSES.', 'TRACE THE TRANSMISSION.', 'TEST THE HYPOTHESIS.', 'MEASURE THE UNCERTAINTY.', 'VALIDATE BEFORE TRUST.'];
  const endF = scene.end;
  const out = 1 - ease((frame - (endF - 100)) / 20);
  const again = ease((frame - (endF - 62)) / 25);
  return (
    <AbsoluteFill style={{ background: '#020305', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: out, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ opacity: rv(0) }}><Logo size={84} /></div>
        <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          {lines.map((l, i) => <div key={l} style={{ fontFamily: MONO, fontSize: 26, letterSpacing: 5, color: i === 5 ? C.cyan : C.text, opacity: rv(i + 1), transform: `translateY(${(1 - rv(i + 1)) * 8}px)` }}>{l}</div>)}
        </div>
      </div>
      <div style={{ position: 'absolute', opacity: again }}><Logo size={84} /></div>
    </AbsoluteFill>
  );
};

export const Video: React.FC = () => {
  const frame = useCurrentFrame();
  let si = TL.scenes.findIndex((s) => frame < s.end);
  if (si < 0) si = TL.scenes.length - 1;
  const scene = TL.scenes[si];
  let li = -1;
  for (let i = 0; i < FLAT.length; i++) { if (FLAT[i].start <= frame) li = i; else break; }
  const line = FLAT[Math.max(0, li)];
  const prevLine = FLAT[Math.max(0, li - 1)];
  let shotLine = line;
  for (let i = Math.max(0, li); i >= 0; i--) { if (FLAT[i].shot) { shotLine = FLAT[i]; break; } }
  const shot = SHOTS[shotLine.shot || 'wide'];
  const pushK = shotLine.push ? 1 + 0.07 * ease((frame - shotLine.start) / 300) : 1;

  const rf = REVEAL[si];
  const hlv = line.si === si ? line.hl : undefined;
  const hlArr = typeof hlv === 'number' ? [hlv] : Array.isArray(hlv) ? hlv : [];
  const ctx: Ctx = {
    frame, local: frame - scene.start, panel: scene.panel, revealFrames: rf,
    reveal: (i: number) => (i < 0 ? 0 : ease((frame - (rf[i] ?? 1e9)) / 12)),
    hl: (i: number) => hlArr.includes(i), anyHl: hlArr.length > 0,
  };

  const since = frame - line.start;
  const k = li <= 0 ? 1 : ease(since / 10);
  const pose = blendPose(poseFor(prevLine.g || 'rest', frame), poseFor(line.g || 'rest', frame), k);
  const lookTo = (l: Line) => (l.look === 'mon' ? 1 : 0);
  const look = lookTo(prevLine) + (lookTo(line) - lookTo(prevLine)) * ease(since / 8);
  const mouth = mouthAt(frame);
  const energy = (mouthAt(frame - 3) + mouthAt(frame - 6) + mouth) / 3;
  const bl = [frame % 131, (frame + 57) % 197].map((m) => (m < 6 ? 1 - Math.abs(m - 2.5) / 3 : 0));
  const blink = Math.max(0, ...bl);

  const arP = line.ar ? ease(since / 10) * (1 - ease((frame - line.end - 60) / 12)) : 0;
  const dim = scene.id === 's23' ? 0.35 * ease((frame - scene.start) / 60) : 0;

  const isFinal = scene.panel.type === 'final';
  const finalFade = isFinal ? ease((frame - scene.start) / 30) : 0;

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Audio src={staticFile('mix.mp3')} />
      {finalFade < 1 && (
        <AbsoluteFill style={{ overflow: 'hidden', perspective: shot.rot ? '2200px' : undefined }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0',
            transform: `${shot.rot ? `rotateY(${shot.rot}deg) ` : ''}translate(960px, 540px) scale(${shot.s * pushK}) translate(${-shot.x}px, ${-shot.y}px)` }}>
            <Studio frame={frame} />
            <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              <PresenterBody frame={frame} pose={pose} look={look} mouth={mouth} energy={energy} blink={blink} />
            </svg>
            <Desk />
            <Monitor ctx={isFinal ? { ...ctx, panel: { type: 'logo' } } : ctx} scene={isFinal ? { ...scene, panel: { type: 'logo' } } : scene} frame={frame} />
            <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              <PresenterArms pose={pose} />
            </svg>
            {line.ar && <ARCard text={line.ar} p={arP} />}
          </div>
          <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
          <AbsoluteFill style={{ background: '#000', opacity: dim }} />
        </AbsoluteFill>
      )}
      {isFinal && <AbsoluteFill style={{ opacity: finalFade }}><Final scene={scene} frame={frame} /></AbsoluteFill>}
      <AbsoluteFill style={{ background: '#000', opacity: 1 - ease(frame / 25) }} />
    </AbsoluteFill>
  );
};
