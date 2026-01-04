<script setup lang="ts">
import {computed} from "vue";

/**
 * 图片展示组件
 */
interface Props {
  /** 图片URL列表 */
  images: string[]
}

const props = defineProps<Props>();

/**
 * 是否有图片
 */
const hasImages = computed(() => {
  // 卫语句：检查图片数组是否存在
  if (!props.images) return false;
  if (!Array.isArray(props.images)) return false;
  return props.images.length > 0;
});

/**
 * 预览图片
 */
const previewImage = (current: string, urls: string[]) => {
  uni.previewImage({
    current,
    urls
  });
};
</script>

<template>
  <view class="images-container">
    <view class="section-title">
      <text class="title-text">图片展示</text>
    </view>
    <view v-if="hasImages" class="image-list">
      <view
        v-for="(image, index) in images"
        :key="index"
        class="image-item"
        @click="previewImage(image, images)"
      >
        <image
          :src="image"
          mode="widthFix"
          class="design-image"
          lazy-load
        />
      </view>
    </view>
    <view v-else class="no-image">
      <text>暂无图片</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.images-container {
  background-color: #fff;
  margin: 24rpx 32rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
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

.image-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 32rpx;

  .image-item {
    width: 100%;
    border-radius: 16rpx;
    overflow: hidden;
    background-color: #f5f5f7;
    box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.02);

    .design-image {
      width: 100%;
      display: block;
    }
  }
}

.no-image {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
  color: #86868b;
  font-size: 28rpx;
}
</style>
