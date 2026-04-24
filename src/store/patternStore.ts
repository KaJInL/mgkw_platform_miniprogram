import { computed, ref } from "vue";
import { defineStore } from "pinia";
import beadPatternApi from "@/common/apis/beadPatternApi";
import beadExportApi from "@/common/apis/beadExportApi";
import beadPatternSession from "@/common/helper/beadPatternSession";
import { LocalStorageKey } from "@/common/helper/localStorageHelper";
import localStorageHelper from "@/common/helper/localStorageHelper";
import type { BeadPatternResult } from "@/common/utils/beadPattern";

export interface PendingBeadPatternDraft {
  taskId: string;
  sourceImagePath: string;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  maxColors: number;
  preserveBackgroundBlank: boolean;
}

const LABEL_PREVIEW_MAX_SIDE = 240;

const getPatternApp = () => getApp() as { globalData?: { latestBeadPattern?: BeadPatternResult | null } };

export const usePatternStore = defineStore("pattern", () => {
  const pattern = ref<BeadPatternResult | null>(null);
  const pendingTaskId = ref("");
  const pendingDraft = ref<PendingBeadPatternDraft | null>(null);
  const patternSource = ref<"local" | "server" | "">("");
  const generationLoading = ref(false);
  const generationProgress = ref(0);
  const generationMessage = ref("正在生成图纸");
  const localDraftLoading = ref(false);

  const previewRequested = ref(false);
  const previewLoading = ref(false);
  const previewProgress = ref(0);
  const previewShowLabels = ref(true);

  const downloading = ref(false);
  const downloadModalVisible = ref(false);
  const exportWithLabels = ref(true);

  const resolvePattern = () => {
    if (pendingTaskId.value) {
      if (!pattern.value) {
        pattern.value = null;
      }
      return;
    }

    const app = getPatternApp();
    pattern.value =
      pattern.value ||
      beadPatternSession.get() ||
      app.globalData?.latestBeadPattern ||
      localStorageHelper.get(LocalStorageKey.LATEST_BEAD_PATTERN, null);
  };

  const loadPendingDraft = () => {
    const cachedDraft = localStorageHelper.get(LocalStorageKey.PENDING_BEAD_PATTERN_DRAFT, null) as PendingBeadPatternDraft | null;
    if (!cachedDraft || !pendingTaskId.value || cachedDraft.taskId !== pendingTaskId.value) {
      pendingDraft.value = null;
      return;
    }
    pendingDraft.value = cachedDraft;
  };

  const initialize = (taskId: string) => {
    pendingTaskId.value = taskId;
    if (taskId) {
      pattern.value = null;
      loadPendingDraft();
    } else {
      pendingDraft.value = null;
    }
    resolvePattern();
  };

  const applyLocalPatternResult = (nextPattern: BeadPatternResult) => {
    patternSource.value = "local";
    pattern.value = nextPattern;
  };

  const applyPatternResult = (nextPattern: BeadPatternResult) => {
    const app = getPatternApp();
    nextPattern.sourceImagePath = beadPatternApi.resolveAssetUrl(nextPattern.sourceImagePath);
    nextPattern.previewUrl = beadPatternApi.resolveAssetUrl((nextPattern as any).previewUrl || (nextPattern as any).preview_url || "");
    patternSource.value = "server";
    pattern.value = nextPattern;
    beadPatternSession.set(nextPattern);
    if (!app.globalData) {
      app.globalData = {};
    }
    app.globalData.latestBeadPattern = nextPattern;
    localStorageHelper.set(LocalStorageKey.LATEST_BEAD_PATTERN, nextPattern);
    localStorageHelper.remove(LocalStorageKey.PENDING_BEAD_PATTERN_DRAFT);
    pendingTaskId.value = "";
    pendingDraft.value = null;
  };

  const waitForPatternTask = async () => {
    if (!pendingTaskId.value || generationLoading.value) {
      return;
    }

    generationLoading.value = true;
    generationProgress.value = 0;
    generationMessage.value = "正在生成图纸";

    try {
      const nextPattern = await beadPatternApi.waitTask(pendingTaskId.value, 180, 1800, (task) => {
        generationProgress.value = task.progress ?? 0;
        generationMessage.value = task.message || "正在生成图纸";
      });
      applyPatternResult(nextPattern);
      generationProgress.value = 100;
      generationMessage.value = "图纸生成完成";
    } catch (error) {
      console.error("等待图纸任务失败：", error);
      uni.showToast({
        title: "图纸生成失败",
        icon: "none",
      });
    } finally {
      generationLoading.value = false;
    }
  };

  const boardText = computed(() => {
    if (!pattern.value) {
      return generationLoading.value ? "生成中" : "";
    }
    return `${pattern.value.boardColumns} × ${pattern.value.boardRows} 块拼板`;
  });

  const canShowLabelsInPreview = computed(() => {
    if (!pattern.value) {
      return false;
    }
    return previewShowLabels.value && Math.max(pattern.value.width, pattern.value.height) <= LABEL_PREVIEW_MAX_SIDE;
  });

  const pageHint = computed(() => {
    if (localDraftLoading.value) {
      return "正在用前端算法生成临时预览，完成后会先显示原图、图纸预览和颜色清单。";
    }
    if (generationLoading.value) {
      if (pattern.value && patternSource.value === "local") {
        return `${generationProgress.value}% ${generationMessage.value}，当前先展示前端预览版。`;
      }
      return `${generationProgress.value}% ${generationMessage.value}`;
    }
    if (!pattern.value) {
      return "正在等待图纸结果";
    }
    if (previewLoading.value) {
      return `${previewProgress.value}% 正在渐进式渲染预览`;
    }
    if (patternSource.value === "local") {
      return "当前内容由前端先行渲染，后端正式图纸完成后会自动刷新。";
    }
    return canShowLabelsInPreview.value
      ? "当前预览包含色号，可直接对照图案完成拼豆。"
      : "当前显示的是本地渐进式渲染预览。";
  });

  const summaryDesc = computed(() => {
    if (!pattern.value) {
      return "图纸任务已创建，正在后台生成。";
    }
    if (generationLoading.value && patternSource.value === "local") {
      return `已先按 ${pattern.value.width} × ${pattern.value.height} 格生成前端预览版，正式结果返回后会自动替换。`;
    }
    return `${pattern.value.width} × ${pattern.value.height} 格，共 ${pattern.value.totalBeads} 颗拼豆。`;
  });

  const previewSectionMeta = computed(() => {
    if (previewLoading.value) {
      return "正在渐进式渲染";
    }
    if (patternSource.value === "local" && generationLoading.value) {
      return "前端已先行渲染";
    }
    return "本地渐进式渲染";
  });

  const openDownloadModal = () => {
    if (!pattern.value || downloading.value || generationLoading.value) {
      return;
    }
    downloadModalVisible.value = true;
  };

  const closeDownloadModal = () => {
    if (downloading.value) {
      return;
    }
    downloadModalVisible.value = false;
  };

  const setExportWithLabels = (value: boolean) => {
    exportWithLabels.value = value;
  };

  const setPreviewShowLabels = (value: boolean) => {
    previewShowLabels.value = value;
  };

  const setPreviewRequested = (value: boolean) => {
    previewRequested.value = value;
  };

  const setPreviewLoading = (value: boolean) => {
    previewLoading.value = value;
  };

  const setPreviewProgress = (value: number) => {
    previewProgress.value = value;
  };

  const setLocalDraftLoading = (value: boolean) => {
    localDraftLoading.value = value;
  };

  const buildLegendIndexRows = (currentPattern: BeadPatternResult) => {
    const legendIndexMap = Object.fromEntries(currentPattern.legend.map((item, index) => [item.id, index]));
    return currentPattern.rows.map((row) => row.map((cell) => (cell ? legendIndexMap[cell] ?? null : null)));
  };

  const downloadExportFile = (url: string) =>
    new Promise<string>((resolve, reject) => {
      uni.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
            resolve(res.tempFilePath);
            return;
          }
          reject(new Error("download failed"));
        },
        fail: reject,
      });
    });

  const saveImageToAlbum = async (filePath: string) => {
    try {
      await uni.saveImageToPhotosAlbum({ filePath });
    } catch (error) {
      const errMsg = (error as { errMsg?: string })?.errMsg || "";
      if (errMsg.includes("auth deny") || errMsg.includes("authorize")) {
        uni.showModal({
          title: "需要相册权限",
          content: "请允许保存到相册后，再次点击下载图纸。",
          showCancel: false,
        });
      }
      throw error;
    }
  };

  const downloadPattern = async () => {
    if (!pattern.value || downloading.value || generationLoading.value) {
      return;
    }

    downloading.value = true;
    uni.showLoading({
      title: "导出图纸中",
      mask: true,
    });

    try {
      const exportRes = await beadExportApi.createExport({
        width: pattern.value.width,
        height: pattern.value.height,
        rows: buildLegendIndexRows(pattern.value),
        legend: pattern.value.legend.map((item) => ({
          id: item.id,
          code: item.code,
          hex: item.hex,
          count: item.count,
        })),
        totalBeads: pattern.value.totalBeads,
        boardColumns: pattern.value.boardColumns,
        boardRows: pattern.value.boardRows,
        withLabels: exportWithLabels.value,
      });
      const task = (exportRes as any).data;
      const exportResult = await beadExportApi.waitTask(task.task_id, 180, 1800, (progressTask) => {
        const progress = progressTask.progress ?? 0;
        const message = progressTask.message || "导出图纸中";
        uni.showLoading({
          title: `${Math.min(progress, 99)}% ${message}`.slice(0, 20),
          mask: true,
        });
      });
      const downloadUrl = beadExportApi.resolveDownloadUrl(exportResult.download_url || "");
      const tempFilePath = await downloadExportFile(downloadUrl);
      await saveImageToAlbum(tempFilePath);
      downloadModalVisible.value = false;
      uni.showToast({
        title: "已保存到相册",
        icon: "success",
      });
    } catch (error) {
      console.error("下载图纸失败：", error);
      uni.showToast({
        title: "导出失败，请稍后重试",
        icon: "none",
      });
    } finally {
      uni.hideLoading();
      downloading.value = false;
    }
  };

  const resetTransientState = () => {
    generationLoading.value = false;
    generationProgress.value = 0;
    generationMessage.value = "正在生成图纸";
    localDraftLoading.value = false;
    previewRequested.value = false;
    previewLoading.value = false;
    previewProgress.value = 0;
    downloading.value = false;
    downloadModalVisible.value = false;
    exportWithLabels.value = true;
    previewShowLabels.value = true;
  };

  return {
    pattern,
    pendingTaskId,
    pendingDraft,
    patternSource,
    generationLoading,
    generationProgress,
    generationMessage,
    localDraftLoading,
    previewRequested,
    previewLoading,
    previewProgress,
    previewShowLabels,
    downloading,
    downloadModalVisible,
    exportWithLabels,
    boardText,
    canShowLabelsInPreview,
    pageHint,
    summaryDesc,
    previewSectionMeta,
    initialize,
    resolvePattern,
    applyLocalPatternResult,
    applyPatternResult,
    waitForPatternTask,
    openDownloadModal,
    closeDownloadModal,
    setExportWithLabels,
    setPreviewShowLabels,
    setPreviewRequested,
    setPreviewLoading,
    setPreviewProgress,
    setLocalDraftLoading,
    downloadPattern,
    resetTransientState,
  };
});
