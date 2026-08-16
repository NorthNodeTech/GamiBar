import { supabase, supabaseGame } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-client";

export const JIGSAW_LIBRARY_BUCKET = "jigsaw-library";
export const JIGSAW_LIBRARY_PAGE_SIZE = 24;

export type JigsawLibrarySort = "popular" | "recent";

export type JigsawCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sortOrder: number;
};

export type JigsawSubtopic = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
};

export type JigsawLibraryImage = {
  id: string;
  categoryId: string;
  subtopicId: string;
  title: string;
  slug: string;
  description: string | null;
  storagePath: string;
  thumbnailPath: string | null;
  keywords: string[];
  illustrationType: string | null;
  usageCount: number;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  createdAt: string | null;
  imageUrl: string;
  categoryName: string | null;
  categorySlug: string | null;
  subtopicName: string | null;
  subtopicSlug: string | null;
};

export type JigsawLibraryImageFilters = {
  categoryId?: string | null;
  subtopicId?: string | null;
  search?: string | null;
  sort?: JigsawLibrarySort;
  offset?: number;
  limit?: number;
};

export type JigsawLibraryImagePage = {
  images: JigsawLibraryImage[];
  hasMore: boolean;
};

function resolveLibraryImageUrl(storagePath: string, updatedAt?: string | null): string {
  const { data } = supabase.storage.from(JIGSAW_LIBRARY_BUCKET).getPublicUrl(storagePath);
  if (!updatedAt) return data.publicUrl;
  const stamp = Date.parse(updatedAt);
  return Number.isFinite(stamp) ? `${data.publicUrl}?v=${stamp}` : data.publicUrl;
}

function mapCategory(row: {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sort_order: number | null;
}): JigsawCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    description: row.description,
    sortOrder: row.sort_order ?? 0,
  };
}

function mapSubtopic(row: {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number | null;
}): JigsawSubtopic {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order ?? 0,
  };
}

type LibraryImageRow = {
  id: string;
  category_id: string;
  subtopic_id: string;
  title: string;
  slug: string;
  description: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  keywords: string[] | null;
  illustration_type: string | null;
  usage_count: number | null;
  width: number | null;
  height: number | null;
  file_size_bytes: number | null;
  created_at: string | null;
  updated_at: string | null;
  jigsaw_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
  jigsaw_subtopics: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapLibraryImage(row: LibraryImageRow): JigsawLibraryImage {
  const category = firstRelated(row.jigsaw_categories);
  const subtopic = firstRelated(row.jigsaw_subtopics);
  return {
    id: row.id,
    categoryId: row.category_id,
    subtopicId: row.subtopic_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    keywords: row.keywords ?? [],
    illustrationType: row.illustration_type,
    usageCount: row.usage_count ?? 0,
    width: row.width,
    height: row.height,
    fileSizeBytes: row.file_size_bytes,
    createdAt: row.created_at,
    imageUrl: resolveLibraryImageUrl(row.storage_path, row.updated_at ?? row.created_at),
    categoryName: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    subtopicName: subtopic?.name ?? null,
    subtopicSlug: subtopic?.slug ?? null,
  };
}

export async function getJigsawCategories(): Promise<JigsawCategory[]> {
  if (typeof window !== "undefined") {
    return apiFetch<JigsawCategory[]>("/api/jigsaw/categories", { auth: false });
  }

  const { data, error } = await supabase
    .from("jigsaw_categories")
    .select("id, name, slug, icon, description, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message || "Could not load puzzle categories.");
  return (data ?? []).map(mapCategory);
}

export async function getJigsawSubtopics(categoryId: string): Promise<JigsawSubtopic[]> {
  if (typeof window !== "undefined") {
    return apiFetch<JigsawSubtopic[]>("/api/jigsaw/subtopics", {
      searchParams: { categoryId },
      auth: false,
    });
  }

  const { data, error } = await supabase
    .from("jigsaw_subtopics")
    .select("id, category_id, name, slug, description, sort_order")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message || "Could not load puzzle subtopics.");
  return (data ?? []).map(mapSubtopic);
}

const LIBRARY_IMAGE_SELECT =
  "id, category_id, subtopic_id, title, slug, description, storage_path, thumbnail_path, keywords, illustration_type, usage_count, width, height, file_size_bytes, created_at, updated_at, jigsaw_categories(name, slug), jigsaw_subtopics(name, slug)";

export async function getJigsawLibraryImages(
  filters: JigsawLibraryImageFilters = {},
): Promise<JigsawLibraryImagePage> {
  if (typeof window !== "undefined") {
    return apiFetch<JigsawLibraryImagePage>("/api/jigsaw/images", {
      searchParams: {
        categoryId: filters.categoryId,
        subtopicId: filters.subtopicId,
        search: filters.search,
        sort: filters.sort,
        offset: filters.offset,
        limit: filters.limit,
      },
      auth: false,
    });
  }

  const limit = filters.limit ?? JIGSAW_LIBRARY_PAGE_SIZE;
  const offset = filters.offset ?? 0;
  const sort = filters.sort ?? "popular";
  const search = filters.search?.trim() ?? "";

  let query = supabase
    .from("jigsaw_library_images")
    .select(LIBRARY_IMAGE_SELECT)
    .eq("status", "active");

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters.subtopicId) {
    query = query.eq("subtopic_id", filters.subtopicId);
  }
  if (search) {
    const escaped = search.replace(/[%*,()]/g, " ").trim();
    if (escaped) {
      const pattern = `%${escaped}%`;
      const [{ data: categoryHits }, { data: subtopicHits }] = await Promise.all([
        supabase.from("jigsaw_categories").select("id").ilike("name", pattern),
        supabase.from("jigsaw_subtopics").select("id").ilike("name", pattern),
      ]);
      const clauses = [
        `title.ilike.${pattern}`,
        `description.ilike.${pattern}`,
        `keywords.cs.{${escaped}}`,
      ];
      for (const row of categoryHits ?? []) clauses.push(`category_id.eq.${row.id}`);
      for (const row of subtopicHits ?? []) clauses.push(`subtopic_id.eq.${row.id}`);
      query = query.or(clauses.join(","));
    }
  }

  query =
    sort === "recent"
      ? query.order("created_at", { ascending: false })
      : query.order("usage_count", { ascending: false }).order("created_at", { ascending: false });

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw new Error(error.message || "Could not load the image library.");

  const images = ((data ?? []) as LibraryImageRow[]).map(mapLibraryImage);
  return { images, hasMore: images.length === limit };
}

export async function searchJigsawImages(
  search: string,
  filters: Omit<JigsawLibraryImageFilters, "search"> = {},
): Promise<JigsawLibraryImagePage> {
  return getJigsawLibraryImages({ ...filters, search });
}

export async function incrementJigsawLibraryUsage(imageId: string): Promise<void> {
  if (typeof window !== "undefined") {
    await apiFetch<{ ok: true }>("/api/jigsaw/usage", {
      method: "POST",
      json: { imageId },
      auth: false,
    });
    return;
  }

  const { error } = await supabaseGame.rpc("increment_jigsaw_library_usage", {
    p_image_id: imageId,
  });
  if (error) {
    console.warn("[GamiBAR] Could not increment jigsaw library usage:", error.message);
  }
}
