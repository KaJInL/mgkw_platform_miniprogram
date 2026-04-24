<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref, watch } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import beadPatternApi from "@/common/apis/beadPatternApi";
import beadExportApi from "@/common/apis/beadExportApi";
import beadPatternSession from "@/common/helper/beadPatternSession";
import { LocalStorageKey } from "@/common/helper/localStorageHelper";
import localStorageHelper from "@/common/helper/localStorageHelper";
import { buildBeadPatternFromImageData, type BeadPatternResult } from "@/common/utils/beadPattern";

const instance = getCurrentInstance();
const app = getApp() as { globalData?: { latestBeadPattern?: BeadPatternResult | null } };

interface PendingBeadPatternDraft {
  taskId: string;
  sourceImagePath: string;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  maxColors: number;
  preserveBackgroundBlank: boolean;
}

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
const previewRenderQueued = ref(false);
const downloading = ref(false);
const downloadModalVisible = ref(false);
const exportWithLabels = ref(true);
const previewShowLabels = ref(true);

const previewZoom = ref(1);
const pinchStartDistance = ref(0);
const pinchStartZoom = ref(1);
const previewStageWidth = ref(800);
const previewStageHeight = ref(800);
const previewCanvasWidth = ref(800);
const previewCanvasHeight = ref(800);
const previewScrollLeft = ref(0);
const previewScrollTop = ref(0);
const samplerCanvasWidth = ref(1);
const samplerCanvasHeight = ref(1);

const LABEL_PREVIEW_MAX_SIDE = 240;
const PREVIEW_STAGE_PADDING = 18;
const PREVIEW_MIN_ZOOM = 0.05;
const PREVIEW_WORKBENCH_BASE_SIZE = 1400;
const PREVIEW_WORKBENCH_MARGIN = 240;
const previewViewportWidth = ref(320);
const previewViewportHeight = ref(320);

const resolvePattern = () => {
  if (pendingTaskId.value) {
    if (!pattern.value) {
      pattern.value = null;
    }
    return;
  }
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

const preparePreviewStage = () => {
  if (!pattern.value) {
    return;
  }
  const maxSide = Math.max(pattern.value.width, pattern.value.height);
  const baseCellSize = maxSide <= 72 ? 24 : maxSide <= 96 ? 20 : maxSide <= 128 ? 16 : maxSide <= 180 ? 12 : 10;
  previewStageWidth.value = Math.max(240, pattern.value.width * baseCellSize);
  previewStageHeight.value = Math.max(240, pattern.value.height * baseCellSize);
  previewCanvasWidth.value = previewStageWidth.value;
  previewCanvasHeight.value = previewStageHeight.value;
  previewZoom.value = 1;
};

const queuePreviewRender = () => {
  if (!pattern.value) {
    return;
  }
  if (previewLoading.value) {
    previewRenderQueued.value = true;
    return;
  }
  previewRenderQueued.value = false;
  void renderPreviewCanvas();
};

const applyLocalPatternResult = (nextPattern: BeadPatternResult) => {
  patternSource.value = "local";
  pattern.value = nextPattern;
  preparePreviewStage();
  queuePreviewRender();
};

const applyPatternResult = (nextPattern: BeadPatternResult) => {
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
  preparePreviewStage();
  queuePreviewRender();
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

const previewZoomLabel = computed(() => `${Math.round(previewZoom.value * 100)}%`);
const previewWorkbenchWidth = computed(() => Math.max(
  PREVIEW_WORKBENCH_BASE_SIZE,
  previewDisplayedStageWidth.value + PREVIEW_WORKBENCH_MARGIN,
));
const previewWorkbenchHeight = computed(() => Math.max(
  PREVIEW_WORKBENCH_BASE_SIZE,
  previewDisplayedStageHeight.value + PREVIEW_WORKBENCH_MARGIN,
));
const previewWorkbenchStyle = computed(() => ({
  width: `${previewWorkbenchWidth.value}px`,
  height: `${previewWorkbenchHeight.value}px`,
}));
const previewBaseStageWidth = computed(() => previewStageWidth.value + (PREVIEW_STAGE_PADDING * 2));
const previewBaseStageHeight = computed(() => previewStageHeight.value + (PREVIEW_STAGE_PADDING * 2));
const previewStageStyle = computed(() => ({
  width: `${Math.round(previewBaseStageWidth.value * Math.max(previewZoom.value, 1))}px`,
  height: `${Math.round(previewBaseStageHeight.value * Math.max(previewZoom.value, 1))}px`,
}));
const previewStageInnerStyle = computed(() => {
  const scaledWidth = previewBaseStageWidth.value * previewZoom.value;
  const scaledHeight = previewBaseStageHeight.value * previewZoom.value;
  return {
    width: `${previewBaseStageWidth.value}px`,
    height: `${previewBaseStageHeight.value}px`,
    transform: `translate(${previewZoom.value < 1 ? Math.round((previewBaseStageWidth.value - scaledWidth) / 2) : 0}px, ${previewZoom.value < 1 ? Math.round((previewBaseStageHeight.value - scaledHeight) / 2) : 0}px) scale(${previewZoom.value})`,
    transformOrigin: "top left",
  };
});
const previewCanvasStyle = computed(() => ({
  width: `${previewCanvasWidth.value}px`,
  height: `${previewCanvasHeight.value}px`,
}));
const previewDisplayedStageWidth = computed(() => Math.round(previewBaseStageWidth.value * Math.max(previewZoom.value, 1)));
const previewDisplayedStageHeight = computed(() => Math.round(previewBaseStageHeight.value * Math.max(previewZoom.value, 1)));

const clampZoom = (value: number) => Math.max(PREVIEW_MIN_ZOOM, value);
const zoomPreview = (factor: number) => {
  previewZoom.value = clampZoom(Number((previewZoom.value * factor).toFixed(2)));
};
const resetPreviewZoom = () => {
  previewZoom.value = 1;
};

const measurePreviewViewport = async () =>
  await new Promise<{ width: number; height: number }>((resolve) => {
    uni
      .createSelectorQuery()
      .in(instance)
      .select(".pattern-scroll")
      .boundingClientRect((result: UniApp.NodeInfo | UniApp.NodeInfo[]) => {
        const rect = Array.isArray(result) ? result[0] : result;
        resolve({
          width: Math.max(240, Number(rect?.width) || previewViewportWidth.value),
          height: Math.max(240, Number(rect?.height) || previewViewportHeight.value),
        });
      })
      .exec();
  });

const fitPreviewZoom = async () => {
  if (!previewStageWidth.value || !previewStageHeight.value) {
    return;
  }
  const viewport = await measurePreviewViewport();
  previewViewportWidth.value = viewport.width;
  previewViewportHeight.value = viewport.height;
  const safeHorizontalGap = 28;
  const safeVerticalGap = 28;
  const fitScale = Math.min(
    (previewViewportWidth.value - safeHorizontalGap) / (previewStageWidth.value + (PREVIEW_STAGE_PADDING * 2)),
    (previewViewportHeight.value - safeVerticalGap) / (previewStageHeight.value + (PREVIEW_STAGE_PADDING * 2)),
  );
  previewZoom.value = clampZoom(Number(fitScale.toFixed(2)));
};

const handlePreviewTouchStart = (event: any) => {
  const touches = event?.touches || [];
  if (touches.length < 2) {
    return;
  }
  pinchStartDistance.value = getTouchDistance(touches[0], touches[1]);
  pinchStartZoom.value = previewZoom.value;
};

const handlePreviewTouchMove = (event: any) => {
  const touches = event?.touches || [];
  if (touches.length < 2 || pinchStartDistance.value <= 0) {
    return;
  }
  const nextDistance = getTouchDistance(touches[0], touches[1]);
  if (nextDistance <= 0) {
    return;
  }
  previewZoom.value = clampZoom(Number(((nextDistance / pinchStartDistance.value) * pinchStartZoom.value).toFixed(2)));
};

const handlePreviewTouchEnd = () => {
  pinchStartDistance.value = 0;
};

const handlePreviewLabelSwitch = (event: any) => {
  previewShowLabels.value = !Boolean(event?.detail?.value);
  if (previewRequested.value && pattern.value) {
    queuePreviewRender();
  }
};

const centerPreviewWorkbench = async () => {
  const viewport = await measurePreviewViewport();
  previewViewportWidth.value = viewport.width;
  previewViewportHeight.value = viewport.height;
  const stageLeft = Math.round((previewWorkbenchWidth.value - previewDisplayedStageWidth.value) / 2);
  const stageTop = Math.round((previewWorkbenchHeight.value - previewDisplayedStageHeight.value) / 2);
  previewScrollLeft.value = Math.max(0, Math.round(stageLeft - ((previewViewportWidth.value - previewDisplayedStageWidth.value) / 2)));
  previewScrollTop.value = Math.max(0, Math.round(stageTop - ((previewViewportHeight.value - previewDisplayedStageHeight.value) / 2)));
};

watch(
  () => [previewZoom.value, previewStageWidth.value, previewStageHeight.value],
  () => {
    void nextTick(() => {
      void centerPreviewWorkbench();
    });
  },
);

const buildLegendIndexRows = (currentPattern: BeadPatternResult) => {
  const legendIndexMap = Object.fromEntries(currentPattern.legend.map((item, index) => [item.id, index]));
  return currentPattern.rows.map((row) => row.map((cell) => (cell ? legendIndexMap[cell] ?? null : null)));
};

const getSamplerSize = (draft: PendingBeadPatternDraft) => {
  const longSide = Math.max(draft.sourceWidth, draft.sourceHeight, 1);
  const targetLongSide = Math.max(draft.targetWidth, draft.targetHeight, 1);
  const samplerLongSide = Math.min(longSide, Math.max(480, Math.min(960, targetLongSide * 6)));
  if (draft.sourceWidth >= draft.sourceHeight) {
    return {
      width: samplerLongSide,
      height: Math.max(1, Math.round((draft.sourceHeight / draft.sourceWidth) * samplerLongSide)),
    };
  }
  return {
    width: Math.max(1, Math.round((draft.sourceWidth / draft.sourceHeight) * samplerLongSide)),
    height: samplerLongSide,
  };
};

const getCanvasImageData = async (canvasId: string, width: number, height: number) =>
  await new Promise<Uint8ClampedArray>((resolve, reject) => {
    uni.canvasGetImageData({
      canvasId,
      x: 0,
      y: 0,
      width,
      height,
      success: (res) => resolve(new Uint8ClampedArray(res.data)),
      fail: reject,
    }, instance);
  });

const buildLocalPatternDraft = async () => {
  if (!pendingDraft.value || localDraftLoading.value || patternSource.value === "server") {
    return;
  }

  localDraftLoading.value = true;

  try {
    const currentDraft = pendingDraft.value;
    const imageInfo = await uni.getImageInfo({ src: currentDraft.sourceImagePath });
    const samplerSize = getSamplerSize(currentDraft);
    samplerCanvasWidth.value = samplerSize.width;
    samplerCanvasHeight.value = samplerSize.height;
    await nextTick();

    const context = uni.createCanvasContext("sourceSamplerCanvas", instance);
    context.clearRect(0, 0, samplerSize.width, samplerSize.height);
    context.drawImage(imageInfo.path || currentDraft.sourceImagePath, 0, 0, samplerSize.width, samplerSize.height);
    await new Promise<void>((resolve) => context.draw(false, () => resolve()));

    const pixelData = await getCanvasImageData("sourceSamplerCanvas", samplerSize.width, samplerSize.height);
    const localPattern = buildBeadPatternFromImageData(
      pixelData,
      samplerSize.width,
      samplerSize.height,
      currentDraft.sourceImagePath,
      {
        targetWidth: currentDraft.targetWidth,
        targetHeight: currentDraft.targetHeight,
        maxColors: currentDraft.maxColors,
        preserveBackgroundBlank: currentDraft.preserveBackgroundBlank,
      },
    );
    applyLocalPatternResult(localPattern);
  } catch (error) {
    console.error("生成前端临时图纸失败：", error);
  } finally {
    localDraftLoading.value = false;
  }
};

const renderPreviewCanvas = async () => {
  if (!pattern.value || previewLoading.value) {
    return;
  }

  previewLoading.value = true;
  previewRequested.value = true;
  previewProgress.value = 0;

  try {
    const currentPattern = pattern.value;
    const padding = 16;
    const maxSide = Math.max(currentPattern.width, currentPattern.height);
    const baseCellSize = maxSide <= 72 ? 24 : maxSide <= 96 ? 20 : maxSide <= 128 ? 16 : maxSide <= 180 ? 12 : 10;
    const cellSize = Math.max(2, baseCellSize);
    const axisFontSize = Math.max(8, Math.floor(cellSize * 0.42));
    const axisDigitCount = Math.max(
      String(Math.max(currentPattern.width - 1, 0)).length,
      String(Math.max(currentPattern.height - 1, 0)).length,
      1,
    );
    const axisLeftGutter = Math.max(24, Math.round((axisDigitCount * axisFontSize * 0.68) + 12));
    const axisTopGutter = Math.max(24, Math.round(axisFontSize * 1.9));
    const gridStartX = padding + axisLeftGutter;
    const gridStartY = padding + axisTopGutter;
    const canvasWidth = Math.max(240, gridStartX + (currentPattern.width * cellSize) + padding);
    const canvasHeight = Math.max(240, gridStartY + (currentPattern.height * cellSize) + padding);
    const context = uni.createCanvasContext("previewCanvas", instance);
    const colorMap = Object.fromEntries(currentPattern.legend.map((item) => [item.id, item.hex]));
    const codeMap = Object.fromEntries(currentPattern.legend.map((item) => [item.id, item.code]));
    const textColorMap = Object.fromEntries(currentPattern.legend.map((item) => [item.id, getContrastTextColor(item.hex)]));

    previewCanvasWidth.value = canvasWidth;
    previewCanvasHeight.value = canvasHeight;
    previewStageWidth.value = canvasWidth;
    previewStageHeight.value = canvasHeight;
    await nextTick();
    await fitPreviewZoom();
    await centerPreviewWorkbench();

    context.setFillStyle("#FFFFFF");
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.setFillStyle("#F8FAFC");
    context.fillRect(padding, padding, axisLeftGutter, axisTopGutter);
    context.fillRect(gridStartX, padding, currentPattern.width * cellSize, axisTopGutter);
    context.fillRect(padding, gridStartY, axisLeftGutter, currentPattern.height * cellSize);
    context.setStrokeStyle("rgba(31,41,55,0.12)");
    context.strokeRect(padding, padding, axisLeftGutter, axisTopGutter);
    context.strokeRect(gridStartX, padding, currentPattern.width * cellSize, axisTopGutter);
    context.strokeRect(padding, gridStartY, axisLeftGutter, currentPattern.height * cellSize);
    context.setFillStyle("#475569");
    context.setFontSize(axisFontSize);
    context.setTextAlign("center");
    context.setTextBaseline("middle");
    for (let columnIndex = 0; columnIndex < currentPattern.width; columnIndex += 1) {
      context.fillText(String(columnIndex), gridStartX + (columnIndex * cellSize) + (cellSize / 2), padding + (axisTopGutter / 2));
    }
    context.setTextAlign("right");
    for (let rowIndex = 0; rowIndex < currentPattern.height; rowIndex += 1) {
      context.fillText(String(rowIndex), padding + axisLeftGutter - 6, gridStartY + (rowIndex * cellSize) + (cellSize / 2));
    }
    await new Promise<void>((resolve) => context.draw(false, () => resolve()));

    const totalRows = currentPattern.rows.length;
    const rowsPerChunk = Math.max(4, Math.ceil(totalRows / 24));

    for (let rowStart = 0; rowStart < totalRows; rowStart += rowsPerChunk) {
      const rowEnd = Math.min(totalRows, rowStart + rowsPerChunk);
      for (let rowIndex = rowStart; rowIndex < rowEnd; rowIndex += 1) {
        for (let columnIndex = 0; columnIndex < currentPattern.rows[rowIndex].length; columnIndex += 1) {
          const cell = currentPattern.rows[rowIndex][columnIndex];
          const x = gridStartX + (columnIndex * cellSize);
          const y = gridStartY + (rowIndex * cellSize);
          context.setFillStyle(cell ? colorMap[cell] || "#FFFFFF" : "#FFFFFF");
          context.fillRect(x, y, cellSize, cellSize);
          context.setStrokeStyle("rgba(31,41,55,0.08)");
          context.strokeRect(x, y, cellSize, cellSize);
          if (canShowLabelsInPreview.value && cell) {
            context.setFillStyle(textColorMap[cell] || "#1F2937");
            context.setFontSize(Math.max(5, Math.floor(cellSize * 0.42)));
            context.setTextAlign("center");
            context.setTextBaseline("middle");
            context.fillText(codeMap[cell] || "", x + (cellSize / 2), y + (cellSize / 2));
          }
        }
      }
      previewProgress.value = Math.min(100, Math.round((rowEnd / totalRows) * 100));
      await new Promise<void>((resolve) => context.draw(true, () => resolve()));
      await new Promise<void>((resolve) => setTimeout(resolve, 8));
    }
    await nextTick();
    await centerPreviewWorkbench();
  } catch (error) {
    console.error("预览渲染失败：", error);
    uni.showToast({
      title: "预览渲染失败",
      icon: "none",
    });
  } finally {
    previewLoading.value = false;
    if (previewRenderQueued.value) {
      previewRenderQueued.value = false;
      void renderPreviewCanvas();
    }
  }
};

onLoad(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  pendingTaskId.value = currentPage?.options?.task_id || "";
  if (pendingTaskId.value) {
    pattern.value = null;
    loadPendingDraft();
  }
  resolvePattern();
  if (pattern.value) {
    preparePreviewStage();
    queuePreviewRender();
  } else if (pendingTaskId.value) {
    void buildLocalPatternDraft();
    void waitForPatternTask();
  }
});

onShow(() => {
  resolvePattern();
  if (pattern.value) {
    preparePreviewStage();
  }
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

const handleExportLabelSwitch = (event: any) => {
  exportWithLabels.value = Boolean(event?.detail?.value);
};

const regenerate = () => {
  uni.switchTab({
    url: "/pages/home/index",
  });
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

function getContrastTextColor(hex: string) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
  return luminance > 160 ? "#1F2937" : "#FFFFFF";
}

function getTouchDistance(left: { clientX: number; clientY: number }, right: { clientX: number; clientY: number }) {
  const xDiff = left.clientX - right.clientX;
  const yDiff = left.clientY - right.clientY;
  return Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
}
</script>

<template>
  <view class="page">
    <canvas
      canvas-id="sourceSamplerCanvas"
      class="sampler-canvas"
      :width="samplerCanvasWidth"
      :height="samplerCanvasHeight"
    />

    <view v-if="pattern || generationLoading" class="content">
      <view class="summary-card">
        <view class="summary-badge">Blueprint Ready</view>
        <text class="summary-title">{{ generationLoading ? "拼豆图纸生成中" : "拼豆图纸已生成" }}</text>
        <text class="summary-desc">{{ summaryDesc }}</text>

        <view v-if="generationLoading" class="task-progress-card">
          <view class="task-progress-head">
            <text class="task-progress-title">生成任务进行中</text>
            <text class="task-progress-value">{{ generationProgress }}%</text>
          </view>
          <view class="task-progress-track">
            <view class="task-progress-fill" :style="{ width: `${generationProgress}%` }" />
          </view>
          <text class="task-progress-desc">{{ generationMessage }}</text>
        </view>

        <view class="toolbar">
          <button class="tool-button solid" :disabled="generationLoading || !pattern" @click="openDownloadModal">
            {{ downloading ? "导出中..." : "下载图纸" }}
          </button>
        </view>
      </view>

      <view v-if="pattern" class="stats-grid">
        <view class="stat-card pink">
          <text class="stat-value">{{ pattern.totalBeads }}</text>
          <text class="stat-label">总颗数</text>
        </view>
        <view class="stat-card blue">
          <text class="stat-value">{{ pattern.legend.length }}</text>
          <text class="stat-label">用色数量</text>
        </view>
        <view class="stat-card green">
          <text class="stat-value">{{ boardText }}</text>
          <text class="stat-label">拼板估算</text>
        </view>
      </view>

      <view v-if="pattern" class="card">
        <view class="section-head">
          <text class="section-title">原图参考</text>
          <text class="section-meta">本地图片</text>
        </view>
        <image :src="pattern.sourceImagePath" class="source-image" mode="aspectFit" />
      </view>

      <view v-if="pattern" class="card">
        <view class="section-head">
          <text class="section-title">图纸预览</text>
          <text class="section-meta">{{ previewSectionMeta }}</text>
        </view>

        <view v-if="previewRequested" class="preview-image-shell">
          <view v-if="previewLoading" class="preview-loading-banner">
            <text class="preview-loading-text">{{ pageHint }}</text>
          </view>
          <view class="preview-toolbar">
            <view class="preview-toolbar-copy">
              <text class="preview-toolbar-title">图纸画布</text>
              <text class="preview-zoom-label">缩放 {{ previewZoomLabel }}</text>
            </view>
            <view class="preview-toolbar-panel">
              <view class="preview-switch-card">
                <view class="preview-switch-copy">
                  <text class="preview-switch-title">隐藏色号</text>
                  <text class="preview-switch-desc">{{ previewShowLabels ? "当前显示格内色号" : "当前只显示颜色块" }}</text>
                </view>
                <switch
                  :checked="!previewShowLabels"
                  color="#4D96FF"
                  style="transform: scale(0.88)"
                  @change="handlePreviewLabelSwitch"
                />
              </view>
              <view class="preview-toolbar-actions">
                <button class="zoom-button subtle" @click="zoomPreview(1 / 1.25)">缩小</button>
                <button class="zoom-button accent" @click="fitPreviewZoom">适应</button>
                <button class="zoom-button subtle" @click="resetPreviewZoom">100%</button>
                <button class="zoom-button warm" @click="zoomPreview(1.25)">放大</button>
              </view>
            </view>
          </view>
          <scroll-view
            scroll-x
            scroll-y
            class="pattern-scroll"
            :scroll-left="previewScrollLeft"
            :scroll-top="previewScrollTop"
          >
            <view class="preview-workbench" :style="previewWorkbenchStyle">
              <view
                class="canvas-stage"
                :style="previewStageStyle"
                @touchstart="handlePreviewTouchStart"
                @touchmove="handlePreviewTouchMove"
                @touchend="handlePreviewTouchEnd"
                @touchcancel="handlePreviewTouchEnd"
              >
                <view class="canvas-stage-inner" :style="previewStageInnerStyle">
                  <canvas
                    canvas-id="previewCanvas"
                    class="preview-canvas"
                    :width="previewCanvasWidth"
                    :height="previewCanvasHeight"
                    :style="previewCanvasStyle"
                  />
                </view>
              </view>
            </view>
          </scroll-view>
          <button class="preview-button secondary" :disabled="previewLoading" @click="renderPreviewCanvas">
            {{ previewLoading ? "渲染中..." : "重新渲染预览" }}
          </button>
        </view>
        <view v-else class="preview-placeholder">
          <text class="preview-placeholder-title">{{ localDraftLoading ? "预览准备中" : "预览未生成" }}</text>
          <text class="preview-placeholder-desc">
            {{ localDraftLoading ? "前端正在准备临时图纸，完成后会自动开始渲染。" : "点击按钮后开始本地渐进式渲染预览，边绘制边显示。" }}
          </text>
          <button class="preview-button primary" :disabled="previewLoading" @click="renderPreviewCanvas">
            {{ previewLoading ? "渲染中..." : "开始渲染预览" }}
          </button>
        </view>

        <text class="pattern-tip">{{ pageHint }}</text>
      </view>

      <view v-if="pattern" class="card">
        <view class="section-head">
          <text class="section-title">颜色清单</text>
          <text class="section-meta">按用量排序</text>
        </view>
        <scroll-view scroll-y class="legend-scroll">
          <view class="legend-list">
            <view v-for="item in pattern.legend" :key="item.id" class="legend-item">
              <view class="legend-main">
                <view class="legend-dot" :style="{ background: item.hex }" />
                <view class="legend-copy">
                  <text class="legend-name">{{ item.name }}</text>
                  <text class="legend-code">{{ item.code }} · {{ item.hex }}</text>
                </view>
              </view>
              <text class="legend-count">{{ item.count }} 颗</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <button class="regen-button" @click="regenerate">重新选图生成</button>
    </view>

    <view v-else class="empty-state">
      <text class="empty-title">还没有生成图纸</text>
      <text class="empty-desc">先回首页上传图片并生成图纸。</text>
      <button class="regen-button" @click="regenerate">返回首页</button>
    </view>

    <view v-if="downloadModalVisible" class="modal-mask" @click="closeDownloadModal">
      <view class="download-modal" @click.stop>
        <text class="modal-title">下载图纸</text>
        <text class="modal-desc">
          导出到相册前，可以决定是否在每个像素格中直接显示色号，方便对着图案完成拼豆。
        </text>

        <view class="option-card">
          <view class="option-copy">
            <text class="option-title">像素格显示色号</text>
            <text class="option-desc">开启后，导出图纸会在每个格子里直接标注色号。</text>
          </view>
          <switch
            :checked="exportWithLabels"
            color="#4D96FF"
            style="transform: scale(0.88)"
            @change="handleExportLabelSwitch"
          />
        </view>

        <view class="modal-actions">
          <button class="modal-button light" :disabled="downloading" @click="closeDownloadModal">取消</button>
          <button class="modal-button strong" :disabled="downloading" @click="downloadPattern">
            {{ downloading ? "导出中..." : "确认下载" }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background:
    radial-gradient(circle at top left, rgba(255, 159, 28, 0.16), transparent 26%),
    linear-gradient(180deg, #fffef7 0%, #f9fafb 100%);
}

.summary-card,
.card,
.stat-card,
.empty-state {
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 22rpx 54rpx rgba(31, 41, 55, 0.08);
}

.summary-card {
  padding: 34rpx 30rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.32), transparent 28%),
    linear-gradient(135deg, #4d96ff 0%, #9b5de5 100%);
}

.summary-badge {
  display: inline-flex;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 22rpx;
}

.summary-title {
  display: block;
  margin-top: 20rpx;
  color: #ffffff;
  font-size: 54rpx;
  font-weight: 700;
}

.summary-desc {
  display: block;
  margin-top: 18rpx;
  color: rgba(255, 255, 255, 0.92);
  font-size: 28rpx;
  line-height: 1.6;
}

.toolbar {
  display: flex;
  gap: 16rpx;
  margin-top: 26rpx;
}

.task-progress-card {
  margin-top: 24rpx;
  padding: 20rpx 22rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.16);
}

.task-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-progress-title {
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
}

.task-progress-value {
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
}

.task-progress-track {
  width: 100%;
  height: 14rpx;
  margin-top: 14rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.22);
}

.task-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ffd60a 0%, #ffffff 100%);
}

.task-progress-desc {
  display: block;
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.9);
  font-size: 23rpx;
}

.tool-button {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.tool-button::after {
  border: none;
}

.tool-button.solid {
  background: #ffffff;
  color: #1f2937;
}

.tool-button[disabled] {
  opacity: 0.5;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 20rpx;
}

.stat-card {
  min-height: 176rpx;
  padding: 24rpx 20rpx;
}

.stat-card.pink {
  background: #fff0f6;
}

.stat-card.blue {
  background: #e6f4ff;
}

.stat-card.green {
  background: #f6ffed;
}

.stat-value {
  display: block;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.3;
}

.stat-label {
  display: block;
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
}

.card {
  margin-top: 20rpx;
  padding: 26rpx 24rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}

.section-meta {
  color: #4d96ff;
  font-size: 24rpx;
}

.source-image {
  width: 100%;
  height: 360rpx;
  margin-top: 22rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, rgba(255, 77, 141, 0.06), rgba(77, 150, 255, 0.08));
}

.preview-image-shell,
.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
  padding: 26rpx 22rpx;
  border-radius: 26rpx;
  background:
    linear-gradient(135deg, rgba(255, 77, 141, 0.08), rgba(54, 207, 201, 0.08)),
    #ffffff;
}

.preview-toolbar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 18rpx;
  width: 100%;
}

.preview-toolbar-copy {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.preview-toolbar-title {
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 700;
}

.preview-zoom-label {
  color: #4b5563;
  font-size: 24rpx;
  font-weight: 600;
}

.preview-toolbar-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12rpx;
  min-width: 0;
}

.preview-switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 16rpx 18rpx;
  border: 1px solid rgba(77, 150, 255, 0.14);
  border-radius: 22rpx;
  background:
    linear-gradient(135deg, rgba(255, 240, 246, 0.92) 0%, rgba(230, 244, 255, 0.96) 100%);
}

.preview-switch-copy {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}

.preview-switch-title {
  color: #1f2937;
  font-size: 24rpx;
  font-weight: 700;
}

.preview-switch-desc {
  color: #6b7280;
  font-size: 21rpx;
  line-height: 1.4;
}

.preview-toolbar-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10rpx;
  min-width: 0;
}

.zoom-button {
  min-width: 0;
  height: 68rpx;
  line-height: 68rpx;
  padding: 0 12rpx;
  border: none;
  border-radius: 20rpx;
  color: #1f2937;
  font-size: 22rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 22rpx rgba(15, 23, 42, 0.06);
}

.zoom-button::after {
  border: none;
}

.zoom-button.subtle {
  background: #ffffff;
  color: #4b5563;
}

.zoom-button.accent {
  background: linear-gradient(135deg, #4d96ff 0%, #36cfc9 100%);
  color: #ffffff;
}

.zoom-button.warm {
  background: linear-gradient(135deg, #ff6a5a 0%, #ff9f1c 100%);
  color: #ffffff;
}

.preview-placeholder-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}

.preview-placeholder-desc {
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
  text-align: center;
}

.preview-button {
  min-width: 280rpx;
  height: 84rpx;
  line-height: 84rpx;
  padding: 0 28rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.preview-button::after {
  border: none;
}

.preview-button.primary {
  background: linear-gradient(135deg, #4d96ff 0%, #36cfc9 100%);
  color: #ffffff;
}

.preview-button.secondary {
  background: #eef2f7;
  color: #1f2937;
}

.preview-loading-banner {
  width: 100%;
  padding: 14rpx 18rpx;
  border-radius: 18rpx;
  background: #e6f4ff;
}

.preview-loading-text {
  color: #1557a8;
  font-size: 24rpx;
  font-weight: 600;
}

.pattern-scroll {
  width: 100%;
  height: 920rpx;
  border-radius: 22rpx;
  background: #e8edf5;
}

.preview-workbench {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background:
    linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(180deg, #eef3f9 0%, #e6ecf5 100%);
  background-size: 28px 28px, 28px 28px, auto;
}

.canvas-stage {
  position: relative;
  display: block;
  overflow: visible;
  border-radius: 28rpx;
}

.canvas-stage-inner {
  position: absolute;
  left: 0;
  top: 0;
  padding: 18px;
  box-sizing: border-box;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow:
    0 24rpx 60rpx rgba(15, 23, 42, 0.14),
    0 0 0 2rpx rgba(255, 255, 255, 0.9);
}

.preview-canvas {
  display: block;
  background: #ffffff;
  border-radius: 22rpx;
}

.sampler-canvas {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.pattern-tip {
  display: block;
  margin-top: 18rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}

.legend-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8rpx;
  margin-top: 14rpx;
}

.legend-scroll {
  height: 560rpx;
  padding-right: 2rpx;
  box-sizing: border-box;
}

.legend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  padding: 12rpx 14rpx;
  border-radius: 16rpx;
  background: #f9fafb;
}

.legend-main {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex: 1;
  min-width: 0;
}

.legend-dot {
  width: 22rpx;
  height: 22rpx;
  border-radius: 999rpx;
  box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, 0.8);
}

.legend-copy {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.legend-name {
  color: #1f2937;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.2;
}

.legend-code {
  color: #6b7280;
  font-size: 18rpx;
  line-height: 1.2;
}

.legend-count {
  color: #1f2937;
  font-size: 20rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.regen-button {
  height: 96rpx;
  margin-top: 24rpx;
  line-height: 96rpx;
  border: none;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
}

.regen-button::after {
  border: none;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 120rpx;
  padding: 48rpx 30rpx;
}

.empty-title {
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 700;
}

.empty-desc {
  margin-top: 14rpx;
  color: #6b7280;
  font-size: 26rpx;
}

.modal-mask {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(15, 23, 42, 0.42);
  z-index: 999;
}

.download-modal {
  width: 100%;
  padding: 34rpx 24rpx calc(34rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.12), transparent 26%),
    #ffffff;
  box-shadow: 0 -18rpx 48rpx rgba(15, 23, 42, 0.12);
}

.modal-title {
  display: block;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 700;
}

.modal-desc {
  display: block;
  margin-top: 14rpx;
  color: #6b7280;
  font-size: 25rpx;
  line-height: 1.7;
}

.option-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-top: 24rpx;
  padding: 24rpx 22rpx;
  border-radius: 24rpx;
  background: #f9fafb;
}

.option-copy {
  flex: 1;
}

.option-title {
  display: block;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 700;
}

.option-desc {
  display: block;
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 23rpx;
  line-height: 1.6;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-top: 26rpx;
}

.modal-button {
  height: 88rpx;
  line-height: 88rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.modal-button::after {
  border: none;
}

.modal-button.light {
  background: #eef2f7;
  color: #1f2937;
}

.modal-button.strong {
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
}
</style>
