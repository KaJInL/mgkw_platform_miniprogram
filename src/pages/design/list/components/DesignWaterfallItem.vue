<script setup lang="ts">
import {computed, onMounted, ref, getCurrentInstance} from 'vue'
import {storeToRefs} from 'pinia'
import type {DesignProductInfo} from '@/common/apis/designProductApi'
import {useCategoryStore} from '@/store/categoryStore'

const props = defineProps<{
  item: DesignProductInfo,
  extraHeight?: number,
  bgColor?: string
}>()

const isVisible = ref(false)
const instance = getCurrentInstance()

const categoryStore = useCategoryStore()
const {categoryList, seriesList} = storeToRefs(categoryStore)

// 获取类目名称
const categoryName = computed(() => {
  if (!props.item.categoryId) return ''
  if (!categoryList.value || !Array.isArray(categoryList.value)) return ''
  const category = categoryList.value.find(c => c.id === props.item.categoryId)
  return category ? category.name : ''
})

// 获取系列名称
const seriesName = computed(() => {
  if (!props.item.seriesId) return ''
  if (!seriesList.value || !Array.isArray(seriesList.value)) return ''
  const series = seriesList.value.find(s => s.id === props.item.seriesId)
  return series ? series.name : ''
})

// 格式化描述
const shortDescription = computed(() => {
  if (!props.item.description) return ''
  return props.item.description.length > 40
      ? props.item.description.substring(0, 40) + '...'
      : props.item.description
})

// 跳转详情
const navigateToDetail = () => {
  uni.navigateTo({
    url: `/pages/design/detail/index?id=${props.item.id}`
  })
}

onMounted(() => {
  // 简单的延时入场动画，或者使用 IntersectionObserver
  const observer = uni.createIntersectionObserver(instance)
  observer.relativeToViewport({bottom: 100}).observe(`.design-item-${props.item.id}`, (res) => {
    if (res.intersectionRatio > 0) {
      isVisible.value = true
      observer.disconnect()
    }
  })
})
</script>

<template>
  <view
      class="design-item-container"
      :class="[`design-item-${item.id}`, { 'is-visible': isVisible }]"
      :style="{ 
        paddingBottom: extraHeight ? extraHeight + 'rpx' : '0',
      }"
      @click="navigateToDetail"
  >
    <view class="image-box" :style="{ backgroundColor: bgColor || '#f5f5f5' }">
      <image
          class="design-image"
          :src="item.images && item.images.length > 0 ? item.images[0] : '/static/default-cover.png'"
          mode="widthFix"
          lazy-load
      />
      <view class="official-badge" v-if="item.isOfficial">
        <text>自营</text>
      </view>
    </view>

    <view class="info-box">
      <text class="title">{{ item.title }}</text>

      <view class="meta-info">
        <text class="tag category" v-if="categoryName">{{ categoryName }}</text>
        <text class="tag series" v-if="seriesName">{{ seriesName }}</text>
      </view>

      <text class="description" v-if="shortDescription">{{ shortDescription }}</text>
    </view>
  </view>
</template>

<style scoped>
.design-item-container {
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

.design-item-container.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.design-item-container:active {
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

.official-badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.official-badge text {
  color: #fff;
  font-size: 18rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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

.meta-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag {
  font-size: 20rpx;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
  letter-spacing: 0.5rpx;
  display: inline-block;
}

/* 高级配色：Category 优雅深色，Series 淡雅 */
.tag.category {
  background-color: #f5f5f7;
  color: #1d1d1f;
}

.tag.series {
  background-color: transparent;
  color: #86868b;
  border: 1rpx solid #e5e5ea;
}

.description {
  font-size: 24rpx;
  color: #86868b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 400;
}
</style>