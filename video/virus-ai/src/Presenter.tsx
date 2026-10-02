import React from 'react';

type P = [number, number];
type Arm = { e: P; h: P; shape: 'rest' | 'point' | 'palm' | 'fist' };
type Pose = { L: Arm; R: Arm; lean: number; brow: number };

const SH_L: P = [275, 588];
const SH_R: P = [585, 588];
const SKIN = '#c08f72';
const SKIN_D = '#9c6c53';
const JACKET = '#18202d';
const JACKET_L = '#232d3d';

const RESTL: Arm = { e: [248, 724], h: [348, 772], shape: 'rest' };
const RESTR: Arm = { e: [612, 724], h: [512, 772], shape: 'rest' };

export function poseFor(g: string, t: number): Pose {
  const s = Math.sin(t / 7), c = Math.cos(t / 9);
  switch (g) {
    case 'point': return { L: RESTL, R: { e: [705, 646], h: [806, 528 + s * 3], shape: 'point' }, lean: 0, brow: -1 };
    case 'open': return { L: { e: [236, 704], h: [318, 646 + s * 4], shape: 'palm' }, R: { e: [624, 704], h: [542, 646 - s * 4], shape: 'palm' }, lean: 0, brow: -3 };
    case 'explain': return { L: RESTL, R: { e: [652, 706], h: [562 + s * 14, 636 + c * 9], shape: 'palm' }, lean: 0, brow: -1.5 };
    case 'lean': return { L: { e: [292, 734], h: [408, 762], shape: 'fist' }, R: { e: [568, 734], h: [452, 762], shape: 'fist' }, lean: 1, brow: -3 };
    case 'stop': return { L: RESTL, R: { e: [642, 694], h: [590, 584], shape: 'palm' }, lean: 0, brow: 2 };
    case 'sweep': return { L: RESTL, R: { e: [690, 652], h: [800 + Math.sin(t / 14) * 40, 540 - Math.sin(t / 14) * 50], shape: 'palm' }, lean: 0, brow: -1 };
    case 'count': {
      const b = Math.abs(Math.sin(t / 8)) * 8;
      return { L: { e: [258, 704], h: [362, 650 - b], shape: 'palm' }, R: { e: [602, 704], h: [470, 652 - b], shape: 'point' }, lean: 0.3, brow: -1 };
    }
    default: return { L: RESTL, R: RESTR, lean: 0, brow: 0 };
  }
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lp = (a: P, b: P, k: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
export function blendPose(a: Pose, b: Pose, k: number): Pose {
  const arm = (x: Arm, y: Arm): Arm => ({ e: lp(x.e, y.e, k), h: lp(x.h, y.h, k), shape: k < 0.5 ? x.shape : y.shape });
  return { L: arm(a.L, b.L), R: arm(a.R, b.R), lean: lerp(a.lean, b.lean, k), brow: lerp(a.brow, b.brow, k) };
}

const Hand: React.FC<{ arm: Arm; side: 'L' | 'R' }> = ({ arm, side }) => {
  const [ex, ey] = arm.e, [hx, hy] = arm.h;
  const ang = Math.atan2(hy - ey, hx - ex);
  const deg = (ang * 180) / Math.PI;
  if (arm.shape === 'point') {
    return (
      <g transform={`translate(${hx},${hy}) rotate(${deg})`}>
        <ellipse cx={4} cy={0} rx={21} ry={17} fill={SKIN} />
        <path d="M14,-6 L46,-9" stroke={SKIN} strokeWidth={9} strokeLinecap="round" />
        <path d="M6,9 Q18,14 26,8" stroke={SKIN_D} strokeWidth={2} fill="none" opacity={0.6} />
      </g>);
  }
  if (arm.shape === 'palm') {
    return (
      <g transform={`translate(${hx},${hy}) rotate(${deg})`}>
        <ellipse cx={8} cy={0} rx={24} ry={20} fill={SKIN} />
        {[-12, -4, 4, 12].map((o) => <path key={o} d={`M24,${o} L40,${o * 1.25}`} stroke={SKIN} strokeWidth={8} strokeLinecap="round" />)}
        <path d={`M2,${side === 'R' ? 16 : -16} L18,${side === 'R' ? 26 : -26}`} stroke={SKIN} strokeWidth={9} strokeLinecap="round" />
      </g>);
  }
  return (
    <g transform={`translate(${hx},${hy}) rotate(${deg})`}>
      <ellipse cx={6} cy={0} rx={23} ry={17} fill={SKIN} />
      <path d="M-4,-10 Q14,-16 26,-6" stroke={SKIN_D} strokeWidth={2} fill="none" opacity={0.5} />
    </g>);
};

const ArmEl: React.FC<{ arm: Arm; sh: P; side: 'L' | 'R' }> = ({ arm, sh, side }) => {
  const [ex, ey] = arm.e, [hx, hy] = arm.h;
  const wx = lerp(ex, hx, 0.8), wy = lerp(ey, hy, 0.8);
  return (
    <g>
      <line x1={sh[0]} y1={sh[1]} x2={ex} y2={ey} stroke={JACKET} strokeWidth={54} strokeLinecap="round" />
      <line x1={ex} y1={ey} x2={wx} y2={wy} stroke={JACKET} strokeWidth={46} strokeLinecap="round" />
      <line x1={sh[0]} y1={sh[1]} x2={ex} y2={ey} stroke={side === 'R' ? '#4fd1e8' : '#000'} strokeWidth={54} strokeLinecap="round" opacity={side === 'R' ? 0.06 : 0.15} />
      <line x1={wx} y1={wy} x2={lerp(ex, hx, 0.86)} y2={lerp(ey, hy, 0.86)} stroke="#d9dde3" strokeWidth={38} strokeLinecap="round" />
      <Hand arm={arm} side={side} />
    </g>);
};

export const PresenterBody: React.FC<{ frame: number; pose: Pose; look: number; mouth: number; energy: number; blink: number }> = ({ frame, pose, look, mouth, energy, blink }) => {
  const breathe = 1 + Math.sin(frame / 38) * 0.004;
  const bob = Math.sin(frame / 9) * energy * 1.4 + Math.sin(frame / 53) * 0.6;
  const headRot = look * 6 + bob;
  const fx = look * 5; // feature shift toward monitor
  const iris = look * 3.5;
  const lean = pose.lean;
  const br = pose.brow;
  const lid = 1 - blink * 0.9;
  const o = Math.min(1, mouth);
  return (
    <g transform={`translate(${430} ${700 + lean * 10}) scale(${1 + lean * 0.035} ${(1 + lean * 0.035) * breathe}) translate(-430 -700)`}>
      <defs>
        <radialGradient id="skin" cx="45%" cy="40%" r="65%"><stop offset="0%" stopColor="#cf9f82" /><stop offset="70%" stopColor={SKIN} /><stop offset="100%" stopColor="#8d5f48" /></radialGradient>
        <linearGradient id="jacket" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#121925" /><stop offset="55%" stopColor={JACKET_L} /><stop offset="100%" stopColor="#1d2a3a" /></linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      {/* torso */}
      <path d="M170,1000 L196,650 C204,590 258,560 330,546 L396,528 L464,528 L530,546 C602,560 656,590 664,650 L690,1000 Z" fill="url(#jacket)" />
      <path d="M388,528 Q430,566 472,528 L486,700 L374,700 Z" fill="#20252d" />
      <path d="M396,528 L356,548 L404,700 L420,610 Z" fill={JACKET_L} stroke="#0e141d" strokeWidth={1.5} />
      <path d="M464,528 L504,548 L456,700 L440,610 Z" fill={JACKET_L} stroke="#0e141d" strokeWidth={1.5} />
      <path d="M598,566 C640,586 660,616 664,660" stroke="#4fd1e8" strokeWidth={10} fill="none" opacity={0.22} filter="url(#soft)" />
      {/* neck */}
      <path d="M400,476 L460,476 L468,534 Q430,552 392,534 Z" fill={SKIN_D} />
      <path d="M394,534 Q430,552 466,534" stroke="#7d5240" strokeWidth={2} fill="none" opacity={0.4} />
      {/* head */}
      <g transform={`translate(0 22) translate(430 470) scale(1.22) translate(-430 -470) rotate(${headRot} 430 470)`}>
        <ellipse cx={369 + fx * 0.3} cy={392} rx={10} ry={19} fill={SKIN_D} />
        <ellipse cx={491 + fx * 0.3} cy={392} rx={10} ry={19} fill={SKIN_D} />
        <path d="M372,356 C372,302 400,288 430,288 C462,288 490,302 490,356 L488,402 C486,442 462,468 430,470 C398,468 374,442 372,402 Z" fill="url(#skin)" />
        <path d="M376,410 C380,446 402,468 430,470 C458,468 482,446 486,410 C470,440 450,452 430,452 C410,452 390,440 376,410 Z" fill="#3a2a22" opacity={0.16} />
        <path d="M486,330 C496,370 492,420 470,454" stroke="#4fd1e8" strokeWidth={6} fill="none" opacity={0.28} filter="url(#soft)" />
        {/* hair */}
        <path d="M364,378 C356,318 382,276 434,276 C488,276 506,318 496,374 C492,346 486,326 474,316 C448,326 404,322 384,312 C374,330 368,352 364,378 Z" fill="#1b1612" />
        <path d="M384,312 C404,322 448,326 474,316 C466,304 452,298 440,298" stroke="#2c241d" strokeWidth={3} fill="none" />
        <g transform={`translate(${fx} 0)`}>
          {/* brows */}
          <path d={`M390,${352 + br} Q404,${345 + br} 419,${350 + br * 1.6}`} stroke="#241b15" strokeWidth={4.5} strokeLinecap="round" fill="none" />
          <path d={`M441,${350 + br * 1.6} Q456,${345 + br} 470,${352 + br}`} stroke="#241b15" strokeWidth={4.5} strokeLinecap="round" fill="none" />
          {/* eyes */}
          {[405, 455].map((cx) => (
            <g key={cx} transform={`translate(${cx} 373) scale(1 ${lid}) translate(${-cx} -373)`}>
              <ellipse cx={cx} cy={373} rx={10.5} ry={5.8} fill="#efe9e4" />
              <circle cx={cx + iris} cy={373} r={4.6} fill="#3b2a20" />
              <circle cx={cx + iris} cy={373} r={2} fill="#0d0907" />
              <circle cx={cx + iris + 1.5} cy={371.5} r={1.1} fill="#fff" opacity={0.8} />
              <path d={`M${cx - 11},372 Q${cx},365 ${cx + 11},372`} stroke="#3a2a22" strokeWidth={1.8} fill="none" />
            </g>))}
          {/* glasses */}
          <rect x={387} y={360} width={36} height={27} rx={8} fill="none" stroke="#14171c" strokeWidth={2.6} />
          <rect x={437} y={360} width={36} height={27} rx={8} fill="#4fd1e8" fillOpacity={0.06} stroke="#14171c" strokeWidth={2.6} />
          <path d="M423,370 Q430,366 437,370" stroke="#14171c" strokeWidth={2.4} fill="none" />
          {/* nose */}
          <path d="M431,378 L425,410 Q431,416 439,411" stroke="#8a5c45" strokeWidth={2.2} fill="none" opacity={0.65} />
          {/* mouth */}
          {o < 0.08 ? (
            <path d="M414,434 Q430,438 446,434" stroke="#7a4636" strokeWidth={3} strokeLinecap="round" fill="none" />
          ) : (
            <g>
              <ellipse cx={430} cy={435 + o * 2} rx={13 + o * 3} ry={2 + o * 8} fill="#3b1f1b" />
              <rect x={421} y={432} width={18} height={3 + o * 1.5} rx={1.5} fill="#e9e3dc" opacity={0.85} />
              <path d={`M${415 - o * 2},434 Q430,${430 - o} ${445 + o * 2},434`} stroke="#7a4636" strokeWidth={2.4} fill="none" />
            </g>)}
        </g>
      </g>
    </g>
  );
};

export const PresenterArms: React.FC<{ pose: Pose }> = ({ pose }) => (
  <g transform={`translate(430 ${700 + pose.lean * 10}) scale(${1 + pose.lean * 0.035}) translate(-430 -700)`}>
    <ArmEl arm={pose.L} sh={SH_L} side="L" />
    <ArmEl arm={pose.R} sh={SH_R} side="R" />
  </g>
);

export type { Pose };
