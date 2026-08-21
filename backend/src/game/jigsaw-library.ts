import { createAdminClient } from "../supabase-admin.js";

const BUCKET = "jigsaw-library";
const PAGE_SIZE = 24;

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sort_order: number | null;
};

type SubtopicRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number | null;
};

type ImageRow = {
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
  jigsaw_categories: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
  jigsaw_subtopics: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
};

function firstRelated<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function publicUrl(storagePath: string, updatedAt?: string | null) {
  const supabase = createAdminClient();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  if (!updatedAt) return data.publicUrl;
  const stamp = Date.parse(updatedAt);
  return Number.isFinite(stamp) ? `${data.publicUrl}?v=${stamp}` : data.publicUrl;
}

export async function getJigsawCategories() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jigsaw_categories")
    .select("id, name, slug, icon, description, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: CategoryRow) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    description: row.description,
    sortOrder: row.sort_order ?? 0,
  }));
}

export async function getJigsawSubtopics(categoryId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("jigsaw_subtopics")
    .select("id, category_id, name, slug, description, sort_order")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: SubtopicRow) => ({
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sortOrder: row.sort_order ?? 0,
  }));
}

const IMAGE_SELECT =
  "id, category_id, subtopic_id, title, slug, description, storage_path, thumbnail_path, keywords, illustration_type, usage_count, width, height, file_size_bytes, created_at, updated_at, jigsaw_categories(name, slug), jigsaw_subtopics(name, slug)";

export async function getJigsawLibraryImages(filters: {
  categoryId?: string | null;
  subtopicId?: string | null;
  search?: string | null;
  sort?: "popular" | "recent";
  offset?: number;
  limit?: number;
} = {}) {
  const supabase = createAdminClient();
  const limit = Math.min(Math.max(filters.limit ?? PAGE_SIZE, 1), 50);
  const offset = Math.max(filters.offset ?? 0, 0);
  const search = filters.search?.trim() ?? "";

  let query = supabase.from("jigsaw_library_images").select(IMAGE_SELECT).eq("status", "active");
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.subtopicId) query = query.eq("subtopic_id", filters.subtopicId);

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
        ...(categoryHits ?? []).map((row: { id: string }) => `category_id.eq.${row.id}`),
        ...(subtopicHits ?? []).map((row: { id: string }) => `subtopic_id.eq.${row.id}`),
      ];
      query = query.or(clauses.join(","));
    }
  }

  query =
    filters.sort === "recent"
      ? query.order("created_at", { ascending: false })
      : query.order("usage_count", { ascending: false }).order("created_at", { ascending: false });
  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;

  const images = (data ?? []).map((row: ImageRow) => {
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
      imageUrl: publicUrl(row.storage_path, row.updated_at ?? row.created_at),
      categoryName: category?.name ?? null,
      categorySlug: category?.slug ?? null,
      subtopicName: subtopic?.name ?? null,
      subtopicSlug: subtopic?.slug ?? null,
    };
  });
  return { images, hasMore: images.length === limit };
}

export async function incrementJigsawLibraryUsage(imageId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("increment_jigsaw_library_usage", { p_image_id: imageId });
  if (error) console.warn(`Could not increment jigsaw library usage: ${error.message}`);
}
