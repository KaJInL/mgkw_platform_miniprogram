<script setup lang="ts">
import {computed} from 'vue'
import {useAccountStore} from '@/store/accountStore'

const accountStore = useAccountStore()

// 判断是否为VIP
const isVip = computed(() => {
  if (!accountStore.userInfo?.vip) return false
  
  // 检查是否到期
  const endTime = new Date(accountStore.userInfo.vip.endTime)
  const now = new Date()
  return endTime > now
})

// 点击事件
const emit = defineEmits<{
  (e: 'click'): void
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <view class="vip-banner" @click="handleClick">
    <view class="vip-banner-content">
      <view class="vip-left">
        <text class="vip-title">尊享会员</text>
        <text class="vip-subtitle">{{ isVip ? '尊享会员权益生效中' : '升级解锁全站设计资源' }}</text>
      </view>
      <view class="vip-btn">
        {{ isVip ? '续费' : '立即开通' }}
      </view>
    </view>
    <view class="vip-bg-decoration"></view>
  </view>
</template>

<style scoped lang="scss">
.vip-banner {
  margin-top: 20rpx;
  background: #1d1d1f;
  border-radius: 24rpx;
  padding: 32rpx 40rpx;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.15);
  transition: transform 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
}

.vip-banner-content {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.vip-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.vip-title {
  color: #ffd700;
  font-size: 32rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.vip-subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 24rpx;
}

.vip-btn {
  background: #ffd700;
  color: #1d1d1f;
  font-size: 26rpx;
  font-weight: 600;
  padding: 12rpx 32rpx;
  border-radius: 100rpx;
}

.vip-bg-decoration {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 300rpx;
  height: 300rpx;
  background: radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
</style>






