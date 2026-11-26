// Cartao de prova, desenhado em codigo a partir de src/data/proof.json (dados reais):
// o que ardeu de verdade (mapa oficial do ICNF) contra o nosso fogo com o vento real
// e o mesmo fogo sem vento. 1000 noites sem jogador, a comecar no quadrado (2, 0), o mais
// perto do inicio real (que fica 360 m a norte do mapa).
// Os quadrados aparecem de norte para sul, como o fogo dessa noite.
// Os numeros (0.65, 0.47 e o circulo 0.68) vem do proof.json, que os copia de npm run validate.
// Aqui estao duas cenas: ProofMini (o mini-cartao antes dos 30 s) e Proof (o cartao completo).
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import proof from "../data/proof.json";
import { Captions } from "../components/Caption";
import { NARRATION } from "../narration";
import { COLORS, FONT } from "../theme";

const N = 32; // 32 x 32 quadrados de 65 m

// A aldeia (Malveira da Serra): o centro das 43 casas dentro do retangulo "in Malveira da Serra"
// de data/levels/sintra.json (places: x 13-22, y 11-20), calculado com createVillage (so leitura).
const VILLAGE = { x: 17.51, y: 15.23 };

type Grid = number[][];

// Contorno da area oficial: um segmento em cada lado de um quadrado ardido
// que toca um quadrado nao ardido (ou a borda do mapa).
const outlineSegments = (g: Grid, tile: number): string => {
  const burned = (r: number, c: number) =>
    r >= 0 && r < N && c >= 0 && c < N && g[r][c] === 1;
  const parts: string[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!burned(r, c)) continue;
      const x = c * tile;
      const y = r * tile;
      if (!burned(r - 1, c)) parts.push(`M${x} ${y}h${tile}`);
      if (!burned(r + 1, c)) parts.push(`M${x} ${y + tile}h${tile}`);
      if (!burned(r, c - 1)) parts.push(`M${x} ${y}v${tile}`);
      if (!burned(r, c + 1)) parts.push(`M${x + tile} ${y}v${tile}`);
    }
  }
  return parts.join("");
};

const clamp01 = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const FireMap: React.FC<{
  grid: Grid;
  color: string;
  revealFromSec: number;
  showOutline: boolean;
  tile: number;
  village?: boolean;
  wind?: boolean;
}> = ({ grid, color, revealFromSec, showOutline, tile, village = false, wind = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const size = N * tile;
  // Quantas filas (de norte para sul) ja apareceram.
  const rows = interpolate(
    frame,
    [revealFromSec * fps, (revealFromSec + 1.6) * fps],
    [0, N + 1],
    clamp01,
  );
  const later = interpolate(
    frame,
    [(revealFromSec + 1.6) * fps, (revealFromSec + 2.1) * fps],
    [0, 1],
    clamp01,
  );
  const vx = (VILLAGE.x + 0.5) * tile;
  const vy = (VILLAGE.y + 0.5) * tile;
  return (
    <svg width={size} height={size} style={{ display: "block", borderRadius: 10 }}>
      <rect width={size} height={size} fill={COLORS.forest} />
      {grid.map((row, r) =>
        row.map((v, c) =>
          v === 1 ? (
            <rect
              key={`${r}-${c}`}
              x={c * tile}
              y={r * tile}
              width={tile}
              height={tile}
              fill={color}
              opacity={Math.max(0, Math.min(1, rows - r))}
            />
          ) : null,
        ),
      )}
      {showOutline ? (
        <path
          d={outlineSegments(proof.official.burned as Grid, tile)}
          stroke={COLORS.cream}
          strokeWidth={3}
          strokeLinecap="square"
          fill="none"
          opacity={later}
        />
      ) : null}
      {village ? (
        <g opacity={later}>
          <circle cx={vx} cy={vy} r={11} fill="white" stroke="#15110e" strokeWidth={4} />
          <rect x={vx + 16} y={vy - 20} width={112} height={40} rx={10} fill="rgba(21,17,14,0.85)" />
          <text x={vx + 72} y={vy + 9} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={28} fill={COLORS.cream}>
            village
          </text>
        </g>
      ) : null}
      {wind ? (
        // A seta do vento: vem de norte, empurra o fogo para sul (canto de cima a direita).
        <g opacity={later}>
          <rect x={size - 146} y={10} width={136} height={128} rx={14} fill="rgba(21,17,14,0.85)" />
          <path
            d={`M${size - 78} 22 v52 m-16 -18 l16 20 l16 -20`}
            stroke={COLORS.cream}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <text x={size - 78} y={104} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={25} fill={COLORS.cream}>
            wind
          </text>
          <text x={size - 78} y={128} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={25} fill={COLORS.cream}>
            from N
          </text>
        </g>
      ) : null}
    </svg>
  );
};

const Panel: React.FC<{
  label: string;
  size: number;
  children: React.ReactNode;
  below: React.ReactNode;
  appearSec: number;
  labelSize?: number;
}> = ({ label, size, children, below, appearSec, labelSize = 38 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        width: size + 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: interpolate(frame, [appearSec * fps, appearSec * fps + 10], [0, 1], clamp01),
      }}
    >
      <div style={{ fontSize: labelSize, fontWeight: 600, color: COLORS.cream, marginBottom: 10, whiteSpace: "nowrap" }}>
        {label}
      </div>
      <div style={{ border: `4px solid ${COLORS.brown}`, borderRadius: 14 }}>{children}</div>
      {below}
    </div>
  );
};

const Score: React.FC<{ value: number; appearSec: number; size?: number; label?: boolean }> = ({
  value,
  appearSec,
  size = 88,
  label = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // O numero aparece ja certo (sem contar a subir): nunca se ve um valor que nao e o real.
  const p = interpolate(frame, [appearSec * fps, (appearSec + 0.4) * fps], [0, 1], clamp01);
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, opacity: p, translate: `0px ${(1 - p) * 12}px` }}>
      <span style={{ fontSize: size, fontWeight: 700, color: COLORS.orange }}>{value.toFixed(2)}</span>
      {label ? <span style={{ fontSize: 34, fontWeight: 500, color: COLORS.creamMuted }}>overlap</span> : null}
    </div>
  );
};

const Note: React.FC<{ text: string; appearSec: number }> = ({ text, appearSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        fontSize: 30,
        fontWeight: 500,
        color: COLORS.creamMuted,
        textAlign: "center",
        lineHeight: 1.15,
        opacity: interpolate(frame, [appearSec * fps, appearSec * fps + 10], [0, 1], clamp01),
      }}
    >
      {text}
    </div>
  );
};

// O norte, com uma seta para cima, a esquerda dos mapas.
const NorthArrow: React.FC = () => (
  <svg width={70} height={110} style={{ display: "block" }}>
    <path d="M35 100 V22 M17 42 L35 18 L53 42" stroke={COLORS.cream} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// ---------------------------------------------------------------------------------------------
// O CARTAO COMPLETO (cerca de 1:25): tres mapas, o norte, o vento, a aldeia e os numeros.
const TILE = 13; // pixeis por quadrado no ecra (416 px por mapa)
const SIZE = N * TILE;

export const Proof: React.FC = () => {
  const o = proof.overlap;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night, fontFamily: FONT, alignItems: "center" }}>
      <div style={{ marginTop: 18, fontSize: 62, fontWeight: 700, color: COLORS.cream, lineHeight: 1.1 }}>
        Our fire against the real one
      </div>
      <div style={{ marginTop: 6, fontSize: 44, fontWeight: 500, color: COLORS.creamMuted, lineHeight: 1.1 }}>
        Overlap with the official burned area: 0 = none, 1 = identical
      </div>
      <div style={{ marginTop: 18, display: "flex", gap: 84, alignItems: "flex-start", position: "relative" }}>
        <div style={{ position: "absolute", left: -150, top: 52, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 52, fontWeight: 700, color: COLORS.cream, lineHeight: 1 }}>N</div>
          <NorthArrow />
        </div>
        <Panel
          label="What really burned"
          size={SIZE}
          appearSec={0.3}
          below={
            <div style={{ height: 112, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
              <Note text="Official map (ICNF)," appearSec={0.6} />
              <Note text="only the part inside our map" appearSec={0.6} />
            </div>
          }
        >
          <FireMap grid={proof.official.burned as Grid} color={COLORS.fireRed} revealFromSec={0.6} showOutline tile={TILE} village />
        </Panel>
        <Panel
          label="Our fire, real wind"
          size={SIZE}
          appearSec={0.3}
          below={
            <div style={{ height: 112, display: "flex", alignItems: "center" }}>
              <Score value={o.realWind} appearSec={7.4} />
            </div>
          }
        >
          <FireMap grid={proof.modelRealWind.burned as Grid} color={COLORS.fireOrange} revealFromSec={6.8} showOutline tile={TILE} village wind />
        </Panel>
        <Panel
          label="Our fire, no wind"
          size={SIZE}
          appearSec={0.3}
          below={
            <div style={{ height: 112, display: "flex", alignItems: "center" }}>
              <Score value={o.noWind} appearSec={9.9} />
            </div>
          }
        >
          <FireMap grid={proof.modelNoWind.burned as Grid} color={COLORS.fireOrange} revealFromSec={9.3} showOutline tile={TILE} village />
        </Panel>
      </div>
      <div style={{ marginTop: 2, display: "flex", gap: 40, alignItems: "center" }}>
        <Legend swatch={<span style={{ width: 44, height: 0, borderTop: `4px solid ${COLORS.cream}` }} />} text="cream line = official burned area" appearSec={2.6} />
        <Legend
          swatch={<span style={{ width: 28, height: 28, borderRadius: 4, backgroundColor: COLORS.fireOrange }} />}
          text="tiles that burned in at least half of the runs"
          appearSec={7.0}
        />
      </div>
      <Captions lines={NARRATION.proof} />
    </AbsoluteFill>
  );
};

const Legend: React.FC<{ swatch: React.ReactNode; text: string; appearSec: number }> = ({ swatch, text, appearSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontSize: 32,
        fontWeight: 500,
        color: COLORS.cream,
        opacity: interpolate(frame, [appearSec * fps, appearSec * fps + 10], [0, 1], clamp01),
      }}
    >
      {swatch}
      {text}
    </div>
  );
};

const MiniLabel: React.FC<{ appearSec: number }> = ({ appearSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        fontSize: 48,
        fontWeight: 500,
        color: COLORS.creamMuted,
        marginTop: -10,
        opacity: interpolate(frame, [appearSec * fps, (appearSec + 0.4) * fps], [0, 1], clamp01),
      }}
    >
      overlap
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// O MINI-CARTAO (antes dos 0:30): o mapa oficial ao lado do nosso fogo com o vento real e o 0.65.
const MINI_TILE = 19; // 608 px por mapa
const MINI = N * MINI_TILE;

export const ProofMini: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.night, fontFamily: FONT, alignItems: "center" }}>
    <div style={{ marginTop: 40, display: "flex", gap: 70, alignItems: "flex-start" }}>
      <Panel label="Official burn map (ICNF)" size={MINI} appearSec={-1} labelSize={44}
        below={<div style={{ height: 20 }} />}>
        <FireMap grid={proof.official.burned as Grid} color={COLORS.fireRed} revealFromSec={0.1} showOutline tile={MINI_TILE} />
      </Panel>
      <Panel label="Our fire, real wind" size={MINI} appearSec={-1} labelSize={44}
        below={<div style={{ height: 20 }} />}>
        <FireMap grid={proof.modelRealWind.burned as Grid} color={COLORS.fireOrange} revealFromSec={0.5} showOutline tile={MINI_TILE} />
      </Panel>
      <div style={{ marginTop: 160, display: "flex", flexDirection: "column", alignItems: "center", width: 330 }}>
        <Score value={proof.overlap.realWind} appearSec={1.6} size={150} label={false} />
        <MiniLabel appearSec={1.6} />
      </div>
    </div>
    <Captions lines={NARRATION.proofMini} />
  </AbsoluteFill>
);
