<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSysConfStore, SysConfKeyEnum } from '@/store/sysConfStore'

const sysConfStore = useSysConfStore()

// 客服电话
const servicePhone = computed(() => {
  return sysConfStore.getConf(SysConfKeyEnum.CUSTOMER_SERVICE_PHONE) || '未配置'
})

// 加载配置
onMounted(async () => {
  await sysConfStore.load()
})

// 点击用户协议
const handleUserAgreement = () => {
  uni.navigateTo({
    url: '/pages/settings/user-agreement/index'
  })
}

// 点击隐私政策
const handlePrivacyPolicy = () => {
  uni.navigateTo({
    url: '/pages/settings/privacy-policy/index'
  })
}

// 点击客服电话，拨打电话
const handleServicePhone = () => {
  const phoneFromStore = sysConfStore.getConf(SysConfKeyEnum.CUSTOMER_SERVICE_PHONE)
  if (!phoneFromStore) {
    uni.showToast({
      title: '客服电话未配置',
      icon: 'none'
    })
    return
  }
  
  uni.makePhoneCall({
    phoneNumber: phoneFromStore,
    success: () => {
      console.log('拨打电话成功')
    },
    fail: (err) => {
      console.error('拨打电话失败', err)
      uni.showToast({
        title: '拨打电话失败',
        icon: 'none'
      })
    }
  })
}
</script>

<template>
  <view class="settings-page">
    <view class="settings-list">
      <!-- 用户协议 -->
      <view class="settings-item" @click="handleUserAgreement">
        <view class="item-left">
          <text class="item-icon">📄</text>
          <text class="item-title">用户协议</text>
        </view>
        <text class="item-arrow">›</text>
      </view>

      <!-- 隐私政策 -->
      <view class="settings-item" @click="handlePrivacyPolicy">
        <view class="item-left">
          <text class="item-icon">🔒</text>
          <text class="item-title">隐私政策</text>
        </view>
        <text class="item-arrow">›</text>
      </view>

      <!-- 客服电话 -->
      <view class="settings-item" @click="handleServicePhone">
        <view class="item-left">
          <text class="item-icon">📞</text>
          <view class="item-content">
            <text class="item-title">客服电话</text>
            <text class="item-desc">{{ servicePhone }}</text>
          </view>
        </view>
        <text class="item-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background-color: #f5f5f7;
  padding: 40rpx;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.settings-item {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
    background: #fafafa;
  }
}

.item-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
  flex: 1;
}

.item-icon {
  font-size: 48rpx;
  line-height: 1;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.item-title {
  font-size: 32rpx;
  color: #1d1d1f;
  font-weight: 500;
  line-height: 1.2;
}

.item-desc {
  font-size: 26rpx;
  color: #86868b;
  line-height: 1.2;
}

.item-arrow {
  font-size: 40rpx;
  color: #d1d1d6;
  font-weight: 300;
  margin-left: 16rpx;
}
</style>