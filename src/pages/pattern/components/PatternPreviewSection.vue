<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePatternStore } from "@/store/patternStore";

const { pattern, generationLoading, generationProgress, generationMessage, pageHint } = storeToRefs(usePatternStore());
</script>

<template>
  <view class="card">
    <view class="section-head">
      <text class="section-title">图纸成品</text>
      <text class="section-meta">{{ generationLoading ? "生成中" : "已生成 PNG" }}</text>
    </view>

    <view v-if="generationLoading" class="task-progress-card">
      <view class="task-progress-head">
        <text class="task-progress-title">后台正在生成图纸</text>
        <text class="task-progress-value">{{ generationProgress }}%</text>
      </view>
      <view class="task-progress-track">
        <view class="task-progress-fill" :style="{ width: `${generationProgress}%` }" />
      </view>
      <text class="task-progress-desc">{{ generationMessage }}</text>
    </view>

    <view v-if="pattern?.previewUrl" class="preview-frame">
      <image :src="pattern.previewUrl" class="preview-image" mode="widthFix" />
    </view>

    <text class="hint-text">{{ pageHint }}</text>
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

.task-progress-card {
  margin-top: 22rpx;
  padding: 20rpx 22rpx;
  border-radius: 24rpx;
  background: #f8fbff;
}

.task-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-progress-title,
.task-progress-value {
  color: #1f2937;
  font-size: 26rpx;
  font-weight: 700;
}

.task-progress-track {
  width: 100%;
  height: 14rpx;
  margin-top: 14rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #dde7f2;
}

.task-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #4d96ff 0%, #36cfc9 100%);
}

.task-progress-desc {
  display: block;
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.6;
}

.preview-frame {
  margin-top: 22rpx;
  padding: 16rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, rgba(255, 240, 246, 0.92), rgba(230, 244, 255, 0.94));
  border: 1px solid #e5e7eb;
}

.preview-image {
  width: 100%;
  border-radius: 18rpx;
  background: #ffffff;
}

.hint-text {
  display: block;
  margin-top: 18rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}
</style>
