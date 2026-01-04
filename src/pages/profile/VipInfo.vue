<script setup lang="ts">
import { computed } from 'vue'
import type { VipInfo } from '@/common/apis/accountApi'

interface Props {
  vip?: VipInfo | null
}

const props = defineProps<Props>()

// 判断是否为VIP
const isVip = computed(() => {
  if (!props.vip) return false
  
  // 检查是否到期
  const endTime = new Date(props.vip.endTime)
  const now = new Date()
  return endTime > now
})

// VIP到期时间（格式化显示）
const vipEndTime = computed(() => {
  if (!props.vip) return null
  const endTime = new Date(props.vip.endTime)
  const year = endTime.getFullYear()
  const month = String(endTime.getMonth() + 1).padStart(2, '0')
  const day = String(endTime.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
})

// 跳转到VIP套餐页面
const goToVipPlan = () => {
  uni.navigateTo({
    url: '/pages/vip-plan/index'
  })
}
</script>

<template>
  <view class="info-card card-animate" :style="{ animationDelay: '0.2s' }">
    <view class="card-header vip-header">
      <text class="card-title">会员信息</text>
    </view>
    
    <view class="card-body">
      <view v-if="isVip" class="vip-active-card">
        <view class="vip-status-row">
          <view class="vip-badge-large">
            <text class="vip-badge-text">VIP</text>
          </view>
          <text class="vip-status-label">会员生效中</text>
        </view>
        <view class="vip-info-row">
          <view class="vip-detail-item">
            <text class="vip-detail-label">到期时间</text>
            <text class="vip-detail-value">{{ vipEndTime }}</text>
          </view>
        </view>
        <view class="vip-action-btn" @click="goToVipPlan">
          <text class="vip-action-text">续费会员</text>
        </view>
      </view>
      <view v-else class="vip-inactive-card" @click="goToVipPlan">
        <view class="vip-inactive-icon">👑</view>
        <text class="vip-inactive-title">开通会员</text>
        <text class="vip-inactive-desc">升级解锁全站设计资源</text>
        <view class="vip-inactive-btn">
          <text class="vip-inactive-btn-text">立即开通</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 信息卡片 */
.info-card {
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 30rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}

/* 卡片进入动画 */
.card-animate {
  opacity: 0;
  transform: translateY(40rpx);
  animation: cardSlideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes cardSlideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  background: #1d1d1f;
  padding: 32rpx;
  position: relative;
  overflow: hidden;
  
  &.vip-header {
    background: linear-gradient(135deg, #1d1d1f 0%, #2d2d2f 100%);
  }
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  position: relative;
  z-index: 1;
  letter-spacing: 1rpx;
}

.card-body {
  padding: 40rpx 30rpx;
}

/* VIP 会员卡片样式 */
.vip-active-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.vip-status-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.vip-badge-large {
  background: #1d1d1f;
  color: #ffd700;
  font-size: 24rpx;
  padding: 8rpx 24rpx;
  border-radius: 12rpx;
  font-weight: bold;
  letter-spacing: 2rpx;
}

.vip-badge-text {
  color: #ffd700;
}

.vip-status-label {
  font-size: 28rpx;
  color: #1d1d1f;
  font-weight: 600;
}

.vip-info-row {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 24rpx;
  background: #f5f5f7;
  border-radius: 16rpx;
}

.vip-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vip-detail-label {
  font-size: 26rpx;
  color: #86868b;
}

.vip-detail-value {
  font-size: 28rpx;
  color: #1d1d1f;
  font-weight: 600;
}

.vip-action-btn {
  padding: 24rpx;
  background: #1d1d1f;
  border-radius: 16rpx;
  text-align: center;
}

.vip-action-text {
  font-size: 28rpx;
  color: #ffd700;
  font-weight: 600;
}

.vip-inactive-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
  gap: 16rpx;
}

.vip-inactive-icon {
  font-size: 80rpx;
  margin-bottom: 8rpx;
}

.vip-inactive-title {
  font-size: 32rpx;
  color: #1d1d1f;
  font-weight: 600;
}

.vip-inactive-desc {
  font-size: 26rpx;
  color: #86868b;
  margin-bottom: 16rpx;
}

.vip-inactive-btn {
  padding: 20rpx 48rpx;
  background: #1d1d1f;
  border-radius: 100rpx;
}

.vip-inactive-btn-text {
  font-size: 28rpx;
  color: #ffd700;
  font-weight: 600;
}
</style>

