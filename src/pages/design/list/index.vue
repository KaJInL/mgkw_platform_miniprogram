<script setup lang="ts">
import { ref, onMounted } from 'vue'
import designProductApi, { type DesignProductInfo, DesignState } from '@/common/apis/designProductApi'
import { useCategoryStore } from '@/store/categoryStore'
import DesignWaterfallItem from './components/DesignWaterfallItem.vue'
import {SysConfKeyEnum, useSysConfStore} from "@/store/sysConfStore";

// 扩展类型以包含背景色
interface DesignProductInfoWithColor extends DesignProductInfo {
  bgColor?: string
}

// 状态变量
const currentFilter = ref('all')
const refreshing = ref(false)
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = ref(10)

// 瀑布流左右两列数据
const leftList = ref<DesignProductInfoWithColor[]>([])
const rightList = ref<DesignProductInfoWithColor[]>([])
// 记录总数用于判断是否还有更多
const totalCount = ref(0)

const categoryStore = useCategoryStore()

// 莫兰迪色系 / 高级低饱和度背景色池
const colorPalette = [
  '#F5F5F7', // 经典灰
  '#F2F4F8', // 极淡蓝灰
  '#F7F5F2', // 暖米白
  '#F0F2F0', // 极淡青灰
  '#F4F2F6', // 极淡紫灰
  '#F8F4F2', // 极淡暖红
  '#F1F1F1', // 纯净灰
  '#EDF1F2', // 冷调灰
]

// 获取随机颜色
const getRandomColor = () => {
  const index = Math.floor(Math.random() * colorPalette.length)
  return colorPalette[index]
}

// 筛选切换
const setFilter = (filter: string) => {
  if (currentFilter.value === filter) return
  currentFilter.value = filter
  // 重置并重新加载
  resetList()
  loadData()
}

const resetList = () => {
  page.value = 1
  hasMore.value = true
  leftList.value = []
  rightList.value = []
  totalCount.value = 0
}

const navigateToSearch = () => {
  uni.navigateTo({ url: '/pages/search/index' })
}

// 加载数据核心逻辑
const loadData = async () => {
  if (loading.value) return
  loading.value = true

  try {
    // 确保分类数据已加载，用于显示类目和系列名称
    if (categoryStore.categoryList.length === 0) {
      categoryStore.getCategoryList()
    }
    if (categoryStore.seriesList.length === 0) {
      categoryStore.getSeriesList()
    }

    const res = await designProductApi.queryDesignProductList({
      page: page.value,
      size: pageSize.value,
      state: DesignState.APPROVED, 
    })
    
    if (res.isSuccess && res.data) {
      const { list, total } = res.data
      totalCount.value = total

      // 过滤逻辑 (如果后端API不支持isOfficial参数)
      let newList = list || []
      if (currentFilter.value === 'official') {
        newList = newList.filter(item => item.isOfficial)
      }

      // 简单的左右分发策略
      newList.forEach((item) => {
        // 为每个item分配一个颜色
        const itemWithColor: DesignProductInfoWithColor = {
          ...item,
          bgColor: getRandomColor()
        }

        if (leftList.value.length <= rightList.value.length) {
          leftList.value.push(itemWithColor)
        } else {
          rightList.value.push(itemWithColor)
        }
      })

      // 判断是否还有更多
      if (leftList.value.length + rightList.value.length >= total) {
        hasMore.value = false
      }
      
      if (list.length < pageSize.value) {
        hasMore.value = false
      }
    }
  } catch (e) {
    console.error('加载设计作品失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onRefresh = () => {
  refreshing.value = true
  resetList()
  loadData()
}

const onLoadMore = () => {
  if (!hasMore.value || loading.value) return
  page.value++
  loadData()
}

const confStore = useSysConfStore()
const logo = confStore.getConf(SysConfKeyEnum.LOGO)

function onShareAppMessage(res: any) {
  return {
    title: "美工开物小程序",
    path: "/pages/recommend/index",
    imageUrl: logo ?? ""
  }
}

function onShareTimeline(res: any) {
  return {
    title: "美工开物小程序",
    path: "/pages/recommend/index",
    imageUrl: logo ?? ""
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <view class="design-list-page">
    <!-- 搜索栏 -->
    <view class="header-section">
      <view class="search-bar">
        <view class="search-box" @click="navigateToSearch">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索设计作品</text>
        </view>
      </view>

      <!-- 筛选栏 -->
      <view class="filter-bar">
        <view
            class="filter-item"
            :class="{ active: currentFilter === 'all' }"
            @click="setFilter('all')"
        >
          <text>全部</text>
        </view>
        <view
            class="filter-item"
            :class="{ active: currentFilter === 'official' }"
            @click="setFilter('official')"
        >
          <text>官方甄选</text>
        </view>
      </view>
    </view>

    <!-- 瀑布流列表 -->
    <scroll-view
        class="design-scroll"
        scroll-y
        :refresher-enabled="true"
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="onLoadMore"
    >
      <view class="waterfall-container">
        <!-- 左列 -->
        <view class="waterfall-column">
          <DesignWaterfallItem 
            v-for="item in leftList" 
            :key="item.id" 
            :item="item"
            :bg-color="item.bgColor"
          />
        </view>
        
        <!-- 右列 -->
        <view class="waterfall-column">
          <DesignWaterfallItem 
            v-for="(item, index) in rightList" 
            :key="item.id" 
            :item="item"
            :extra-height="index === 0 ? 10 : 0"
            :bg-color="item.bgColor"
          />
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view class="load-more" v-if="loading">
        <text>LOADING...</text>
      </view>
      <view class="load-more" v-else-if="!hasMore && (leftList.length + rightList.length) > 0">
        <text class="end-text">THE END</text>
      </view>
      <view class="empty-state" v-else-if="!loading && (leftList.length + rightList.length) === 0">
        <text>暂无设计作品</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.design-list-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fbfbfd;
}

.header-section {
  background: rgba(251, 251, 253, 0.8);
  backdrop-filter: blur(20px);
  z-index: 10;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
}

.search-bar {
  padding: 20rpx 32rpx;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #fff;
  border-radius: 100rpx;
  padding: 20rpx 32rpx;
  transition: all 0.3s;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
  border: 1rpx solid rgba(0, 0, 0, 0.03);
}

.search-icon {
  font-size: 28rpx;
  color: #86868b;
}

.search-placeholder {
  font-size: 28rpx;
  color: #86868b;
  letter-spacing: 1rpx;
}

.filter-bar {
  display: flex;
  gap: 48rpx;
  padding: 10rpx 40rpx 30rpx 40rpx;
}

.filter-item {
  font-size: 28rpx;
  color: #86868b;
  position: relative;
  padding-bottom: 8rpx;
  transition: all 0.3s;
  letter-spacing: 0.5rpx;
}

.filter-item.active {
  color: #1d1d1f;
  font-weight: 600;
}

.filter-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #1d1d1f;
  border-radius: 4rpx;
}

.design-scroll {
  flex: 1;
  height: 0;
  background-color: #fbfbfd;
}

.waterfall-container {
  display: flex;
  justify-content: space-between;
  padding: 30rpx 32rpx;
  align-items: flex-start;
}

.waterfall-column {
  display: flex;
  flex-direction: column;
  width: 334rpx;
  gap: 0;
}

.load-more {
  text-align: center;
  padding: 60rpx 0 80rpx 0;
  color: #86868b;
  font-size: 22rpx;
  letter-spacing: 2rpx;
  text-transform: uppercase;
  font-weight: 500;
}

.end-text {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  opacity: 0.6;
}

.empty-state {
  padding: 160rpx 0;
  text-align: center;
  color: #86868b;
  font-size: 26rpx;
  letter-spacing: 2rpx;
}
</style>