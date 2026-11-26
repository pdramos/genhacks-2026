// Saida REAL do terminal (rotulada "Real output"), copiada tal e qual de:
//   src/data/terminal-test.txt     (ultimas linhas de npm test)
//   src/data/terminal-validate.txt (npm run validate: tabela MAIN)
// Nada e escrito a mao: as linhas vem dos ficheiros. So escolhemos QUE linhas mostrar
// e para onde a "camara" olha: primeiro o resumo do npm test (pass 251 / fail 0) com zoom 2x,
// depois a tabela (modelo com vento, sem vento e o circulo, que fica a cinzento).
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import testOut from "../data/terminal-test.txt";
import validateOut from "../data/terminal-validate.txt";
import { Captions } from "../components/Caption";
import { Chip } from "../components/Chip";
import { NARRATION } from "../narration";
import { COLORS, FONT, MONO } from "../theme";

const lines = (txt: string) => txt.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);

// npm test: as ultimas 9 linhas (o ultimo teste e o resumo "tests / pass / fail").
const TEST_LINES = lines(testOut).slice(-9);
// npm run validate: o titulo e a tabela MAIN (cabecalho + 4 linhas, incluindo o circulo).
const V = lines(validateOut);
const mainAt = V.findIndex((l) => l.startsWith("MAIN"));
const VALIDATE_LINES = V.slice(mainAt, mainAt + 5);

const ORANGE_MARK = "rgba(242, 140, 40, 0.30)";
const GREY_MARK = "rgba(203, 187, 163, 0.22)";

const Window: React.FC<{
  title: string;
  rows: string[];
  fontSize: number;
  startSec: number;
  mark: (line: string) => string | null; // cor do destaque, ou null
  width: number;
}> = ({ title, rows, fontSize, startSec, mark, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // As linhas aparecem depressa, uma a uma, como num terminal.
  const shown = interpolate(frame, [startSec * fps, (startSec + 0.8) * fps], [0, rows.length], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const markOpacity = interpolate(frame, [(startSec + 1.0) * fps, (startSec + 1.3) * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width,
        borderRadius: 16,
        overflow: "hidden",
        border: `3px solid ${COLORS.brown}`,
        backgroundColor: "#0c0a09",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          height: 46,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 18px",
          backgroundColor: "#2a211b",
          fontFamily: FONT,
          fontSize: 26,
          fontWeight: 600,
          color: COLORS.creamMuted,
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 7, background: "#e0533d" }} />
        <span style={{ width: 14, height: 14, borderRadius: 7, background: "#e6b23a" }} />
        <span style={{ width: 14, height: 14, borderRadius: 7, background: "#5cb85c" }} />
        <span style={{ marginLeft: 14 }}>{title}</span>
      </div>
      <div style={{ padding: "14px 22px 18px", fontFamily: MONO, fontSize, lineHeight: 1.38, color: "#e8e2d6" }}>
        {rows.map((row, i) => {
          const m = mark(row);
          return (
            <div
              key={`${i}-${row}`}
              style={{
                whiteSpace: "pre",
                opacity: i < shown ? 1 : 0,
                borderRadius: 6,
                backgroundColor: m ? m.replace(/[\d.]+\)$/, (a) => `${parseFloat(a) * markOpacity})`) : "transparent",
                color: m && markOpacity > 0.5 ? COLORS.cream : undefined,
              }}
            >
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// A "camara" do terminal: no segundo "at", o ponto (x, y) do quadro fica no centro, com "zoom".
// A tabela tem linhas largas (105 letras): com zoom 1.7 ve-se primeiro o lado dos nomes
// (modelo com vento, sem vento, circulo) e depois a camara desliza para os numeros (Sorensen).
const KEYS = [
  { at: 0.0, x: 960, y: 530, zoom: 1 },
  { at: 1.0, x: 960, y: 530, zoom: 1 },
  { at: 1.8, x: 580, y: 385, zoom: 2 }, // o resumo do npm test: tests 251, pass 251, fail 0
  { at: 2.8, x: 580, y: 385, zoom: 2 },
  { at: 3.6, x: 595, y: 790, zoom: 1.7 }, // a tabela: os nomes das linhas
  { at: 4.4, x: 595, y: 790, zoom: 1.7 },
  { at: 5.3, x: 1205, y: 790, zoom: 1.7 }, // a tabela: os numeros (Sorensen = overlap)
];

const Camera2D: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const last = KEYS[KEYS.length - 1];
  let x = last.x;
  let y = last.y;
  let zoom = last.zoom;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (t >= a.at && t <= b.at) {
      const p = interpolate(t, [a.at, b.at], [0, 1], {
        easing: Easing.inOut(Easing.cubic),
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      x = a.x + (b.x - a.x) * p;
      y = a.y + (b.y - a.y) * p;
      zoom = a.zoom + (b.zoom - a.zoom) * p;
    }
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          translate: `${960 - x * zoom}px ${540 - y * zoom}px`,
          scale: String(zoom),
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const Terminal: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLORS.night }}>
    <Camera2D>
      <div style={{ position: "absolute", left: 100, top: 120 }}>
        <Window
          title="npm test"
          rows={TEST_LINES}
          fontSize={27}
          startSec={0.1}
          width={1240}
          mark={(l) => (/^ℹ (tests|pass|fail) /.test(l) ? ORANGE_MARK : null)}
        />
      </div>
      <div style={{ position: "absolute", left: 30, top: 610 }}>
        <Window
          title="npm run validate"
          rows={VALIDATE_LINES}
          fontSize={28}
          startSec={0.5}
          width={1860}
          mark={(l) =>
            l.startsWith("Model, real wind") || l.startsWith("Baseline A: model, no wind")
              ? ORANGE_MARK
              : l.startsWith("Baseline B: circle")
                ? GREY_MARK
                : null
          }
        />
      </div>
    </Camera2D>
    <Chip text="Real output" corner="top-left" accent size={30} top={30} />
    <Captions lines={NARRATION.terminal} />
  </AbsoluteFill>
);
