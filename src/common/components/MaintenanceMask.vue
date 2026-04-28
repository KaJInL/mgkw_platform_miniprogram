<script setup lang="ts">
import { storeToRefs } from "pinia";

import { useAppStateStore } from "@/store/appStateStore";

const appStateStore = useAppStateStore();
const { maintenanceModeEnabled } = storeToRefs(appStateStore);
</script>

<template>
  <view v-if="maintenanceModeEnabled" class="maintenance-mask">
    <view class="maintenance-panel">
      <text class="maintenance-title">系统维护中</text>
      <text class="maintenance-text">当前服务正在进行维护与优化，请稍后再试。</text>
    </view>
  </view>
</template>

<style scoped>
.maintenance-mask {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(8rpx);
}

.maintenance-panel {
  position: relative;
  width: 100%;
  max-width: 560rpx;
  padding: 42rpx 36rpx;
  border-radius: 28rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 24rpx 60rpx rgba(31, 41, 55, 0.18),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.08);
}

.maintenance-title {
  color: #ffffff;
  font-size: 48rpx;
  font-weight: 900;
  line-height: 1.18;
}

.maintenance-text {
  margin-top: 18rpx;
  color: rgba(255, 255, 255, 0.92);
  font-size: 26rpx;
  line-height: 1.75;
}
</style>
