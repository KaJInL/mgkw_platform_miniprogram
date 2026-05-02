<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useAppStateStore } from "@/store/appStateStore";

interface Props {
  isLoggedIn: boolean;
}

defineProps<Props>();
const appStateStore = useAppStateStore();
const { virtualPaymentReviewModeEnabled } = storeToRefs(appStateStore);

defineEmits<{
  (e: "goOrderCenter"): void;
  (e: "goFreePatterns"): void;
  // 跳转系统设置页。
  (e: "goSetting"): void;
  // 打开扫码绑定门店。
  (e: "scanShopBindCode"): void;
  // 触发退出登录确认流程。
  (e: "logout"): void;
}>();
</script>

<template>
  <view class="settings-block">
    <view class="settings-title-row">
      <text class="settings-title">设置</text>
      <text class="settings-subtitle">快捷操作</text>
    </view>

    <view class="settings-grid">
      <view v-if="!virtualPaymentReviewModeEnabled" class="settings-card settings-card-primary" @click="$emit('goOrderCenter')">
        <view class="settings-icon-wrap settings-icon-wrap-order">
          <text class="settings-icon settings-icon-order">⌘</text>
        </view>
        <view class="settings-card-main">
          <text class="settings-card-title">订单中心</text>
          <text class="settings-card-subtitle">查看历史购买记录和订单详情</text>
        </view>
        <text class="settings-card-arrow">›</text>
      </view>

      <view class="settings-card settings-card-primary" @click="$emit('goSetting')">
        <view class="settings-icon-wrap settings-icon-wrap-primary">
          <text class="settings-icon">⚙</text>
        </view>
        <view class="settings-card-main">
          <text class="settings-card-title">系统设置</text>
          <text class="settings-card-subtitle">偏好、资料与通用配置</text>
        </view>
        <text class="settings-card-arrow">›</text>
      </view>

      <view class="settings-card settings-card-brand" @click="$emit('goFreePatterns')">
        <view class="settings-icon-wrap settings-icon-wrap-rainbow">
          <text class="settings-icon settings-icon-rainbow">▣</text>
        </view>
        <view class="settings-card-main">
          <text class="settings-card-title">免费图纸</text>
          <text class="settings-card-subtitle">浏览可直接查看和下载的拼豆图纸</text>
        </view>
        <text class="settings-card-arrow">›</text>
      </view>

      <view class="settings-card settings-card-brand" @click="$emit('scanShopBindCode')">
        <view class="settings-icon-wrap settings-icon-wrap-brand">
          <text class="settings-icon settings-icon-brand">⌁</text>
        </view>
        <view class="settings-card-main">
          <text class="settings-card-title">扫码绑定门店</text>
          <text class="settings-card-subtitle">扫描业务员二维码后自动建店</text>
        </view>
        <text class="settings-card-arrow">›</text>
      </view>

      <view v-if="isLoggedIn" class="settings-card settings-card-danger" @click="$emit('logout')">
        <view class="settings-icon-wrap settings-icon-wrap-danger">
          <text class="settings-icon settings-icon-danger">⏻</text>
        </view>
        <view class="settings-card-main">
          <text class="settings-card-title settings-card-title-danger">退出登录</text>
          <text class="settings-card-subtitle settings-card-subtitle-danger">清除当前登录状态</text>
        </view>
        <text class="settings-card-arrow settings-card-arrow-danger">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.settings-block {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.settings-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-title {
  font-size: 36rpx;
  font-weight: 800;
}

.settings-subtitle {
  font-size: 20rpx;
  color: #6b7280;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.settings-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16rpx;
  min-height: 198rpx;
  padding: 24rpx 22rpx;
  border-radius: 30rpx;
  border: 1rpx solid rgba(229, 231, 235, 0.92);
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 14rpx 28rpx rgba(77, 150, 255, 0.05),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.72);
  overflow: hidden;
}

.settings-card::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.42;
  pointer-events: none;
}

.settings-card-primary::after {
  background: radial-gradient(circle at 100% 0%, rgba(77, 150, 255, 0.12), transparent 26%);
}

.settings-card-brand::after {
  background: radial-gradient(circle at 100% 0%, rgba(255, 77, 141, 0.14), transparent 28%);
}

.settings-card-danger::after {
  background: radial-gradient(circle at 100% 0%, rgba(255, 77, 109, 0.12), transparent 28%);
}

.settings-icon-wrap {
  position: relative;
  z-index: 1;
  width: 84rpx;
  height: 84rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.settings-icon-wrap-primary {
  background: linear-gradient(135deg, rgba(77, 150, 255, 0.16) 0%, rgba(54, 207, 201, 0.18) 100%);
}

.settings-icon-wrap-order {
  background: linear-gradient(135deg, rgba(77, 150, 255, 0.18) 0%, rgba(155, 93, 229, 0.18) 100%);
}

.settings-icon-wrap-brand {
  background: linear-gradient(135deg, rgba(255, 77, 141, 0.14) 0%, rgba(255, 159, 28, 0.2) 100%);
}

.settings-icon-wrap-rainbow {
  background: linear-gradient(135deg, rgba(255, 77, 141, 0.16) 0%, rgba(255, 214, 10, 0.18) 36%, rgba(54, 207, 201, 0.18) 70%, rgba(77, 150, 255, 0.2) 100%);
}

.settings-icon-wrap-danger {
  background: linear-gradient(135deg, rgba(255, 77, 109, 0.16) 0%, rgba(255, 106, 90, 0.2) 100%);
}

.settings-card-main {
  position: relative;
  z-index: 1;
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.settings-icon {
  font-size: 36rpx;
  color: #4d96ff;
}

.settings-icon-brand {
  color: #ff4d8d;
}

.settings-icon-rainbow {
  color: #9b5de5;
}

.settings-icon-order {
  color: #4d96ff;
}

.settings-card-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1f2937;
}

.settings-card-subtitle {
  font-size: 20rpx;
  color: #6b7280;
  line-height: 1.55;
}

.settings-icon-danger,
.settings-card-title-danger {
  color: #ff4d6d;
}

.settings-card-subtitle-danger {
  color: #b4233c;
}

.settings-card-arrow {
  position: relative;
  z-index: 1;
  align-self: flex-end;
  color: #4d96ff;
  font-size: 34rpx;
  font-weight: 700;
}

.settings-card-arrow-danger {
  color: #ff4d6d;
}
</style>
