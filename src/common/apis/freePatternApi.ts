import { http } from "@/plugin/request";

export interface IFreePatternItem {
  id: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  tags: string[];
  cover_file_hash: string;
  cover_url?: string | null;
  cover_full_url?: string | null;
  cover_width?: number | null;
  cover_height?: number | null;
  labeled_file_hash: string;
  labeled_url?: string | null;
  labeled_full_url?: string | null;
  plain_file_hash: string;
  plain_url?: string | null;
  plain_full_url?: string | null;
  sort_order: number;
  is_published: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

const freePatternApi = {
  list() {
    return http.get<IFreePatternItem[]>("/free-patterns");
  },
  getDetail(patternId: number) {
    return http.get<IFreePatternItem>(`/free-patterns/${patternId}`);
  },
};

export default freePatternApi;
