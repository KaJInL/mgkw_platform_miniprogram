<script setup lang="ts">
interface Props {
  isLoggedIn: boolean;
  isVipActive: boolean;
  vipBadgeText?: string;
  vipExpiresText?: string;
  vipPriceText?: string;
}

defineProps<Props>();

defineEmits<{
  // 统一从这个模块进入会员购买页，避免“显示状态”和“开通入口”分散在两个区域。
  (e: "goRecharge"): void;
}>();
</script>

<template>
  <view class="membership-card" :class="{ 'membership-card-active': isVipActive }" @click="$emit('goRecharge')">
    <view class="membership-orbit membership-orbit-one" />
    <view class="membership-orbit membership-orbit-two" />
    <view class="membership-main">
      <text class="membership-tag">{{ isVipActive ? "VIP 会员" : "开通会员" }}</text>
      <text class="membership-title">
        {{ isVipActive ? (vipBadgeText || "豆豆月卡") : "开通专属会员，生成更省心" }}
      </text>
      <text class="membership-desc">
        {{
          isVipActive
            ? `当前会员有效期至 ${vipExpiresText || "--"}`
            : "会员有效期内可直接生成图纸；没有会员时，也可以先购买单次生成权益。"
        }}
      </text>
    </view>

    <view class="membership-side">
      <text class="membership-side-label">{{ isVipActive ? "已开通" : "低至" }}</text>
      <text class="membership-side-value">{{ isVipActive ? "VIP" : `¥${vipPriceText || "0.00"}` }}</text>
      <view class="membership-side-action">
        <text class="membership-side-arrow">{{ isVipActive ? "查看权益" : "立即开通" }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.membership-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  overflow: hidden;
  padding: 28rpx 26rpx;
  border-radius: 34rpx;
  background:
    radial-gradient(circle at 100% 0%, rgba(255, 214, 10, 0.18), transparent 28%),
    linear-gradient(135deg, rgba(255, 240, 246, 1) 0%, rgba(255, 251, 230, 0.96) 38%, rgba(230, 244, 255, 1) 100%);
  border: 1rpx solid rgba(229, 231, 235, 0.92);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.12);
}

.membership-card-active {
  background:
    radial-gradient(circle at 100% 0%, rgba(255, 214, 10, 0.32), transparent 24%),
    linear-gradient(130deg, #ff4d8d 0%, #ff6a5a 26%, #ff9f1c 54%, #4d96ff 100%);
}

.membership-orbit {
  position: absolute;
  border-radius: 999rpx;
  pointer-events: none;
}

.membership-orbit-one {
  top: -34rpx;
  right: -10rpx;
  width: 180rpx;
  height: 180rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.28);
}

.membership-orbit-two {
  right: 54rpx;
  bottom: -56rpx;
  width: 120rpx;
  height: 120rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 72%);
}

.membership-main {
  position: relative;
  z-index: 1;
  min-width: 0;
  flex: 1;
}

.membership-tag {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.membership-card-active .membership-tag {
  color: #ff4d8d;
}

.membership-title {
  display: block;
  margin-top: 14rpx;
  color: #1f2937;
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1.14;
}

.membership-desc {
  display: block;
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.65;
}

.membership-card-active .membership-title,
.membership-card-active .membership-desc,
.membership-card-active .membership-side-label,
.membership-card-active .membership-side-value,
.membership-card-active .membership-side-arrow {
  color: #ffffff;
}

.membership-side {
  position: relative;
  z-index: 1;
  min-width: 148rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.membership-side-label {
  color: #6b7280;
  font-size: 20rpx;
  font-weight: 700;
}

.membership-side-value {
  margin-top: 8rpx;
  color: #111827;
  font-size: 40rpx;
  font-weight: 900;
  line-height: 1;
}

.membership-side-action {
  margin-top: 14rpx;
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
}

.membership-card-active .membership-side-action {
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(8rpx);
}

.membership-side-arrow {
  margin-top: 10rpx;
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.membership-card-active .membership-side-arrow {
  color: #ffffff;
}
</style>
