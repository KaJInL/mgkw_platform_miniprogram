<script setup lang="ts">
import FunctionItem from './FunctionItem.vue'

const emit = defineEmits<{
  (e: 'order-click'): void
  (e: 'purchased-click'): void
  (e: 'profile-click'): void
  (e: 'settings-click'): void
}>()

const handleOrderClick = () => {
  emit('order-click')
}

const handlePurchasedClick = () => {
  emit('purchased-click')
}

const handleProfileClick = () => {
  emit('profile-click')
}

const handleSettingsClick = () => {
  emit('settings-click')
}
</script>

<template>
  <view class="function-section">
    <view class="section-header">
      <text class="section-title">我的服务</text>
    </view>

    <view class="function-grid">
      <!-- 我的订单 -->
      <FunctionItem
          icon="📦"
          title="我的订单"
          desc="查看全部订单记录"
          delay="0.1s"
          @click="handleOrderClick"
      />

      <!-- 已购买资源 -->
      <FunctionItem
          icon="💎"
          title="已购资源"
          desc="浏览我的资源库"
          delay="0.15s"
          @click="handlePurchasedClick"
      />

      <!-- 个人信息 -->
      <FunctionItem
          icon="👤"
          title="个人信息"
          desc="管理个人资料"
          delay="0.2s"
          @click="handleProfileClick"
      />

      <!-- 设置 -->
      <FunctionItem
          icon="⚙️"
          title="系统设置"
          desc="应用设置与管理"
          delay="0.25s"
          @click="handleSettingsClick"
      />
    </view>
  </view>
</template>

<style scoped lang="scss">
.function-section {
  padding: 40rpx;
}

.section-header {
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.function-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}
</style>





