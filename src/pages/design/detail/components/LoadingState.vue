<script setup lang="ts">
/**
 * 加载状态组件
 */
</script>

<template>
  <view class="loading-container">
    <uni-loading type="circle" :size="40"></uni-loading>
    <text class="loading-text">加载中...</text>
  </view>
</template>

<style scoped lang="scss">
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;

  .loading-text {
    margin-top: 20rpx;
    font-size: 28rpx;
    color: #999;
  }
}
</style>
