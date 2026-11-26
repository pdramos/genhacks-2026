// Uma "placa": mostra SO um retangulo de uma gravacao (por exemplo as tres barras do cartao),
// ampliado e centrado sobre o fundo escuro. Nada e redesenhado: sao os pixeis do jogo.
// src = { x, y, w, h } em coordenadas da gravacao (1920x1080); scale = quantas vezes ampliar.
// O centro da placa fica em (cx, cy) no ecra do video. children = a gravacao (um <Clip>).
import React from "react";
import { COLORS } from "../theme";

export type Rect = { x: number; y: number; w: number; h: number };

export const Plate: React.FC<{
  src: Rect;
  scale: number;
  cx?: number;
  cy: number;
  children: React.ReactNode;
  overlay?: React.ReactNode; // desenhos por cima, em coordenadas da gravacao
  radius?: number;
  framed?: boolean; // false = sem borda nem sombra (por exemplo o porta-moedas)
}> = ({ src, scale, cx = 960, cy, children, overlay, radius = 22, framed = true }) => {
  const w = src.w * scale;
  const h = src.h * scale;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        overflow: "hidden",
        borderRadius: radius,
        border: framed ? `5px solid ${COLORS.brown}` : undefined,
        boxShadow: framed ? "0 16px 48px rgba(0,0,0,0.55)" : "0 8px 24px rgba(0,0,0,0.45)",
        backgroundColor: COLORS.cream,
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
          translate: `${-src.x * scale}px ${-src.y * scale}px`,
          scale: String(scale),
        }}
      >
        {children}
        {overlay}
      </div>
    </div>
  );
};
