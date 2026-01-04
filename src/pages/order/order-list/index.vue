<script setup lang="ts">
import { ref, computed } from "vue";
import orderApi, { type OrderSimple } from "@/common/apis/orderApi";

// 状态变量
const currentFilter = ref("all");
const refreshing = ref(false);
const loading = ref(false);
const hasMore = ref(true);
const page = ref(1);
const pageSize = ref(10);

// 订单列表
const orderList = ref<OrderSimple[]>([]);
const totalCount = ref(0);

// 订单状态映射
const statusMap: Record<string, { text: string; color: string; bgColor: string }> = {
  pending: { text: "待支付", color: "#FF9500", bgColor: "#FFF4E6" },
  paid: { text: "已支付", color: "#34C759", bgColor: "#E8F8EC" },
  cancelled: { text: "已取消", color: "#8E8E93", bgColor: "#F2F2F7" },
  expired: { text: "已过期", color: "#8E8E93", bgColor: "#F2F2F7" },
  refunded: { text: "已退款", color: "#FF3B30", bgColor: "#FFE9E7" },
};

// 获取订单状态样式
const getStatusStyle = (status: string) => {
  return statusMap[status] || { text: status, color: "#8E8E93", bgColor: "#F2F2F7" };
};

// 格式化金额
const formatPrice = (price: string) => {
  const num = parseFloat(price);
  return num.toFixed(2);
};

// 格式化时间
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

// 格式化支付方式
const formatPaymentType = (type: string) => {
  const paymentMap: Record<string, string> = {
    WECHAT: "微信支付",
    wechat: "微信支付",
    ALIPAY: "支付宝",
    alipay: "支付宝",
  };
  return paymentMap[type] || type;
};

// 筛选切换
const setFilter = (filter: string) => {
  if (currentFilter.value === filter) return;
  currentFilter.value = filter;
  resetList();
  loadData();
};

// 重置列表
const resetList = () => {
  page.value = 1;
  hasMore.value = true;
  orderList.value = [];
  totalCount.value = 0;
};

// 加载数据
const loadData = async () => {
  if (loading.value) return;
  loading.value = true;

  try {
    const res = await orderApi.getOrderList(page.value, pageSize.value);

    if (res.isSuccess && res.data) {
      const { list, total } = res.data;
      totalCount.value = total;

      // 过滤逻辑
      let newList = list || [];
      if (currentFilter.value !== "all") {
        newList = newList.filter((item) => item.status === currentFilter.value);
      }

      // 追加数据
      if (page.value === 1) {
        orderList.value = newList;
      } else {
        orderList.value.push(...newList);
      }

      // 判断是否还有更多
      if (orderList.value.length >= total || list.length < pageSize.value) {
        hasMore.value = false;
      }
    }
  } catch (e) {
    console.error("加载订单列表失败", e);
    uni.showToast({ title: "加载失败", icon: "none" });
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
};

// 下拉刷新
const onRefresh = () => {
  refreshing.value = true;
  resetList();
  loadData();
};

// 加载更多
const onLoadMore = () => {
  if (!hasMore.value || loading.value) return;
  page.value++;
  loadData();
};

// 跳转到订单详情
const navigateToDetail = (orderId: number) => {
  uni.navigateTo({
    url: `/pages/order/order-detail/index?orderId=${orderId}`,
  });
};

// 初始化加载
loadData();
</script>

<template>
  <view class="order-list-page">
    <!-- 筛选栏 -->
    <view class="header-section">
      <view class="filter-bar">
        <view
          class="filter-item"
          :class="{ active: currentFilter === 'all' }"
          @click="setFilter('all')"
        >
          <text>全部</text>
        </view>
        <view
          class="filter-item"
          :class="{ active: currentFilter === 'pending' }"
          @click="setFilter('pending')"
        >
          <text>待支付</text>
        </view>
        <view
          class="filter-item"
          :class="{ active: currentFilter === 'paid' }"
          @click="setFilter('paid')"
        >
          <text>已支付</text>
        </view>
        <view
          class="filter-item"
          :class="{ active: currentFilter === 'cancelled' }"
          @click="setFilter('cancelled')"
        >
          <text>已取消</text>
        </view>
      </view>
    </view>

    <!-- 订单列表 -->
    <scroll-view
      class="order-scroll"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="onLoadMore"
    >
      <view class="order-list-container">
        <view
          v-for="item in orderList"
          :key="item.id"
          class="order-item-card"
          @click="navigateToDetail(item.id)"
        >
          <!-- 订单头部 -->
          <view class="order-header">
            <view class="order-no">
              <text class="label">订单号</text>
              <text class="value">{{ item.merchantOrderNo || item.id }}</text>
              <text v-if="item.serialNo" class="serial-no">流水号: {{ item.serialNo }}</text>
            </view>
            <view
              class="order-status"
              :style="{
                color: getStatusStyle(item.status).color,
                backgroundColor: getStatusStyle(item.status).bgColor,
              }"
            >
              <text>{{ getStatusStyle(item.status).text }}</text>
            </view>
          </view>

          <!-- 订单内容 -->
          <view class="order-content">
            <view class="order-info">
              <text class="order-name">{{ item.name || "订单详情" }}</text>
              <text v-if="item.remark" class="order-remark">{{ item.remark }}</text>
              <view v-if="item.paymentType" class="payment-info">
                <text class="payment-label">支付方式</text>
                <text class="payment-value">{{ formatPaymentType(item.paymentType) }}</text>
              </view>
            </view>
            <view class="order-amount">
              <text class="amount-label">总计</text>
              <text class="amount-value">¥{{ item.totalAmount }}</text>
            </view>
          </view>

          <!-- 订单底部 -->
          <view class="order-footer">
            <text class="create-time">{{ item.createdAt }}</text>
            <view class="arrow-icon">
              <text>›</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多提示 -->
      <view class="load-more" v-if="loading">
        <text>LOADING...</text>
      </view>
      <view class="load-more" v-else-if="!hasMore && orderList.length > 0">
        <text class="end-text">THE END</text>
      </view>
      <view class="empty-state" v-else-if="!loading && orderList.length === 0">
        <text>暂无订单</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.order-list-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #fbfbfd;
}

.header-section {
  background: rgba(251, 251, 253, 0.8);
  backdrop-filter: blur(20px);
  z-index: 10;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
}

.filter-bar {
  display: flex;
  gap: 48rpx;
  padding: 20rpx 40rpx 30rpx 40rpx;
}

.filter-item {
  font-size: 28rpx;
  color: #86868b;
  position: relative;
  padding-bottom: 8rpx;
  transition: all 0.3s;
  letter-spacing: 0.5rpx;
}

.filter-item.active {
  color: #1d1d1f;
  font-weight: 600;
}

.filter-item.active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #1d1d1f;
  border-radius: 4rpx;
}

.order-scroll {
  flex: 1;
  height: 0;
  background-color: #fbfbfd;
}

.order-list-container {
  padding: 24rpx 32rpx;
}

.order-item-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
  transition: all 0.3s;

  &:active {
    transform: scale(0.98);
    box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  }
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}

.order-no {
  display: flex;
  flex-direction: column;
  gap: 8rpx;

  .label {
    font-size: 24rpx;
    color: #86868b;
  }

  .value {
    font-size: 26rpx;
    color: #1d1d1f;
    font-weight: 500;
    font-family: "SF Mono", "Monaco", "Menlo", monospace;
  }

  .serial-no {
    font-size: 22rpx;
    color: #86868b;
    font-family: "SF Mono", "Monaco", "Menlo", monospace;
  }
}

.order-status {
  padding: 8rpx 20rpx;
  border-radius: 100rpx;
  font-size: 24rpx;
  font-weight: 600;
  letter-spacing: 0.5rpx;
}

.order-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.order-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.order-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1d1d1f;
  line-height: 1.4;
}

.order-remark {
  font-size: 26rpx;
  color: #86868b;
  line-height: 1.5;
}

.payment-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 8rpx;

  .payment-label {
    font-size: 24rpx;
    color: #86868b;
  }

  .payment-value {
    font-size: 24rpx;
    color: #1d1d1f;
    font-weight: 500;
  }
}

.order-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.amount-label {
  font-size: 24rpx;
  color: #86868b;
}

.amount-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d1d1f;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-time {
  font-size: 24rpx;
  color: #86868b;
}

.arrow-icon {
  font-size: 48rpx;
  color: #d1d1d6;
  line-height: 1;
}

.load-more {
  text-align: center;
  padding: 60rpx 0 80rpx 0;
  color: #86868b;
  font-size: 22rpx;
  letter-spacing: 2rpx;
  text-transform: uppercase;
  font-weight: 500;
}

.end-text {
  font-size: 22rpx;
  letter-spacing: 2rpx;
  opacity: 0.6;
}

.empty-state {
  padding: 160rpx 0;
  text-align: center;
  color: #86868b;
  font-size: 26rpx;
  letter-spacing: 2rpx;
}
</style>