import { computed, ref } from "vue";
import { defineStore } from "pinia";
import beadPatternApi from "@/common/apis/beadPatternApi";
import beadPatternSession from "@/common/helper/beadPatternSession";
import { LocalStorageKey } from "@/common/helper/localStorageHelper";
import localStorageHelper from "@/common/helper/localStorageHelper";
import type { BeadPatternResult } from "@/common/utils/beadPattern";

const getPatternApp = () => getApp() as { globalData?: { latestBeadPattern?: BeadPatternResult | null } };

export const usePatternStore = defineStore("pattern", () => {
  const pattern = ref<BeadPatternResult | null>(null);
  const pendingTaskId = ref("");
  const generationLoading = ref(false);
  const generationProgress = ref(0);
  const generationMessage = ref("正在生成图纸");
  const downloading = ref(false);
  const downloadModalVisible = ref(false);
  const selectedDownloadVariant = ref<"labeled" | "plain">("labeled");

  const resolvePattern = () => {
    if (pendingTaskId.value) {
      return;
    }
    const app = getPatternApp();
    pattern.value =
      pattern.value ||
      beadPatternSession.get() ||
      app.globalData?.latestBeadPattern ||
      localStorageHelper.get(LocalStorageKey.LATEST_BEAD_PATTERN, null);
  };

  const initialize = (taskId: string) => {
    pendingTaskId.value = taskId;
    if (taskId) {
      pattern.value = null;
      return;
    }
    resolvePattern();
  };

  const applyPatternResult = (nextPattern: BeadPatternResult) => {
    const app = getPatternApp();
    nextPattern.sourceImagePath = beadPatternApi.resolveAssetUrl(nextPattern.sourceImagePath);
    nextPattern.previewUrl = beadPatternApi.resolveAssetUrl((nextPattern as any).previewUrl || (nextPattern as any).preview_url || "");
    nextPattern.labeledDownloadUrl = beadPatternApi.resolveAssetUrl(
      (nextPattern as any).labeledDownloadUrl || (nextPattern as any).labeled_download_url || nextPattern.previewUrl || "",
    );
    nextPattern.plainDownloadUrl = beadPatternApi.resolveAssetUrl(
      (nextPattern as any).plainDownloadUrl || (nextPattern as any).plain_download_url || "",
    );
    pattern.value = nextPattern;
    beadPatternSession.set(nextPattern);
    if (!app.globalData) {
      app.globalData = {};
    }
    app.globalData.latestBeadPattern = nextPattern;
    localStorageHelper.set(LocalStorageKey.LATEST_BEAD_PATTERN, nextPattern);
    pendingTaskId.value = "";
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

  const summaryDesc = computed(() => {
    if (!pattern.value) {
      return "图纸任务已创建，正在后台生成 PNG。";
    }
    return `${pattern.value.width} × ${pattern.value.height} 格，共 ${pattern.value.totalBeads} 颗拼豆，已生成可直接下载的图纸 PNG。`;
  });

  const pageHint = computed(() => {
    if (generationLoading.value) {
      return `${generationProgress.value}% ${generationMessage.value}`;
    }
    if (!pattern.value) {
      return "正在等待图纸结果";
    }
    return "当前展示的是已生成的图纸 PNG，可直接保存到相册。";
  });

  const openDownloadModal = () => {
    if (!pattern.value || downloading.value || generationLoading.value) {
      return;
    }
    selectedDownloadVariant.value = "labeled";
    downloadModalVisible.value = true;
  };

  const closeDownloadModal = () => {
    if (downloading.value) {
      return;
    }
    downloadModalVisible.value = false;
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

  const setSelectedDownloadVariant = (value: "labeled" | "plain") => {
    selectedDownloadVariant.value = value;
  };

  const downloadPattern = async (variant?: "labeled" | "plain") => {
    if (!pattern.value || downloading.value || generationLoading.value) {
      return;
    }

    const resolvedVariant = variant || selectedDownloadVariant.value;
    const downloadUrl = resolvedVariant === "plain"
      ? (pattern.value.plainDownloadUrl || pattern.value.labeledDownloadUrl || pattern.value.previewUrl || "")
      : (pattern.value.labeledDownloadUrl || pattern.value.previewUrl || pattern.value.plainDownloadUrl || "");
    if (!downloadUrl) {
      uni.showToast({
        title: "图纸地址不存在",
        icon: "none",
      });
      return;
    }

    downloading.value = true;
    uni.showLoading({
      title: "下载图纸中",
      mask: true,
    });

    try {
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
        title: "下载失败，请稍后重试",
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
    downloading.value = false;
    downloadModalVisible.value = false;
    selectedDownloadVariant.value = "labeled";
  };

  return {
    pattern,
    pendingTaskId,
    generationLoading,
    generationProgress,
    generationMessage,
    downloading,
    downloadModalVisible,
    selectedDownloadVariant,
    boardText,
    summaryDesc,
    pageHint,
    initialize,
    resolvePattern,
    applyPatternResult,
    waitForPatternTask,
    openDownloadModal,
    closeDownloadModal,
    setSelectedDownloadVariant,
    downloadPattern,
    resetTransientState,
  };
});
