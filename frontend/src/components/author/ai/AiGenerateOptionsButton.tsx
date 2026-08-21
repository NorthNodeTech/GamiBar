import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateAiOptions,
  type AiGenerationRequest,
  type AiGenerationResponse,
} from "@/lib/ai/option-generation";
import { cn } from "@/lib/utils";

import { UpgradeToProDialog } from "@/components/billing/UpgradeToProDialog";

type AiGenerateOptionsButtonProps = {
  request: AiGenerationRequest;
  disabled?: boolean;
  buttonLabel?: string;
  dialogTitle?: string;
  className?: string;
  onApply: (response: AiGenerationResponse) => void;
};

export function AiGenerateOptionsButton({
  request,
  disabled = false,
  buttonLabel = "Generate",
  dialogTitle = "Review AI suggestion",
  className,
  onApply,
}: AiGenerateOptionsButtonProps) {
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<AiGenerationResponse | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleGenerate = async () => {
    if (!request.question.trim()) {
      toast.error("Enter a question before generating.");
      return;
    }

    setPending(true);
    try {
      setPreview(await generateAiOptions(request));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not generate AI options.";
      if (msg.includes("20 free") || msg.includes("Upgrade to Pro") || msg.includes("limit")) {
        setShowUpgrade(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setPending(false);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    onApply(preview);
    setPreview(null);
    toast.success("AI suggestion applied.");
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-11 rounded-xl", className)}
        disabled={disabled || pending}
        onClick={handleGenerate}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {pending ? "Generating" : buttonLabel}
      </Button>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Review the generated content before applying it to this question.
            </DialogDescription>
          </DialogHeader>

          {preview && <AiGenerationPreview response={preview} />}

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setPreview(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-[#111111] hover:bg-black"
              onClick={handleApply}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeToProDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        featureTitle="AI Monthly Limit Reached"
        featureDescription="You have used your 20 free AI generations this month. Upgrade to GamiBar Pro for ₹49/month to get unlimited AI generations!"
      />
    </>
  );
}

function AiGenerationPreview({ response }: { response: AiGenerationResponse }) {
  if (response.kind === "quiz_options") {
    return (
      <div className="grid gap-2">
        {(["A", "B", "C", "D"] as const).map((id) => {
          const correct = response.correctOption === id;
          return (
            <div
              key={id}
              className={cn(
                "grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-xl border p-3",
                correct
                  ? "border-green-500 bg-green-50 text-green-950"
                  : "border-[var(--gamibar-border)] bg-[var(--gamibar-page)] text-[#111111]",
              )}
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-lg text-xs font-bold",
                  correct ? "bg-green-600 text-white" : "bg-white text-[#525252]",
                )}
              >
                {id}
              </span>
              <p className="min-w-0 text-sm font-medium">{response.options[id]}</p>
            </div>
          );
        })}
      </div>
    );
  }

  if (response.kind === "poll_options") {
    return (
      <div className="grid gap-2">
        {response.options.map((option, index) => (
          <div
            key={`${option}-${index}`}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-3"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-white text-xs font-bold text-[#525252]">
              {index + 1}
            </span>
            <p className="min-w-0 text-sm font-medium text-[#111111]">{option}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#737373]">Answer</p>
      <p className="mt-2 text-base font-semibold text-[#111111]">{response.answer}</p>
    </div>
  );
}
