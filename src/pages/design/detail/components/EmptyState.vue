<script setup lang="ts">
/**
 * 空状态组件
 */
interface Props {
  /** 空状态文本 */
  text?: string
}

withDefaults(defineProps<Props>(), {
  text: '暂无数据'
});
</script>

<template>
  <view class="empty-container">
    <text class="empty-text">{{ text }}</text>
  </view>
</template>

<style scoped lang="scss">
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: #999;
  }
}
</style>
