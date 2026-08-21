export const GST_RATE_BPS = 1_800;

export type BillingPlanCode =
  "free" | "pro_monthly" | "pro_yearly" | "lifetime";
export type PaidBillingPlanCode = Exclude<BillingPlanCode, "free">;

export type BillingPlan = {
  code: BillingPlanCode;
  name: string;
  shortName: string;
  description: string;
  billingLabel: string;
  baseAmountPaise: number;
  gstAmountPaise: number;
  totalAmountPaise: number;
  recurring: boolean;
  featured: boolean;
  limits: {
    livePlayersPerRoom: number;
    roomLifespanDays: number | null;
    aiGenerationsPerMonth: number | null;
    filesPerRoom: number;
    fileSizeMb: number;
    fileRetentionDays: number;
  };
};

const paidLimits = {
  livePlayersPerRoom: 200,
  roomLifespanDays: null,
  aiGenerationsPerMonth: null,
  filesPerRoom: 1,
  fileSizeMb: 50,
  fileRetentionDays: 28,
} as const;

export const BILLING_PLANS: Record<BillingPlanCode, BillingPlan> = {
  free: {
    code: "free",
    name: "GamiBAR Free",
    shortName: "Free",
    description: "Run engaging classroom activities at no cost.",
    billingLabel: "Free forever",
    baseAmountPaise: 0,
    gstAmountPaise: 0,
    totalAmountPaise: 0,
    recurring: false,
    featured: false,
    limits: {
      livePlayersPerRoom: 100,
      roomLifespanDays: 7,
      aiGenerationsPerMonth: 20,
      filesPerRoom: 1,
      fileSizeMb: 15,
      fileRetentionDays: 7,
    },
  },
  pro_monthly: {
    code: "pro_monthly",
    name: "GamiBAR Pro Monthly",
    shortName: "Monthly",
    description: "Full GamiBAR Pro access with monthly billing.",
    billingLabel: "per month",
    baseAmountPaise: 4_900,
    gstAmountPaise: 882,
    totalAmountPaise: 5_782,
    recurring: true,
    featured: false,
    limits: paidLimits,
  },
  pro_yearly: {
    code: "pro_yearly",
    name: "GamiBAR Pro Yearly",
    shortName: "Yearly",
    description: "Full GamiBAR Pro access with annual billing.",
    billingLabel: "per year",
    baseAmountPaise: 49_900,
    gstAmountPaise: 8_982,
    totalAmountPaise: 58_882,
    recurring: true,
    featured: true,
    limits: paidLimits,
  },
  lifetime: {
    code: "lifetime",
    name: "GamiBAR Lifetime",
    shortName: "Lifetime",
    description: "A single payment for permanent GamiBAR Pro access.",
    billingLabel: "one-time",
    baseAmountPaise: 199_900,
    gstAmountPaise: 35_982,
    totalAmountPaise: 235_882,
    recurring: false,
    featured: false,
    limits: paidLimits,
  },
};

export const PAID_BILLING_PLAN_CODES: PaidBillingPlanCode[] = [
  "pro_monthly",
  "pro_yearly",
  "lifetime",
];

export function isPaidBillingPlanCode(
  value: unknown,
): value is PaidBillingPlanCode {
  return (
    typeof value === "string" &&
    PAID_BILLING_PLAN_CODES.includes(value as PaidBillingPlanCode)
  );
}

export function formatInrFromPaise(amountPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: amountPaise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);
}
