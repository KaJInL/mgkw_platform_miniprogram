<script setup lang="ts">
import {ref} from "vue";
import {useAccountStore} from "@/store/accountStore";
import {SysConfKeyEnum, useSysConfStore} from "@/store/sysConfStore";

const accountStore = useAccountStore();
const confStore = useSysConfStore();
const loading = ref(false);
const agreedProtocol = ref(false); // 是否同意协议
const shakeAnimation = ref(false); // 抖动动画状态

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

/**
 * 检查是否同意协议
 */
const checkProtocol = () => {
  if (!agreedProtocol.value) {
    uni.showToast({
      title: '请先阅读并同意用户协议和隐私政策',
      icon: 'none',
      duration: 2000
    });
    // 触发抖动动画
    shakeAnimation.value = true;
    setTimeout(() => {
      shakeAnimation.value = false;
    }, 500);
    return false;
  }
  return true;
};

/**
 * 处理登录按钮点击
 */
const handleLoginClick = () => {
  if (!checkProtocol()) {
    return;
  }
  loading.value = true;
};

// 一键登录
const getPhoneNumber = (e: {detail: { encryptedData: string, iv: string }}) => {
  // 检查是否同意协议
  if (!checkProtocol()) {
    return;
  }
  
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
            :class="{ 'loading': loading, 'disabled': !agreedProtocol }"
            @click="handleLoginClick"
            @getphonenumber="getPhoneNumber"
            open-type="getPhoneNumber"
            :disabled="loading"
        >
          <text v-if="!loading" class="button-text">一键登录</text>
          <text v-else class="button-text">登录中...</text>
        </button>

        <view class="login-tips" :class="{ 'shake': shakeAnimation }">
          <view class="checkbox-wrapper" @click="agreedProtocol = !agreedProtocol">
            <view class="checkbox" :class="{ 'checked': agreedProtocol }">
              <text v-if="agreedProtocol" class="checkbox-icon">✓</text>
            </view>
          </view>
          <text class="tips-text">我已阅读并同意</text>
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

  &.disabled {
    opacity: 0.5;
    background: linear-gradient(135deg, #e0e0e0 0%, #d0d0d0 100%);
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

  &.shake {
    animation: shake 0.5s ease-in-out;
  }
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rpx;
}

.checkbox {
  width: 32rpx;
  height: 32rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.8);
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  transition: all 0.3s ease;

  &.checked {
    background-color: #fff;
    border-color: #fff;
  }
}

.checkbox-icon {
  font-size: 24rpx;
  color: #667eea;
  font-weight: bold;
  line-height: 1;
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

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-10rpx);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(10rpx);
  }
}
</style>
