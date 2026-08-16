const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;
const CLARITY_ID_PATTERN = /^[a-z0-9]+$/i;

function validEnvValue(value: string | undefined, pattern: RegExp): string | undefined {
  const candidate = value?.trim();
  return candidate && pattern.test(candidate) ? candidate : undefined;
}

export const googleAnalyticsId = validEnvValue(
  import.meta.env.VITE_GA_MEASUREMENT_ID,
  GA_ID_PATTERN,
);
export const microsoftClarityId = validEnvValue(
  import.meta.env.VITE_MICROSOFT_CLARITY_ID,
  CLARITY_ID_PATTERN,
);
