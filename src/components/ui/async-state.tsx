import { AlertCircle, Loader2, RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageLoaderProps = {
  message?: string;
  description?: string;
  fullScreen?: boolean;
  className?: string;
};

export function PageLoader({
  message = "Loading…",
  description,
  fullScreen = true,
  className,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-8 text-center",
        fullScreen && "min-h-dvh-screen bg-white",
        className,
      )}
    >
      <Loader2
        className="size-8 animate-spin text-[var(--gamibar-brand)]"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{message}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-[var(--gamibar-text-tertiary)]">{description}</p>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {message}
      </span>
    </div>
  );
}

type PageErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  fullScreen?: boolean;
  className?: string;
  children?: ReactNode;
};

export function PageErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  fullScreen = true,
  className,
  children,
}: PageErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-8 text-center",
        fullScreen && "min-h-dvh-screen bg-white",
        className,
      )}
      role="alert"
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
        <AlertCircle className="size-6" aria-hidden="true" />
      </div>
      <h1 className="mt-5 font-display text-lg font-bold text-[var(--foreground)]">{title}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--gamibar-text-tertiary)]">
        {message}
      </p>
      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row">
        {onRetry ? (
          <Button
            type="button"
            className="rounded-xl bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Retrying…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" aria-hidden="true" />
                {retryLabel}
              </>
            )}
          </Button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

type ConnectionBannerProps = {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

export function ConnectionBanner({
  message = "Connection interrupted. Updates may be delayed.",
  onRetry,
  retrying = false,
  className,
}: ConnectionBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950",
        className,
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <WifiOff className="size-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </span>
      {onRetry ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 rounded-lg border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
          disabled={retrying}
          onClick={onRetry}
        >
          {retrying ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
              Retrying…
            </>
          ) : (
            "Retry now"
          )}
        </Button>
      ) : null}
    </div>
  );
}

type InlineErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  onDismiss?: () => void;
  className?: string;
};

export function InlineErrorBanner({
  message,
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  onDismiss,
  className,
}: InlineErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",
        className,
      )}
    >
      <p>{message}</p>
      {(onRetry || onDismiss) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onRetry ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-red-200 bg-white text-red-800 hover:bg-red-50"
              disabled={retrying}
              onClick={onRetry}
            >
              {retrying ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
                  Retrying…
                </>
              ) : (
                retryLabel
              )}
            </Button>
          ) : null}
          {onDismiss ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg text-red-800 hover:bg-red-100"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
