<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getRecommendList, type RecommendItem } from '@/common/apis/recommendApi'

// 页面数据
const pages = ref<RecommendItem[]>([])
const loading = ref(true)

const scrollTop = ref(0)
const windowHeight = ref(0)

// 获取推荐列表数据
const fetchRecommendList = async () => {
  try {
    loading.value = true
    const res = await getRecommendList()
    if (res.isSuccess) {
      pages.value = res.data.list
    }
  } catch (error) {
    console.error('获取推荐列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 获取窗口高度并加载数据
onMounted(() => {
  uni.getSystemInfo({
    success: (res) => {
      windowHeight.value = res.windowHeight
    }
  })
  fetchRecommendList()
})

// 滚动事件处理
const onScroll = (e: any) => {
  scrollTop.value = e.detail.scrollTop
}

// 计算每个页面的translateY位置
// 实现视差滚动：上一p位置不变，下一p从下方滑上来覆盖
const getPageTransform = (index: number) => {
  if (windowHeight.value === 0) {
    // 初始状态：第一个页面在顶部，其他页面在下方
    return index === 0 ? 'translateY(0px)' : `translateY(${index * 800}px)`
  }
  
  const pageHeight = windowHeight.value
  const currentScroll = scrollTop.value
  const pageStart = index * pageHeight
  const pageEnd = pageStart + pageHeight
  
  // 如果页面已经被滚动过（上一p），位置保持不变，固定在视口上方
  if (currentScroll >= pageEnd) {
    return `translateY(-${pageHeight}px)`
  }
  
  // 如果页面正在视口内，跟随滚动保持在视口顶部
  if (currentScroll >= pageStart && currentScroll < pageEnd) {
    return `translateY(${pageStart - currentScroll}px)`
  }
  
  // 如果页面还没滚动到（下一p），从下方滑上来
  return `translateY(${pageStart - currentScroll}px)`
}

// 计算页面的z-index，后面的页面层级更高，能够覆盖前面的页面
const getPageZIndex = (index: number) => {
  // index越大，z-index越大，后面的页面覆盖前面的页面
  // 从10开始，确保高于scroll-container的z-index(1)
  return index + 10
}

// 计算内容透明度 - 当前视口内的页面最清晰
const getOpacity = (index: number) => {
  if (windowHeight.value === 0) return 1
  
  const pageHeight = windowHeight.value
  const currentScroll = scrollTop.value
  const pageStart = index * pageHeight
  const pageEnd = pageStart + pageHeight
  const pageCenter = pageStart + pageHeight / 2
  
  // 如果页面在视口内
  if (currentScroll >= pageStart && currentScroll < pageEnd) {
    const distance = Math.abs(currentScroll - pageCenter)
    const maxDistance = pageHeight / 2
    return Math.max(0.6, 1 - distance / maxDistance)
  }
  
  // 如果页面在视口上方（已经滚动过去）
  if (currentScroll >= pageEnd) {
    return 0.3
  }
  
  // 如果页面在视口下方（还没滚动到）
  return 0.5
}

// 计算内容缩放
const getScale = (index: number) => {
  if (windowHeight.value === 0) return 1
  
  const pageHeight = windowHeight.value
  const currentScroll = scrollTop.value
  const pageStart = index * pageHeight
  const pageEnd = pageStart + pageHeight
  const pageCenter = pageStart + pageHeight / 2
  
  // 如果页面在视口内
  if (currentScroll >= pageStart && currentScroll < pageEnd) {
    const distance = Math.abs(currentScroll - pageCenter)
    const maxDistance = pageHeight / 2
    const progress = Math.max(0, Math.min(1, 1 - distance / maxDistance))
    return 0.9 + progress * 0.1
  }
  
  return 0.9
}

// 计算背景视差偏移
const getParallaxOffset = (index: number) => {
  if (windowHeight.value === 0) return 0
  
  const pageHeight = windowHeight.value
  const currentScroll = scrollTop.value
  const pageStart = index * pageHeight
  const pageEnd = pageStart + pageHeight
  
  // 只在页面进入视口时应用视差
  if (currentScroll >= pageStart && currentScroll < pageEnd) {
    const progress = (currentScroll - pageStart) / pageHeight
    // 背景移动速度较慢，产生视差效果
    return (currentScroll - pageStart) * 0.3
  }
  
  return 0
}

// 跳转到详情页
const navigateToDetail = (designProductId: number) => {
  uni.navigateTo({
    url: `/pages/design/detail/index?id=${designProductId}`
  })
}
</script>

<template>
  <view class="recommend-page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <view class="loading-text">加载中...</view>
    </view>
    
    <!-- 空数据提示 -->
    <view v-else-if="pages.length === 0" class="empty-container">
      <view class="empty-text">暂无推荐内容</view>
    </view>
    
    <!-- 推荐内容 -->
    <template v-else>
      <!-- 滚动容器，用于触发滚动事件 -->
      <scroll-view
        class="scroll-container"
        scroll-y
        @scroll="onScroll"
        :enable-back-to-top="true"
        :scroll-with-animation="false"
      >
        <!-- 占位内容，用于产生滚动高度 -->
        <view 
          class="scroll-placeholder"
          :style="{ height: windowHeight > 0 ? (pages.length * windowHeight) + 'px' : (pages.length * 800) + 'px' }"
        ></view>
      </scroll-view>
      
      <!-- 固定定位的页面层 -->
      <view
        v-for="(page, index) in pages"
        :key="page.designProductId"
        class="page-section"
        :style="{
          height: (windowHeight || 800) + 'px',
          transform: getPageTransform(index),
          zIndex: getPageZIndex(index)
        }"
      >
        <!-- 视频背景层 -->
        <view class="page-bg">
          <video
            v-if="page.videoUrl"
            :src="page.videoUrl"
            class="bg-video"
            autoplay
            loop
            muted
            :show-center-play-btn="false"
            :show-play-btn="false"
            :controls="false"
            object-fit="cover"
          ></video>
          <!-- 视频遮罩层 -->
          <view class="video-mask"></view>
        </view>
        
        <!-- 设计图片层（独立，不受opacity影响） -->
        <view class="page-image-layer">
          <view class="design-image-container" @click="navigateToDetail(page.designProductId)">
            <image
              v-if="page.designImageUrl"
              :src="page.designImageUrl"
              class="design-image"
              mode="aspectFill"
            ></image>
          </view>
        </view>
        
        <!-- 文字内容层 -->
        <view
          class="page-content"
          :style="{
            opacity: getOpacity(index),
            transform: `scale(${getScale(index)})`
          }"
        >
          <view class="content-wrapper">
            <!-- 标题 -->
            <view class="page-title" @click="navigateToDetail(page.designProductId)">{{ page.title }}</view>
            
            <!-- 副标题 -->
            <view class="page-subtitle">{{ page.subTitle }}</view>
            
            <!-- 类型标签 -->
            <view v-if="page.type" class="page-type">{{ page.type }}</view>
          </view>
        </view>
      </view>
      
      <!-- 页面指示器 -->
      <view class="page-indicator">
        <view
          v-for="(page, index) in pages"
          :key="page.designProductId"
          class="indicator-dot"
          :class="{ active: windowHeight > 0 && Math.floor(scrollTop / windowHeight) === index }"
        ></view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
.recommend-page {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #000;
}

// 加载状态
.loading-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.loading-text {
  font-size: 32rpx;
  color: #fff;
  opacity: 0.8;
}

// 空数据状态
.empty-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
}

.empty-text {
  font-size: 32rpx;
  color: #fff;
  opacity: 0.6;
}

.scroll-container {
  width: 100%;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: auto;
  background: transparent;
}

.scroll-placeholder {
  width: 100%;
  pointer-events: none;
}

.page-section {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  overflow: hidden;
  will-change: transform;
  pointer-events: none;
  z-index: 10;
}

.page-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  background: #000;
  
  .bg-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .video-mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.3) 0%,
      rgba(0, 0, 0, 0.5) 100%
    );
    z-index: 1;
  }
}

// 图片层（独立于内容层，不受opacity影响）
.page-image-layer {
  position: relative;
  z-index: 3;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding-bottom: 340rpx; // 为下方文字预留空间
}

// 设计图片
.design-image-container {
  width: 600rpx;
  height: 300rpx;
  border-radius: 16rpx;
  overflow: hidden;
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.3s ease;
  &:active {
    transform: scale(0.98);
  }
}

.page-content {
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 2;
  width: 100%;
  padding-bottom: 400rpx;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  will-change: transform, opacity;
  pointer-events: none;
}

.content-wrapper {
  text-align: center;
  padding: 0 60rpx;
  color: #fff;
  max-width: 600rpx;
}

.design-image {
  width: 100%;
  height: 100%;
  display: block;
}

.page-title {
  font-size: 48rpx;
  font-weight: bold;
  letter-spacing: 2rpx;
  line-height: 1.4;
  pointer-events: auto;
  cursor: pointer;
  transition: opacity 0.3s ease;
  
  &:active {
    opacity: 0.7;
  }
}

.page-subtitle {
  font-size: 28rpx;
  opacity: 0.9;
  margin-bottom: 24rpx;
  letter-spacing: 1rpx;
  font-weight: 300;
  line-height: 1.5;
}

.page-type {
  display: inline-block;
  padding: 12rpx 32rpx;
  font-size: 24rpx;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 40rpx;
  margin-top: 16rpx;
}

// 页面指示器
.page-indicator {
  position: fixed;
  right: 40rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  pointer-events: none;
}

.indicator-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
  
  &.active {
    width: 16rpx;
    height: 16rpx;
    background: rgba(255, 255, 255, 0.9);
  }
}
</style>
