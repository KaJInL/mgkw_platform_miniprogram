<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAccountStore } from '@/store/accountStore'
import PersonalInfo from './PersonalInfo.vue'
import VipInfo from './VipInfo.vue'
import RoleInfo from './RoleInfo.vue'

// 使用 accountStore
const accountStore = useAccountStore()

// 获取状态栏高度和胶囊按钮信息
const statusBarHeight = ref(0)
const menuButtonInfo = ref<any>(null)

// 计算安全区域顶部高度
const safeAreaTop = computed(() => {
  const extraSpace = 10
  let topHeight = statusBarHeight.value
  
  if (menuButtonInfo.value) {
    const menuBottom = menuButtonInfo.value.bottom || 0
    const menuBottomRpx = menuBottom * 2
    topHeight = Math.max(topHeight, menuBottomRpx)
  }
  
  return `${topHeight + extraSpace}rpx`
})

// 加载状态
const loading = ref(false)

// 页面展示动画状态
const pageVisible = ref(false)

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
    const systemInfo = uni.getSystemInfoSync()
    statusBarHeight.value = (systemInfo.statusBarHeight || 0) * 2
    
    // @ts-ignore
    if (uni.getMenuButtonBoundingClientRect) {
      // @ts-ignore
      menuButtonInfo.value = uni.getMenuButtonBoundingClientRect()
    }
  } catch (error) {
    console.error('获取系统信息失败:', error)
    statusBarHeight.value = 40
  }
}

// 加载用户信息
const loadUserInfo = async () => {
  loading.value = true
  try {
    await accountStore.getUserInfo(true)
  } catch (error) {
    console.error('加载用户信息失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 刷新用户信息
const handleRefresh = async () => {
  await loadUserInfo()
  uni.showToast({
    title: '刷新成功',
    icon: 'success'
  })
}
</script>

<template>
  <view class="userinfo-page">
    <!-- 加载状态 -->
    <view v-if="loading && !accountStore.userInfo" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">正在加载用户信息...</text>
    </view>

    <!-- 用户信息内容（使用scroll-view实现滚动） -->
    <scroll-view 
      v-else-if="accountStore.userInfo" 
      class="scroll-content"
      scroll-y
      :show-scrollbar="false"
    >
      <view class="content" :class="{ 'visible': pageVisible }">
      <!-- 用户基本信息卡片 -->
      <PersonalInfo v-if="accountStore.userInfo?.user" :user="accountStore.userInfo.user" />

      <!-- VIP 会员卡片 -->
      <VipInfo :vip="accountStore.userInfo?.vip" />

      <!-- 角色权限卡片 -->
      <RoleInfo :roles="accountStore.userInfo?.roles || []" />

      <!-- 操作按钮 -->
      <view class="action-buttons card-animate" :style="{ animationDelay: '0.3s' }">
        <view class="action-btn refresh-btn" @click="handleRefresh" :class="{ 'loading': loading }">
          <text class="btn-icon">🔄</text>
          <text class="btn-text">刷新信息</text>
        </view>
      </view>
      </view>
    </scroll-view>

    <!-- 错误状态 -->
    <view v-else class="error-container">
      <text class="error-icon">⚠️</text>
      <text class="error-text">无法加载用户信息</text>
      <view class="error-btn" @click="loadUserInfo">
        <text class="error-btn-text">重新加载</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.userinfo-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fbfbfd;
}

/* 滚动容器 */
.scroll-content {
  flex: 1;
  height: 100%;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  animation: fadeIn 0.5s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #e5e5e5;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 30rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

/* 内容区域 */
.content {
  padding: 30rpx;
  padding-bottom: 100rpx;
  opacity: 0;
  transform: translateY(30rpx);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.visible {
    opacity: 1;
    transform: translateY(0);
  }
}


/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 32rpx 88rpx;
  border-radius: 100rpx;
  font-size: 32rpx;
  font-weight: 600;
  background: #1d1d1f;
  transition: all 0.3s ease;
  
  &.loading {
    opacity: 0.7;
  }
  
  &:active {
    transform: scale(0.98);
  }
}

.refresh-btn {
  color: #fff;
}

.btn-icon {
  font-size: 32rpx;
}

.btn-text {
  font-size: 30rpx;
}

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  animation: fadeIn 0.5s ease-in-out;
}

.error-icon {
  font-size: 100rpx;
  margin-bottom: 30rpx;
  opacity: 0.5;
}

.error-text {
  font-size: 28rpx;
  color: #86868b;
  margin-bottom: 40rpx;
}

.error-btn {
  padding: 24rpx 48rpx;
  background: #1d1d1f;
  border-radius: 100rpx;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
}

.error-btn-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 500;
}
</style>


