// Uma "camara" sobre uma gravacao 1920x1080: aproxima (zoom) e move-se com suavidade.
// Cada chave diz: no segundo "at" da cena, o ponto (x, y) da gravacao fica no centro do ecra
// (ou em "anchor"), com o zoom "zoom". Entre duas chaves a camara desliza (ease in-out).
// A camara nunca mostra a parte de fora da gravacao (fica sempre preenchida).
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type CameraKey = { at: number; x: number; y: number; zoom: number };

const SRC_W = 1920;
const SRC_H = 1080;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export const Camera: React.FC<{
  keys: CameraKey[];
  anchor?: { x: number; y: number };
  children: React.ReactNode;
}> = ({ keys, anchor = { x: 960, y: 540 }, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  // Encontra o par de chaves em que estamos e mistura-as.
  let x = keys[0].x;
  let y = keys[0].y;
  let zoom = keys[0].zoom;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
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
  const last = keys[keys.length - 1];
  if (t > last.at) {
    x = last.x;
    y = last.y;
    zoom = last.zoom;
  }

  // Desloca a gravacao para o ponto escolhido, sem deixar ver as bordas.
  const tx = clamp(anchor.x - x * zoom, SRC_W - SRC_W * zoom, 0);
  const ty = clamp(anchor.y - y * zoom, SRC_H - SRC_H * zoom, 0);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "black" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SRC_W,
          height: SRC_H,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
