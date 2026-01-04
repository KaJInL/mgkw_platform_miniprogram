<script setup lang="ts">
import { ref, onMounted } from 'vue'
import designProductApi, { type PurchasedDesignProductItem } from '@/common/apis/designProductApi'
import PurchasedDesignItem from './components/PurchasedDesignItem.vue'

// 扩展类型以包含背景色
interface PurchasedDesignProductItemWithColor extends PurchasedDesignProductItem {
  bgColor?: string
}

// 状态变量
const refreshing = ref(false)
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const pageSize = ref(10)

// 瀑布流左右两列数据
const leftList = ref<PurchasedDesignProductItemWithColor[]>([])
const rightList = ref<PurchasedDesignProductItemWithColor[]>([])
// 记录总数用于判断是否还有更多
const totalCount = ref(0)

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

const resetList = () => {
  page.value = 1
  hasMore.value = true
  leftList.value = []
  rightList.value = []
  totalCount.value = 0
}

// 加载数据核心逻辑
const loadData = async () => {
  if (loading.value) return
  loading.value = true

  try {
    const res = await designProductApi.getPurchasedDesignProducts({
      page: page.value,
      pageSize: pageSize.value
    })

    if (res.isSuccess && res.data) {
      const { list, total, hasNext } = res.data
      totalCount.value = total
      hasMore.value = hasNext

      // 简单的左右分发策略
      list.forEach((item) => {
        // 为每个item分配一个颜色
        const itemWithColor: PurchasedDesignProductItemWithColor = {
          ...item,
          bgColor: getRandomColor()
        }

        if (leftList.value.length <= rightList.value.length) {
          leftList.value.push(itemWithColor)
        } else {
          rightList.value.push(itemWithColor)
        }
      })
    }
  } catch (e) {
    console.error('加载已购买设计作品失败', e)
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

onMounted(() => {
  loadData()
})
</script>

<template>
  <view class="my-resources-page">
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
          <PurchasedDesignItem
            v-for="item in leftList"
            :key="item.productId"
            :item="item"
            :bg-color="item.bgColor"
          />
        </view>

        <!-- 右列 -->
        <view class="waterfall-column">
          <PurchasedDesignItem
            v-for="(item, index) in rightList"
            :key="item.productId"
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
        <text>暂无已购买的设计作品</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.my-resources-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fbfbfd;
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
