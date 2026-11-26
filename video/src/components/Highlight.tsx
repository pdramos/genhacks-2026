// Um contorno laranja a pulsar, para mostrar ao jurado onde olhar
// (um "?" no mapa, o botao "Start disaster", o botao "Try again").
// As coordenadas sao as da gravacao (1920x1080): poe-se DENTRO da <Camera>, e segue o zoom.
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

export const Highlight: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  fromSec: number;
  radius?: number;
  stroke?: number;
}> = ({ x, y, w, h, fromSec, radius = 999, stroke = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps - fromSec;
  if (t < 0) return null;
  const appear = interpolate(t, [0, 0.25], [0, 1], {
    extrapolateRight: "clamp",
  });
  // Pulsa devagar (uma vez por segundo), sem nunca desaparecer.
  const pulse = 0.8 + 0.2 * Math.cos(t * Math.PI * 2);
  const grow = 1 + 0.08 * (1 - Math.cos(t * Math.PI * 2)) * 0.5;
  return (
    <div
      style={{
        position: "absolute",
        left: x - (w * (grow - 1)) / 2,
        top: y - (h * (grow - 1)) / 2,
        width: w * grow,
        height: h * grow,
        borderRadius: radius,
        border: `${stroke}px solid ${COLORS.orange}`,
        boxShadow: `0 0 ${stroke * 3}px ${COLORS.orange}`,
        opacity: appear * pulse,
        boxSizing: "border-box",
      }}
    />
  );
};
