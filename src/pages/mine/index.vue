<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import {useAccountStore} from '@/store/accountStore'
import UserCard from './components/UserCard.vue'
import VipBanner from './components/VipBanner.vue'
import FunctionGrid from './components/FunctionGrid.vue'

// 使用 accountStore
const accountStore = useAccountStore()

// 获取状态栏高度和胶囊按钮信息
const statusBarHeight = ref(0)
const menuButtonInfo = ref<any>(null)

// 页面展示状态
const pageVisible = ref(false)

// 计算安全区域顶部高度
const safeAreaTop = computed(() => {
  // 状态栏高度 + 额外间距
  const extraSpace = 20 // 额外的间距（rpx）
  let topHeight = statusBarHeight.value

  // 如果有胶囊按钮信息，确保不被遮挡
  if (menuButtonInfo.value) {
    const menuBottom = menuButtonInfo.value.bottom || 0
    // 转换为rpx（小程序的px需要转换）
    const menuBottomRpx = menuBottom * 2
    topHeight = Math.max(topHeight, menuBottomRpx)
  }

  return `${topHeight + extraSpace}rpx`
})

// 页面加载时获取用户信息
onMounted(() => {
  getSystemInfo()
  loadUserInfo()
  // 延迟触发进入动画
  setTimeout(() => {
    pageVisible.value = true
  }, 100)
})

// 获取系统信息
const getSystemInfo = () => {
  try {
    // 获取系统信息
    const systemInfo = uni.getSystemInfoSync()
    // 状态栏高度转换为rpx（1px = 2rpx）
    statusBarHeight.value = (systemInfo.statusBarHeight || 0) * 2

    // 获取胶囊按钮信息（仅小程序环境）
    // @ts-ignore
    if (uni.getMenuButtonBoundingClientRect) {
      // @ts-ignore
      menuButtonInfo.value = uni.getMenuButtonBoundingClientRect()
    }
  } catch (error) {
    console.error('获取系统信息失败:', error)
    // 设置默认值
    statusBarHeight.value = 40 // 默认状态栏高度
  }
}

// 加载用户信息
const loadUserInfo = async () => {
  await accountStore.getUserInfo(true)
}

// 点击用户信息区域
const handleUserClick = () => {
  if (accountStore.isLoggedIn) {
    // 已登录，跳转到用户信息页
    uni.navigateTo({
      url: '/pages/profile/index'
    })
  } else {
    // 未登录，跳转到登录页
    uni.navigateTo({
      url: '/pages/login/index'
    })
  }
}

// 跳转到我的订单
const goToOrders = () => {
  uni.navigateTo({
    url: '/pages/order/order-list/index'
  })
}

// 跳转到已购买资源
const goToPurchased = () => {
  uni.navigateTo({
    url: '/pages/design/my-resources/index'
  })
}

// 跳转到个人信息
const goToProfile = () => {
  uni.navigateTo({
    url: '/pages/profile/index'
  })
}

// 跳转到设置
const goToSettings = () => {
  uni.navigateTo({
    url: '/pages/settings/list/index'
  })
}

// 跳转到VIP套餐页面
const goToVipPlan = () => {
  uni.navigateTo({
    url: '/pages/vip-plan/index'
  })
}
</script>
<template>
  <view class="mine-page" :class="{ 'page-visible': pageVisible }">
    <!-- 顶部背景 -->
    <view class="header-bg"></view>

    <!-- 用户信息区 -->
    <view class="user-info-section" :style="{ paddingTop: safeAreaTop }">
      <UserCard @click="handleUserClick" />
      <VipBanner @click="goToVipPlan" />
    </view>

    <!-- 功能区 -->
    <FunctionGrid
        @order-click="goToOrders"
        @purchased-click="goToPurchased"
        @profile-click="goToProfile"
        @settings-click="goToSettings"
    />
  </view>
</template>

<style scoped lang="scss">
.mine-page {
  min-height: 100vh;
  background-color: #fbfbfd;
  position: relative;
  opacity: 0;
  transform: translateY(20rpx);
  transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);

  &.page-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 500rpx;
  background: linear-gradient(180deg, rgba(0,0,0,0.02) 0%, transparent 100%);
  z-index: 0;
  pointer-events: none;
}

/* 用户信息区 */
.user-info-section {
  padding: 0 40rpx;
  position: relative;
  z-index: 1;
  margin-bottom: 40rpx;
}
</style>

