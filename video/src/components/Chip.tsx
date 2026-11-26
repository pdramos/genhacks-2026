// Uma etiqueta pequena num canto: "2x speed", "Dramatization", "Real output"...
// Serve para a honestidade: diz ao jurado o que esta a ver.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT } from "../theme";

export const Chip: React.FC<{
  text: string;
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  accent?: boolean;
  size?: number;
  top?: number;
}> = ({ text, corner = "top-right", accent = false, size = 34, top = 36 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });
  const [v, h] = corner.split("-");
  return (
    <div
      style={{
        position: "absolute",
        [v]: v === "top" ? top : 36,
        [h]: 48,
        opacity,
        padding: "6px 20px 8px",
        borderRadius: 999,
        backgroundColor: accent ? COLORS.orange : "rgba(22, 15, 10, 0.78)",
        color: accent ? "#2a1a0e" : COLORS.cream,
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: 0.5,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};
