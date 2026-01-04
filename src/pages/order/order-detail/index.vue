<script setup lang="ts">
import {onLoad, onUnload} from "@dcloudio/uni-app";
import {ref, computed} from "vue";
// @ts-ignore - 路径别名可能在某些环境下无法正确解析
import orderApi from "@/common/apis/orderApi";
// @ts-ignore
import paymentApi from "@/common/apis/payment";
// @ts-ignore
import LoadingState from "../../design/detail/components/LoadingState.vue";
// @ts-ignore
import EmptyState from "../../design/detail/components/EmptyState.vue";

// 订单详情类型（从 API 响应中提取）
type OrderDetailRes = NonNullable<Awaited<ReturnType<typeof orderApi.getOrderDetail>>["data"]>;

// 订单ID
const orderId = ref<string>("");
// 订单详情
const orderDetail = ref<OrderDetailRes | null>(null);
// 加载状态
const loading = ref(true);
// 倒计时定时器
let countdownTimer: ReturnType<typeof setInterval> | null = null;
// 倒计时剩余时间（秒）
const countdownSeconds = ref<number>(0);

/**
 * 获取订单详情
 */
const fetchOrderDetail = async (id: string) => {
  try {
    loading.value = true;
    const res = await orderApi.getOrderDetail(id);
    if (res.isSuccess && res.data) {
      orderDetail.value = res.data;
      // 初始化倒计时
      initCountdown();
    } else {
      uni.showToast({
        title: res.message || "获取订单详情失败",
        icon: "none"
      });
    }
  } catch (error) {
    console.error("获取订单详情失败:", error);
    uni.showToast({
      title: "加载失败，请重试",
      icon: "none"
    });
  } finally {
    loading.value = false;
  }
};

/**
 * 初始化倒计时
 */
const initCountdown = () => {
  if (!orderDetail.value?.expireTime) {
    return;
  }
  
  const expireTime = new Date(orderDetail.value.expireTime).getTime();
  const now = Date.now();
  const diff = Math.floor((expireTime - now) / 1000);
  
  if (diff <= 0) {
    countdownSeconds.value = 0;
    return;
  }
  
  countdownSeconds.value = diff;
  
  // 清除旧的定时器
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  
  // 启动倒计时
  countdownTimer = setInterval(() => {
    if (countdownSeconds.value <= 0) {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
      return;
    }
    countdownSeconds.value--;
  }, 1000);
};

/**
 * 格式化倒计时显示
 */
const countdownText = computed(() => {
  if (countdownSeconds.value <= 0) {
    return "订单已过期";
  }
  
  const hours = Math.floor(countdownSeconds.value / 3600);
  const minutes = Math.floor((countdownSeconds.value % 3600) / 60);
  const seconds = countdownSeconds.value % 60;
  
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
});

/**
 * 格式化金额显示
 */
const formatPrice = (price: string) => {
  const num = parseFloat(price);
  return num.toFixed(2);
};

/**
 * 格式化时间显示
 */
const formatTime = (time: string) => {
  if (!time) return "";
  const date = new Date(time.replace(" ", "T"));
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * 订单状态映射
 */
const statusMap: Record<string, { text: string; description: string; color: string }> = {
  pending: { text: "待支付", description: "请尽快完成支付", color: "#FF9500" },
  paid: { text: "已支付", description: "支付成功", color: "#34C759" },
  cancelled: { text: "已取消", description: "订单已取消", color: "#8E8E93" },
  expired: { text: "已过期", description: "订单已过期", color: "#8E8E93" },
  refunded: { text: "已退款", description: "订单已退款", color: "#FF3B30" },
};

/**
 * 获取订单状态信息
 */
const getStatusInfo = (status: string) => {
  return statusMap[status] || { text: status, description: "", color: "#8E8E93" };
};

/**
 * 是否显示倒计时
 */
const shouldShowCountdown = computed(() => {
  return orderDetail.value?.status === "pending" && orderDetail.value?.expireTime;
});

/**
 * 是否显示支付按钮
 */
const shouldShowPayButton = computed(() => {
  return orderDetail.value?.status === "pending" && countdownSeconds.value > 0;
});

/**
 * 是否显示取消按钮
 */
const shouldShowCancelButton = computed(() => {
  return orderDetail.value?.status === "pending";
});

/**
 * 处理支付
 */
const handlePay = async () => {
  if (!orderDetail.value) {
    return;
  }
  
  // 检查订单是否已过期
  if (countdownSeconds.value <= 0) {
    uni.showToast({
      title: "订单已过期，请重新下单",
      icon: "none"
    });
    return;
  }
  
  // 检查订单状态
  if (orderDetail.value.status !== "pending") {
    uni.showToast({
      title: "订单状态异常，无法支付",
      icon: "none"
    });
    return;
  }
  
  try {
    // 显示加载提示
    uni.showLoading({
      title: "正在发起支付...",
      mask: true
    });
    
    // 调用创建支付订单API
    const paymentRes = await paymentApi.createWehcatPayment(orderId.value);
    
    if (!paymentRes.isSuccess || !paymentRes.data) {
      uni.hideLoading();
      uni.showToast({
        title: paymentRes.message || "创建支付订单失败",
        icon: "none"
      });
      return;
    }
    
    const paymentData = paymentRes.data;
    
    // 调起微信支付
    uni.requestPayment({
      provider: "wxpay",
      timeStamp: paymentData.timeStamp,
      nonceStr: paymentData.nonceStr,
      package: paymentData.package,
      signType: paymentData.signType,
      paySign: paymentData.paySign,
      success: (res) => {
        uni.hideLoading();
        // 跳转到支付状态查询页面（倒计时页面）
        uni.redirectTo({
          url: `/pages/order/payment-status/index?orderId=${orderId.value}`
        });
      },
      fail: (err) => {
        uni.hideLoading();
        console.error("支付失败:", err);
        
        // 用户取消支付
        if (err.errMsg && err.errMsg.includes("cancel")) {
          uni.showToast({
            title: "支付已取消",
            icon: "none"
          });
        } else {
          // 其他支付失败情况
          uni.showToast({
            title: err.errMsg || "支付失败，请重试",
            icon: "none"
          });
        }
      }
    });
  } catch (error) {
    uni.hideLoading();
    console.error("发起支付异常:", error);
    uni.showToast({
      title: "发起支付失败，请重试",
      icon: "none"
    });
  }
};

/**
 * 处理取消订单
 */
const handleCancel = async () => {
  if (!orderDetail.value) {
    return;
  }
  
  // 检查订单状态
  if (orderDetail.value.status !== "pending") {
    uni.showToast({
      title: "订单状态不允许取消",
      icon: "none"
    });
    return;
  }
  
  // 显示确认对话框
  uni.showModal({
    title: "确认取消",
    content: "确定要取消该订单吗？",
    confirmText: "确定",
    cancelText: "取消",
    success: async (res) => {
      if (res.confirm) {
        try {
          // 显示加载提示
          uni.showLoading({
            title: "取消中...",
            mask: true
          });
          
          // 调用取消订单API
          const cancelRes = await orderApi.cancelOrder(orderId.value);
          
          // 隐藏加载提示
          uni.hideLoading();
          
          if (cancelRes.isSuccess) {
            uni.showToast({
              title: "订单已取消",
              icon: "success"
            });
            
            // 延迟返回上一页
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          } else {
            uni.showToast({
              title: cancelRes.message || "取消订单失败",
              icon: "none"
            });
          }
        } catch (error) {
          // 隐藏加载提示
          uni.hideLoading();
          console.error("取消订单失败:", error);
          uni.showToast({
            title: "取消订单失败，请重试",
            icon: "none"
          });
        }
      }
    }
  });
};

onLoad((options) => {
  if (options?.orderId) {
    orderId.value = options.orderId;
    fetchOrderDetail(options.orderId);
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
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
});
</script>

<template>
  <view class="order-payment-page">
    <!-- 加载中 -->
    <LoadingState v-if="loading" />

    <!-- 订单详情 -->
    <view v-else-if="orderDetail" class="order-content">
      <!-- 订单状态和倒计时 -->
      <view class="order-header">
        <view class="order-status">
          <text class="status-text" :style="{ color: getStatusInfo(orderDetail.status).color }">
            {{ getStatusInfo(orderDetail.status).text }}
          </text>
          <text class="status-description">
            {{ getStatusInfo(orderDetail.status).description }}
          </text>
        </view>
        <view v-if="shouldShowCountdown" class="countdown">
          <view class="countdown-content">
            <text class="countdown-label">剩余支付时间</text>
            <text class="countdown-value" :class="{ expired: countdownSeconds <= 0 }">
              {{ countdownText }}
            </text>
          </view>
        </view>
      </view>

      <!-- 订单项列表 -->
      <view class="order-items-section">
        <view class="section-title">订单商品</view>
        <view class="order-items">
          <view
            v-for="item in orderDetail.items"
            :key="item.id"
            class="order-item"
          >
            <view class="item-info">
              <text class="item-name">{{ item.productName }}</text>
              <text v-if="item.skuName" class="item-sku">{{ item.skuName }}</text>
              <view class="item-meta">
                <text class="item-quantity">数量：{{ item.quantity }}</text>
                <text class="item-price">¥{{ formatPrice(item.unitPrice) }}</text>
              </view>
            </view>
            <view class="item-total">
              <text class="total-price">¥{{ formatPrice(item.totalPrice) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单金额明细 -->
      <view class="order-amount-section">
        <view class="section-title">金额明细</view>
        <view class="amount-detail">
          <view class="amount-row">
            <text class="amount-label">订单总额</text>
            <text class="amount-value">¥{{ formatPrice(orderDetail.totalAmount) }}</text>
          </view>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="order-info-section">
        <view class="section-title">订单信息</view>
        <view class="info-list">
          <view class="info-item">
            <text class="info-label">订单号</text>
            <text class="info-value">{{ orderDetail.merchantOrderNo || orderDetail.id }}</text>
          </view>
          <view v-if="orderDetail.serialNo" class="info-item">
            <text class="info-label">流水号</text>
            <text class="info-value">{{ orderDetail.serialNo }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">订单状态</text>
            <text class="info-value">{{ getStatusInfo(orderDetail.status).text }}</text>
          </view>
          <view v-if="orderDetail.paymentType" class="info-item">
            <text class="info-label">支付方式</text>
            <text class="info-value">{{ orderDetail.paymentType === 'wechat' ? '微信支付' : orderDetail.paymentType }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatTime(orderDetail.createdAt) }}</text>
          </view>
          <view v-if="orderDetail.payTime" class="info-item">
            <text class="info-label">支付时间</text>
            <text class="info-value">{{ formatTime(orderDetail.payTime) }}</text>
          </view>
          <view v-if="orderDetail.expireTime && orderDetail.status === 'pending'" class="info-item">
            <text class="info-label">过期时间</text>
            <text class="info-value">{{ formatTime(orderDetail.expireTime) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <EmptyState v-else text="订单不存在" />

    <!-- 底部操作按钮 -->
    <view v-if="!loading && orderDetail && (shouldShowPayButton || shouldShowCancelButton)" class="bottom-action-bar">
      <view 
        v-if="shouldShowCancelButton"
        class="cancel-btn" 
        @click="handleCancel"
      >
        <text class="cancel-btn-text">取消订单</text>
      </view>
      <view 
        v-if="shouldShowPayButton"
        class="pay-btn" 
        :class="{ disabled: countdownSeconds <= 0 }" 
        @click="handlePay"
      >
        <text class="pay-btn-text">立即支付 ¥{{ formatPrice(orderDetail.totalAmount) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.order-payment-page {
  min-height: 100vh;
  background-color: #fbfbfd;
}

.order-content {
  min-height: 100vh;
  background-color: #fbfbfd;
  padding-bottom: 120rpx; /* 为底部支付按钮留出空间 */
}

.order-header {
  background: #fff;
  border-radius: 0 0 32rpx 32rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
}

.order-status {
  margin-bottom: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.status-text {
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: -1rpx;
}

.status-description {
  font-size: 28rpx;
  color: #86868b;
  margin-top: 12rpx;
}

.countdown {
  padding-top: 32rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
}

.countdown-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.countdown-label {
  font-size: 26rpx;
  color: #424245;
}

.countdown-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d1d1f;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  letter-spacing: 2rpx;
  
  &.expired {
    color: #999;
  }
}

.order-items-section,
.order-amount-section,
.order-info-section {
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
}

.section-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 32rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  letter-spacing: -1rpx;
}

.order-items {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  
  &:first-child {
    padding-top: 0;
    border-top: none;
  }
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.item-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d1d1f;
  line-height: 1.4;
}

.item-sku {
  font-size: 26rpx;
  color: #424245;
  margin-top: 8rpx;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 16rpx;
}

.item-quantity {
  font-size: 26rpx;
  color: #424245;
}

.item-price {
  font-size: 26rpx;
  color: #424245;
}

.item-total {
  display: flex;
  align-items: center;
}

.total-price {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d1d1f;
}

.amount-detail {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.amount-label {
  font-size: 30rpx;
  color: #424245;
}

.amount-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d1d1f;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 28rpx;
  color: #424245;
}

.info-value {
  font-size: 28rpx;
  color: #1d1d1f;
}

.bottom-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.cancel-btn {
  padding: 24rpx 48rpx;
  background: #f5f5f7;
  border-radius: 100rpx;
  text-align: center;
  box-sizing: border-box;
  
  &:active {
    background: #e8e8ed;
  }
}

.cancel-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #424245;
}

.pay-btn {
  flex: 1;
  padding: 24rpx;
  background: #1d1d1f;
  border-radius: 100rpx;
  text-align: center;
  box-sizing: border-box;
  
  &.disabled {
    background: #ccc;
  }
  
  &:active:not(.disabled) {
    background: #2d2d2f;
  }
}

.pay-btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}
</style>