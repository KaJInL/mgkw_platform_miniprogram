<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { usePatternStore } from "@/store/patternStore";

const instance = getCurrentInstance();
const patternStore = usePatternStore();
const {
  pattern,
  previewRequested,
  previewLoading,
  previewProgress,
  previewShowLabels,
  localDraftLoading,
  pageHint,
  previewSectionMeta,
  canShowLabelsInPreview,
} = storeToRefs(patternStore);

const PREVIEW_STAGE_PADDING = 18;
const PREVIEW_MIN_ZOOM = 0.05;
const PREVIEW_WORKBENCH_BASE_SIZE = 1400;
const PREVIEW_WORKBENCH_MARGIN = 240;

const previewRenderQueued = ref(false);
const previewZoom = ref(1);
const pinchStartDistance = ref(0);
const pinchStartZoom = ref(1);
const previewStageWidth = ref(800);
const previewStageHeight = ref(800);
const previewCanvasWidth = ref(800);
const previewCanvasHeight = ref(800);
const previewScrollLeft = ref(0);
const previewScrollTop = ref(0);
const previewViewportWidth = ref(320);
const previewViewportHeight = ref(320);

const previewZoomLabel = computed(() => `${Math.round(previewZoom.value * 100)}%`);
const previewDisplayedStageWidth = computed(() => Math.round(previewBaseStageWidth.value * Math.max(previewZoom.value, 1)));
const previewDisplayedStageHeight = computed(() => Math.round(previewBaseStageHeight.value * Math.max(previewZoom.value, 1)));
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

const clampZoom = (value: number) => Math.max(PREVIEW_MIN_ZOOM, value);

const centerPreviewWorkbench = async () => {
  const viewport = await measurePreviewViewport();
  previewViewportWidth.value = viewport.width;
  previewViewportHeight.value = viewport.height;
  const stageLeft = Math.round((previewWorkbenchWidth.value - previewDisplayedStageWidth.value) / 2);
  const stageTop = Math.round((previewWorkbenchHeight.value - previewDisplayedStageHeight.value) / 2);
  previewScrollLeft.value = Math.max(0, Math.round(stageLeft - ((previewViewportWidth.value - previewDisplayedStageWidth.value) / 2)));
  previewScrollTop.value = Math.max(0, Math.round(stageTop - ((previewViewportHeight.value - previewDisplayedStageHeight.value) / 2)));
};

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

const getContrastTextColor = (hex: string) => {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 1000;
  return luminance > 160 ? "#1F2937" : "#FFFFFF";
};

const renderPreviewCanvas = async () => {
  if (!pattern.value || previewLoading.value) {
    return;
  }

  patternStore.setPreviewLoading(true);
  patternStore.setPreviewRequested(true);
  patternStore.setPreviewProgress(0);

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
      patternStore.setPreviewProgress(Math.min(100, Math.round((rowEnd / totalRows) * 100)));
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
    patternStore.setPreviewLoading(false);
    if (previewRenderQueued.value) {
      previewRenderQueued.value = false;
      void renderPreviewCanvas();
    }
  }
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

const zoomPreview = (factor: number) => {
  previewZoom.value = clampZoom(Number((previewZoom.value * factor).toFixed(2)));
};

const resetPreviewZoom = () => {
  previewZoom.value = 1;
};

const getTouchDistance = (left: { clientX: number; clientY: number }, right: { clientX: number; clientY: number }) => {
  const xDiff = left.clientX - right.clientX;
  const yDiff = left.clientY - right.clientY;
  return Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));
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
  patternStore.setPreviewShowLabels(!Boolean(event?.detail?.value));
  if (previewRequested.value && pattern.value) {
    queuePreviewRender();
  }
};

watch(
  () => [previewZoom.value, previewStageWidth.value, previewStageHeight.value],
  () => {
    void nextTick(() => {
      void centerPreviewWorkbench();
    });
  },
);

watch(
  () => pattern.value?.generatedAt || "",
  (value) => {
    if (!value || !pattern.value) {
      return;
    }
    preparePreviewStage();
    queuePreviewRender();
  },
  { immediate: true },
);
</script>

<template>
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
</template>

<style scoped>
.card {
  margin-top: 20rpx;
  padding: 26rpx 24rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 22rpx 54rpx rgba(31, 41, 55, 0.08);
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

.pattern-tip {
  display: block;
  margin-top: 18rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}
</style>
