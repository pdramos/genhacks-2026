// As legendas (o rascunho da narracao). Letra grande, fundo escuro, no maximo 2 linhas.
// Lidas num telemovel com 320 px de largura: 62 px aqui ficam com cerca de 10 px la.
import React from "react";
import {
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";
import type { Line } from "../narration";

const FADE = 6; // fotogramas para aparecer e desaparecer

const CaptionBox: React.FC<{ line: Line; frames: number }> = ({
  line,
  frames,
}) => {
  const frame = useCurrentFrame();
  // "instant": a legenda ja esta la no primeiro fotograma (a abertura do video).
  const fadeIn = line.instant ? 0 : FADE;
  const opacity =
    frame < fadeIn
      ? frame / FADE
      : interpolate(frame, [frames - FADE, frames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const pos = line.pos ?? "bottom";

  // Na barra preta de cinema (cena do cigarro): uma so linha, sem caixa.
  if (pos === "bar") {
    return (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 52, // a meio da barra preta de baixo (175 px) da cena do cigarro
          height: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 54,
          color: COLORS.cream,
          whiteSpace: "nowrap",
        }}
      >
        {line.text}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        ...(pos === "top" ? { top: 44 } : { bottom: 64 }),
        opacity,
        translate: `0px ${line.instant ? 0 : interpolate(frame, [0, FADE], [pos === "top" ? -10 : 10, 0], { extrapolateRight: "clamp" })}px`,
      }}
    >
      <div
        style={{
          maxWidth: 1640,
          padding: "16px 36px 20px",
          borderRadius: 24,
          backgroundColor: COLORS.captionBg,
          color: COLORS.cream,
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 62,
          lineHeight: 1.18,
          textAlign: "center",
          textWrap: "balance",
          boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
        }}
      >
        {line.text}
      </div>
    </div>
  );
};

// Mostra todas as legendas de uma cena, cada uma no seu tempo.
export const Captions: React.FC<{ lines: Line[] }> = ({ lines }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {lines.map((line) => {
        const from = Math.round(line.from * fps);
        const frames = Math.round((line.to - line.from) * fps);
        return (
          <Sequence
            key={line.text}
            name={`Legenda: ${line.text.slice(0, 30)}`}
            from={from}
            durationInFrames={frames}
            layout="absolute-fill"
          >
            <CaptionBox line={line} frames={frames} />
          </Sequence>
        );
      })}
    </>
  );
};
