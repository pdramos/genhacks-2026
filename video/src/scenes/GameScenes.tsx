// As cenas feitas com gravacoes do jogo publicado (?seed=1960).
// Gravacoes em public/clips/ (fora do git). Tempos-chave em src/data/clips.json.
// Em cada cena: <Clip startSec=... speed=...> escolhe o pedaco da gravacao,
// <Camera keys=...> escolhe o enquadramento e <Captions> poe as legendas de src/narration.ts.
// <Plate> mostra so um retangulo da gravacao (por exemplo as barras do cartao), ampliado.
// <Freeze frame={0}> congela a gravacao no segundo startSec (os cartoes do jogo estao parados).
import React from "react";
import {
  AbsoluteFill,
  Freeze,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Camera } from "../components/Camera";
import { Captions } from "../components/Caption";
import { Chip } from "../components/Chip";
import { ClickRing } from "../components/ClickRing";
import { Clip } from "../components/Clip";
import { Highlight } from "../components/Highlight";
import { Plate } from "../components/Plate";
import { NARRATION } from "../narration";
import { COLORS, FONT } from "../theme";

// Zoom de 1.14 preso a margem de baixo: esconde a fila de cima do HUD do jogo
// (onde a fase de construcao diz "FORECAST") e mantem as ferramentas e o botao Start.
const BOTTOM_ZOOM = [{ at: 0, x: 960, y: 1080, zoom: 1.14 }];

// 1. 0:00 - O fogo da noite SEM plano a passar pela aldeia (night-nothing, 13.6-34.8 s, a 2x).
// Comeca ja com chamas; o zoom (1.30 a 1.42) deixa de fora o HUD de cima e a faixa de baixo
// onde o jogo escreve a sua legenda.
export const ColdOpen: React.FC = () => (
  <AbsoluteFill>
    <Camera
      keys={[
        { at: 0, x: 980, y: 545, zoom: 1.3 },
        { at: 10.6, x: 980, y: 560, zoom: 1.42 },
      ]}
    >
      <Clip name="night-nothing (fogo)" file="night-nothing.mp4" startSec={13.6} speed={2} />
    </Camera>
    <Chip text="Game footage · a what-if night · 2× speed" corner="top-right" size={30} />
    <Captions lines={NARRATION.coldOpen} />
  </AbsoluteFill>
);

// 2. O nome, sobre a aldeia de dia (opening, 0.5-12.6 s, a 1.05x: so a camara se move).
const TitleText: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 170,
        textAlign: "center",
        fontFamily: FONT,
        fontWeight: 700,
        fontSize: 190,
        color: COLORS.cream,
        textShadow: `0 10px 0 ${COLORS.brown}, 0 18px 50px rgba(0,0,0,0.55)`,
        opacity: s,
        scale: interpolate(s, [0, 1], [0.92, 1]),
      }}
    >
      Same Night
    </div>
  );
};

export const TitleScene: React.FC = () => (
  <AbsoluteFill>
    <Clip name="opening (aldeia de dia)" file="opening.mp4" startSec={0.5} speed={1.05} />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(10,8,6,0.45) 0%, rgba(10,8,6,0) 45%)",
      }}
    />
    <TitleText />
    <Captions lines={NARRATION.title} />
  </AbsoluteFill>
);

// 3. So as tres barras do cartao do jogo (night-sensible, cartao parado aos 46 s):
// Your plan 181/194, Doing nothing 100/194, Expert plan 194/194.
export const Teaser: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
    <Plate src={{ x: 672, y: 454, w: 578, h: 114 }} scale={2.85} cy={420}>
      <Freeze frame={0}>
        <Clip name="night-sensible (barras)" file="night-sensible.mp4" startSec={46} />
      </Freeze>
    </Plate>
    <Captions lines={NARRATION.teaser} />
  </AbsoluteFill>
);

// 4. Preparar (build-v1, 0.6-15.2 s, ao vivo, a 1x). Escolhe Clear brush (os quadrados que a lei
// deixa trabalhar brilham), 4 cliques de Clear brush, depois Firebreak e 1 clique (EUR 500).
// Os cliques (a gravacao nao mostra o rato) sao circulos desenhados aqui; tempos e pontos vem de
// scratchpad/video-wf/meta-build-v1.json (gravacao 0.6 s antes da cena). No fim: zoom nos quadrados
// mudados, "Before" (gravacao aos 3.6 s, antes do 1.o clique) e "After" (aos 15.6 s).
const BUILD_START = 0.6;
const QUESTION_MARKS = [
  { x: 1026, y: 351 },
  { x: 1181, y: 373 },
  { x: 1169, y: 487 },
  { x: 1153, y: 557 },
  { x: 1305, y: 248 },
];
const CLICKS = [
  { x: 926, y: 501, at: 3.43 },
  { x: 985, y: 503, at: 4.87 },
  { x: 1046, y: 516, at: 6.25 },
  { x: 997, y: 442, at: 7.71 },
  { x: 1107, y: 519, at: 11.01 }, // o corta-fogo
];
const CHANGED = { x: 1016, y: 482, zoom: 1.85 }; // o centro dos 5 quadrados mudados
const LIVE_END = 14.6; // a partir daqui: Before / After

// O porta-moedas do jogo (canto de cima a direita da gravacao), ampliado no canto de baixo.
const Wallet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Plate src={{ x: 1692, y: 10, w: 160, h: 56 }} scale={2} cx={1700} cy={990} radius={56} framed={false}>
    {children}
  </Plate>
);

export const Build: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Sequence name="Ao vivo" durationInFrames={Math.round(LIVE_END * fps)}>
        <Camera
          keys={[
            { at: 0, x: 960, y: 1080, zoom: 1.14 },
            { at: 13.9, x: 960, y: 1080, zoom: 1.14 },
            { at: LIVE_END, ...CHANGED },
          ]}
        >
          <Clip name="build-v1 (preparar)" file="build-v1.mp4" startSec={BUILD_START} />
          <Sequence name="Clear brush escolhido" from={Math.round(0.55 * fps)} durationInFrames={Math.round(2.6 * fps)} layout="none">
            <Highlight x={698} y={933} w={98} h={126} fromSec={0} radius={18} stroke={6} />
          </Sequence>
          <Sequence name="Os ?" from={Math.round(5.0 * fps)} durationInFrames={Math.round(3.7 * fps)} layout="none">
            {QUESTION_MARKS.map((q) => (
              <Highlight key={`${q.x}-${q.y}`} x={q.x - 26} y={q.y - 26} w={52} h={52} fromSec={0} stroke={5} />
            ))}
          </Sequence>
          <Sequence name="Firebreak escolhido" from={Math.round(9.0 * fps)} durationInFrames={Math.round(2.2 * fps)} layout="none">
            <Highlight x={800} y={933} w={98} h={126} fromSec={0} radius={18} stroke={6} />
          </Sequence>
          {CLICKS.map((c) => (
            <ClickRing key={c.at} x={c.x} y={c.y} atSec={c.at} />
          ))}
        </Camera>
        <Wallet>
          <Clip name="build-v1 (porta-moedas)" file="build-v1.mp4" startSec={BUILD_START} />
        </Wallet>
      </Sequence>
      <Sequence name="Before" from={Math.round(LIVE_END * fps)} durationInFrames={Math.round(0.8 * fps)}>
        <Camera keys={[{ at: 0, ...CHANGED }]}>
          <Freeze frame={0}>
            <Clip name="build-v1 (antes)" file="build-v1.mp4" startSec={3.6} />
          </Freeze>
        </Camera>
        <Wallet>
          <Freeze frame={0}>
            <Clip name="build-v1 (porta-moedas antes)" file="build-v1.mp4" startSec={3.6} />
          </Freeze>
        </Wallet>
        <Chip text="Before" corner="bottom-left" size={44} />
      </Sequence>
      <Sequence name="After" from={Math.round((LIVE_END + 0.8) * fps)}>
        <Camera keys={[{ at: 0, ...CHANGED }]}>
          <Freeze frame={0}>
            <Clip name="build-v1 (depois)" file="build-v1.mp4" startSec={15.6} />
          </Freeze>
        </Camera>
        <Wallet>
          <Freeze frame={0}>
            <Clip name="build-v1 (porta-moedas depois)" file="build-v1.mp4" startSec={15.6} />
          </Freeze>
        </Wallet>
        <Chip text="After" corner="bottom-left" size={44} accent />
      </Sequence>
      <Captions lines={NARRATION.build} />
    </AbsoluteFill>
  );
};

// 5. O plano sensato pronto e o clique em "Start disaster" (night-sensible, 0-2.4 s, a 0.95x).
export const PlanReady: React.FC = () => (
  <AbsoluteFill>
    <Camera keys={BOTTOM_ZOOM}>
      <Clip name="night-sensible (plano)" file="night-sensible.mp4" startSec={0} speed={0.95} />
      <Highlight x={1112} y={950} w={124} h={124} fromSec={1.2} stroke={5} />
    </Camera>
    <Captions lines={NARRATION.planReady} />
  </AbsoluteFill>
);

// 6. O cigarro (night-sensible, 3.35-7.85 s): acaba antes de o cigarro chegar a borda azul do
// terreno. Rotulo "Dramatization" na barra de cima. A barra de baixo (175 px) tapa o aviso
// "Click or press Space to skip" e a legenda do proprio jogo.
const Letterbox: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 98, background: "black" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 175, background: "black" }} />
  </>
);
export const Cigarette: React.FC = () => (
  <AbsoluteFill>
    <Clip name="night-sensible (cigarro)" file="night-sensible.mp4" startSec={3.35} />
    <Letterbox />
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 18,
        height: 64,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 18,
        fontFamily: FONT,
        fontSize: 40,
        fontWeight: 600,
        color: COLORS.cream,
      }}
    >
      <span
        style={{
          padding: "2px 18px 4px",
          borderRadius: 999,
          backgroundColor: COLORS.orange,
          color: "#2a1a0e",
          letterSpacing: 2,
        }}
      >
        DRAMATIZATION
      </span>
      <span>the real cause was never confirmed</span>
    </div>
    <Captions lines={NARRATION.cigarette} />
  </AbsoluteFill>
);

// 7. O fogo, acelerado (night-sensible, 12.5-41.55 s, a 3.5x). Comeca depois de a legenda do jogo
// desaparecer (12.4 s) e corta antes do cartao (41.7 s).
export const Fire: React.FC = () => (
  <AbsoluteFill>
    <Camera
      keys={[
        { at: 0, x: 960, y: 560, zoom: 1.25 },
        { at: 8.3, x: 940, y: 580, zoom: 1.32 },
      ]}
    >
      <Clip name="night-sensible (fogo)" file="night-sensible.mp4" startSec={12.5} speed={3.5} />
    </Camera>
    <Chip text="Game footage · 3.5× speed" corner="top-right" size={30} />
    <Captions lines={NARRATION.fire} />
  </AbsoluteFill>
);

// 8. O cartao do plano sensato (night-sensible, cartao parado aos 46 s), em tres placas:
// 2 estrelas com 181/194 e "Safe"; so a frase "the expert plan saved 13 more houses";
// a fila de botoes com "Try again (same night)" a pulsar. Fica de fora "What really happened".
const SensibleCard: React.FC = () => (
  <Freeze frame={0}>
    <Clip name="night-sensible (cartao)" file="night-sensible.mp4" startSec={46} />
  </Freeze>
);
export const Result: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
      <Sequence name="2 estrelas, 181/194" durationInFrames={Math.round(3.5 * fps)}>
        <Plate src={{ x: 652, y: 168, w: 616, h: 226 }} scale={2.3} cy={600}>
          <SensibleCard />
        </Plate>
      </Sequence>
      <Sequence name="A licao: 13 casas" from={Math.round(3.5 * fps)} durationInFrames={Math.round(3.6 * fps)}>
        <Plate
          src={{ x: 688, y: 565, w: 356, h: 32 }}
          scale={4.4}
          cy={560}
          overlay={
            <div style={{ position: "absolute", left: 808, top: 591, width: 232, height: 3, borderRadius: 2, backgroundColor: COLORS.orange }} />
          }
        >
          <SensibleCard />
        </Plate>
      </Sequence>
      <Sequence name="Try again" from={Math.round(7.1 * fps)}>
        <Plate
          src={{ x: 660, y: 822, w: 602, h: 64 }}
          scale={2.6}
          cy={560}
          overlay={<Highlight x={912} y={824} w={220} h={60} fromSec={0.1} radius={16} stroke={4} />}
        >
          <SensibleCard />
        </Plate>
      </Sequence>
      <Captions lines={NARRATION.result} />
    </AbsoluteFill>
  );
};

// 9. "Try again" com o plano do perito: o que mudou. Cortina (da esquerda para a direita) do
// plano sensato (night-sensible aos 1.0 s) para o do perito (night-expert aos 1.0 s), com zoom 2x
// no "?" norte, quadrado (17, 3). O perito poe corta-fogos em (17,3), (19,3), (17,4), (18,4) e
// (19,4): o cigarro cai no (17,3), rola para o (18,3) e o fogo fica cercado. O zoom tambem deixa
// de fora o HUD de cima (onde se le "FORECAST").
const NORTH_Q = { x: 1090, y: 470, zoom: 2 };
const WIPE_FROM = 1.2;
const WIPE_TO = 1.9;
const FirebreakRing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - 2.1;
  if (t < 0) return null;
  const p = interpolate(t, [0, 0.35], [0, 1], { extrapolateRight: "clamp" });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 1085 - 95,
          top: 478 - 68,
          width: 190,
          height: 136,
          borderRadius: "50%",
          border: `4px solid ${COLORS.orange}`,
          boxShadow: `0 0 10px ${COLORS.orange}`,
          opacity: p,
          scale: String(interpolate(p, [0, 1], [1.25, 1])),
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 1085 - 120,
          top: 478 + 76,
          width: 240,
          textAlign: "center",
          opacity: p,
        }}
      >
        <span
          style={{
            padding: "3px 12px 5px",
            borderRadius: 999,
            backgroundColor: COLORS.orange,
            color: "#2a1a0e",
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 25,
            whiteSpace: "nowrap",
          }}
        >
          Expert firebreaks
        </span>
      </div>
    </>
  );
};
const ExpertLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [WIPE_FROM * fps, WIPE_TO * fps], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ clipPath: `inset(0 ${100 - p}% 0 0)` }}>
      <Camera keys={[{ at: 0, ...NORTH_Q }]}>
        <Freeze frame={0}>
          <Clip name="night-expert (plano)" file="night-expert.mp4" startSec={1} />
        </Freeze>
        <FirebreakRing />
      </Camera>
      {p > 0 && p < 100 ? (
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `calc(${p}% - 4px)`, width: 8, backgroundColor: COLORS.cream }} />
      ) : null}
    </AbsoluteFill>
  );
};
export const ExpertPlan: React.FC = () => {
  const { fps } = useVideoConfig();
  const swap = Math.round(((WIPE_FROM + WIPE_TO) / 2) * fps);
  return (
    <AbsoluteFill>
      <Camera keys={[{ at: 0, ...NORTH_Q }]}>
        <Freeze frame={0}>
          <Clip name="night-sensible (plano)" file="night-sensible.mp4" startSec={1} />
        </Freeze>
      </Camera>
      <ExpertLayer />
      <Sequence name="Chip Your plan" durationInFrames={swap}>
        <Chip text="Your plan" corner="bottom-left" size={44} />
      </Sequence>
      <Sequence name="Chip Expert plan" from={swap}>
        <Chip text="Expert plan" corner="bottom-left" size={44} accent />
      </Sequence>
      <Captions lines={NARRATION.expertPlan} />
    </AbsoluteFill>
  );
};

// 11. O cartao do perito (night-expert, cartao parado aos 18.5 s): "Village saved!", 3 estrelas,
// 194/194 e as barras. Fica de fora "You matched the expert plan on this night!" (o plano foi
// carregado, nao descoberto pelo jogador) e o paragrafo "What really happened".
export const VillageSaved: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
    <Plate src={{ x: 652, y: 192, w: 616, h: 372 }} scale={1.95} cy={590}>
      <Freeze frame={0}>
        <Clip name="night-expert (cartao)" file="night-expert.mp4" startSec={18.5} />
      </Freeze>
    </Plate>
    <Captions lines={NARRATION.villageSaved} />
  </AbsoluteFill>
);

// 16. A galeria (gallery.mp4, 1.5-7.5 s, a 1.5x).
export const Gallery: React.FC = () => (
  <AbsoluteFill>
    <Clip name="gallery" file="gallery.mp4" startSec={1.5} speed={1.5} />
    <Captions lines={NARRATION.gallery} />
  </AbsoluteFill>
);

// 17. Fecho: "Look around" da noite sem plano (1-17 s) e o cartao final com o nome e o link.
const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const later = (sec: number) =>
    interpolate(frame, [sec * fps, sec * fps + 10], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: `rgba(14, 10, 8, ${interpolate(s, [0, 1], [0, 0.84])})`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: FONT,
        color: COLORS.cream,
        textAlign: "center",
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          fontSize: 150,
          fontWeight: 700,
          lineHeight: 1.05,
          textShadow: `0 9px 0 ${COLORS.brown}`,
          opacity: s,
          scale: interpolate(s, [0, 1], [0.94, 1]),
        }}
      >
        Same Night
      </div>
      <div style={{ marginTop: 14, fontSize: 56, fontWeight: 600, opacity: s }}>One real wildfire. Three plans.</div>
      <div style={{ marginTop: 40, fontSize: 46, fontWeight: 600, opacity: later(0.5) }}>Play the same night:</div>
      <div style={{ marginTop: 2, fontSize: 73, fontWeight: 700, color: COLORS.orange, opacity: later(0.5) }}>
        pdramos.github.io/genhacks-2026/?seed=1960
      </div>
      <div style={{ marginTop: 6, fontSize: 42, fontWeight: 500, opacity: later(0.5) }}>
        For teens in villages next to forest, and their teachers.
      </div>
      <div style={{ marginTop: 30, fontSize: 36, fontWeight: 500, color: COLORS.creamMuted, opacity: later(1.2) }}>
        Source: github.com/pdramos/genhacks-2026
      </div>
      <div style={{ marginTop: 10, fontSize: 40, fontWeight: 500, opacity: later(1.2) }}>
        Made by a 16-year-old in Portugal, learning to code with AI (Claude Code).
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 60,
          right: 60,
          fontSize: 27,
          fontWeight: 500,
          color: COLORS.creamMuted,
          opacity: later(1.2),
        }}
      >
        Data: © OpenStreetMap contributors · ERA5 via Open-Meteo · elevation: Copernicus DEM · burned area: ICNF, EFFIS · Three.js (MIT)
      </div>
    </AbsoluteFill>
  );
};

export const Close: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {/* Zoom de 1.25 a volta do centro: deixa de fora o HUD de cima inteiro (nome, vento, dinheiro e
          "Houses saved") e o botao "Back to results" de baixo; os aneis vermelhos ficam livres. */}
      <Camera keys={[{ at: 0, x: 960, y: 565, zoom: 1.25 }]}>
        <Clip name="look-around" file="look-around.mp4" startSec={1} />
      </Camera>
      <Captions lines={NARRATION.close} />
      <Sequence name="Cartao final" from={Math.round(9.6 * fps)} layout="absolute-fill">
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};
