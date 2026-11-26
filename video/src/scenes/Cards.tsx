// Dois cartoes desenhados em codigo (sem gravacoes):
// - Luck: "uma noite pode ser sorte". Em 120 repeticoes desta noite, o plano do perito salva a
//   aldeia toda em 68% e nao fazer nada em 10% (docs/devpost.md, "Does a plan beat luck?";
//   a tabela que node --test tests/balance.test.js imprime).
// - HowBuilt: como foi feito, em 3 setas (docs/devpost.md, "How we built it").
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "../components/Caption";
import { NARRATION } from "../narration";
import { COLORS, FONT } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Cores das barras iguais as do cartao do jogo: verde = perito, vermelho = nada fazer.
const GREEN = "#3fa34d";
const RED = "#e0533d";

const Bar: React.FC<{ label: string; pct: number; color: string; fromSec: number }> = ({
  label,
  pct,
  color,
  fromSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = interpolate(frame, [fromSec * fps, (fromSec + 0.9) * fps], [0, pct / 100], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  // O numero so aparece quando a barra chega ao fim (nunca mostra um valor que nao e o real).
  const num = interpolate(frame, [(fromSec + 0.9) * fps, (fromSec + 1.2) * fps], [0, 1], clamp);
  const show = interpolate(frame, [fromSec * fps - 6, fromSec * fps], [0, 1], clamp);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 36, opacity: show }}>
      <div style={{ width: 400, textAlign: "right", fontSize: 58, fontWeight: 600, color: COLORS.cream }}>{label}</div>
      <div
        style={{
          width: 900,
          height: 86,
          borderRadius: 43,
          backgroundColor: "#3a2f27",
          border: `4px solid ${COLORS.brown}`,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${grow * 100}%`, height: "100%", backgroundColor: color, borderRadius: 43 }} />
      </div>
      <div style={{ width: 230, fontSize: 96, fontWeight: 700, color, opacity: num }}>{pct}%</div>
    </div>
  );
};

export const Luck: React.FC = () => {
  const frame = useCurrentFrame();
  const title = interpolate(frame, [0, 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night, fontFamily: FONT, alignItems: "center" }}>
      <div style={{ marginTop: 110, fontSize: 70, fontWeight: 700, color: COLORS.cream, opacity: title, textAlign: "center", lineHeight: 1.1 }}>
        Over 120 replays of this night:
        <br />
        whole village saved
      </div>
      <div style={{ marginTop: 14, fontSize: 44, fontWeight: 500, color: COLORS.creamMuted, opacity: title }}>
        every house and the fire station
      </div>
      <div style={{ marginTop: 70, display: "flex", flexDirection: "column", gap: 50 }}>
        <Bar label="Expert plan" pct={68} color={GREEN} fromSec={3.4} />
        <Bar label="Doing nothing" pct={10} color={RED} fromSec={8.0} />
      </div>
      <Captions lines={NARRATION.luck} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------------------------
const Box: React.FC<{ children: React.ReactNode; accent?: boolean }> = ({ children, accent = false }) => (
  <div
    style={{
      width: 760,
      minHeight: 150,
      padding: "18px 28px",
      boxSizing: "border-box",
      borderRadius: 22,
      border: `4px solid ${accent ? COLORS.orange : COLORS.brown}`,
      backgroundColor: accent ? "#2b1d12" : "#211a15",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      fontSize: 44,
      fontWeight: 600,
      lineHeight: 1.15,
      color: COLORS.cream,
    }}
  >
    {children}
  </div>
);

const Arrow: React.FC = () => (
  <svg width={150} height={60} style={{ display: "block", flexShrink: 0 }}>
    <path d="M8 30 H128 M106 10 L132 30 L106 50" stroke={COLORS.orange} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const Row: React.FC<{ from: React.ReactNode; to: React.ReactNode; atSec: number }> = ({ from, to, atSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [atSec * fps, (atSec + 0.35) * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: p, translate: `${(1 - p) * -30}px 0px` }}>
      <Box>{from}</Box>
      <Arrow />
      <Box accent>{to}</Box>
    </div>
  );
};

export const HowBuilt: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.night, fontFamily: FONT, alignItems: "center" }}>
    <div style={{ marginTop: 110, display: "flex", flexDirection: "column", gap: 40 }}>
      <Row
        atSec={0.2}
        from={<>OpenStreetMap roads + buildings, Copernicus elevation</>}
        to={<>3D village on 65 m tiles (Three.js, all in code)</>}
      />
      <Row atSec={1.4} from={<>ERA5 hourly wind of that night (Open-Meteo)</>} to={<>fire rules, tested in Node</>} />
      <Row atSec={2.6} from={<>Same seed = same night</>} to={<>your plan, doing nothing, expert plan</>} />
    </div>
    <Captions lines={NARRATION.howBuilt} />
  </AbsoluteFill>
);
