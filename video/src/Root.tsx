// Regista as composicoes que o Remotion Studio mostra e que se podem exportar (render).
import React from "react";
import { Composition } from "remotion";
import { SameNight } from "./SameNight";
import { FPS, totalFrames } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SameNight"
        component={SameNight}
        durationInFrames={totalFrames(FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ voiceSrc: null }}
      />
    </>
  );
};
