<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onLoad, onShow, onUnload } from "@dcloudio/uni-app";
import PatternDownloadModal from "./components/PatternDownloadModal.vue";
import PatternLegendCard from "./components/PatternLegendCard.vue";
import PatternPreviewSection from "./components/PatternPreviewSection.vue";
import PatternSourceCard from "./components/PatternSourceCard.vue";
import PatternStatsGrid from "./components/PatternStatsGrid.vue";
import PatternSummaryCard from "./components/PatternSummaryCard.vue";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import { usePatternStore } from "@/store/patternStore";

const patternStore = usePatternStore();
const { pattern, pendingTaskId, generationLoading } = storeToRefs(patternStore);

onLoad(() => {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1] as { options?: Record<string, string> } | undefined;
  const taskId = currentPage?.options?.task_id || "";
  patternStore.initialize(taskId);
  if (!pattern.value && pendingTaskId.value) {
    void patternStore.waitForPatternTask();
  }
});

onShow(() => {
  patternStore.resolvePattern();
  if (!pattern.value && pendingTaskId.value && !generationLoading.value) {
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
    <view class="page-aurora page-aurora-pink" />
    <view class="page-aurora page-aurora-blue" />
    <view class="page-aurora page-aurora-green" />

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
  background: linear-gradient(180deg, #fff6fb 0%, #ffffff 34%, #f7fafc 100%);
}

.page-aurora {
  position: fixed;
  border-radius: 9999rpx;
  filter: blur(70rpx);
  opacity: 0.42;
  pointer-events: none;
}

.page-aurora-pink {
  top: 60rpx;
  right: -80rpx;
  width: 260rpx;
  height: 260rpx;
  background: rgba(255, 77, 141, 0.18);
}

.page-aurora-blue {
  top: 420rpx;
  left: -100rpx;
  width: 300rpx;
  height: 300rpx;
  background: rgba(77, 150, 255, 0.16);
}

.page-aurora-green {
  bottom: 260rpx;
  right: -60rpx;
  width: 220rpx;
  height: 220rpx;
  background: rgba(54, 207, 201, 0.14);
}

.content {
  position: relative;
}

.regen-button {
  height: 96rpx;
  margin-top: 24rpx;
  line-height: 96rpx;
  border: none;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  box-shadow: 0 18rpx 36rpx rgba(77, 150, 255, 0.16);
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
