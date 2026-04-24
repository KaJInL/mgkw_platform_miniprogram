<script setup lang="ts">
import { computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import { useAccountStore } from "@/store/accountStore";
import ProfileSection from "./components/ProfileSection.vue";
import SettingsSection from "./components/SettingsSection.vue";

const accountStore = useAccountStore();
// 先尝试用本地缓存秒开页面，避免初次渲染闪烁。
accountStore.loadCachedUserInfo();

// 页面层只保留最小状态：是否登录。
const isLoggedIn = computed(() => accountStore.isLoggedIn);

const handleAvatarTap = () => {
  if (!accountStore.isLoggedIn) {
    uni.navigateTo({
      url: "/pages/login/index",
    });
    return;
  }
  miniPromptHelper.info("个人主页建设中");
};

const handleGoSetting = () => {
  uni.navigateTo({
    url: "/pages/settings/index",
  });
};

const handleLogout = () => {
  if (!accountStore.isLoggedIn) {
    miniPromptHelper.info("当前未登录");
    return;
  }

  uni.showModal({
    title: "退出登录",
    content: "确认退出当前账号吗？",
    confirmColor: "#dc2626",
    success: ({ confirm }) => {
      if (!confirm) {
        return;
      }
      accountStore.clearAuthState();
      miniPromptHelper.success("已退出登录");
    },
  });
};

onShow(() => {
  // 每次进入「我的」页都刷新一次用户信息，保证展示最新资料。
  void accountStore.refreshCurrentUser();
});
</script>

<template>
  <view class="mine-page">
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-inner">
        <ProfileSection @avatar-tap="handleAvatarTap" />
        <SettingsSection :is-logged-in="isLoggedIn" @go-setting="handleGoSetting" @logout="handleLogout" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.mine-page {
  min-height: 100vh;
  background: #f9fafb;
  color: #1f2937;
}

.content-scroll {
  height: 100vh;
}

.content-inner {
  padding: 28rpx 28rpx 20rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  box-sizing: border-box;
}
</style>
