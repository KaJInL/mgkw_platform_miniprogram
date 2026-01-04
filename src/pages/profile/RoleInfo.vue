<script setup lang="ts">
import type { RoleInfo } from '@/common/apis/accountApi'

interface Props {
  roles: RoleInfo[]
}

const props = defineProps<Props>()
</script>

<template>
  <view class="info-card card-animate" :style="{ animationDelay: '0.2s' }">
    <view class="card-header role-header">
      <text class="card-title">角色权限</text>
    </view>
    
    <view class="card-body">
      <view v-if="props.roles && props.roles.length > 0" class="roles-list">
        <view 
          v-for="role in props.roles" 
          :key="role.id"
          class="role-item"
        >
          <view class="role-icon">
            <text class="icon-text">🔐</text>
          </view>
          <view class="role-content">
            <text class="role-name">{{ role.roleName }}</text>
            <text v-if="role.description" class="role-desc">{{ role.description }}</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-roles">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无角色信息</text>
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
  
  &.role-header {
    background: #1d1d1f;
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

/* 角色列表 */
.roles-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.role-item {
  display: flex;
  align-items: center;
  padding: 28rpx;
  background: #f5f5f7;
  border-radius: 16rpx;
}

.role-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #1d1d1f;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.icon-text {
  font-size: 40rpx;
}

.role-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.role-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.role-desc {
  font-size: 24rpx;
  color: #86868b;
}

/* 空状态 */
.empty-roles {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
  opacity: 0.4;
}

.empty-text {
  font-size: 28rpx;
  color: #86868b;
}
</style>

