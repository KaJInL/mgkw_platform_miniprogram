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

// VIP信息
const vipInfo = computed(() => {
  return accountStore.userInfo?.vip || null
})

// VIP到期时间（格式化显示）
const vipEndTime = computed(() => {
  if (!vipInfo.value) return null
  const endTime = new Date(vipInfo.value.endTime)
  const year = endTime.getFullYear()
  const month = String(endTime.getMonth() + 1).padStart(2, '0')
  const day = String(endTime.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
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
  <view class="user-card" @click="handleClick">
    <!-- 左侧：头像和用户名 -->
    <view class="user-main">
      <view class="avatar-container">
        <image
            class="avatar"
            :src="accountStore.userInfo?.user?.avatar || '/static/images/default-avatar.png'"
            mode="aspectFill"
        />
      </view>
      <view class="user-details">
        <view class="name-row">
          <text class="nickname">{{ accountStore.userInfo?.user?.nickname }}</text>
          <view v-if="isVip" class="vip-tag-mini">VIP</view>
        </view>
        <text class="user-id">ID: {{ accountStore.userInfo?.user?.id || '未登录' }}</text>
        
        <!-- VIP 状态 -->
        <view v-if="accountStore.isLoggedIn" class="vip-status-text" :class="{ 'is-vip': isVip }">
           {{ isVip ? `会员有效期至 ${vipEndTime}` : '普通用户' }}
        </view>
      </view>
    </view>

    <!-- 右侧：箭头 -->
    <view class="card-arrow">
      <text class="arrow-icon">›</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.user-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40rpx 0;
}

.user-main {
  display: flex;
  align-items: center;
  gap: 32rpx;
  flex: 1;
  overflow: hidden; /* 防止溢出 */
}

.avatar-container {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: #fff;
  padding: 4rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #f5f5f7;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
  overflow: hidden;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.nickname {
  font-size: 40rpx;
  font-weight: 600;
  color: #1d1d1f;
  letter-spacing: 0.5rpx;
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vip-tag-mini {
  background: #1d1d1f;
  color: #ffd700;
  font-size: 18rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: bold;
  letter-spacing: 1rpx;
  flex-shrink: 0;
}

.user-id {
  font-size: 24rpx;
  color: #86868b;
  letter-spacing: 1rpx;
}

.vip-status-text {
  font-size: 22rpx;
  color: #86868b;
  margin-top: 4rpx;
  
  &.is-vip {
    color: #b8860b;
  }
}

.card-arrow {
  margin-left: 20rpx;
  flex-shrink: 0;
  .arrow-icon {
    font-size: 40rpx;
    color: #86868b;
    font-weight: 300;
  }
}
</style>





