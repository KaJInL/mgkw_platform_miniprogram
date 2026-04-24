<script setup lang="ts">
import { computed, ref } from "vue";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import { useAccountStore } from "@/store/accountStore";

const agreed = ref(false);
const shakeAgreement = ref(false);
const accountStore = useAccountStore();
const loading = computed(() => accountStore.loggingIn);

const toggleAgreement = () => {
  if (loading.value) {
    return;
  }
  agreed.value = !agreed.value;
};

const remindAgreeProtocol = () => {
  miniPromptHelper.info("请先勾选并同意《用户协议》和《隐私政策》");
  shakeAgreement.value = true;
  setTimeout(() => {
    shakeAgreement.value = false;
  }, 420);
};

const redirectAfterLogin = () => {
  setTimeout(() => {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      uni.navigateBack({
        fail: () => {
          uni.switchTab({
            url: "/pages/mine/index",
          });
        },
      });
      return;
    }

    uni.switchTab({
      url: "/pages/mine/index",
    });
  }, 350);
};

const handleLoginWithoutAgreement = () => {
  remindAgreeProtocol();
};

const handleGetPhoneNumber = async (event: any) => {
  if (loading.value) {
    return;
  }

  if (!agreed.value) {
    remindAgreeProtocol();
    return;
  }

  const encryptedData = String(event?.detail?.encryptedData || "").trim();
  const iv = String(event?.detail?.iv || "").trim();

  if (!encryptedData || !iv) {
    const errMsg = String(event?.detail?.errMsg || "");
    if (errMsg.includes("deny")) {
      miniPromptHelper.info("需要授权手机号后才能继续登录");
      return;
    }
    miniPromptHelper.fail("未获取到手机号授权信息，请重试");
    return;
  }

  const loginResult = await accountStore.loginByWechatPhone({
    encryptedData,
    iv,
  });
  if (!loginResult.success) {
    miniPromptHelper.fail(loginResult.message || "登录失败，请稍后重试");
    return;
  }
  try {
    miniPromptHelper.success("登录成功");
    redirectAfterLogin();
  } catch (error) {
    console.error("登录后跳转异常：", error);
  }
};

const goUserAgreement = () => {
  uni.navigateTo({
    url: "/pages/settings/user-agreement/index",
  });
};

const goPrivacyPolicy = () => {
  uni.navigateTo({
    url: "/pages/settings/privacy-policy/index",
  });
};
</script>

<template>
  <view class="login-page">
    <view class="bg-orb orb-top" />
    <view class="bg-orb orb-bottom" />

    <view class="main-wrap">
      <view class="brand-block">
        <view class="logo-ring">
          <image class="brand-logo" src="/static/brand-logo.png" mode="aspectFit" />
        </view>
        <text class="brand-sub">PINDOU GENERATOR</text>
        <text class="brand-title">拼豆生成器</text>
        <view class="brand-divider" />
      </view>

      <view class="welcome-block">
        <text class="welcome-title">欢迎使用拼豆生成器</text>
        <text class="welcome-sub">登录后即可继续你的拼豆创作与生成流程</text>
      </view>

      <view class="action-block">
        <button
          v-if="!agreed"
          class="login-btn"
          :class="{ 'login-btn-disabled': !agreed }"
          @click="handleLoginWithoutAgreement"
        >
          <text class="login-btn-text">手机号一键登录</text>
          <text class="login-btn-arrow">›</text>
        </button>

        <button
          v-else
          class="login-btn"
          :class="{ 'login-btn-loading': loading }"
          :disabled="loading"
          open-type="getPhoneNumber"
          @getphonenumber="handleGetPhoneNumber"
        >
          <text class="login-btn-text">{{ loading ? "登录中..." : "手机号一键登录" }}</text>
          <text class="login-btn-arrow">›</text>
        </button>
      </view>

      <view class="agreement-wrap" :class="{ 'agreement-shake': shakeAgreement }" @click="toggleAgreement">
        <view class="checkbox">
          <view class="checkbox-inner" :class="{ checked: agreed }">
            <text v-if="agreed" class="check-icon">✓</text>
          </view>
        </view>
        <view class="agreement-text">
          <text class="agreement-normal">我已阅读并同意</text>
          <text class="agreement-link" @click.stop="goUserAgreement">《用户协议》</text>
          <text class="agreement-normal">和</text>
          <text class="agreement-link" @click.stop="goPrivacyPolicy">《隐私政策》</text>
        </view>
      </view>
    </view>

    <view class="bottom-seal">✺</view>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  background: #ffffff;
  color: #1f2937;
  position: relative;
  overflow: hidden;
}

.bg-orb {
  position: absolute;
  border-radius: 999rpx;
  pointer-events: none;
}

.orb-top {
  width: 680rpx;
  height: 420rpx;
  top: -120rpx;
  right: -180rpx;
  background: rgba(255, 77, 141, 0.14);
  filter: blur(60rpx);
}

.orb-bottom {
  width: 520rpx;
  height: 320rpx;
  left: -120rpx;
  bottom: 40rpx;
  background: rgba(77, 150, 255, 0.14);
  filter: blur(70rpx);
}

.main-wrap {
  min-height: 100vh;
  padding: 110rpx 56rpx 130rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.brand-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.logo-ring {
  width: 184rpx;
  height: 184rpx;
  border-radius: 92rpx;
  background: #ffffff;
  border: 1rpx solid rgba(229, 231, 235, 0.9);
  box-shadow: 0 24rpx 50rpx rgba(77, 150, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo {
  width: 138rpx;
  height: 138rpx;
}

.brand-sub {
  font-size: 18rpx;
  letter-spacing: 6rpx;
  color: #4d96ff;
  opacity: 0.78;
}

.brand-title {
  font-size: 78rpx;
  font-weight: 700;
  letter-spacing: 3rpx;
  color: #1f2937;
}

.brand-divider {
  width: 56rpx;
  height: 2rpx;
  background: linear-gradient(90deg, rgba(255, 77, 141, 0.65), rgba(77, 150, 255, 0.65));
}

.welcome-block {
  margin-top: 20rpx;
  text-align: center;
}

.welcome-title {
  display: block;
  font-size: 46rpx;
  font-weight: 500;
  color: #4b5563;
  font-style: italic;
}

.welcome-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.action-block {
  width: 100%;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  border: 0;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-shadow: 0 12rpx 26rpx rgba(77, 150, 255, 0.22);
}

.login-btn::after {
  border: 0;
}

.login-btn-disabled {
  background: #dbeafe;
  box-shadow: none;
}

.login-btn-loading {
  opacity: 0.86;
}

.login-btn-text {
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.login-btn-arrow {
  font-size: 30rpx;
  line-height: 1;
  transform: translateY(-1rpx);
}

.agreement-wrap {
  margin-top: 32rpx;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  padding: 8rpx 0;
}

.agreement-shake {
  animation: agreement-shake 0.42s ease-in-out;
}

.checkbox {
  padding-top: 2rpx;
  flex-shrink: 0;
}

.checkbox-inner {
  width: 30rpx;
  height: 30rpx;
  border-radius: 6rpx;
  border: 1rpx solid #cbd5e1;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-inner.checked {
  background: #4d96ff;
  border-color: #4d96ff;
}

.check-icon {
  color: #ffffff;
  font-size: 18rpx;
  font-weight: 700;
}

.agreement-text {
  max-width: 620rpx;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-size: 20rpx;
  line-height: 1.8;
}

.agreement-normal {
  color: #6b7280;
}

.agreement-link {
  color: #4d96ff;
  text-decoration: underline;
  text-decoration-color: rgba(77, 150, 255, 0.36);
  text-underline-offset: 4rpx;
  margin: 0 6rpx;
}

.bottom-seal {
  position: fixed;
  left: 50%;
  bottom: 82rpx;
  transform: translateX(-50%);
  font-size: 88rpx;
  color: rgba(255, 77, 141, 0.16);
  pointer-events: none;
}

@keyframes agreement-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-8rpx);
  }
  40%,
  80% {
    transform: translateX(8rpx);
  }
}
</style>
