<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePatternStore } from "@/store/patternStore";

const { pattern } = storeToRefs(usePatternStore());
</script>

<template>
  <view v-if="pattern" class="card">
    <view class="section-head">
      <text class="section-title">原图参考</text>
      <text class="section-meta">本地图片</text>
    </view>
    <image :src="pattern.sourceImagePath" class="source-image" mode="aspectFit" />
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

.source-image {
  width: 100%;
  height: 360rpx;
  margin-top: 22rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, rgba(255, 240, 246, 0.92), rgba(230, 244, 255, 0.94));
  border: 1px solid #eef2f7;
}
</style>
