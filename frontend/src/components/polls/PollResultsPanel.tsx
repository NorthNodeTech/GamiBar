import { BarChart3, Download, MessageSquareText, Star } from "lucide-react";

import type { PollQuestionResults, PollResults } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PollResultsPanel({
  results,
  className,
  compact = false,
}: {
  results: PollResults;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[24px] border border-[var(--gamibar-border)] bg-[var(--gamibar-surface)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="border-b border-[var(--gamibar-border)] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-orange-100 text-orange-700">
              <BarChart3 className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--foreground)]">
                Live results
              </h2>
              <p className="text-xs text-[var(--muted-foreground)]">
                {results.submittedCount}/{results.totalParticipants} submitted
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--gamibar-page)] px-3 py-1 text-xs font-bold tabular-nums text-[var(--foreground)]">
              {results.completionRate}% complete
            </span>
            {!compact && results.responseRows.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-[var(--gamibar-border)] bg-white text-xs font-bold"
                onClick={() => downloadPollResultsCsv(results)}
              >
                <Download className="mr-1.5 size-3.5" />
                CSV
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={cn("grid gap-4 p-4 sm:p-6", compact && "p-3 sm:p-4")}>
        {results.questions.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            Results appear after the first response.
          </p>
        ) : (
          results.questions.map((question, index) => (
            <QuestionResult key={question.questionId} question={question} index={index} />
          ))
        )}
      </div>
    </section>
  );
}

function QuestionResult({ question, index }: { question: PollQuestionResults; index: number }) {
  return (
    <article className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
            Question {index + 1}
          </p>
          <h3 className="mt-1 break-words font-display text-base font-bold text-[var(--foreground)]">
            {question.prompt}
          </h3>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--muted-foreground)]">
          {question.responseCount} response{question.responseCount === 1 ? "" : "s"}
        </span>
      </div>

      {question.options && <OptionBars options={question.options} />}
      {question.rating && <RatingBars rating={question.rating} />}
      {question.textResponses && <TextResponses responses={question.textResponses} />}
    </article>
  );
}

function OptionBars({ options }: { options: NonNullable<PollQuestionResults["options"]> }) {
  return (
    <div className="mt-4 grid gap-2">
      {options.map((option) => (
        <div key={option.id} className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-semibold text-[var(--foreground)]">
              {option.label}
            </span>
            <span className="shrink-0 font-bold tabular-nums text-[var(--muted-foreground)]">
              {option.count} - {option.percent}%
            </span>
          </div>
          <Bar percent={option.percent} />
        </div>
      ))}
    </div>
  );
}

function RatingBars({ rating }: { rating: NonNullable<PollQuestionResults["rating"]> }) {
  return (
    <div className="mt-4 grid gap-3">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-orange-100 text-orange-700">
          <Star className="size-4 fill-current" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
            Average
          </p>
          <p className="font-display text-xl font-extrabold tabular-nums text-[var(--foreground)]">
            {rating.average == null ? "--" : rating.average}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {rating.distribution.map((item) => (
          <div
            key={item.value}
            className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-center gap-2"
          >
            <span className="text-xs font-bold tabular-nums text-[var(--foreground)]">
              {item.value}
            </span>
            <Bar percent={item.percent} />
            <span className="text-right text-xs font-bold tabular-nums text-[var(--muted-foreground)]">
              {item.count} - {item.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextResponses({
  responses,
}: {
  responses: NonNullable<PollQuestionResults["textResponses"]>;
}) {
  if (responses.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-white px-3 py-3 text-sm text-[var(--muted-foreground)]">
        No text responses yet.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-2">
      {responses.map((response) => (
        <div
          key={`${response.participantId}-${response.submittedAt ?? response.value}`}
          className="rounded-xl bg-white px-3 py-2.5"
        >
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
            <MessageSquareText className="size-3.5" />
            {response.displayName}
          </div>
          <p className="mt-1 break-words text-sm leading-relaxed text-[var(--foreground)]">
            {response.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-2.5 min-w-0 overflow-hidden rounded-full bg-white">
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-[var(--gamibar-brand)] transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function downloadPollResultsCsv(results: PollResults) {
  const headers = [
    "Participant",
    "Submitted at",
    ...results.questions.map((question, index) => `Q${index + 1}: ${question.prompt}`),
  ];
  const rows = results.responseRows.map((row) => [
    row.displayName,
    row.submittedAt ? new Date(row.submittedAt).toISOString() : "",
    ...results.questions.map((question) =>
      formatPollCsvValue(question, row.responses[question.questionId]),
    ),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gamibar-poll-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatPollCsvValue(
  question: PollQuestionResults,
  value: PollResults["responseRows"][number]["responses"][string],
) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((item) => optionLabel(question, item)).join("; ");
  if (typeof value === "number") return String(value);
  return optionLabel(question, value);
}

function optionLabel(question: PollQuestionResults, value: string) {
  if (question.type === "yes_no") return value === "yes" ? "Yes" : value === "no" ? "No" : value;
  return question.options?.find((option) => option.id === value)?.label ?? value;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
