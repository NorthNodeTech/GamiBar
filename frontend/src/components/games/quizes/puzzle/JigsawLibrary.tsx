import { useQuery } from "@/lib/query";
import { Check, ChevronLeft, Images, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { JIGSAW_TEMPLATES, type JigsawTemplateId } from "@shared/game/jigsaw-grid";
import {
  JIGSAW_LIBRARY_PAGE_SIZE,
  getJigsawCategories,
  getJigsawLibraryImages,
  getJigsawSubtopics,
  type JigsawLibraryImage,
  type JigsawLibrarySort,
} from "@/lib/supabase/jigsaw-library";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 350;

const DIFFICULTY_LABELS: Record<JigsawTemplateId, string> = {
  "2x2": "Easy",
  "3x3": "Medium",
  "4x4": "Hard",
};

type JigsawLibraryProps = {
  selectedImageId?: string | null;
  selectedTemplateId: JigsawTemplateId;
  onUseImage: (image: JigsawLibraryImage, templateId: JigsawTemplateId) => void;
  onBack: () => void;
  onUploadDevice?: () => void;
};

export function JigsawLibrary({
  selectedImageId,
  selectedTemplateId,
  onUseImage,
  onBack,
  onUploadDevice,
}: JigsawLibraryProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subtopicId, setSubtopicId] = useState<string | null>(null);
  const [sort, setSort] = useState<JigsawLibrarySort>("popular");
  const [offset, setOffset] = useState(0);
  const [loadedImages, setLoadedImages] = useState<JigsawLibraryImage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [preview, setPreview] = useState<JigsawLibraryImage | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<JigsawTemplateId>(selectedTemplateId);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setOffset(0);
    setLoadedImages([]);
  }, [debouncedSearch, categoryId, subtopicId, sort]);

  const categoriesQuery = useQuery({
    queryKey: ["jigsaw-library", "categories"],
    queryFn: getJigsawCategories,
  });

  const subtopicsQuery = useQuery({
    queryKey: ["jigsaw-library", "subtopics", categoryId],
    queryFn: () => getJigsawSubtopics(categoryId!),
    enabled: Boolean(categoryId),
  });

  const imagesQuery = useQuery({
    queryKey: [
      "jigsaw-library",
      "images",
      { debouncedSearch, categoryId, subtopicId, sort, offset },
    ],
    queryFn: () =>
      getJigsawLibraryImages({
        search: debouncedSearch,
        categoryId,
        subtopicId,
        sort,
        offset,
      }),
  });

  useEffect(() => {
    const page = imagesQuery.data;
    if (!page) return;
    setLoadedImages((prev) => (offset === 0 ? page.images : [...prev, ...page.images]));
    setHasMore(page.hasMore);
  }, [imagesQuery.data, offset]);

  const selectedCategory = useMemo(
    () => categoriesQuery.data?.find((category) => category.id === categoryId) ?? null,
    [categoriesQuery.data, categoryId],
  );

  const openPreview = (image: JigsawLibraryImage) => {
    setPreview(image);
    setPreviewTemplateId(selectedTemplateId);
  };

  if (preview) {
    return (
      <JigsawImagePreview
        image={preview}
        templateId={previewTemplateId}
        onTemplateChange={setPreviewTemplateId}
        onChangeImage={() => setPreview(null)}
        onUseImage={() => onUseImage(preview, previewTemplateId)}
      />
    );
  }

  const loadingFirstPage = imagesQuery.isLoading && offset === 0;
  const loadError = imagesQuery.isError && offset === 0;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-[#111111]">Choose a Puzzle Image</p>
          <p className="mt-1 text-sm text-[#737373]">
            Browse the GamiBAR educational library, then pick a grid size.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onUploadDevice ? (
            <Button type="button" variant="outline" className="rounded-xl" onClick={onUploadDevice}>
              <Upload className="mr-1 size-4" />
              Upload from device
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="rounded-xl" onClick={onBack}>
            <ChevronLeft className="mr-1 size-4" />
            Back
          </Button>
        </div>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#737373]" />
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search animals, planets, science..."
          className="h-11 rounded-xl pl-10"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {(["popular", "recent"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSort(value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
              sort === value
                ? "border-[var(--game-jigsaw)] bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)]"
                : "border-[var(--gamibar-border)] bg-white text-[#525252]",
            )}
          >
            {value === "popular" ? "Popular" : "Recently Added"}
          </button>
        ))}
      </div>

      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex min-w-min gap-2 pb-1">
          <FilterChip
            label="All"
            active={!categoryId}
            onClick={() => {
              setCategoryId(null);
              setSubtopicId(null);
            }}
          />
          {(categoriesQuery.data ?? []).map((category) => (
            <FilterChip
              key={category.id}
              label={category.name}
              active={category.id === categoryId}
              onClick={() => {
                setCategoryId(category.id);
                setSubtopicId(null);
              }}
            />
          ))}
        </div>
      </div>

      {categoryId ? (
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex min-w-min gap-2 pb-1">
            <FilterChip
              label={selectedCategory ? `All ${selectedCategory.name}` : "All"}
              active={!subtopicId}
              onClick={() => setSubtopicId(null)}
            />
            {(subtopicsQuery.data ?? []).map((subtopic) => (
              <FilterChip
                key={subtopic.id}
                label={subtopic.name}
                active={subtopic.id === subtopicId}
                onClick={() => setSubtopicId(subtopic.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-2xl border border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-8 text-center">
          <p className="font-semibold text-[#111111]">We couldn&apos;t load the image library.</p>
          <Button
            type="button"
            className="mt-4 rounded-xl bg-[#111111] hover:bg-black"
            onClick={() => void imagesQuery.refetch()}
          >
            Try Again
          </Button>
        </div>
      ) : loadingFirstPage ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : loadedImages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--gamibar-border)] bg-[var(--gamibar-page)] px-4 py-10 text-center">
          <Images className="mx-auto size-8 text-[var(--game-jigsaw)]" />
          <p className="mt-3 font-semibold text-[#111111]">No puzzle images found.</p>
          <p className="mt-1 text-sm text-[#737373]">Try another category or search term.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {loadedImages.map((image) => {
              const selected = image.id === selectedImageId;
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => openPreview(image)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-white text-left transition-transform",
                    selected
                      ? "border-[var(--game-jigsaw)] ring-2 ring-[var(--game-jigsaw)]/30"
                      : "border-[var(--gamibar-border)] hover:-translate-y-0.5 hover:border-[var(--game-jigsaw)]",
                  )}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.title}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  {selected ? (
                    <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[var(--game-jigsaw)] text-white">
                      <Check className="size-3.5" />
                    </span>
                  ) : null}
                  <span className="block px-2.5 py-2 text-xs font-semibold text-[#111111]">
                    {image.title}
                  </span>
                </button>
              );
            })}
          </div>
          {hasMore ? (
            <Button
              type="button"
              variant="outline"
              className="justify-self-center rounded-xl"
              disabled={imagesQuery.isFetching}
              onClick={() => setOffset((value) => value + JIGSAW_LIBRARY_PAGE_SIZE)}
            >
              Load More
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-[var(--game-jigsaw)] bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)]"
          : "border-[var(--gamibar-border)] bg-white text-[#525252]",
      )}
    >
      {label}
    </button>
  );
}

function JigsawImagePreview({
  image,
  templateId,
  onTemplateChange,
  onChangeImage,
  onUseImage,
}: {
  image: JigsawLibraryImage;
  templateId: JigsawTemplateId;
  onTemplateChange: (id: JigsawTemplateId) => void;
  onChangeImage: () => void;
  onUseImage: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl border border-[var(--gamibar-border)] bg-[#111111]">
        <img src={image.imageUrl} alt={image.title} className="aspect-square w-full object-cover" />
      </div>
      <div className="text-center">
        <p className="font-display text-2xl font-bold text-[#111111]">{image.title}</p>
        <p className="mt-1 text-sm text-[#737373]">
          {image.categoryName} → {image.subtopicName}
        </p>
      </div>
      <div>
        <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--game-jigsaw-deep)]">
          Choose Difficulty
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {JIGSAW_TEMPLATES.map((template) => {
            const active = template.id === templateId;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onTemplateChange(template.id)}
                className={cn(
                  "rounded-xl border px-2 py-3 text-center transition-colors",
                  active
                    ? "border-[var(--game-jigsaw)] bg-[var(--game-jigsaw-soft)] text-[var(--game-jigsaw-deep)] ring-2 ring-[var(--game-jigsaw)]/25"
                    : "border-[var(--gamibar-border)] bg-white text-[#525252]",
                )}
              >
                <span className="block text-xs font-semibold">
                  {DIFFICULTY_LABELS[template.id]}
                </span>
                <span className="mt-0.5 block font-display text-lg font-bold">
                  {template.label}
                </span>
                <span className="block text-[11px]">{template.tileCount} pieces</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={onChangeImage}>
          Change Image
        </Button>
        <Button
          type="button"
          className="h-11 rounded-xl bg-[#111111] hover:bg-black"
          onClick={onUseImage}
        >
          Use This Image
        </Button>
      </div>
    </div>
  );
}
