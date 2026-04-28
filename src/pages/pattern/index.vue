<script setup lang="ts">
import { getCurrentInstance, nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import PatternDownloadModal from "./components/PatternDownloadModal.vue";
import PatternLegendCard from "./components/PatternLegendCard.vue";
import PatternPreviewSection from "./components/PatternPreviewSection.vue";
import PatternSourceCard from "./components/PatternSourceCard.vue";
import PatternStatsGrid from "./components/PatternStatsGrid.vue";
import PatternSummaryCard from "./components/PatternSummaryCard.vue";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import { buildBeadPatternFromImageData } from "@/common/utils/beadPattern";
import { usePatternStore, type PendingBeadPatternDraft } from "@/store/patternStore";

const instance = getCurrentInstance();
const patternStore = usePatternStore();
const { pattern, pendingTaskId, pendingDraft, generationLoading, localDraftLoading } = storeToRefs(patternStore);

const samplerCanvasWidth = ref(1);
const samplerCanvasHeight = ref(1);

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
  if (!pendingDraft.value || localDraftLoading.value || patternStore.patternSource === "server") {
    return;
  }

  patternStore.setLocalDraftLoading(true);

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
    patternStore.applyLocalPatternResult(localPattern);
  } catch (error) {
    console.error("生成前端临时图纸失败：", error);
  } finally {
    patternStore.setLocalDraftLoading(false);
  }
};

onLoad(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  const taskId = currentPage?.options?.task_id || "";
  patternStore.resetPreviewState();
  patternStore.initialize(taskId);
  if (!pattern.value && pendingTaskId.value) {
    void buildLocalPatternDraft();
    void patternStore.waitForPatternTask();
  }
});

onShow(() => {
  patternStore.resolvePattern();
  if (!pattern.value && pendingTaskId.value && !generationLoading.value) {
    void buildLocalPatternDraft();
    void patternStore.waitForPatternTask();
  }
});

onUnload(() => {
  patternStore.resetTransientState();
});

const regenerate = () => {
  uni.switchTab({
    url: "/pages/home/index",
  });
};
</script>

<template>
  <view class="page">
    <MaintenanceMask />
    <canvas
      canvas-id="sourceSamplerCanvas"
      class="sampler-canvas"
      :width="samplerCanvasWidth"
      :height="samplerCanvasHeight"
    />

    <view v-if="pattern || generationLoading" class="content">
      <PatternSummaryCard />
      <PatternStatsGrid />
      <PatternSourceCard />
      <PatternPreviewSection />
      <PatternLegendCard />

      <button class="regen-button" @click="regenerate">重新选图生成</button>
    </view>

    <view v-else class="empty-state">
      <text class="empty-title">还没有生成图纸</text>
      <text class="empty-desc">先回首页上传图片并生成图纸。</text>
      <button class="regen-button" @click="regenerate">返回首页</button>
    </view>

    <PatternDownloadModal />
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

.sampler-canvas {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
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
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 22rpx 54rpx rgba(31, 41, 55, 0.08);
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
</style>
