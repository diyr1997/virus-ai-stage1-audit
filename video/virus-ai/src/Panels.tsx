import React from 'react';

export const C = {
  bg: '#060a11', panel: '#0b121c', line: '#1b2633', grid: '#111a25',
  text: '#e6edf5', muted: '#7d8a99', dim: '#465464',
  cyan: '#4fd1e8', cyanDim: 'rgba(79,209,232,0.14)', amber: '#e0a84a', red: '#e0605a',
  gold: '#cfae62', green: '#6fcf97', white: '#f2f5f8',
};
export const SANS = 'Inter, "Liberation Sans", sans-serif';
export const MONO = '"JetBrains Mono", "DejaVu Sans Mono", monospace';

export type Ctx = {
  frame: number;
  local: number; // frames since scene start
  reveal: (i: number) => number; // 0..1
  hl: (i: number) => boolean;
  anyHl: boolean;
  panel: any;
  revealFrames: number[];
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (x: number) => { const t = clamp(x); return 1 - Math.pow(1 - t, 3); };
const ap = (p: number, dy = 10): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * dy}px)` });
const toneColor = (t: string) => ({ cyan: C.cyan, amber: C.amber, red: C.red, gold: C.gold, white: C.white, green: C.green } as any)[t] || C.cyan;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const Label: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, color = C.muted, size = 13, style }) => (
  <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: 1.6, color, textTransform: 'uppercase', ...style }}>{children}</div>
);

const Node: React.FC<{ text: string; p: number; color?: string; hl?: boolean; dashed?: boolean; w?: number; small?: boolean; locked?: boolean; style?: React.CSSProperties }> =
  ({ text, p, color = C.cyan, hl, dashed, w, small, locked, style }) => (
    <div style={{
      ...ap(p), width: w, padding: small ? '7px 12px' : '10px 16px', borderRadius: 6,
      border: `1.5px ${dashed ? 'dashed' : 'solid'} ${locked ? C.dim : hl ? color : color + '88'}`,
      background: hl ? `linear-gradient(${color}22, ${color}22), #0a121c` : '#0a121c', color: locked ? C.dim : C.text,
      fontFamily: MONO, fontSize: small ? 14 : 17, letterSpacing: 1.2, textAlign: 'center', whiteSpace: 'nowrap',
      boxShadow: hl ? `0 0 22px ${color}55` : 'none', ...style,
    }}>{locked ? '■ ' : ''}{text}</div>
  );

const Arrow: React.FC<{ p: number; dir?: 'down' | 'right'; color?: string; len?: number }> = ({ p, dir = 'down', color = C.cyan, len = 22 }) => (
  <div style={{ opacity: p, color, fontFamily: MONO, fontSize: 18, lineHeight: 1, textAlign: 'center', width: dir === 'right' ? len : undefined, height: dir === 'down' ? len : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dir === 'down' ? '↓' : '→'}</div>
);

// ---------- chart ----------
function series(seed: number, n: number) {
  const r = rng(seed);
  const out: { o: number; h: number; l: number; c: number }[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    let d = (r() - 0.5) * 0.9;
    if (i > 16 && i < 32) d += 0.45;
    if (i === 40) d += 4.2;
    if (i > 40 && i < 48) d += 0.2;
    let vol = 1;
    if (i >= 50 && i <= 62) { vol = 2.6; d += (i % 2 ? 1 : -1) * 1.6; }
    if (i >= 66) d -= 0.55;
    if (i === 66) d -= 2.5;
    const o = p, c = p + d;
    out.push({ o, c, h: Math.max(o, c) + r() * 0.6 * vol, l: Math.min(o, c) - r() * 0.6 * vol }); p = c;
  }
  return out;
}

function variantSeries(seed: number, n: number, variant: number) {
  const r = rng(seed); let p = 100; const out = [] as { o: number; h: number; l: number; c: number }[];
  for (let i = 0; i < n; i++) {
    let d = (r() - 0.5) * 0.8;
    if (i >= 18) d += variant === 0 ? 0.6 : variant === 1 ? (i < 26 ? 0.5 : -0.35) : variant === 2 ? -0.6 : 0.4;
    const o = p, c = p + d; out.push({ o, c, h: Math.max(o, c) + r() * 0.4, l: Math.min(o, c) - r() * 0.4 }); p = c;
  }
  return out;
}

const Chart: React.FC<{ ctx: Ctx; w: number; h: number; seed?: number; marks?: string[]; drawIn?: boolean; mini?: boolean; variant?: number }> = ({ ctx, w, h, seed = 3, marks = [], drawIn = true, mini, variant }) => {
  const n = mini ? 40 : 80;
  const data = React.useMemo(() => (variant === undefined ? series(seed, n) : variantSeries(seed, n, variant)), [seed, n, variant]);
  const lo = Math.min(...data.map((d) => d.l)) - 1, hi = Math.max(...data.map((d) => d.h)) + 1;
  const x = (i: number) => (mini ? 8 : 40) + (i / (n - 1)) * (w - (mini ? 16 : 70));
  const y = (v: number) => 14 + (1 - (v - lo) / (hi - lo)) * (h - 34);
  const shown = drawIn ? Math.max(1, Math.floor(ease(ctx.local / 40) * n)) : n;
  const bw = Math.max(2, ((w - 60) / n) * 0.55);
  const mp = (k: string) => (marks.indexOf(k) >= 0 ? ctx.reveal(marks.indexOf(k)) : 0);
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {[0, 1, 2, 3, 4].map((g) => <line key={g} x1={mini ? 0 : 40} x2={w - (mini ? 0 : 30)} y1={14 + (g * (h - 34)) / 4} y2={14 + (g * (h - 34)) / 4} stroke={C.grid} strokeWidth={1} />)}
      {!mini && [0, 1, 2, 3, 4].map((g) => <text key={'t' + g} x={w - 24} y={18 + (g * (h - 34)) / 4} fill={C.dim} fontFamily={MONO} fontSize={11}>{(2385 + (4 - g) * 6.5).toFixed(1)}</text>)}
      {mp('vol') > 0 && <rect x={x(50) - 6} y={10} width={x(62) - x(50) + 12} height={h - 26} fill={C.amber} opacity={0.08 * mp('vol')} />}
      {data.slice(0, shown).map((d, i) => {
        const up = d.c >= d.o; const col = up ? '#8fb3c4' : '#3e5566';
        const isImp = i === 40 && mp('impulse') > 0;
        return (
          <g key={i}>
            <line x1={x(i)} x2={x(i)} y1={y(d.h)} y2={y(d.l)} stroke={isImp ? C.cyan : col} strokeWidth={1} />
            <rect x={x(i) - bw / 2} y={y(Math.max(d.o, d.c))} width={bw} height={Math.max(1.5, Math.abs(y(d.o) - y(d.c)))} fill={isImp ? C.cyan : up ? col : 'transparent'} stroke={isImp ? C.cyan : col} strokeWidth={1} />
          </g>
        );
      })}
      {mp('up') > 0 && <g opacity={mp('up')}>
        <path d={`M${x(17)},${y(data[17].c) + 22} L${x(31)},${y(data[31].c) + 22}`} stroke={C.gold} strokeWidth={2} fill="none" />
        <text x={x(22)} y={y(data[31].c) + 50} fill={C.gold} fontFamily={MONO} fontSize={14}>PRICE ↑</text></g>}
      {mp('impulse') > 0 && <text x={x(40) - 30} y={y(data[40].h) - 14} fill={C.cyan} fontFamily={MONO} fontSize={14} opacity={mp('impulse')}>IMPULSE</text>}
      {mp('vol') > 0 && <text x={x(51)} y={30} fill={C.amber} fontFamily={MONO} fontSize={14} opacity={mp('vol')}>VOLATILITY ↑</text>}
      {mp('reversal') > 0 && <g opacity={mp('reversal')}>
        <circle cx={x(66)} cy={y(data[66].c)} r={16 + 8 * (1 - mp('reversal'))} fill="none" stroke={C.white} strokeWidth={1.5} />
        <text x={x(66) + 22} y={y(data[66].c) + 5} fill={C.white} fontFamily={MONO} fontSize={14}>REVERSAL</text></g>}
    </svg>
  );
};

const ChartPanel: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const marks: string[] = ctx.panel.marks || [];
  const pw = ctx.reveal(marks.indexOf('what')), py = ctx.reveal(marks.indexOf('why'));
  return (
    <div>
      <Chart ctx={ctx} w={860} h={340} marks={marks} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 14, paddingLeft: 40, height: 50 }}>
        <div style={{ ...ap(pw), fontFamily: MONO, fontSize: 24, color: C.text, letterSpacing: 2 }}>{ctx.panel.whatText || 'WHAT HAPPENED?'}</div>
        <div style={{ opacity: py, color: C.cyan, fontSize: 24 }}>→</div>
        <div style={{ ...ap(py), fontFamily: MONO, fontSize: 34, color: C.cyan, letterSpacing: 3, textShadow: `0 0 18px ${C.cyan}88` }}>{ctx.panel.whyText || 'WHY?'}</div>
      </div>
    </div>
  );
};

// ---------- chips ----------
const Chips: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const items: string[] = ctx.panel.items;
  const logoP = ctx.panel.logo ? 1 - ctx.reveal(0) : 0;
  return (
    <div style={{ position: 'relative', height: 400 }}>
      {logoP > 0.01 && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: logoP }}><Logo size={60} /></div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', paddingTop: 40 }}>
        {items.map((t, i) => <Node key={t} text={t} p={ctx.reveal(i)} hl={ctx.reveal(i) > 0 && ctx.reveal(i) < 1} w={items.length > 8 ? 250 : 300} />)}
      </div>
    </div>
  );
};

// ---------- flows ----------
const Flows: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const P = ctx.panel;
  const boxes: string[] = P.boxes || [], side: string[] = P.side || [], alts: string[] = P.alts || [];
  let k = 0;
  const bi = boxes.map(() => k++); const merge = boxes.length ? k++ : -1;
  const si = side.map(() => k++);
  const chains: number[][] = (P.chains || []).map((ch: string[]) => ch.map(() => k++));
  const ai = alts.map(() => k++); const li = P.locked ? k++ : -1;
  const mergeP = merge >= 0 ? ctx.reveal(merge) : 0;
  const altP = ai.length ? ctx.reveal(ai[0]) : 0;
  const fresh = (i: number) => ctx.reveal(i) > 0 && ctx.reveal(i) < 1;

  const chainEl = (ch: string[], ids: number[], dir: string, key: number) => {
    if (dir === 'v2') {
      const last = ids.filter((q) => ctx.reveal(q) > 0).length - 1;
      return (
        <div key={key} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 400px)', gap: '22px 30px', justifyContent: 'center', marginTop: 30 }}>
          {ch.map((t, j) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Label color={C.dim} style={{ opacity: ctx.reveal(ids[j]) }}>{String(j + 1).padStart(2, '0')}</Label>
              <Node text={t} p={ctx.reveal(ids[j])} w={340} small hl={j === last} color={t === 'VALIDATION' ? C.green : C.cyan} />
            </div>))}
        </div>);
    }
    const isV = dir === 'v';
    return (
      <div key={key} style={{ display: 'flex', flexDirection: isV ? 'column' : 'row', alignItems: 'center', gap: 2, justifyContent: 'center', marginTop: 6 }}>
        {ch.map((t, j) => (
          <React.Fragment key={t + j}>
            {j > 0 && <Arrow p={ctx.reveal(ids[j])} dir={isV ? 'down' : 'right'} color={altP > 0 ? C.amber : C.cyan} len={isV ? 16 : 30} />}
            <Node text={t} p={ctx.reveal(ids[j])} dashed={altP > 0} small={isV && ch.length > 4} w={isV ? 260 : undefined}
              hl={ctx.hl(ids[j]) || fresh(ids[j])} color={t.includes('XAU') || t === 'GOLD' ? C.gold : C.cyan} />
          </React.Fragment>))}
      </div>);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', minHeight: 440 }}>
      {boxes.length > 0 && (
        <div style={{ display: 'flex', gap: 12, opacity: 1 - 0.45 * mergeP }}>
          {boxes.map((b, j) => <Node key={b} text={b} p={ctx.reveal(bi[j])} small color={C.muted} />)}
        </div>)}
      {merge >= 0 && <Label color={C.cyan} style={{ opacity: mergeP }}>{P.mergeLabel || '— everything happens at the same time —'}</Label>}
      {side.length > 0 && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 30 }}>
          <Label color={C.amber} style={{ opacity: ctx.reveal(si[0]) }}>KNOWN TODAY</Label>
          {side.map((s, j) => <Node key={s} text={s} p={ctx.reveal(si[j])} small color={C.amber} dashed />)}
          <Label color={C.red} style={{ opacity: ctx.reveal(chains[0]?.[0] ?? 0) }}>✕ NOT KNOWN THEN</Label>
        </div>)}
      <div style={{ display: 'flex', gap: 60, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {(P.chains || []).map((ch: string[], ci: number) => chainEl(ch, chains[ci], P.dir || 'h', ci))}
          {P.locked && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Arrow p={ctx.reveal(li)} color={C.dim} len={16} />
              <Node text={P.locked} p={ctx.reveal(li)} locked w={320} small />
            </div>)}
        </div>
        {alts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <Label color={C.amber} style={{ opacity: altP }}>{P.altTitle || 'ALTERNATIVE EXPLANATIONS'}</Label>
            {alts.map((a, j) => <Node key={a} text={a} p={ctx.reveal(ai[j])} color={C.amber} w={290} small hl={fresh(ai[j])} />)}
            <Node text={P.altFooter || "CAUSAL HYPOTHESIS · UNPROVEN"} p={altP} color={C.white} dashed small w={290} style={{ marginTop: 10 }} />
          </div>)}
      </div>
    </div>
  );
};

// ---------- state ----------
const State: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const items: [string, string, string][] = ctx.panel.items;
  const b = ctx.reveal(items.length);
  return (
    <div style={{ paddingTop: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {items.map(([k, v, t], i) => {
          const p = ctx.reveal(i); const col = toneColor(t);
          return (
            <div key={k} style={{ ...ap(p), border: `1px solid ${C.line}`, borderRadius: 8, padding: '16px 14px', background: C.panel, boxShadow: p > 0 && p < 1 ? `0 0 18px ${col}44` : 'none' }}>
              <Label>{k}</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: col }} />
                <div style={{ fontFamily: MONO, fontSize: 17, color: C.text }}>{v}</div>
              </div>
              <div style={{ height: 3, background: C.grid, marginTop: 12, borderRadius: 2 }}>
                <div style={{ height: 3, width: `${(30 + ((i * 37) % 55)) * p}%`, background: col, borderRadius: 2, opacity: 0.8 }} />
              </div>
            </div>);
        })}
      </div>
      <div style={{ ...ap(b), marginTop: 34, textAlign: 'center' }}>
        <Label color={C.cyan} size={15}>{ctx.panel.banner || 'LAYER 01 · same news + different regime → different reaction'}</Label>
      </div>
    </div>
  );
};

// ---------- news ----------
const News: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const steps: string[] = ctx.panel.items;
  const times = ['T+0.0s', 'T+0.3s', 'T+2s', 'T+5s', 'T+8s', 'T+15s', 'T+40s'];
  const done = steps.filter((_, j) => ctx.reveal(j + 1) > 0).length;
  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ ...ap(ctx.reveal(0)), display: 'flex', alignItems: 'center', gap: 18, border: `1px solid ${C.cyan}66`, borderRadius: 8, padding: '12px 18px', background: C.cyanDim }}>
        <Label color={C.cyan}>NEWS RELEASE</Label>
        <div style={{ fontFamily: SANS, fontSize: 18, color: C.text }}>Macro data release · actual vs. consensus</div>
        <Label style={{ marginLeft: 'auto' }}>13:30:00 UTC</Label>
      </div>
      <div style={{ position: 'relative', marginTop: 40 }}>
        <div style={{ position: 'absolute', left: 58, top: 6, height: 2, width: Math.max(0, done - 1) / (steps.length - 1) * 744, background: `linear-gradient(90deg, ${C.cyan}, ${C.gold})`, opacity: 0.5 }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {steps.map((s, j) => {
            const p = ctx.reveal(j + 1); const col = s === 'XAUUSD' ? C.gold : C.cyan;
            return (
              <div key={s} style={{ ...ap(p), display: 'flex', flexDirection: 'column', alignItems: 'center', width: 116 }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, border: `2px solid ${col}`, background: p >= 1 ? col : C.bg }} />
                <div style={{ fontFamily: MONO, fontSize: 13, color: s === 'XAUUSD' ? C.gold : C.text, marginTop: 10, textAlign: 'center' }}>{s}</div>
                <Label size={11} style={{ marginTop: 4 }}>{times[j]}</Label>
              </div>);
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 70, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...ap(ctx.reveal(8)), fontFamily: MONO, fontSize: 24, color: C.text }}>“NEWS → GOLD ↑”</div>
        <div style={{ opacity: ctx.reveal(9), border: `1.5px solid ${C.amber}`, color: C.amber, fontFamily: MONO, fontSize: 18, padding: '8px 14px', borderRadius: 6, transform: `rotate(-3deg) scale(${1 + 0.25 * (1 - ctx.reveal(9))})` }}>HYPOTHESIS · NOT PROOF</div>
      </div>
    </div>
  );
};

// ---------- cards ----------
const Cards: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const items: [string, string, string, string?][] = ctx.panel.items;
  return (
    <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 50 }}>
      {items.map(([h, s, t, ic], i) => {
        const p = ctx.reveal(i); const col = toneColor(t); const on = ctx.hl(i);
        return (
          <div key={h} style={{ opacity: p, width: 250, height: 210, borderRadius: 10, border: `1.5px solid ${on ? col : C.line}`, background: on ? col + '18' : C.panel, padding: 22, boxShadow: on ? `0 0 30px ${col}44` : 'none', transform: `translateY(${(1 - p) * 10}px) scale(${on ? 1.05 : 1})` }}>
            <div style={{ width: 34, height: 34, borderRadius: 17, border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: col, fontFamily: MONO, fontSize: 18 }}>{ic || (i === 0 ? '✓' : i === 1 ? '≠' : '?')}</div>
            <div style={{ fontFamily: MONO, fontSize: 22, color: C.text, marginTop: 26, letterSpacing: 1.5 }}>{h}</div>
            <div style={{ fontFamily: SANS, fontSize: 16, color: C.muted, marginTop: 10 }}>{s}</div>
          </div>);
      })}
    </div>
  );
};

// ---------- network ----------
const Network: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const N: Record<string, [number, number]> = {
    EVENT: [70, 190], MACRO: [230, 100], BONDS: [390, 60], YIELDS: [410, 200], USD: [580, 120], EQUITIES: [250, 320], OIL: [450, 340], RISK: [610, 290], GOLD: [790, 200],
  };
  const all: [string, string][] = [['EVENT', 'MACRO'], ['MACRO', 'BONDS'], ['BONDS', 'YIELDS'], ['YIELDS', 'USD'], ['USD', 'GOLD'], ['EVENT', 'EQUITIES'], ['EQUITIES', 'RISK'], ['RISK', 'GOLD'], ['OIL', 'RISK'], ['MACRO', 'EQUITIES']];
  const prim = new Set(['EVENT-MACRO', 'MACRO-BONDS', 'BONDS-YIELDS', 'YIELDS-USD']);
  const rv = (k: number) => ctx.reveal(k);
  const order = ['EVENT', 'MACRO', 'BONDS', 'YIELDS', 'USD', 'GOLD'];
  return (
    <svg width={860} height={400} style={{ overflow: 'visible', marginTop: 10 }}>
      {all.map(([a, b]) => {
        const key = `${a}-${b}`; const lit = prim.has(key) ? rv(2) : rv(3);
        return <line key={key} x1={N[a][0]} y1={N[a][1]} x2={N[b][0]} y2={N[b][1]} stroke={lit > 0 ? C.cyan : C.line} strokeWidth={lit > 0 ? 2 : 1} opacity={0.25 + 0.75 * Math.max(rv(1) * 0.5, lit)} />;
      })}
      {rv(6) > 0 && <g opacity={rv(6)}><line x1={N.OIL[0]} y1={N.OIL[1]} x2={N.GOLD[0]} y2={N.GOLD[1]} stroke={C.amber} strokeWidth={2} strokeDasharray="6 6" />
        <text x={560} y={395} fill={C.amber} fontFamily={MONO} fontSize={13}>CO-OCCURRENCE ≠ CAUSATION ?</text></g>}
      {Object.entries(N).map(([k, [x, y]]) => {
        const lit = ['EVENT', 'MACRO', 'BONDS', 'YIELDS', 'USD'].includes(k) ? rv(2) : rv(3);
        const col = k === 'GOLD' ? C.gold : C.cyan; const oi = order.indexOf(k);
        return (
          <g key={k} opacity={rv(0)}>
            <circle cx={x} cy={y} r={32} fill={C.panel} stroke={lit > 0 ? col : C.dim} strokeWidth={1.5} />
            <text x={x} y={y + 4} fill={lit > 0 ? C.text : C.muted} fontFamily={MONO} fontSize={k.length > 5 ? 10 : 12} textAnchor="middle">{k}</text>
            {oi >= 0 && <text x={x} y={y - 42} fill={C.cyan} fontFamily={MONO} fontSize={13} textAnchor="middle" opacity={rv(4)}>t{oi + 1}</text>}
            {oi >= 0 && oi < 5 && <text x={x + 26} y={y + 34} fill={C.green} fontFamily={MONO} fontSize={15} opacity={rv(5)}>✓</text>}
          </g>);
      })}
    </svg>
  );
};

// ---------- history ----------
const History: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const names: string[] = ctx.panel.names || ['HIST. EVENT A', 'HIST. EVENT B', 'HIST. EVENT C', 'TODAY'];
  const rn: string[] | undefined = ctx.panel.rowNames;
  const rows = [['XAU', ['+1.4%', '−0.3%', '−1.1%', '?']], ['USD·YLD', ['↓ · ↓', '↑ · ↑', '↑ · ↓', '↓ · ↓']], ['VOL', ['LOW', 'HIGH', 'HIGH', 'ELEVATED']], ['REGIME', ['RISK-ON', 'TIGHTENING', 'RISK-OFF', 'TRANSITION']], ['SIMILARITY', ['0.71', '0.38', '0.52', '—']]] as [string, string[]][];
  return (
    <div>
      <div style={{ display: 'flex', gap: 14 }}>
        {names.map((n, i) => {
          const p = ctx.reveal(i); const on = ctx.hl(i);
          return (
            <div key={n} style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px) scale(${on ? 1.04 : 1})`, width: 200, border: `1px solid ${on ? C.cyan : i === 3 ? C.gold + '88' : C.line}`, borderRadius: 8, background: C.panel, padding: '10px 6px 4px', boxShadow: on ? `0 0 20px ${C.cyan}44` : 'none' }}>
              <Label size={11} color={i === 3 ? C.gold : C.muted} style={{ paddingLeft: 8 }}>{n}</Label>
              <Chart ctx={ctx} w={186} h={110} mini seed={11 + i} variant={i} drawIn={false} />
            </div>);
        })}
      </div>
      <div style={{ marginTop: 12 }}>
        {rows.map(([k, vals], ri) => (
          <div key={k} style={{ ...ap(ctx.reveal([4, 4, 5, 6, 7][ri])), display: 'flex', gap: 14, borderTop: `1px solid ${C.grid}`, padding: '7px 0' }}>
            {vals.map((v, i) => <div key={i} style={{ width: 200, fontFamily: MONO, fontSize: 14, color: i === 3 ? C.gold : C.text, paddingLeft: 10 }}><span style={{ color: C.dim, fontSize: 11, marginRight: 8 }}>{rn ? rn[ri] : k}</span>{v}</div>)}
          </div>))}
      </div>
    </div>
  );
};

// ---------- council ----------
const Council: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const models = [['CHATGPT', 'CAUSE A'], ['CLAUDE', 'CAUSE B'], ['GEMINI', 'CAUSE A'], ['GROK', 'UNCERTAIN'], ['KIMI', 'CAUSE A']];
  const steps = ['COMPARE', 'CRITIQUE', 'EVIDENCE', 'SYNTHESIS'];
  return (
    <div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {models.map(([m, o], i) => (
          <div key={m} style={{ ...ap(ctx.reveal(i)), width: 150, border: `1px solid ${C.line}`, borderRadius: 8, background: C.panel, padding: 12 }}>
            <Label color={C.text} size={13}>{m}</Label>
            <div style={{ fontFamily: MONO, fontSize: 15, color: o === 'UNCERTAIN' ? C.amber : C.cyan, marginTop: 10 }}>{o}</div>
          </div>))}
      </div>
      <div style={{ ...ap(ctx.reveal(5)), margin: '16px auto 0', width: 600, textAlign: 'center', border: `1px dashed ${C.amber}`, borderRadius: 6, padding: 8 }}>
        <Label color={C.amber}>5 models ≠ 5 proofs · shared premise → shared error</Label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 4 }}>
        {steps.map((s, j) => (
          <React.Fragment key={s}>
            <Arrow p={ctx.reveal(6 + j)} len={14} />
            <Node text={s} p={ctx.reveal(6 + j)} w={260} small hl={ctx.reveal(6 + j) > 0 && ctx.reveal(7 + j) === 0} />
          </React.Fragment>))}
      </div>
      <div style={{ ...ap(ctx.reveal(9)), display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
        {[['FACTS', C.cyan], ['ASSUMPTIONS', C.amber], ['INTERPRETATIONS', C.white]].map(([t, c]) => <Label key={t} color={c} style={{ border: `1px solid ${c}55`, padding: '4px 10px', borderRadius: 4 }}>{t}</Label>)}
      </div>
    </div>
  );
};

// ---------- quant ----------
const Quant: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const items: string[] = ctx.panel.items;
  const morph = ease((ctx.frame - (ctx.revealFrames[4] ?? 1e9)) / 60);
  const r = rng(5);
  const pts = Array.from({ length: 120 }, (_, i) => 60 + Math.sin(i / 9) * 20 + (r() - 0.5) * 30);
  const bins = Array.from({ length: 24 }, (_, i) => Math.exp(-Math.pow((i - 11.5) / 5, 2)) * 110 + (i % 3) * 4 + (i < 3 || i > 20 ? 6 : 0));
  return (
    <div style={{ display: 'flex', gap: 28, paddingTop: 10 }}>
      <div style={{ width: 430 }}>
        <svg width={430} height={290} style={{ opacity: Math.max(ctx.reveal(0), 0.3) }}>
          <polyline fill="none" stroke={C.cyan} strokeWidth={1.5} opacity={1 - morph} points={pts.map((v, i) => `${10 + i * 3.4},${40 + v}`).join(' ')} />
          {bins.map((b, i) => <rect key={i} x={20 + i * 16.5} y={270 - b * morph * 1.6} width={13} height={b * morph * 1.6} fill={C.cyan} opacity={0.55} />)}
          <line x1={10} x2={420} y1={270} y2={270} stroke={C.line} />
          <text x={12} y={18} fill={C.muted} fontFamily={MONO} fontSize={12}>{morph < 0.5 ? 'XAUUSD RETURNS · TIME SERIES' : 'RETURN DISTRIBUTION · FAT TAILS'}</text>
        </svg>
        <div style={{ ...ap(ctx.reveal(10)), marginTop: 10, border: `1.5px solid ${C.green}`, color: C.green, borderRadius: 6, padding: '8px 12px', fontFamily: MONO, fontSize: 14, textAlign: 'center' }}>OUT-OF-SAMPLE · DATA NEVER SEEN BY THE MODEL</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignContent: 'start', flex: 1 }}>
        {items.map((t, i) => <Node key={t} text={t} p={ctx.reveal(i + 1)} small hl={ctx.reveal(i + 1) > 0 && ctx.reveal(i + 1) < 1} />)}
      </div>
    </div>
  );
};

// ---------- micro ----------
const Micro: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const asks = [2387.62, 2387.55, 2387.49, 2387.44, 2387.40];
  const bids = [2387.21, 2387.15, 2387.08, 2387.02, 2386.95];
  const sz = [12, 30, 18, 44, 22];
  const flick = Math.floor(ctx.frame / 8);
  return (
    <div style={{ display: 'flex', gap: 30 }}>
      <div style={{ ...ap(ctx.reveal(0)), width: 360, border: `1px solid ${C.line}`, borderRadius: 8, background: C.panel, padding: 14 }}>
        <Label>ORDER BOOK · VENUE: BROKER-X</Label>
        {asks.map((a, i) => <div key={a} style={{ display: 'flex', fontFamily: MONO, fontSize: 15, marginTop: 6, opacity: Math.max(0.2, ctx.reveal(1)) }}>
          <span style={{ color: C.red, width: 110 }}>{a.toFixed(2)}</span>
          <div style={{ height: 12, marginTop: 4, width: sz[(i + flick) % 5] * 3 * ctx.reveal(3), background: C.red + '55' }} /></div>)}
        <div style={{ opacity: ctx.reveal(2), fontFamily: MONO, fontSize: 14, color: C.cyan, margin: '8px 0', borderTop: `1px dashed ${C.line}`, borderBottom: `1px dashed ${C.line}`, padding: '4px 0' }}>SPREAD 0.19 · TICKS {120 + (flick % 9)}/s</div>
        {bids.map((b, i) => <div key={b} style={{ display: 'flex', fontFamily: MONO, fontSize: 15, marginTop: 6, opacity: Math.max(0.2, ctx.reveal(1)) }}>
          <span style={{ color: C.green, width: 110 }}>{b.toFixed(2)}</span>
          <div style={{ height: 12, marginTop: 4, width: sz[(i + flick + 2) % 5] * 3 * ctx.reveal(3), background: C.green + '55' }} /></div>)}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['BID', 'ASK'].map((t) => <Node key={t} text={t} small p={ctx.reveal(1)} />)}
          {['SPREAD', 'TICKS'].map((t) => <Node key={t} text={t} small p={ctx.reveal(2)} />)}
          {['LIQUIDITY', 'DEPTH'].map((t) => <Node key={t} text={t} small p={ctx.reveal(3)} />)}
          <Node text="ORDER FLOW" small p={ctx.reveal(4)} />
        </div>
        <div style={{ ...ap(ctx.reveal(5)), border: `1.5px solid ${C.amber}`, borderRadius: 6, padding: 12, color: C.amber, fontFamily: MONO, fontSize: 15 }}>⚠ BROKER / VENUE SPECIFIC<br /><span style={{ color: C.muted, fontSize: 13 }}>NOT THE GLOBAL ORDER BOOK OF THE GOLD MARKET</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          {['DATA', 'SOURCE', 'VENUE', 'CONTEXT'].map((t, j) => <React.Fragment key={t}>{j > 0 && <Arrow dir="right" p={ctx.reveal(6 + j)} len={22} />}<Node text={t} small p={ctx.reveal(6 + j)} /></React.Fragment>)}
        </div>
      </div>
    </div>
  );
};

// ---------- leak ----------
const Leak: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const a = ctx.reveal(0), b = ctx.reveal(1), c = ctx.reveal(2);
  const row = (txt: string[], p: number, ok: boolean) => (
    <div style={{ ...ap(p), display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 28, position: 'relative' }}>
      {txt.map((t, j) => <React.Fragment key={t}>{j > 0 && <Arrow dir="right" p={1} len={34} color={ok ? C.cyan : C.red} />}<Node text={t} p={1} color={ok ? C.cyan : C.red} w={180} /></React.Fragment>)}
      <div style={{ fontFamily: MONO, fontSize: 30, color: ok ? C.green : C.red, marginLeft: 16, width: 30 }}>{ok ? '✓' : '✕'}</div>
      {!ok && <div style={{ position: 'absolute', left: 70, right: 110, top: '50%', height: 2, background: C.red, transform: `scaleX(${p})`, transformOrigin: 'left' }} />}
    </div>);
  return (
    <div style={{ paddingTop: 20 }}>
      <svg width={860} height={110} style={{ opacity: Math.max(0.3, a) }}>
        <line x1={40} x2={820} y1={60} y2={60} stroke={C.line} strokeWidth={2} />
        <line x1={430} x2={430} y1={34} y2={86} stroke={C.white} strokeWidth={2} />
        <text x={430} y={24} fill={C.white} fontFamily={MONO} fontSize={13} textAnchor="middle">DECISION TIME T</text>
        <text x={120} y={92} fill={C.cyan} fontFamily={MONO} fontSize={14}>PAST · AVAILABLE</text>
        <text x={600} y={92} fill={C.red} fontFamily={MONO} fontSize={14}>FUTURE · NOT AVAILABLE</text>
        <g opacity={a}><path d="M700,52 Q580,6 446,50" stroke={C.red} strokeWidth={2} fill="none" strokeDasharray="6 5" />
          <text x={560} y={14} fill={C.red} fontFamily={MONO} fontSize={12}>LOOK-AHEAD ✕</text></g>
      </svg>
      {row(['PAST DATA', 'MODEL', 'FUTURE'], b, true)}
      {row(['FUTURE DATA', 'MODEL', 'PAST'], c, false)}
    </div>
  );
};

// ---------- scenarios ----------
const Scenarios: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const sc: [string, string, string, number, string][] = ctx.panel.items || [
    ['SCENARIO A', 'Yields continue · USD confirms', 'CONFIDENCE · MEDIUM', 0.55, 'USD reverses'],
    ['SCENARIO B', 'Transmission breaks', 'CONFIDENCE · LOW–MED', 0.35, 'Yields & USD re-align'],
    ['SCENARIO C', 'Conflicting data', 'CONFIDENCE · LOW', 0.25, 'Clear confirmation'],
    ['WAIT', 'Evidence insufficient', 'CONFIDENCE · —', 0, 'New evidence arrives'],
  ];
  const many = sc.length > 4;
  return (
    <div style={{ display: 'flex', gap: many ? 8 : 14, marginTop: 30, justifyContent: 'center' }}>
      {sc.map(([h, cond, conf, v, inv], i) => {
        const p = ctx.reveal(i); const on = ctx.hl(i); const col = toneColor((ctx.panel.tones || [])[i] || (h === 'WAIT' ? 'white' : 'cyan'));
        return (
          <div key={h} style={{ opacity: p, width: many ? 132 : 200, borderRadius: 10, border: `1.5px ${h === 'WAIT' ? 'dashed' : 'solid'} ${on ? col : C.line}`, background: on ? col + '14' : C.panel, padding: many ? 10 : 16, transform: `translateY(${(1 - p) * 10}px) scale(${on ? 1.05 : 1})`, boxShadow: on ? `0 0 26px ${col}33` : 'none' }}>
            <div style={{ fontFamily: MONO, fontSize: many ? 15 : 19, color: col }}>{h}</div>
            <Label size={11} style={{ marginTop: 16 }}>{ctx.panel.condLabel || 'CONDITIONS'}</Label>
            <div style={{ fontFamily: SANS, fontSize: many ? 13 : 15, color: C.text, marginTop: 4, height: many ? 70 : 40 }}>{cond}</div>
            <Label size={11} style={{ marginTop: 10 }}>{conf}</Label>
            <div style={{ height: 4, background: C.grid, marginTop: 6 }}><div style={{ height: 4, width: `${v * 100}%`, background: col }} /></div>
            <Label size={11} style={{ marginTop: 12 }}>{ctx.panel.invLabel || 'INVALIDATION'}</Label>
            <div style={{ fontFamily: SANS, fontSize: many ? 12 : 14, color: C.amber, marginTop: 4 }}>{inv}</div>
          </div>);
      })}
    </div>
  );
};

// ---------- uncertainty ----------
const Uncertainty: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const rows = [['SUPPORTING EVIDENCE', '3 independent sources', C.cyan, 0.6], ['CONFLICTING EVIDENCE', '2 sources disagree', C.amber, 0.4], ['UNKNOWN', 'positioning data missing', C.white, 0.3], ['INVALIDATION', 'USD reverses > 0.5%', C.red, 0.2], ['ALTERNATIVES', 'B · C remain open', C.amber, 0.45], ['SENSITIVITY', 'flips if lag > 30 min', C.white, 0.5]] as [string, string, string, number][];
  return (
    <div style={{ display: 'flex', gap: 30, paddingTop: 10 }}>
      <div style={{ ...ap(ctx.reveal(0)), width: 290, border: `1px solid ${C.line}`, borderRadius: 10, background: C.panel, padding: 20 }}>
        <Label>WORKING HYPOTHESIS</Label>
        <div style={{ fontFamily: MONO, fontSize: 17, color: C.text, marginTop: 10 }}>RATES → USD → XAU</div>
        <Label style={{ marginTop: 22 }}>CONFIDENCE · RANGE</Label>
        <div style={{ position: 'relative', height: 10, background: C.grid, marginTop: 8, borderRadius: 5 }}>
          <div style={{ position: 'absolute', left: '42%', width: '34%', height: 10, background: C.cyan + '55', borderRadius: 5 }} />
          <div style={{ position: 'absolute', left: '62%', width: 2, height: 16, top: -3, background: C.cyan }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 15, color: C.text, marginTop: 10 }}>0.62 <span style={{ color: C.muted }}>[0.42 – 0.76]</span></div>
        <div style={{ fontFamily: MONO, fontSize: 15, color: C.amber, marginTop: 12 }}>UNCERTAINTY: HIGH</div>
      </div>
      <div style={{ flex: 1 }}>
        {rows.map(([k, v, c, w], i) => (
          <div key={k} style={{ ...ap(ctx.reveal(i + 1)), display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: `1px solid ${C.grid}` }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: c }} />
            <Label color={C.text} style={{ width: 220 }}>{k}</Label>
            <div style={{ fontFamily: SANS, fontSize: 15, color: C.muted, flex: 1 }}>{v}</div>
            <div style={{ width: 70, height: 4, background: C.grid }}><div style={{ width: `${w * 100}%`, height: 4, background: c }} /></div>
          </div>))}
      </div>
    </div>
  );
};

// ---------- backtest ----------
const Backtest: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const costs = ['SPREAD', 'COMMISSION', 'SLIPPAGE', 'LATENCY', 'LIQUIDITY', 'EXECUTION'];
  const pipe = ['TRAIN', 'VALIDATION', 'OUT-OF-SAMPLE', 'BLIND REPLAY', 'DEMO'];
  return (
    <div style={{ paddingTop: 10 }}>
      <Label>REAL COSTS INCLUDED</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginTop: 10 }}>
        {costs.map((c, i) => <Node key={c} text={c} small p={ctx.reveal(i)} color={C.amber} hl={ctx.reveal(i) > 0 && ctx.reveal(i) < 1} />)}
      </div>
      <div style={{ ...ap(ctx.reveal(6)), marginTop: 28 }}>
        <Label>MARKET REGIMES</Label>
        <div style={{ display: 'flex', marginTop: 8, height: 26, borderRadius: 4, overflow: 'hidden' }}>
          {([['LOW VOL', 0.22, '#1d3444'], ['TRENDING', 0.18, '#22465a'], ['HIGH VOL', 0.16, '#4a3a22'], ['RISK-OFF', 0.14, '#4a2826'], ['RANGE', 0.3, '#1d3444']] as [string, number, string][]).map(([t, w, c]) => (
            <div key={t} style={{ width: `${w * 100}%`, background: c, fontFamily: MONO, fontSize: 11, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t}</div>))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 44, justifyContent: 'center' }}>
        {pipe.map((t, j) => <React.Fragment key={t}>{j > 0 && <Arrow dir="right" p={ctx.reveal(7 + j)} len={24} />}<Node text={t} small p={ctx.reveal(7 + j)} color={j >= 2 ? C.green : C.cyan} hl={j === 2 && ctx.reveal(9) >= 1} /></React.Fragment>)}
      </div>
    </div>
  );
};

// ---------- walk-forward ----------
const Walk: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const moveStart = ctx.revealFrames[2] ?? 1e9;
  const curFold = Math.min(4, Math.max(0, ctx.frame - moveStart) / 40);
  const res = ['+0.21', '−0.05', '+0.12', '+0.03', '−0.08'];
  return (
    <div style={{ paddingTop: 10 }}>
      <svg width={860} height={290}>
        <line x1={20} x2={840} y1={250} y2={250} stroke={C.line} />
        <text x={20} y={274} fill={C.dim} fontFamily={MONO} fontSize={12}>PAST</text>
        <text x={780} y={274} fill={C.dim} fontFamily={MONO} fontSize={12}>TIME →</text>
        {[0, 1, 2, 3, 4].map((f) => {
          const vis = f === 0 ? 1 : ctx.frame >= moveStart ? Math.min(1, Math.max(0, curFold - f + 1)) : 0;
          const x0 = 20 + f * 95, y0 = 14 + f * 46;
          const tr = f === 0 ? ctx.reveal(0) : 1, te = f === 0 ? ctx.reveal(1) : 1;
          return (
            <g key={f} opacity={vis}>
              <rect x={x0} y={y0} width={330 * tr} height={30} fill={C.cyan} opacity={0.35} />
              <text x={x0 + 10} y={y0 + 20} fill={C.text} fontFamily={MONO} fontSize={13} opacity={tr}>TRAIN</text>
              <rect x={x0 + 334} y={y0} width={100} height={30} fill={C.green} opacity={0.45 * te} />
              <text x={x0 + 344} y={y0 + 20} fill={C.text} fontFamily={MONO} fontSize={13} opacity={te}>TEST</text>
              <text x={x0 + 450} y={y0 + 20} fill={res[f].startsWith('−') ? C.amber : C.cyan} fontFamily={MONO} fontSize={13} opacity={ctx.reveal(4)}>OOS {res[f]}</text>
            </g>);
        })}
      </svg>
      <div style={{ ...ap(ctx.reveal(4)), textAlign: 'center' }}><Label color={C.text}>robust across regimes? → mixed · not yet proven</Label></div>
    </div>
  );
};

// ---------- architecture ----------
const Arch: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const mods = [['PRICE', 'REACTION'], ['NEWS', 'INFORMATION FLOW'], ['MACRO', 'CONTEXT'], ['QUANT', 'MEASURE'], ['CAUSE ENGINE', 'HYPOTHESES'], ['TRANSMISSION', 'PROPAGATION'], ['HISTORY', 'COMPARISON'], ['AI COUNCIL', 'CRITIQUE'], ['SCENARIO ENGINE', 'SCENARIOS'], ['VALIDATION', 'REALITY CHECK']];
  const cx = 430, cy = 205, Rx = 340, Ry = 160;
  const link = ctx.reveal(10);
  const pos = (i: number) => { const a = (i / mods.length) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * Rx, cy + Math.sin(a) * Ry]; };
  return (
    <div style={{ position: 'relative', width: 860, height: 420 }}>
      <svg width={860} height={420} style={{ position: 'absolute' }}>
        {mods.map((_, i) => { const [x, y] = pos(i); return <line key={i} x1={cx} y1={cy} x2={cx + (x - cx) * link} y2={cy + (y - cy) * link} stroke={ctx.hl(i) ? C.cyan : C.cyan + '55'} strokeWidth={ctx.hl(i) ? 2 : 1} />; })}
      </svg>
      <div style={{ position: 'absolute', left: cx - 95, top: cy - 38, width: 190, height: 76, borderRadius: 10, border: `1.5px solid ${C.cyan}`, background: '#0c1b26', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: Math.max(0.3, link), boxShadow: `0 0 ${30 * link}px ${C.cyan}55` }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, color: C.white, letterSpacing: 4 }}>VIRUS AI</div>
        <Label size={10} color={C.cyan}>causal intelligence</Label>
      </div>
      {mods.map(([m, role], i) => {
        const [x, y] = pos(i); const on = ctx.hl(i);
        return (
          <div key={m} style={{ position: 'absolute', left: x - 85, top: y - 20, width: 170, textAlign: 'center' }}>
            <Node text={m} p={ctx.reveal(i)} small hl={on} color={m === 'VALIDATION' ? C.green : C.cyan} />
            <Label size={10} color={C.cyan} style={{ marginTop: 3, opacity: on ? 1 : 0 }}>{role}</Label>
          </div>);
      })}
    </div>
  );
};

// ---------- compare ----------
const Compare: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const qs = ['WHY?', 'WHAT CAME BEFORE?', 'WHAT WAS KNOWN AT T?', 'MOST PLAUSIBLE CHAIN?', 'ALTERNATIVES?', 'CONTRADICTING DATA?', 'SIMILAR CONDITIONS?', "WHAT DON'T WE KNOW?"];
  return (
    <div style={{ display: 'flex', gap: 36, paddingTop: 20 }}>
      <div style={{ width: 260 }}>
        <Label>TYPICAL SIGNAL</Label>
        <div style={{ ...ap(ctx.reveal(0)), marginTop: 14, fontFamily: MONO, fontSize: 22, color: C.muted, border: `1px solid ${C.line}`, padding: 14, borderRadius: 8 }}>“GOLD ↑”</div>
        <div style={{ ...ap(ctx.reveal(1)), marginTop: 12, fontFamily: MONO, fontSize: 17, color: C.muted, border: `1px solid ${C.line}`, padding: 14, borderRadius: 8 }}>“P(continuation) ↑”</div>
      </div>
      <div style={{ flex: 1 }}>
        <Label color={C.cyan}>VIRUS AI · NEXT LEVEL OF QUESTIONS</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
          {qs.map((q, i) => <Node key={q} text={q} small p={ctx.reveal(i + 2)} hl={ctx.reveal(i + 2) > 0 && ctx.reveal(i + 2) < 1} color={i === 7 ? C.white : C.cyan} />)}
        </div>
      </div>
    </div>
  );
};

// ---------- phone (Telegram message) ----------
const Phone: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const P = ctx.panel; const rv = ctx.reveal;
  const opts: string[] = P.options || ['КУПИТЬ', 'ПРОДАТЬ', 'ЖДАТЬ'];
  const pick: number = P.pick ?? 2;
  const strength: number = P.strength ?? 48;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
      <div style={{ width: 380, height: 430, borderRadius: 34, border: '2px solid #263244', background: '#0e1621', padding: '18px 16px', boxSizing: 'border-box', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }}>
        <div style={{ ...ap(rv(0)), display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1f2b3a', paddingBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: C.cyan, color: '#04121a', fontFamily: SANS, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>V</div>
          <div><div style={{ fontFamily: SANS, fontSize: 15, color: C.white, fontWeight: 600 }}>VIRUS AI</div><div style={{ fontFamily: SANS, fontSize: 11, color: C.muted }}>{P.header || 'XAU/USD · анализ H1'}</div></div>
        </div>
        <div style={{ ...ap(rv(0)), marginTop: 14, background: '#182533', borderRadius: '14px 14px 14px 4px', padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, opacity: rv(1) }}>
            {opts.map((o, i) => { const on = rv(2) > 0 && i === pick; return <div key={o} style={{ flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8, fontFamily: SANS, fontWeight: 600, fontSize: 13, border: `1.5px solid ${on ? C.cyan : '#2c3a4c'}`, color: on ? C.cyan : C.muted, background: on ? C.cyanDim : 'transparent' }}>{o}</div>; })}
          </div>
          <div style={{ ...ap(rv(3)), marginTop: 14, fontFamily: SANS, fontSize: 13, color: C.muted }}>Сила сигнала</div>
          <div style={{ opacity: rv(3), display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <div style={{ flex: 1, height: 8, background: '#0e1621', borderRadius: 4, position: 'relative' }}>
              <div style={{ width: `${strength * rv(3)}%`, height: 8, borderRadius: 4, background: strength < 60 ? C.amber : C.green }} />
              <div style={{ position: 'absolute', left: '60%', top: -4, width: 2, height: 16, background: C.white, opacity: 0.6 }} />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 14, color: C.text }}>{Math.round(strength * rv(3))}/100</div>
          </div>
          {(P.lines || []).map((l: string, i: number) => <div key={i} style={{ ...ap(rv(4 + i)), marginTop: 12, fontFamily: SANS, fontSize: 14, color: i === (P.lines.length - 1) ? C.muted : C.text, lineHeight: 1.35 }}>{l}</div>)}
        </div>
      </div>
    </div>
  );
};

export const Logo: React.FC<{ size?: number; sub?: boolean }> = ({ size = 56, sub = true }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: size, letterSpacing: size * 0.22, color: C.white, paddingLeft: size * 0.22 }}>VIRUS<span style={{ color: C.cyan }}> AI</span></div>
    {sub && <div style={{ fontFamily: MONO, fontSize: size * 0.24, letterSpacing: size * 0.09, color: C.muted, marginTop: size * 0.25 }}>GLOBAL CAUSAL INTELLIGENCE</div>}
  </div>
);

const LogoPanel: React.FC<{ ctx: Ctx }> = ({ ctx }) => (
  <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', opacity: ctx.panel.dim ? 0.7 : 1 }}>
    <svg width={500} height={420} style={{ position: 'absolute', opacity: 0.35 }}>
      {[0, 1, 2].map((i) => <circle key={i} cx={250} cy={210} r={110 + i * 55 + Math.sin((ctx.frame + i * 40) / 50) * 5} fill="none" stroke={C.cyan} strokeWidth={0.8} strokeDasharray={i === 1 ? '2 8' : undefined} opacity={0.6 - i * 0.15} />)}
    </svg>
    <Logo size={62} />
  </div>
);

export const Panel: React.FC<{ ctx: Ctx }> = ({ ctx }) => {
  const M: Record<string, React.FC<{ ctx: Ctx }>> = {
    chart: ChartPanel, chips: Chips, flows: Flows, state: State, news: News, cards: Cards, network: Network, history: History,
    council: Council, quant: Quant, micro: Micro, leak: Leak, scenarios: Scenarios, uncertainty: Uncertainty, backtest: Backtest,
    walk: Walk, arch: Arch, compare: Compare, logo: LogoPanel, phone: Phone,
  };
  const Comp = M[ctx.panel.type] || LogoPanel;
  return <Comp ctx={ctx} />;
};
