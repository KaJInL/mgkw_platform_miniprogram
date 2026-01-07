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
 * 处理未勾选协议时的登录按钮点击
 */
const handleLoginClick = () => {
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
        <!-- 未勾选协议时显示的按钮（用于提示） -->
        <button
            v-if="!agreedProtocol"
            class="login-button disabled"
            @click="handleLoginClick"
        >
          <text class="button-text">一键登录</text>
        </button>
        
        <!-- 已勾选协议时显示的按钮（真正的登录按钮） -->
        <button
            v-else
            class="login-button"
            :class="{ 'loading': loading }"
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
  background-color: #fbfbfd;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 60rpx;
  position: relative;
  overflow: hidden;
}

/* 背景装饰，增加层次感 */
.login-page::before {
  content: '';
  position: absolute;
  top: -10vh;
  right: -10vw;
  width: 600rpx;
  height: 600rpx;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.08) 0%, rgba(251, 251, 253, 0) 70%);
  border-radius: 50%;
  filter: blur(60px);
  z-index: 1;
}

.login-page::after {
  content: '';
  position: absolute;
  bottom: -10vh;
  left: -10vw;
  width: 500rpx;
  height: 500rpx;
  background: radial-gradient(circle, rgba(118, 75, 162, 0.05) 0%, rgba(251, 251, 253, 0) 70%);
  border-radius: 50%;
  filter: blur(60px);
  z-index: 1;
}

.login-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 100rpx;
  position: relative;
  z-index: 2;
}

/* Logo 区域 */
.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30rpx;
  animation: fadeInDown 0.8s ease-out;
}

.logo-image {
  width: 180rpx;
  height: 180rpx;
  border-radius: 40rpx;
  background-color: #fff;
  padding: 20rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.05);
}

.app-name {
  font-size: 44rpx;
  font-weight: 600;
  color: #1d1d1f;
  margin-top: 10rpx;
  letter-spacing: 2rpx;
}

.app-slogan {
  font-size: 24rpx;
  color: #86868b;
  letter-spacing: 4rpx;
  text-transform: uppercase;
  font-weight: 500;
}

/* 登录按钮区域 */
.login-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
  animation: fadeInUp 0.8s ease-out;
}

.login-button {
  width: 100%;
  height: 100rpx;
  background: #1d1d1f;
  border-radius: 100rpx;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 30rpx rgba(29, 29, 31, 0.2);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:active {
    transform: scale(0.98);
    box-shadow: 0 4rpx 12rpx rgba(29, 29, 31, 0.15);
  }

  &.loading {
    opacity: 0.8;
  }

  &.disabled {
    opacity: 0.8;
    background: #e5e5ea; // Light gray for disabled
    box-shadow: none;
    
    .button-text {
      color: #8e8e93;
    }
  }

  &::after {
    border: none;
  }
}

.button-text {
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
  letter-spacing: 2rpx;
}

.login-tips {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  margin-top: 20rpx;

  &.shake {
    animation: shake 0.5s ease-in-out;
  }
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10rpx;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  border: 2rpx solid #d1d1d6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  transition: all 0.3s ease;

  &.checked {
    background-color: #1d1d1f;
    border-color: #1d1d1f;
  }
}

.checkbox-icon {
  font-size: 22rpx;
  color: #fff;
  font-weight: bold;
  line-height: 1;
}

.tips-text {
  font-size: 24rpx;
  color: #86868b;
}

.tips-link {
  font-size: 24rpx;
  color: #1d1d1f;
  font-weight: 500;
  border-bottom: 1px solid rgba(29, 29, 31, 0.2);
  padding-bottom: 2rpx;
}

/* 动画 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30rpx);
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
    transform: translateX(-6rpx);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(6rpx);
  }
}
</style>