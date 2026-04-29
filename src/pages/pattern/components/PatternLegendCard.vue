<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePatternStore } from "@/store/patternStore";

const { pattern } = storeToRefs(usePatternStore());
</script>

<template>
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
  background: linear-gradient(135deg, #fff0f6 0%, #f7fafc 100%);
  border: 1px solid #eef2f7;
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
</style>
