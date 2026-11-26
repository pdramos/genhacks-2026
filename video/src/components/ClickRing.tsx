// Um circulo que cresce e desaparece onde houve um clique (a gravacao nao mostra o rato).
// Coordenadas da gravacao (1920x1080): poe-se DENTRO da <Camera>, como o <Highlight>.
// atSec = o segundo da cena em que o clique acontece.
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

export const ClickRing: React.FC<{ x: number; y: number; atSec: number; color?: string }> = ({
  x,
  y,
  atSec,
  color = COLORS.orange,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - atSec;
  if (t < 0 || t > 0.9) return null;
  const r = interpolate(t, [0, 0.6], [8, 46], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: 999,
        border: `5px solid ${color}`,
        boxShadow: `0 0 12px ${color}`,
        boxSizing: "border-box",
        opacity: interpolate(t, [0, 0.1, 0.55, 0.9], [0, 1, 1, 0]),
      }}
    />
  );
};
