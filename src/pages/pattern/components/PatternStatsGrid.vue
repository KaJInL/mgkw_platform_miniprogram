<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePatternStore } from "@/store/patternStore";

const { pattern, boardText } = storeToRefs(usePatternStore());
</script>

<template>
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
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-top: 20rpx;
}

.stat-card {
  min-height: 176rpx;
  padding: 24rpx 20rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 22rpx 54rpx rgba(31, 41, 55, 0.08);
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
</style>
