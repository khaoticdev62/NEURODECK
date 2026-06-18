import { bridgeInvoke } from "../http";

export const promptLab = {
  async generateJPE(prompt: string, level: "grade8" | "college" | "expert" = "college") {
    return bridgeInvoke<{ explanation: string }>("generate_jpe_explanation_with_level", {
      prompt,
      level,
    });
  },
  async optimizePrompt(prompt: string) {
    return bridgeInvoke<{ optimized: string }>("optimize_raw_prompt", { prompt });
  },
};
