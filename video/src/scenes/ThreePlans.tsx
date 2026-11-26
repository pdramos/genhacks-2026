// 10. Ecra dividido: a MESMA noite com tres planos, lado a lado e ao mesmo segundo de jogo.
// As tres gravacoes (night-nothing, night-sensible, night-expert) tem a mesma camara e o mesmo
// relogio (o primeiro fogo aparece ao mesmo tempo). Fonte: 12.5-31.1 s, a 3x (antes dos 12.5 s ainda se ve a legenda do proprio jogo).
// A noite do perito acaba aos 15.7 s (o fogo apaga-se): o ultimo fotograma da noite fica congelado,
// com "Fire out". No fim, por baixo de cada coluna, o numero final do cartao do jogo.
// Em cima, o painel de vento do proprio jogo (muda de hora a hora), ampliado.
// Nao ha contador ao vivo: o jogo nao mostra um durante o fogo, por isso o video tambem nao.
import React from "react";
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "../components/Caption";
import { Chip } from "../components/Chip";
import { Clip } from "../components/Clip";
import { NARRATION } from "../narration";
import { COLORS, FONT } from "../theme";

const SRC_START = 12.5; // segundo da gravacao onde a cena comeca
const SPEED = 3;
const HOLD_AT = 6.2; // a partir daqui as noites ficam paradas (antes de o fumo tapar a aldeia)
const EXPERT_OUT = 1.0; // 12.5 + 1.0 x 3 = 15.5 s: o ultimo fotograma de noite do perito

// O recorte de cada coluna na gravacao 1920x1080: do "?" norte ate ao quartel e a aldeia.
const COL_W = 630;
const COL_TOP = 226;
const COL_H = 1080 - COL_TOP; // 854
const CROP = { x: 592, y: 124, w: 696, h: Math.round(COL_H * (696 / COL_W)) };
const S = COL_W / CROP.w;

// A gravacao a andar ate "untilSec" (segundos da cena) e depois congelada nesse fotograma.
const NightClip: React.FC<{ file: string; untilSec: number }> = ({ file, untilSec }) => {
  const { fps } = useVideoConfig();
  const f = Math.round(untilSec * fps);
  return (
    <>
      <Sequence name={`${file} (a andar)`} durationInFrames={f} layout="none">
        <Clip file={file} startSec={SRC_START} speed={SPEED} />
      </Sequence>
      <Sequence name={`${file} (parado)`} from={f} layout="none">
        <Freeze frame={0}>
          <Clip file={file} startSec={SRC_START + (f / fps) * SPEED} />
        </Freeze>
      </Sequence>
    </>
  );
};

const Column: React.FC<{
  index: number;
  file: string;
  label: string;
  color: string;
  untilSec: number;
  result: string;
  note?: string;
  fireOutAt?: number;
}> = ({ index, file, label, color, untilSec, result, note, fireOutAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const left = index * (COL_W + 15);
  const resultIn = interpolate(frame, [6.0 * fps, 6.3 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left,
          width: COL_W,
          top: 158,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 52,
          color: COLORS.cream,
        }}
      >
        <span style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: color }} />
        {label}
      </div>
      <div
        style={{
          position: "absolute",
          left,
          top: COL_TOP,
          width: COL_W,
          height: COL_H,
          overflow: "hidden",
          borderTop: `6px solid ${color}`,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transformOrigin: "0 0",
            translate: `${-CROP.x * S}px ${-CROP.y * S}px`,
            scale: String(S),
          }}
        >
          <NightClip file={file} untilSec={untilSec} />
        </div>
        {fireOutAt !== undefined ? (
          <Sequence name="Fire out" from={Math.round(fireOutAt * fps)} layout="none">
            <Chip text="Fire out" corner="top-left" size={44} accent top={24} />
          </Sequence>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 40,
            display: "flex",
            justifyContent: "center",
            opacity: resultIn,
          }}
        >
          <div
            style={{
              padding: "10px 30px 14px",
              borderRadius: 24,
              backgroundColor: "rgba(22, 15, 10, 0.92)",
              border: `4px solid ${color}`,
              textAlign: "center",
              fontFamily: FONT,
              color: COLORS.cream,
            }}
          >
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1 }}>{result}</div>
            <div style={{ fontSize: 32, fontWeight: 600, color: COLORS.creamMuted }}>houses saved</div>
            {note ? <div style={{ fontSize: 32, fontWeight: 700, color: "#ff7a5c" }}>{note}</div> : null}
          </div>
        </div>
      </div>
    </>
  );
};

// O painel de vento do jogo (WIND / From the north / km/h, rajadas e a hora), recortado da
// gravacao sem plano e ampliado. E o mesmo nas tres noites.
const WIND = { x: 838, y: 8, w: 376, h: 82 };
const WIND_S = 1.7;
const WindPanel: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: 150,
      top: 10,
      width: WIND.w * WIND_S,
      height: WIND.h * WIND_S,
      overflow: "hidden",
      borderRadius: 60,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1920,
        height: 1080,
        transformOrigin: "0 0",
        translate: `${-WIND.x * WIND_S}px ${-WIND.y * WIND_S}px`,
        scale: String(WIND_S),
      }}
    >
      <NightClip file="night-nothing.mp4" untilSec={HOLD_AT} />
    </div>
  </div>
);

export const ThreePlans: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
    <WindPanel />
    <div
      style={{
        position: "absolute",
        left: 150 + WIND.w * WIND_S + 30,
        top: 10,
        height: WIND.h * WIND_S,
        display: "flex",
        alignItems: "center",
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: 42,
        color: COLORS.cream,
        whiteSpace: "nowrap",
      }}
    >
      Same real wind · ERA5 via Open-Meteo
    </div>
    <Column index={0} file="night-nothing.mp4" label="Doing nothing" color="#e0533d" untilSec={HOLD_AT} result="100/194" note="fire station lost" />
    <Column index={1} file="night-sensible.mp4" label="Your plan" color="#f2b632" untilSec={HOLD_AT} result="181/194" />
    <Column index={2} file="night-expert.mp4" label="Expert plan" color="#3fa34d" untilSec={EXPERT_OUT} result="194/194" fireOutAt={EXPERT_OUT + 0.1} />
    <Chip text="3× speed" corner="top-right" size={30} top={40} />
    <Captions lines={NARRATION.threePlans} />
  </AbsoluteFill>
);
