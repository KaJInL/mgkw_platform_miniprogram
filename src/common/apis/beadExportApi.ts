import EnvHelper from "@/common/helper/EnvHelper";
import { http } from "@/plugin/request";

export interface IBeadLegendItemReq {
  id: string;
  code: string;
  hex: string;
  count: number;
}

export interface IBeadExportReq {
  width: number;
  height: number;
  rows: Array<Array<number | null>>;
  legend: IBeadLegendItemReq[];
  totalBeads: number;
  boardColumns: number;
  boardRows: number;
  withLabels: boolean;
}

export interface IBeadExportRes {
  export_id: string;
  download_url: string;
}

export interface IBeadExportTaskRes {
  task_id: string;
  status: "pending" | "success" | "failed";
  message: string;
  progress?: number;
  result?: IBeadExportRes | null;
  error?: string | null;
}

const beadExportApi = {
  async createExport(data: IBeadExportReq) {
    return await http.post<IBeadExportTaskRes>("/bead-pattern/export", data);
  },
  async getTask(taskId: string) {
    return await http.get<IBeadExportTaskRes>(`/bead-pattern/task/${taskId}`);
  },
  async waitTask(
    taskId: string,
    maxAttempts: number = 180,
    intervalMs: number = 1800,
    onProgress?: (task: IBeadExportTaskRes) => void,
  ) {
    for (let index = 0; index < maxAttempts; index += 1) {
      const res = await this.getTask(taskId);
      const task = (res as any).data as IBeadExportTaskRes;
      if (onProgress) {
        onProgress(task);
      }
      if (task.status === "success") {
        return task.result as IBeadExportRes;
      }
      if (task.status === "failed") {
        throw new Error(task.error || task.message || "导出失败");
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error("导出超时，请稍后重试");
  },
  resolveDownloadUrl(relativeUrl: string) {
    const baseUrl = EnvHelper.env.VITE_API_BASE_URL || "";
    if (relativeUrl.startsWith("http")) {
      return relativeUrl;
    }
    const originMatch = baseUrl.match(/^(https?:\/\/[^/]+)/);
    const origin = originMatch ? originMatch[1] : "";
    if (relativeUrl.startsWith("/")) {
      return `${origin}${relativeUrl}`;
    }
    return `${baseUrl.replace(/\/$/, "")}/${relativeUrl.replace(/^\//, "")}`;
  },
};

export default beadExportApi;
