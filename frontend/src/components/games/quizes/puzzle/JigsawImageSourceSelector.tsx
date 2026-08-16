import { Images, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

export type JigsawImageSource = "upload" | "library";

type JigsawImageSourceSelectorProps = {
  onSelect: (source: JigsawImageSource) => void;
};

const options: {
  source: JigsawImageSource;
  title: string;
  description: string;
  icon: typeof Upload;
}[] = [
  {
    source: "library",
    title: "Auto Upload",
    description: "Choose a real-world educational photo from the GamiBAR Library",
    icon: Images,
  },
  {
    source: "upload",
    title: "Upload Image",
    description: "Choose an image from your computer or phone",
    icon: Upload,
  },
];

export function JigsawImageSourceSelector({ onSelect }: JigsawImageSourceSelectorProps) {
  return (
    <div className="grid gap-4">
      <div className="text-center sm:text-left">
        <p className="font-display text-xl font-bold text-[#111111]">
          How would you like to add your puzzle image?
        </p>
        <p className="mt-1 text-sm text-[#737373]">
          Pick a library photo, or upload an image from your device.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.source}
              type="button"
              onClick={() => onSelect(option.source)}
              className={cn(
                "group flex min-h-[7.5rem] flex-col items-start gap-3 rounded-2xl border border-[var(--gamibar-border)] bg-white p-4 text-left transition-colors",
                "hover:border-[var(--game-jigsaw)] hover:bg-[var(--game-jigsaw-soft)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--game-jigsaw)]/40",
              )}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw)] transition-colors group-hover:bg-white">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-display text-lg font-bold text-[#111111]">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-sm text-[#525252]">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
