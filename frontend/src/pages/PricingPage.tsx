import { BILLING_PLANS, formatInrFromPaise, type BillingPlanCode } from "@shared/billing/plans";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthSafe } from "@/lib/auth-store";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const planCodes: BillingPlanCode[] = ["free", "pro_monthly", "pro_yearly", "lifetime"];

export default function PricingPage() {
  const { isAuthor } = useAuthSafe();

  return (
    <div className="bg-[#F7F7F8] text-[#111111]">
      <section className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D9DDE3] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#5F6368]">
            <Sparkles className="size-3.5 text-[#FF3B30]" /> Simple plans
          </span>
          <h1 className="mt-6 font-display text-4xl font-bold tracking-[-0.035em] sm:text-6xl">
            Choose how you teach with GamiBAR
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#5F6368] sm:text-lg">
            Every plan includes all six game modes. Upgrade for larger rooms, longer retention, and
            fair-use unlimited AI generation.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-[#111111]">
            These plans are only for hosts who create rooms. Joining and playing are always free,
            with no participant account or purchase required.
          </p>
          <p className="mt-3 text-sm font-medium text-[#737780]">
            Prices shown below are exclusive of 18% GST.
          </p>
        </div>

        <div className="mt-12 grid overflow-hidden rounded-3xl border border-[#D9DDE3] bg-white lg:grid-cols-4">
          {planCodes.map((code, index) => (
            <PlanCard
              key={code}
              code={code}
              isAuthor={isAuthor}
              last={index === planCodes.length - 1}
            />
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-[#D9DDE3] bg-white">
          <div className="grid grid-cols-[minmax(10rem,1.2fr)_repeat(4,minmax(8rem,1fr))] overflow-x-auto">
            <ComparisonRow
              label="Feature"
              values={["Free", "Monthly", "Yearly", "Lifetime"]}
              header
            />
            <ComparisonRow
              label="All 6 game modes"
              values={["Included", "Included", "Included", "Included"]}
            />
            <ComparisonRow
              label="Host room capacity"
              values={["Up to 100", "Up to 200", "Up to 200", "Up to 200"]}
            />
            <ComparisonRow
              label="Room lifespan"
              values={["7 days", "Unlimited", "Unlimited", "Unlimited"]}
            />
            <ComparisonRow
              label="AI generations"
              values={[
                "20 / month",
                "Fair-use unlimited",
                "Fair-use unlimited",
                "Fair-use unlimited",
              ]}
            />
            <ComparisonRow
              label="QRFile sharing"
              values={[
                "1 file · 15 MB · 7 days",
                "1 file · 50 MB · 28 days",
                "1 file · 50 MB · 28 days",
                "1 file · 50 MB · 28 days",
              ]}
              last
            />
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-[#737780]">
          Fair-use unlimited covers normal classroom and workshop use. Automated scripts, account
          sharing, and concurrent generation floods may be throttled. Recurring plans can be
          cancelled before the next renewal. Eligible payments have a seven-day refund-request
          period.
        </div>
      </section>
    </div>
  );
}

function PlanCard({
  code,
  isAuthor,
  last,
}: {
  code: BillingPlanCode;
  isAuthor: boolean;
  last: boolean;
}) {
  const plan = BILLING_PLANS[code];
  const destination =
    code === "free"
      ? "/author/create"
      : isAuthor
        ? `/author/billing?plan=${code}`
        : `/author/register?redirect=${encodeURIComponent(`/author/billing?plan=${code}`)}`;
  const features =
    code === "free"
      ? [
          "All 6 game modes",
          "Up to 100 live players",
          "20 AI generations monthly",
          "7-day room and file retention",
        ]
      : [
          "All 6 game modes",
          "Up to 200 live players",
          "Fair-use unlimited AI",
          "28-day QRFile retention",
        ];

  return (
    <article
      className={cn(
        "relative flex min-h-[31rem] flex-col p-6 sm:p-7",
        !last && "border-b border-[#D9DDE3] lg:border-b-0 lg:border-r",
        plan.featured && "bg-[#F4F4F5]",
      )}
    >
      {plan.featured ? (
        <span className="absolute right-5 top-5 rounded-full bg-[#111111] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          Best value
        </span>
      ) : null}
      <h2 className="font-display text-xl font-bold">{plan.shortName}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-[#5F6368]">{plan.description}</p>
      <div className="mt-6">
        <span className="font-display text-4xl font-bold tracking-tight">
          {formatInrFromPaise(plan.baseAmountPaise)}
        </span>
        <span className="ml-2 text-sm text-[#737780]">{plan.billingLabel}</span>
      </div>
      {code !== "free" ? (
        <p className="mt-2 text-xs text-[#737780]">
          + {formatInrFromPaise(plan.gstAmountPaise)} GST ·{" "}
          {formatInrFromPaise(plan.totalAmountPaise)} charged
        </p>
      ) : (
        <p className="mt-2 text-xs text-[#737780]">No card required</p>
      )}
      <Button
        asChild
        className={cn(
          "mt-6 h-11 rounded-xl",
          plan.featured
            ? "bg-[#111111] text-white hover:bg-[#2A2A2A]"
            : "border border-[#D9DDE3] bg-white text-[#111111] hover:bg-[#F3F4F6]",
        )}
      >
        <Link to={destination}>
          {code === "free" ? "Start free" : `Choose ${plan.shortName}`}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <div className="my-6 h-px bg-[#E7E9ED]" />
      <p className="text-sm font-semibold">Includes:</p>
      <ul className="mt-4 space-y-3 text-sm leading-5">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-[#16A34A]" />
            {feature}
          </li>
        ))}
      </ul>
      {code === "lifetime" ? (
        <p className="mt-auto pt-6 text-xs leading-5 text-[#737780]">
          One payment. No recurring mandate and no renewal charges.
        </p>
      ) : null}
    </article>
  );
}

function ComparisonRow({
  label,
  values,
  header = false,
  last = false,
}: {
  label: string;
  values: string[];
  header?: boolean;
  last?: boolean;
}) {
  return (
    <>
      {[label, ...values].map((value, index) => (
        <div
          key={`${label}-${index}`}
          className={cn(
            "min-w-[8rem] px-4 py-4 text-sm",
            !last && "border-b border-[#E7E9ED]",
            index > 0 && "border-l border-[#E7E9ED] text-center",
            header ? "bg-[#F4F4F5] font-bold" : index === 0 ? "font-semibold" : "text-[#5F6368]",
          )}
        >
          {value}
        </div>
      ))}
    </>
  );
}
