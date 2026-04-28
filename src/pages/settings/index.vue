<script setup lang="ts">
import { computed } from "vue";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import { useAccountStore } from "@/store/accountStore";

const accountStore = useAccountStore();

const profileTitle = computed(() => {
  if (!accountStore.isLoggedIn) {
    return "登录后完善昵称、头像和联系方式";
  }
  return accountStore.userInfo?.display_name || accountStore.userInfo?.username || "编辑个人资料";
});

const goProfile = () => {
  if (!accountStore.isLoggedIn) {
    uni.navigateTo({ url: "/pages/login/index" });
    return;
  }
  uni.navigateTo({ url: "/pages/settings/profile/index" });
};

const goUserAgreement = () => {
  uni.navigateTo({ url: "/pages/settings/user-agreement/index" });
};

const goPrivacyPolicy = () => {
  uni.navigateTo({ url: "/pages/settings/privacy-policy/index" });
};
</script>

<template>
  <view class="settings-page">
    <MaintenanceMask />
    <view class="hero-card">
      <text class="eyebrow">Account Center</text>
      <text class="title">设置</text>
      <text class="desc">管理你的账号资料、展示昵称和基础联系方式。</text>
    </view>

    <view class="settings-grid">
      <view class="setting-item setting-item-featured" @click="goProfile">
        <view class="setting-icon">✦</view>
        <view class="setting-copy">
          <text class="setting-title">个人资料</text>
          <text class="setting-desc">{{ profileTitle }}</text>
        </view>
        <text class="setting-arrow">›</text>
      </view>

      <view class="setting-item" @click="goUserAgreement">
        <view class="setting-icon setting-icon-coral">§</view>
        <view class="setting-copy">
          <text class="setting-title">用户协议</text>
          <text class="setting-desc">查看账号使用、服务规则与内容规范</text>
        </view>
        <text class="setting-arrow">›</text>
      </view>

      <view class="setting-item" @click="goPrivacyPolicy">
        <view class="setting-icon setting-icon-cyan">◎</view>
        <view class="setting-copy">
          <text class="setting-title">隐私政策</text>
          <text class="setting-desc">查看信息收集、使用、存储与权利说明</text>
        </view>
        <text class="setting-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.18), transparent 30%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 42%, #f7fafc 100%);
  padding: 28rpx;
  box-sizing: border-box;
}

.hero-card,
.settings-grid {
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.1);
}

.hero-card {
  padding: 34rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.28), transparent 28%),
    linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 36%, #36cfc9 70%, #4d96ff 100%);
}

.eyebrow {
  display: block;
  color: rgba(255, 255, 255, 0.78);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.title {
  display: block;
  margin-top: 10rpx;
  font-size: 42rpx;
  line-height: 1.2;
  font-weight: 800;
  color: #ffffff;
}

.desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
}

.settings-grid {
  margin-top: 24rpx;
  padding: 16rpx;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
}

.setting-item {
  min-height: 204rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18rpx;
  padding: 24rpx 22rpx;
  border-radius: 26rpx;
  background: linear-gradient(135deg, rgba(255, 240, 246, 0.72), rgba(230, 244, 255, 0.7));
  box-sizing: border-box;
}

.setting-item-featured {
  background: linear-gradient(135deg, rgba(255, 240, 246, 0.92), rgba(230, 244, 255, 0.86));
}

.setting-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 32rpx;
  background: linear-gradient(135deg, #ff4d8d, #4d96ff);
  box-shadow: 0 12rpx 24rpx rgba(77, 150, 255, 0.18);
}

.setting-icon-coral {
  background: linear-gradient(135deg, #ff6a5a 0%, #ff9f1c 100%);
}

.setting-icon-cyan {
  background: linear-gradient(135deg, #36cfc9 0%, #4d96ff 100%);
}

.setting-copy {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.setting-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 800;
}

.setting-desc {
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.5;
}

.setting-arrow {
  align-self: flex-end;
  color: #4d96ff;
  font-size: 44rpx;
  font-weight: 300;
}
</style>
