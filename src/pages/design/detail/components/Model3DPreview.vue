<script setup lang="ts">
import Model3DViewer from "@/components/Model3DViewer.vue";

/**
 * 3D模型预览组件
 */
interface Props {
  /** 3D模型URL */
  modelUrl: string
  /** 是否自动旋转 */
  autoRotate?: boolean
  /** 高度 */
  height?: string
}

withDefaults(defineProps<Props>(), {
  autoRotate: true,
  height: '600rpx'
});
</script>

<template>
  <view class="model-section">
    <view class="section-title">
      <text class="title-text">3D模型预览</text>
    </view>
    <view class="model-viewer-container">
      <Model3DViewer
        :modelUrl="modelUrl"
        :autoRotate="autoRotate"
        width="100%"
        :height="height"
      />
    </view>
  </view>
</template>

<style scoped lang="scss">
.model-section {
  background-color: #fff;
  margin: 24rpx 32rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
  position: relative;
  isolation: isolate;
}

.section-title {
  padding: 32rpx 32rpx 0;
  background-color: #fff;

  .title-text {
    font-size: 34rpx;
    font-weight: 700;
    color: #1d1d1f;
  }
}

.model-viewer-container {
  padding: 32rpx;
  background-color: #fff;
  position: relative;
}
</style>
