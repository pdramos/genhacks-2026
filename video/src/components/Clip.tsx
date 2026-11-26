// Uma gravacao do jogo (public/clips/*.mp4), sem som, com o tamanho da gravacao (1920x1080).
// trimBefore = onde comeca dentro da gravacao (em segundos); speed = velocidade (2 = duas vezes).
import React from "react";
import { Video } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";

export const Clip: React.FC<{
  file: string;
  startSec: number;
  speed?: number;
  name?: string;
}> = ({ file, startSec, speed = 1, name }) => {
  const { fps } = useVideoConfig();
  return (
    <Video
      name={name ?? file}
      src={staticFile(`clips/${file}`)}
      trimBefore={Math.round(startSec * fps)}
      playbackRate={speed}
      muted
      style={{ width: 1920, height: 1080, display: "block" }}
    />
  );
};
