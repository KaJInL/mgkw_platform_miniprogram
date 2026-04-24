<script setup lang="ts">
interface Props {
  isLoggedIn: boolean;
}

defineProps<Props>();

defineEmits<{
  // 跳转系统设置页。
  (e: "goSetting"): void;
  // 触发退出登录确认流程。
  (e: "logout"): void;
}>();
</script>

<template>
  <view class="settings-block">
    <view class="settings-title-row">
      <text class="settings-title">设置</text>
      <text class="settings-subtitle">快捷入口</text>
    </view>

    <view class="settings-grid">
      <view class="card settings-card" @click="$emit('goSetting')">
        <text class="settings-icon">⚙</text>
        <text class="settings-card-title">系统设置</text>
        <text class="settings-card-subtitle">偏好与通用配置</text>
      </view>

      <view class="card settings-card settings-card-danger" @click="$emit('logout')">
        <text class="settings-icon settings-icon-danger">⏻</text>
        <text class="settings-card-title settings-card-title-danger">退出登录</text>
        <text class="settings-card-subtitle settings-card-subtitle-danger">
          {{ isLoggedIn ? "清除当前登录状态" : "当前未登录" }}
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.card {
  position: relative;
  background: #ffffff;
  border: 1rpx solid rgba(128, 118, 104, 0.09);
  border-radius: 28rpx;
  box-shadow: 0 10rpx 26rpx rgba(27, 28, 25, 0.04);
  overflow: hidden;
}

.settings-block {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.settings-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-title {
  font-size: 34rpx;
  font-weight: 600;
}

.settings-subtitle {
  font-size: 20rpx;
  color: #8c8578;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
}

.settings-card {
  min-height: 188rpx;
  padding: 22rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8rpx;
}

.settings-icon {
  font-size: 34rpx;
  color: #745726;
}

.settings-card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1b1c19;
}

.settings-card-subtitle {
  font-size: 20rpx;
  color: #8c8578;
}

.settings-card-danger {
  border-color: rgba(220, 38, 38, 0.24);
  background: linear-gradient(140deg, #ffffff 0%, rgba(254, 242, 242, 0.66) 100%);
}

.settings-icon-danger,
.settings-card-title-danger {
  color: #dc2626;
}

.settings-card-subtitle-danger {
  color: #b91c1c;
}
</style>
