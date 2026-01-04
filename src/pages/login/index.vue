<script setup lang="ts">
import {ref} from "vue";
import {useAccountStore} from "@/store/accountStore";
import {SysConfKeyEnum, useSysConfStore} from "@/store/sysConfStore";

const accountStore = useAccountStore();
const confStore = useSysConfStore();
const loading = ref(false);

/**
 * 登录失败提示
 * @param message
 */
const loginFields = (message = "登录失败,请联系管理员") => {
  uni.showToast({
    title: '登录失败，请重试',
    icon: 'none',
    duration: 2000
  });
};
/**
 * 登录成功 提示
 * @param message
 */
const loginSuccess =  (message = "登录成功") => {
  uni.showToast({
    title: message,
    icon: 'success'
  });
  setTimeout(async () => {
    await accountStore.getUserInfo()
    uni.navigateBack()
  },500)
};

// 一键登录
const getPhoneNumber = (e: {detail: { encryptedData: string, iv: string }}) => {
  if (!e.detail.encryptedData || !e.detail.iv){
    loginFields()
    return
  }
  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      if (!loginRes.code) {
        console.error('微信登录失败:', loginRes)
        loginFields()
        return
      }
      const isLoginSuccess = await accountStore.weixinLogin(loginRes.code, e.detail.encryptedData, e.detail.iv)
      isLoginSuccess ?  loginSuccess() :  loginFields()
    },
    fail: (err) => {
      console.error('微信登录失败:', err);
      loginFields()
    },
    complete: () => {
      loading.value = false;
    }
  });
}

</script>

<template>
  <view class="login-page">
    <view class="login-container">
      <!-- Logo 区域 -->
      <view class="logo-section">
        <image
            class="logo-image"
            :src="confStore.getConf(SysConfKeyEnum.LOGO)"
            mode="aspectFit"
        />
        <text class="app-name">美工开物平台</text>
        <text class="app-slogan">设计创意，触手可得</text>
      </view>

      <!-- 登录按钮区域 -->
      <view class="login-section">
        <button
            class="login-button"
            :class="{ 'loading': loading }"
            @click="handleQuickLogin"
            @getphonenumber="getPhoneNumber"
            open-type="getPhoneNumber"
            :disabled="loading"
        >
          <text v-if="!loading" class="button-text">一键登录</text>
          <text v-else class="button-text">登录中...</text>
        </button>

        <view class="login-tips">
          <text class="tips-text">登录即表示同意</text>
          <text class="tips-link">《用户协议》</text>
          <text class="tips-text">和</text>
          <text class="tips-link">《隐私政策》</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 60rpx;
}

.login-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 120rpx;
}

/* Logo 区域 */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  animation: fadeInDown 0.8s ease-out;
}

.logo-image {
  width: 200rpx;
  height: 200rpx;
  border-radius: 40rpx;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.app-name {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
  margin-top: 20rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
}

.app-slogan {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 8rpx;
}

/* 登录按钮区域 */
.login-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  animation: fadeInUp 0.8s ease-out;
}

.login-button {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
  border-radius: 48rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.2);
  }

  &.loading {
    opacity: 0.7;
  }

  &::after {
    border: none;
  }
}

.button-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #667eea;
}

.login-tips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8rpx;
}

.tips-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.tips-link {
  font-size: 24rpx;
  color: #fff;
  text-decoration: underline;
}

/* 动画 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
