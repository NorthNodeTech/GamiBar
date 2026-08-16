import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineErrorBanner } from "@/components/ui/async-state";
import {
  SESSION_FILE_ACCEPT,
  SESSION_FILE_DEFAULT_RETENTION_DAYS,
  SESSION_FILE_MAX_FILES,
  SESSION_FILE_RETENTION_OPTIONS,
  formatSessionFileSize,
  getFileKindLabel,
  type SessionFileRetentionDays,
  validateSessionShareFiles,
} from "@/lib/sharing-files/session-files";
import { cn } from "@/lib/utils";

type SessionFilesPickerProps = {
  files: File[];
  onChange: (files: File[]) => void;
  activeCount?: number;
  disabled?: boolean;
  compact?: boolean;
  retentionDays?: SessionFileRetentionDays;
  onRetentionDaysChange?: (days: SessionFileRetentionDays) => void;
};

export function SessionFilesPicker({
  files,
  onChange,
  activeCount = 0,
  disabled = false,
  compact = false,
  retentionDays = SESSION_FILE_DEFAULT_RETENTION_DAYS,
  onRetentionDaysChange,
}: SessionFilesPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const validation = useMemo(
    () => validateSessionShareFiles(files, activeCount),
    [files, activeCount],
  );
  const remaining = Math.max(0, SESSION_FILE_MAX_FILES - activeCount - files.length);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || disabled) return;
    const next = [...files, ...Array.from(incoming)];
    const result = validateSessionShareFiles(next, activeCount);
    if (!result.ok) {
      setError(result.errors[0] ?? "Some files cannot be added.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setError(null);
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setError(null);
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="grid gap-3">
      <div
        className={cn(
          "rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] p-4",
          compact ? "sm:p-4" : "sm:p-5",
          disabled && "opacity-70",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
              <Paperclip className="size-4 text-[var(--gamibar-brand)]" />
              Resource Drop
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
              PDF, PPT, PPTX, DOC, DOCX. Each document can be up to 50 MB and will expire
              automatically.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 rounded-xl border-[var(--gamibar-border)] bg-[var(--gamibar-surface)]"
            disabled={disabled || remaining <= 0}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            Add files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={SESSION_FILE_ACCEPT}
            multiple
            className="sr-only"
            disabled={disabled}
            onChange={(event) => addFiles(event.target.files)}
          />
        </div>
        <div className="mt-4 grid gap-2 rounded-xl border border-[var(--gamibar-border)] bg-white p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gamibar-text-tertiary)]">
            Keep documents for
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {SESSION_FILE_RETENTION_OPTIONS.map((days) => {
              const selected = retentionDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  disabled={disabled || !onRetentionDaysChange}
                  onClick={() => onRetentionDaysChange?.(days)}
                  className={cn(
                    "min-h-9 rounded-lg px-2 text-xs font-bold transition-colors",
                    selected
                      ? "bg-[#111111] text-white"
                      : "bg-[var(--gamibar-page)] text-[#525252] hover:bg-[var(--gamibar-brand-soft)] hover:text-[var(--gamibar-brand)]",
                    (disabled || !onRetentionDaysChange) && "cursor-default opacity-75",
                  )}
                  aria-pressed={selected}
                >
                  {days} days
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#525252]">
            {files.length} staged
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#525252]">
            {remaining} slot{remaining === 1 ? "" : "s"} left
          </span>
        </div>
      </div>

      {error ? <InlineErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
      {!validation.ok && !error ? (
        <InlineErrorBanner message={validation.errors[0] ?? "Some files cannot be used."} />
      ) : null}

      {files.length > 0 ? (
        <div className="grid gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-white px-3 py-3"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--gamibar-brand-soft)] text-[var(--gamibar-brand)]">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {file.name}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {getFileKindLabel(file.type)}, {formatSessionFileSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-xl text-[var(--gamibar-text-tertiary)] hover:text-red-600"
                disabled={disabled}
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
