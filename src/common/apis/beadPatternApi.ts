import EnvHelper from "@/common/helper/EnvHelper";
import { http } from "@/plugin/request";
import type { BeadPatternResult } from "@/common/utils/beadPattern";

export interface IBeadPaletteColorReq {
  id: string;
  name: string;
  hex: string;
  code: string;
}

export interface IBeadImageUploadRes {
  image_id: string;
  width: number;
  height: number;
  image_url: string;
  image_full_url?: string;
  file_hash?: string;
  is_duplicate?: boolean;
}

export interface IBeadGenerateReq {
  image_id: string;
  width: number;
  height: number;
  max_colors: number;
  preserve_background_blank: boolean;
  palette: IBeadPaletteColorReq[];
}

export interface IBeadPatternLegendItem {
  id: string;
  name: string;
  hex: string;
  code: string;
  count: number;
}

export type IBeadPatternRes = BeadPatternResult;

export interface IBeadTaskRes<T = Record<string, unknown>> {
  task_id: string;
  status: "pending" | "running" | "success" | "failed";
  message: string;
  progress?: number;
  result?: T | null;
  error?: string | null;
  image_id?: string | null;
  task_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface IBeadTaskListRes {
  page: number;
  page_size: number;
  has_more: boolean;
  items: IBeadTaskRes<IBeadPatternRes>[];
}

const beadPatternApi = {
  async uploadImage(filePath: string) {
    return await http.upload<IBeadImageUploadRes>("/media/upload-image", filePath, "file");
  },
  async generate(data: IBeadGenerateReq) {
    return await http.post<IBeadTaskRes<IBeadPatternRes>>("/bead-pattern/generate", data);
  },
  async getTask(taskId: string) {
    return await http.get<IBeadTaskRes<IBeadPatternRes>>(`/bead-pattern/task/${taskId}`);
  },
  async listTasks(params?: { page?: number; page_size?: number }) {
    return await http.get<IBeadTaskListRes>("/bead-pattern/tasks", params || {});
  },
  async waitTask(
    taskId: string,
    maxAttempts: number = 180,
    intervalMs: number = 1800,
    onProgress?: (task: IBeadTaskRes<IBeadPatternRes>) => void,
  ) {
    for (let index = 0; index < maxAttempts; index += 1) {
      const res = await this.getTask(taskId);
      const task = (res as any).data as IBeadTaskRes<IBeadPatternRes>;
      if (onProgress) {
        onProgress(task);
      }
      if (task.status === "success") {
        return task.result as IBeadPatternRes;
      }
      if (task.status === "failed") {
        throw new Error(task.error || task.message || "生成失败");
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error("生成超时，请稍后重试");
  },
  resolveAssetUrl(relativeUrl: string) {
    const baseUrl = EnvHelper.env.VITE_API_BASE_URL || "";
    if (relativeUrl.startsWith("http")) {
      return relativeUrl;
    }
    const originMatch = baseUrl.match(/^(https?:\/\/[^/]+)/);
    const origin = originMatch ? originMatch[1] : "";
    return `${origin}${relativeUrl}`;
  },
};

export default beadPatternApi;
