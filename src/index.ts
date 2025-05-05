import generateConfig from "./actions/generateConfig.ts";
import type { Plugin } from "@elizaos/core";
import { poolProvider } from "./providers/poolInfo.ts";

export const quokkaStepPlugin: Plugin = {
  name: "quokkaStep",
  description:
    "quokkaStep plugin buiding on Raydium, As the ladder step and single-sided LP converte tool",
  actions: [generateConfig],
  evaluators: [],
  providers: [poolProvider],
};
export default quokkaStepPlugin;
