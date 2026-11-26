// O VIDEO COMPLETO: as cenas por ordem (TransitionSeries poe cada uma a seguir a anterior).
// Duracoes: src/timeline.ts. Legendas: src/narration.ts. Cenas: src/scenes/.
import React from "react";
import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import {
  Build,
  Cigarette,
  Close,
  ColdOpen,
  ExpertPlan,
  Fire,
  Gallery,
  PlanReady,
  Result,
  Teaser,
  TitleScene,
  VillageSaved,
} from "./scenes/GameScenes";
import { HowBuilt, Luck } from "./scenes/Cards";
import { Proof, ProofMini } from "./scenes/Proof";
import { Terminal } from "./scenes/Terminal";
import { ThreePlans } from "./scenes/ThreePlans";
import { FADES, SCENE_SECONDS as S } from "./timeline";

export type SameNightProps = {
  // SITIO PARA A VOZ: quando a gravacao da narracao existir, poe o ficheiro em
  // public/voice/ e escreve aqui o caminho (por exemplo "voice/narration.wav"),
  // em Root.tsx (defaultProps). null = video sem som.
  voiceSrc: string | null;
};

export const SameNight: React.FC<SameNightProps> = ({ voiceSrc }) => {
  const { fps } = useVideoConfig();
  const d = (sec: number) => Math.round(sec * fps);
  const fadeFor = (frames: number) => (
    <TransitionSeries.Transition
      presentation={fade()}
      timing={linearTiming({ durationInFrames: frames })}
    />
  );
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries name="Cenas">
        <TransitionSeries.Sequence name="1 Cold open (fogo)" durationInFrames={d(S.coldOpen)}>
          <ColdOpen />
        </TransitionSeries.Sequence>
        {fadeFor(FADES.coldOpenToTitle)}
        <TransitionSeries.Sequence name="2 Titulo (o que e, para quem)" durationInFrames={d(S.title)}>
          <TitleScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="3 Mini-prova 0.65" durationInFrames={d(S.proofMini)}>
          <ProofMini />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="4 Tres barras" durationInFrames={d(S.teaser)}>
          <Teaser />
        </TransitionSeries.Sequence>
        {fadeFor(FADES.teaserToBuild)}
        <TransitionSeries.Sequence name="5 Preparar" durationInFrames={d(S.build)}>
          <Build />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="6 Plano pronto" durationInFrames={d(S.planReady)}>
          <PlanReady />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="7 Cigarro" durationInFrames={d(S.cigarette)}>
          <Cigarette />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="8 Fogo" durationInFrames={d(S.fire)}>
          <Fire />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="9 Resultado 181" durationInFrames={d(S.result)}>
          <Result />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="10 Plano do perito (cortina)" durationInFrames={d(S.expertPlan)}>
          <ExpertPlan />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="11 Tres planos lado a lado" durationInFrames={d(S.threePlans)}>
          <ThreePlans />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="12 Village saved 194" durationInFrames={d(S.villageSaved)}>
          <VillageSaved />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="13 Sorte? 68% contra 10%" durationInFrames={d(S.luck)}>
          <Luck />
        </TransitionSeries.Sequence>
        {fadeFor(FADES.luckToProof)}
        <TransitionSeries.Sequence name="14 Prova" durationInFrames={d(S.proof)}>
          <Proof />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="15 Como foi feito" durationInFrames={d(S.howBuilt)}>
          <HowBuilt />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="16 Terminal" durationInFrames={d(S.terminal)}>
          <Terminal />
        </TransitionSeries.Sequence>
        <TransitionSeries.Sequence name="17 Galeria" durationInFrames={d(S.gallery)}>
          <Gallery />
        </TransitionSeries.Sequence>
        {fadeFor(FADES.galleryToClose)}
        <TransitionSeries.Sequence name="18 Look around e fecho" durationInFrames={d(S.close)}>
          <Close />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {voiceSrc ? <Audio name="Voz (narracao)" src={staticFile(voiceSrc)} /> : null}
    </AbsoluteFill>
  );
};
