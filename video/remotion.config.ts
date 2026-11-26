/**
 * Configuracao do Remotion (so para a linha de comandos e o Studio).
 * Todas as opcoes: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Os ficheiros .txt (saida real do terminal) entram no codigo como texto, sem mudar nada.
Config.overrideBundlerConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: [
      ...(config.module?.rules ?? []),
      { test: /\.txt$/, type: "asset/source" },
    ],
  },
}));
