import { apiFetch } from "@/lib/api-client";

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
export type JigsawLibraryImagePage = { images: JigsawLibraryImage[]; hasMore: boolean };

export function getJigsawCategories() {
  return apiFetch<JigsawCategory[]>("/api/jigsaw/categories", { auth: false });
}

export function getJigsawSubtopics(categoryId: string) {
  return apiFetch<JigsawSubtopic[]>("/api/jigsaw/subtopics", {
    searchParams: { categoryId },
    auth: false,
  });
}

export function getJigsawLibraryImages(filters: JigsawLibraryImageFilters = {}) {
  return apiFetch<JigsawLibraryImagePage>("/api/jigsaw/images", {
    searchParams: filters,
    auth: false,
  });
}

export function searchJigsawImages(
  search: string,
  filters: Omit<JigsawLibraryImageFilters, "search"> = {},
) {
  return getJigsawLibraryImages({ ...filters, search });
}
