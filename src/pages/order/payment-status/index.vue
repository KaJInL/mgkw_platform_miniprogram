<script setup lang="ts">
import {onLoad, onUnload} from "@dcloudio/uni-app";
import {ref, computed} from "vue";
// @ts-ignore
import orderApi from "@/common/apis/orderApi";
// @ts-ignore
import LoadingState from "../../design/detail/components/LoadingState.vue";

// 订单ID
const orderId = ref<string>("");
// 订单状态
const orderStatus = ref<string>("");
// 加载状态
const loading = ref(true);
// 倒计时定时器
let countdownTimer: ReturnType<typeof setInterval> | null = null;
// 查询状态定时器
let queryTimer: ReturnType<typeof setInterval> | null = null;
// 倒计时剩余时间（秒）
const countdownSeconds = ref<number>(30); // 默认30秒倒计时
// 是否正在查询
const isQuerying = ref(false);

/**
 * 查询订单状态
 */
const queryOrderStatus = async () => {
  if (isQuerying.value || !orderId.value) {
    return;
  }
  
  try {
    isQuerying.value = true;
    const res = await orderApi.getOrderDetail(orderId.value);
    
    if (res.isSuccess && res.data) {
      orderStatus.value = res.data.status;
      
      // 如果订单已支付，停止倒计时和查询
      if (res.data.status === "paid") {
        stopTimers();
        // 延迟返回上一页
        setTimeout(() => {
          uni.navigateBack({
            delta: 1 // 返回两层（支付页面和订单详情页）
          });
        }, 1500);
      }
    }
  } catch (error) {
    console.error("查询订单状态失败:", error);
  } finally {
    isQuerying.value = false;
  }
};

/**
 * 初始化倒计时
 */
const initCountdown = () => {
  countdownSeconds.value = 10;
  
  // 清除旧的定时器
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  
  // 启动倒计时
  countdownTimer = setInterval(() => {
    if (countdownSeconds.value <= 0) {
      stopTimers();
      // 倒计时结束，返回上一页
      uni.navigateBack({
        delta: 2 // 返回两层（支付页面和订单详情页）
      });
      return;
    }
    countdownSeconds.value--;
  }, 1000);
  
  // 启动状态查询定时器（每3秒查询一次）
  if (queryTimer) {
    clearInterval(queryTimer);
  }
  
  queryTimer = setInterval(() => {
    queryOrderStatus();
  }, 3000);
  
  // 立即查询一次
  queryOrderStatus();
};

/**
 * 停止所有定时器
 */
const stopTimers = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (queryTimer) {
    clearInterval(queryTimer);
    queryTimer = null;
  }
};

/**
 * 格式化倒计时显示
 */
const countdownText = computed(() => {
  if (countdownSeconds.value <= 0) {
    return "00:00";
  }
  
  const minutes = Math.floor(countdownSeconds.value / 60);
  const seconds = countdownSeconds.value % 60;
  
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
});

/**
 * 状态文本
 */
const statusText = computed(() => {
  if (orderStatus.value === "paid") {
    return "支付成功";
  }
  return "查询支付状态中...";
});

onLoad((options) => {
  if (options?.orderId) {
    orderId.value = options.orderId;
    loading.value = false;
    // 初始化倒计时和查询
    initCountdown();
  } else {
    uni.showToast({
      title: "缺少订单ID",
      icon: "none"
    });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  }
});

onUnload(() => {
  // 清除定时器
  stopTimers();
});
</script>

<template>
  <view class="payment-status-page">
    <!-- 加载中 -->
    <LoadingState v-if="loading" />

    <!-- 支付状态查询 -->
    <view v-else class="status-content">
      <view class="status-card">
        <!-- 状态图标 -->
        <view class="status-icon">
          <view v-if="orderStatus === 'paid'" class="icon-success">
            <text class="icon-text">✓</text>
          </view>
          <view v-else class="icon-loading">
            <text class="loading-dot"></text>
            <text class="loading-dot"></text>
            <text class="loading-dot"></text>
          </view>
        </view>

        <!-- 状态文本 -->
        <view class="status-text-wrapper">
          <text class="status-text">{{ statusText }}</text>
        </view>

        <!-- 倒计时 -->
        <view class="countdown-wrapper">
          <text class="countdown-label">自动返回倒计时</text>
          <text class="countdown-value">{{ countdownText }}</text>
        </view>

        <!-- 提示信息 -->
        <view class="tip-wrapper">
          <text class="tip-text">
            {{ orderStatus === 'paid' ? '支付成功，即将返回...' : '正在查询支付状态，请稍候...' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.payment-status-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.status-content {
  width: 100%;
  max-width: 600rpx;
}

.status-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 80rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40rpx;
}

.status-icon {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .icon-success {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .icon-text {
      font-size: 80rpx;
      font-weight: 700;
      color: #fff;
    }
  }
  
  .icon-loading {
    width: 100%;
    height: 100%;
    background: #f5f5f7;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    
    .loading-dot {
      width: 16rpx;
      height: 16rpx;
      background: #667eea;
      border-radius: 50%;
      animation: loading 1.4s infinite ease-in-out;
      
      &:nth-child(1) {
        animation-delay: -0.32s;
      }
      
      &:nth-child(2) {
        animation-delay: -0.16s;
      }
      
      &:nth-child(3) {
        animation-delay: 0s;
      }
    }
  }
}

@keyframes loading {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.status-text-wrapper {
  text-align: center;
}

.status-text {
  font-size: 44rpx;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -1rpx;
}

.countdown-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 48rpx;
  background: #f5f5f7;
  border-radius: 100rpx;
}

.countdown-label {
  font-size: 24rpx;
  color: #424245;
}

.countdown-value {
  font-size: 48rpx;
  font-weight: 700;
  color: #1d1d1f;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  letter-spacing: 2rpx;
}

.tip-wrapper {
  text-align: center;
  padding-top: 20rpx;
}

.tip-text {
  font-size: 28rpx;
  color: #424245;
  line-height: 1.6;
}
</style>

