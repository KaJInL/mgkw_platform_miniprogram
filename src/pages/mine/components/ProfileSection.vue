<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useAccountStore } from "@/store/accountStore";

const ROLE_CODE_LABEL_MAP: Record<string, string> = {
  SUPER_ADMIN: "超级管理员",
  ADMIN: "管理员",
  DESIGNER: "设计师",
  NORMAL_USER: "普通用户",
};

const accountStore = useAccountStore();
const { userInfo, isLoggedIn, loadingUserInfo } = storeToRefs(accountStore);

// 展示名优先使用昵称，其次使用 display_name 和 username。
const userName = computed(() => {
  if (!isLoggedIn.value) {
    return "未登录";
  }
  return userInfo.value?.nickname || userInfo.value?.display_name || userInfo.value?.username || "已登录用户";
});

// 头像为空时使用姓名首字作为占位头像。
const avatarUrl = computed(() => userInfo.value?.avatar_url || "");

const avatarText = computed(() => {
  if (!isLoggedIn.value) {
    return "未登录";
  }
  const normalizedName = (userName.value || "用户").trim();
  return normalizedName.slice(0, 1) || "用";
});

const userTags = computed(() => {
  if (!isLoggedIn.value) {
    return ["游客身份"];
  }

  const labels: string[] = [];
  if (userInfo.value?.is_superuser) {
    labels.push("超级管理员");
  }

  const roleCodes = userInfo.value?.role_codes || [];
  for (const roleCode of roleCodes) {
    const label = ROLE_CODE_LABEL_MAP[roleCode] || roleCode;
    if (!labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels.length ? labels : ["已登录用户"];
});

defineEmits<{
  (e: "avatarTap"): void;
}>();
</script>

<template>
  <view class="profile-stack">
    <view class="card profile-card">
      <view class="profile-row">
        <view class="avatar-wrap" @click="$emit('avatarTap')">
          <image v-if="avatarUrl" class="avatar" :src="avatarUrl" mode="aspectFill" />
          <view v-else class="avatar guest-avatar" :class="{ 'member-avatar': isLoggedIn }">
            {{ avatarText }}
          </view>
        </view>

        <view class="profile-main">
          <view class="name-row">
            <text class="name">{{ userName }}</text>
            <text v-if="isLoggedIn" class="verified">✓</text>
          </view>
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

        <view class="profile-action">⌗</view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.card {
  position: relative;
  background: #ffffff;
  border: 1rpx solid rgba(229, 231, 235, 0.95);
  border-radius: 28rpx;
  box-shadow: 0 10rpx 26rpx rgba(77, 150, 255, 0.06);
  overflow: hidden;
}

.profile-card {
  padding: 30rpx;
}

.profile-stack {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.profile-row {
  display: flex;
  align-items: center;
}

.avatar-wrap {
  width: 122rpx;
  height: 122rpx;
  border-radius: 61rpx;
  overflow: hidden;
  border: 2rpx solid rgba(77, 150, 255, 0.22);
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
}

.guest-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff0f6;
  color: #ff4d8d;
  font-size: 24rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
}

.member-avatar {
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #fff;
  font-size: 40rpx;
}

.profile-main {
  margin-left: 20rpx;
  flex: 1;
  padding-right: 50rpx;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.name {
  font-size: 44rpx;
  line-height: 1.15;
  font-weight: 600;
}

.verified {
  width: 34rpx;
  height: 34rpx;
  border-radius: 17rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22rpx;
  background: #4d96ff;
}

.tag-row {
  margin-top: 10rpx;
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}

.user-tag {
  padding: 5rpx 14rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  color: #6b7280;
  background: #f0f2f4;
}

.user-tag-primary {
  color: #4d96ff;
  background: rgba(77, 150, 255, 0.12);
}

.sync-tip {
  display: inline-flex;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #6b7280;
}

.profile-action {
  width: 58rpx;
  height: 58rpx;
  border-radius: 29rpx;
  background: rgba(77, 150, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4d96ff;
  font-size: 30rpx;
}
</style>
