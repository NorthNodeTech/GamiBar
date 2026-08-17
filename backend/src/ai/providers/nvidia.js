import { callOpenAiCompatibleProvider } from "./openai-compatible.js";

const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

export const nvidiaProvider = {
  id: "nvidia",
  label: "NVIDIA NIM",
  isConfigured() {
    return Boolean(nvidiaApiKey());
  },
  async generateJson({ prompt, schema }) {
    return callOpenAiCompatibleProvider({
      baseUrl: process.env.NVIDIA_BASE_URL?.trim() || DEFAULT_NVIDIA_BASE_URL,
      apiKey: nvidiaApiKey(),
      model: process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL,
      prompt,
      schema,
      schemaName: "gamibar_generation",
      bodyExtras: {
        nvext: { guided_json: schema },
      },
    });
  },
};

function nvidiaApiKey() {
  return process.env.NVIDIA_API_KEY?.trim() || process.env.NIM_API_KEY?.trim() || "";
}
