import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  className?: string;
  onApply: (response: AiGenerationResponse) => void;
};

export function AiGenerateOptionsButton({
  request,
  disabled = false,
  buttonLabel = "Generate",
  className,
  onApply,
}: AiGenerateOptionsButtonProps) {
  const [pending, setPending] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleGenerate = async () => {
    if (!request.question.trim()) {
      toast.error("Enter a question before generating.");
      return;
    }

    setPending(true);
    try {
      const result = await generateAiOptions(request);
      onApply(result);
      toast.success("AI options generated & applied!");
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
        {pending ? "Generating..." : buttonLabel}
      </Button>

      <UpgradeToProDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        featureTitle="AI Monthly Limit Reached"
        featureDescription="You have used your 20 free AI generations this month. Upgrade to GamiBar Pro for ₹49/month to get unlimited AI generations!"
      />
    </>
  );
}
