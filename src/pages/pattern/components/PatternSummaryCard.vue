<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePatternStore } from "@/store/patternStore";

const patternStore = usePatternStore();
const {
  pattern,
  generationLoading,
  generationProgress,
  generationMessage,
  downloading,
  summaryDesc,
} = storeToRefs(patternStore);
</script>

<template>
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
      <button class="tool-button solid" :disabled="generationLoading || !pattern" @click="patternStore.openDownloadModal">
        {{ downloading ? "导出中..." : "下载图纸" }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.summary-card {
  padding: 34rpx 30rpx;
  border-radius: 32rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.28), transparent 28%),
    linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  box-shadow: 0 24rpx 56rpx rgba(77, 150, 255, 0.14);
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

.task-progress-title,
.task-progress-value,
.task-progress-desc {
  color: #ffffff;
}

.task-progress-title {
  font-size: 26rpx;
  font-weight: 700;
}

.task-progress-value {
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
</style>
