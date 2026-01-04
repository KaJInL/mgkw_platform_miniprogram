<script setup lang="ts">
import { onMounted, ref, getCurrentInstance } from 'vue'
import type { PurchasedDesignProductItem } from '@/common/apis/designProductApi'

const props = defineProps<{
  item: PurchasedDesignProductItem
  extraHeight?: number
  bgColor?: string
}>()

const isVisible = ref(false)
const instance = getCurrentInstance()

// 跳转详情
const navigateToDetail = () => {
  if (props.item.designId) {
    uni.navigateTo({
      url: `/pages/design/detail/index?id=${props.item.designId}`
    })
  } else {
    uni.showToast({
      title: '无法获取设计作品ID',
      icon: 'none'
    })
  }
}

onMounted(() => {
  // 简单的延时入场动画，或者使用 IntersectionObserver
  if (!props.item.productId) return
  const observer = uni.createIntersectionObserver(instance)
  observer.relativeToViewport({ bottom: 100 }).observe(`.purchased-item-${props.item.productId}`, (res) => {
    if (res.intersectionRatio > 0) {
      isVisible.value = true
      observer.disconnect()
    }
  })
})
</script>

<template>
  <view
    class="purchased-item-container"
    :class="[`purchased-item-${item.productId}`, { 'is-visible': isVisible }]"
    :style="{
      paddingBottom: extraHeight ? extraHeight + 'rpx' : '0'
    }"
    @click="navigateToDetail"
  >
    <view class="image-box" :style="{ backgroundColor: bgColor || '#f5f5f5' }">
      <image
        class="design-image"
        :src="item.imgUrl || '/static/default-cover.png'"
        mode="widthFix"
        lazy-load
      />
    </view>

    <view class="info-box">
      <text class="title">{{ item.name }}</text>
    </view>
  </view>
</template>

<style scoped>
.purchased-item-container {
  border-radius: 24rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  background-color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  position: relative;
  width: 100%;

  /* 初始状态：透明且下移 */
  opacity: 0;
  transform: translateY(40rpx);
  transition: opacity 0.8s ease, transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.purchased-item-container.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.purchased-item-container:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.image-box {
  position: relative;
  width: 100%;
  font-size: 0;
  overflow: hidden;
}

.design-image {
  width: 100%;
  display: block;
  transition: opacity 0.5s ease;
}

.info-box {
  padding: 20rpx 24rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.title {
  font-size: 28rpx;
  color: #1d1d1f;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

