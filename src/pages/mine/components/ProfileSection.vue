<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import accountApi from "@/common/apis/accountApi";
import { useAccountStore } from "@/store/accountStore";
import { useAppStateStore } from "@/store/appStateStore";

interface Props {
  vipPriceText?: string;
}

defineProps<Props>();

const ROLE_CODE_LABEL_MAP: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  ADMIN: "管理员",
  SALESPERSON: "推广",
  SHOP_OWNER: "店长",
  NORMAL_USER: "普通用户",
};

const accountStore = useAccountStore();
const { userInfo, isLoggedIn, loadingUserInfo } = storeToRefs(accountStore);
const appStateStore = useAppStateStore();
const { virtualPaymentReviewModeEnabled } = storeToRefs(appStateStore);

// 展示名优先使用昵称，其次使用 display_name 和 username。
const userName = computed(() => {
  if (!isLoggedIn.value) {
    return "未登录";
  }
  return userInfo.value?.nickname || userInfo.value?.display_name || userInfo.value?.username || "已登录用户";
});

// 头像为空时使用姓名首字作为占位头像。
const avatarUrl = computed(() => {
  const candidate = userInfo.value?.avatar_full_url || userInfo.value?.avatar_url || "";
  return accountApi.canRenderImageUrl(candidate) ? candidate : "";
});

const avatarText = computed(() => {
  if (!isLoggedIn.value) {
    return "未登录";
  }
  const normalizedName = (userName.value || "用户").trim();
  return normalizedName.slice(0, 1) || "用";
});
const vipBadgeText = computed(() => userInfo.value?.vip_badge_text || userInfo.value?.vip_plan_name || "");
const vipExpiresText = computed(() => {
  const raw = userInfo.value?.vip_expires_at || "";
  return raw ? String(raw).replace("T", " ").slice(0, 16) : "";
});
const singleGenerateQuotaRemaining = computed(() => Math.max(0, Number(userInfo.value?.single_generate_quota_remaining || 0)));

const userTags = computed(() => {
  if (!isLoggedIn.value) {
    return ["游客身份"];
  }

  const labels: string[] = [];
  // 角色标签统一只使用后端 roles 返回，避免和 role_codes 重复渲染。
  const roles = userInfo.value?.roles || [];
  for (const role of roles) {
    const roleName = (role?.role_name || ROLE_CODE_LABEL_MAP[role?.role_code || ""] || "").trim();
    if (roleName && !labels.includes(roleName)) {
      labels.push(roleName);
    }
  }
  return labels.length ? labels : ["已登录用户"];
});

defineEmits<{
  (e: "avatarTap"): void;
  (e: "goRecharge"): void;
}>();
</script>

<template>
  <view class="profile-stack">
    <view class="card profile-card" :class="{ 'profile-card-vip': userInfo?.is_vip_active && !virtualPaymentReviewModeEnabled }">
      <view class="profile-ribbon" />
      <view class="profile-orb profile-orb-one" />
      <view class="profile-orb profile-orb-two" />

      <view class="profile-top">
        <view class="avatar-wrap" @click="$emit('avatarTap')">
          <image v-if="avatarUrl" class="avatar-image" :src="avatarUrl" mode="aspectFill" />
          <view v-else class="avatar-fallback" :class="{ 'avatar-fallback-member': isLoggedIn }">
            {{ avatarText }}
          </view>
          <view class="avatar-ring" />
        </view>

        <view class="profile-body">
          <text class="profile-kicker">{{ isLoggedIn ? "PERSONAL HUB" : "WELCOME" }}</text>
          <view class="name-row">
            <text class="name">{{ userName }}</text>
            <view v-if="isLoggedIn" class="verified-badge">已登录</view>
          </view>
          <text class="profile-subline">
            {{
              virtualPaymentReviewModeEnabled
                ? (isLoggedIn ? "资料与门店入口" : "登录后可保存资料并继续使用")
                : (isLoggedIn ? "资料、会员与权益入口" : "登录后可保存资料并开通会员")
            }}
          </text>

          <view class="tag-row">
            <text
              v-for="item in userTags"
              :key="item"
              class="user-tag"
              :class="{ 'user-tag-primary': isLoggedIn }"
            >
              {{ item }}
            </text>
          </view>

          <text v-if="loadingUserInfo && isLoggedIn" class="sync-tip">资料同步中...</text>
        </view>

        <view class="profile-action">
          <text class="profile-action-arrow">›</text>
        </view>
      </view>

      <view class="profile-divider">
        <view class="profile-divider-line" />
        <view class="profile-divider-dot" />
        <view class="profile-divider-line" />
      </view>

      <view v-if="isLoggedIn && !virtualPaymentReviewModeEnabled" class="benefit-row">
        <view class="benefit-chip">
          <text class="benefit-chip-label">剩余单次生成次数</text>
          <text class="benefit-chip-value">{{ singleGenerateQuotaRemaining }}</text>
        </view>
      </view>

      <view v-if="!virtualPaymentReviewModeEnabled" class="vip-panel" :class="{ 'vip-panel-active': userInfo?.is_vip_active }" @click.stop="$emit('goRecharge')">
        <view class="membership-panel-glow membership-panel-glow-one" />
        <view class="membership-panel-glow membership-panel-glow-two" />
        <view class="vip-panel-main">
          <text class="vip-panel-tag">{{ userInfo?.is_vip_active ? "VIP 会员" : "MEMBERSHIP" }}</text>
          <text class="vip-panel-title">
            {{ userInfo?.is_vip_active ? (vipBadgeText || "豆豆月卡") : "开通会员" }}
          </text>
          <text class="vip-panel-text">
            {{
              userInfo?.is_vip_active
                ? `有效期至 ${vipExpiresText || "--"}`
                : "开通后生成图纸更顺手"
            }}
          </text>
        </view>

        <view class="vip-panel-side">
          <text class="vip-panel-side-label">{{ userInfo?.is_vip_active ? "当前状态" : "低至" }}</text>
          <text class="vip-panel-side-value">{{ userInfo?.is_vip_active ? "VIP" : `¥${vipPriceText || "0.00"}` }}</text>
          <text class="vip-panel-side-link">{{ userInfo?.is_vip_active ? "查看权益" : "立即开通" }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.card {
  position: relative;
  background: #ffffff;
  border: 1rpx solid rgba(229, 231, 235, 0.9);
  border-radius: 36rpx;
  box-shadow:
    0 18rpx 44rpx rgba(77, 150, 255, 0.08),
    0 2rpx 0 rgba(255, 255, 255, 0.66) inset;
  overflow: hidden;
}

.profile-card {
  position: relative;
  padding: 30rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.24), transparent 24%),
    radial-gradient(circle at left center, rgba(54, 207, 201, 0.1), transparent 28%),
    linear-gradient(180deg, #fff7fb 0%, #ffffff 42%, #f7fafc 100%);
}

.profile-card-vip {
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.32), transparent 22%),
    radial-gradient(circle at left center, rgba(54, 207, 201, 0.12), transparent 32%),
    linear-gradient(135deg, rgba(255, 240, 246, 1) 0%, rgba(255, 251, 230, 0.98) 32%, rgba(230, 244, 255, 1) 100%);
}

.profile-stack {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.profile-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 12rpx;
  background: linear-gradient(90deg, #ff4d8d 0%, #ff6a5a 18%, #ff9f1c 38%, #ffd60a 52%, #36cfc9 72%, #4d96ff 100%);
}

.profile-orb {
  position: absolute;
  border-radius: 999rpx;
  pointer-events: none;
}

.profile-orb-one {
  top: -46rpx;
  right: -24rpx;
  width: 206rpx;
  height: 206rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.24);
}

.profile-orb-two {
  right: 84rpx;
  bottom: -82rpx;
  width: 148rpx;
  height: 148rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 72%);
}

.profile-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
}

.avatar-wrap {
  position: relative;
  width: 132rpx;
  height: 132rpx;
  border-radius: 66rpx;
  overflow: hidden;
  border: 4rpx solid rgba(255, 255, 255, 0.88);
  box-shadow: 0 16rpx 28rpx rgba(31, 41, 55, 0.12);
  flex-shrink: 0;
}

.avatar-ring {
  position: absolute;
  inset: 8rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  pointer-events: none;
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #fff0f6 0%, #e6f4ff 100%);
  color: #ff4d8d;
  font-size: 40rpx;
  font-weight: 800;
  letter-spacing: 1rpx;
}

.avatar-fallback-member {
  background: linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 42%, #4d96ff 100%);
  color: #fff;
}

.profile-body {
  margin-left: 22rpx;
  flex: 1;
  min-width: 0;
  padding-right: 8rpx;
}

.profile-kicker {
  display: block;
  color: #ff4d8d;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.name {
  font-size: 42rpx;
  line-height: 1.12;
  font-weight: 800;
  color: #1f2937;
}

.verified-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  color: #4d96ff;
  font-size: 18rpx;
  font-weight: 700;
  border: 1rpx solid rgba(77, 150, 255, 0.1);
}

.profile-subline {
  display: block;
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.55;
}

.tag-row {
  margin-top: 14rpx;
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.profile-divider {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 20rpx 0 18rpx;
}

.profile-divider-line {
  flex: 1;
  height: 2rpx;
  background: linear-gradient(90deg, rgba(255, 77, 141, 0.08) 0%, rgba(77, 150, 255, 0.18) 48%, rgba(255, 159, 28, 0.08) 100%);
}

.profile-divider-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 7rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 48%, #4d96ff 100%);
  box-shadow: 0 0 0 6rpx rgba(255, 255, 255, 0.72);
}

.benefit-row {
  position: relative;
  z-index: 1;
  display: flex;
  margin-bottom: 18rpx;
}

.benefit-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 10rpx;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.84);
  border: 1rpx solid rgba(77, 150, 255, 0.1);
}

.benefit-chip-label {
  color: #6b7280;
  font-size: 20rpx;
}

.benefit-chip-value {
  color: #4d96ff;
  font-size: 26rpx;
  font-weight: 800;
}

.vip-panel {
  position: relative;
  z-index: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 22rpx;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 252, 0.98) 100%);
  border: 1rpx solid rgba(77, 150, 255, 0.12);
  box-shadow:
    inset 0 0 0 1rpx rgba(255, 255, 255, 0.6),
    0 12rpx 26rpx rgba(77, 150, 255, 0.06);
}

.vip-panel-active {
  background: linear-gradient(135deg, #ff4d8d 0%, #ff6a5a 26%, #ff9f1c 56%, #4d96ff 100%);
  border-color: transparent;
  box-shadow: 0 16rpx 34rpx rgba(255, 77, 141, 0.18);
}

.membership-panel-glow {
  position: absolute;
  border-radius: 999rpx;
  pointer-events: none;
}

.membership-panel-glow-one {
  top: -32rpx;
  right: -18rpx;
  width: 150rpx;
  height: 150rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0) 70%);
}

.membership-panel-glow-two {
  left: -20rpx;
  bottom: -28rpx;
  width: 120rpx;
  height: 120rpx;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0) 72%);
}

.vip-panel-main {
  position: relative;
  z-index: 1;
  min-width: 0;
  flex: 1;
}

.vip-panel-tag {
  display: inline-flex;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.92);
  color: #4d96ff;
  font-size: 18rpx;
  font-weight: 700;
}

.vip-panel-active .vip-panel-tag {
  color: #ff4d8d;
}

.vip-panel-title {
  display: block;
  margin-top: 10rpx;
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.24;
}

.vip-panel-text {
  display: block;
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 20rpx;
  line-height: 1.55;
}

.vip-panel-active .vip-panel-title,
.vip-panel-active .vip-panel-text,
.vip-panel-active .vip-panel-side-label,
.vip-panel-active .vip-panel-side-value,
.vip-panel-active .vip-panel-side-link {
  color: #ffffff;
}

.vip-panel-side {
  position: relative;
  z-index: 1;
  min-width: 132rpx;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.82);
  border: 1rpx solid rgba(255, 255, 255, 0.46);
  backdrop-filter: blur(10rpx);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.vip-panel-active .vip-panel-side {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.24);
}

.vip-panel-side-label {
  color: #6b7280;
  font-size: 18rpx;
  font-weight: 700;
}

.vip-panel-side-value {
  margin-top: 6rpx;
  color: #111827;
  font-size: 34rpx;
  font-weight: 900;
  line-height: 1;
}

.vip-panel-side-link {
  margin-top: 10rpx;
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.user-tag {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.9);
  border: 1rpx solid rgba(229, 231, 235, 0.92);
}

.user-tag-primary {
  color: #4d96ff;
  background: rgba(77, 150, 255, 0.12);
  border-color: rgba(77, 150, 255, 0.08);
}

.sync-tip {
  display: inline-flex;
  margin-top: 12rpx;
  font-size: 20rpx;
  color: #6b7280;
}

.profile-action {
  margin-left: 18rpx;
  width: 62rpx;
  height: 62rpx;
  border-radius: 31rpx;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(230, 244, 255, 0.92) 100%);
  border: 1rpx solid rgba(77, 150, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4d96ff;
  box-shadow: 0 8rpx 20rpx rgba(77, 150, 255, 0.08);
}

.profile-action-arrow {
  font-size: 30rpx;
  font-weight: 700;
}
</style>
