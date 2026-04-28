<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import paymentApi, { type IUserPaymentOrderDetail, type IUserPaymentOrderItem } from "@/common/apis/paymentApi";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import { useAppStateStore } from "@/store/appStateStore";

const appStateStore = useAppStateStore();
const { virtualPaymentReviewModeEnabled } = storeToRefs(appStateStore);
const loading = ref(false);
const loadingDetail = ref(false);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const orders = ref<IUserPaymentOrderItem[]>([]);
const selectedOrder = ref<IUserPaymentOrderDetail | null>(null);

const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize.value), 1));
const displayedOrders = computed(() => orders.value.filter((item) => String(item.status || "").toUpperCase() !== "PENDING"));

const formatMoney = (value?: string | null) => `¥${Number(value || 0).toFixed(2)}`;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveOrderTypeText = (value: string) => {
  if (value === "MONTH_CARD") {
    return "会员套餐";
  }
  if (value === "SINGLE_GENERATE") {
    return "单次生成";
  }
  return value || "--";
};

const resolveOrderStatusText = (value: string) => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "PENDING") return "待支付";
  if (normalized === "PAID") return "已支付";
  if (normalized === "PARTIAL") return "部分使用";
  if (normalized === "CONSUMED") return "已用完";
  return value || "--";
};

const resolveOrderStatusClass = (value: string) => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "PAID") return "order-status-paid";
  if (normalized === "PARTIAL") return "order-status-partial";
  if (normalized === "CONSUMED") return "order-status-consumed";
  return "order-status-pending";
};

const fetchOrders = async (page = currentPage.value) => {
  loading.value = true;
  try {
    const response = await paymentApi.getOrderList({
      page,
      page_size: pageSize.value,
    });
    const payload = (response as any).data;
    currentPage.value = payload?.page || page;
    pageSize.value = payload?.page_size || pageSize.value;
    total.value = payload?.total || 0;
    orders.value = payload?.items || [];
  } catch (error) {
    orders.value = [];
    total.value = 0;
    miniPromptHelper.fail(error instanceof Error ? error.message : "订单列表加载失败");
  } finally {
    loading.value = false;
  }
};

const openOrderDetail = async (item: IUserPaymentOrderItem) => {
  loadingDetail.value = true;
  selectedOrder.value = null;
  try {
    const response = await paymentApi.getOrderDetail(item.order_no);
    selectedOrder.value = (response as any).data as IUserPaymentOrderDetail;
  } catch (error) {
    miniPromptHelper.fail(error instanceof Error ? error.message : "订单详情加载失败");
  } finally {
    loadingDetail.value = false;
  }
};

const closeDetail = () => {
  selectedOrder.value = null;
};

onMounted(() => {
  if (virtualPaymentReviewModeEnabled.value) {
    return;
  }
  void fetchOrders();
});
</script>

<template>
  <view class="order-page">
    <MaintenanceMask />
    <view v-if="virtualPaymentReviewModeEnabled" class="empty-card">
      <text class="empty-title">虚拟支付审核模式已开启</text>
      <text class="empty-desc">审核期间已隐藏订单能力，当前页面暂不展示购买记录。</text>
    </view>
    <template v-else>
    <view class="hero-card">
      <text class="hero-title">订单中心</text>
      <text class="hero-subtitle">查看你的历史订单记录与明细</text>
    </view>

    <view v-if="loading" class="empty-card">
      <text class="empty-title">订单加载中...</text>
      <text class="empty-desc">正在同步你的历史订单记录。</text>
    </view>

    <view v-else-if="displayedOrders.length === 0" class="empty-card">
      <text class="empty-title">还没有历史订单</text>
      <text class="empty-desc">购买会员套餐或单次生成后，这里会显示订单记录。</text>
    </view>

    <view v-else class="order-list">
      <view v-for="item in displayedOrders" :key="item.order_no" class="order-card" @click="openOrderDetail(item)">
        <view class="order-head">
          <view>
            <text class="order-title">{{ item.title }}</text>
            <text class="order-meta">{{ resolveOrderTypeText(item.order_type) }} · {{ formatDateTime(item.paid_at || item.created_at) }}</text>
          </view>
          <view class="order-side">
            <text class="order-amount">{{ formatMoney(item.payable_amount || item.amount_amount) }}</text>
            <text class="order-status" :class="resolveOrderStatusClass(item.status)">{{ resolveOrderStatusText(item.status) }}</text>
          </view>
        </view>
        <view class="order-foot">
          <text class="order-no">{{ item.order_no }}</text>
        </view>
      </view>
    </view>

    <view v-if="total > pageSize" class="pagination-bar">
      <button class="page-btn" :disabled="currentPage <= 1 || loading" @click="fetchOrders(currentPage - 1)">上一页</button>
      <text class="page-meta">{{ currentPage }} / {{ totalPages }}</text>
      <button class="page-btn" :disabled="currentPage >= totalPages || loading" @click="fetchOrders(currentPage + 1)">下一页</button>
    </view>

    <view v-if="selectedOrder || loadingDetail" class="detail-mask" @click="closeDetail">
      <view class="detail-card" @click.stop>
        <text class="detail-title">订单详情</text>
        <text v-if="loadingDetail" class="detail-loading">加载中...</text>
        <view v-else-if="selectedOrder" class="detail-grid">
          <view class="detail-item">
            <text class="detail-label">订单标题</text>
            <text class="detail-value">{{ selectedOrder.title }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">订单号</text>
            <text class="detail-value">{{ selectedOrder.order_no }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">订单类型</text>
            <text class="detail-value">{{ resolveOrderTypeText(selectedOrder.order_type) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">订单状态</text>
            <text class="detail-value">{{ resolveOrderStatusText(selectedOrder.status) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">订单金额</text>
            <text class="detail-value">{{ formatMoney(selectedOrder.amount_amount) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">实际支付金额</text>
            <text class="detail-value">{{ formatMoney(selectedOrder.payable_amount || selectedOrder.amount_amount) }}</text>
          </view>
          <view class="detail-item">
            <text class="detail-label">支付时间</text>
            <text class="detail-value">{{ formatDateTime(selectedOrder.paid_at || selectedOrder.created_at) }}</text>
          </view>
          <view v-if="selectedOrder.plan_name" class="detail-item">
            <text class="detail-label">套餐名称</text>
            <text class="detail-value">{{ selectedOrder.plan_name }}</text>
          </view>
          <view v-if="selectedOrder.plan_code" class="detail-item">
            <text class="detail-label">套餐编码</text>
            <text class="detail-value">{{ selectedOrder.plan_code }}</text>
          </view>
          <view v-if="selectedOrder.shop_code" class="detail-item">
            <text class="detail-label">归属门店</text>
            <text class="detail-value">{{ selectedOrder.shop_code }}</text>
          </view>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<style scoped>
.order-page {
  min-height: 100vh;
  padding: 24rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.18), transparent 28%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 42%, #f7fafc 100%);
}

.hero-card,
.empty-card,
.order-card,
.detail-card {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid rgba(229, 231, 235, 0.92);
  box-shadow: 0 16rpx 38rpx rgba(77, 150, 255, 0.08);
}

.hero-card {
  padding: 28rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.26), transparent 26%),
    linear-gradient(135deg, rgba(255, 240, 246, 0.98), rgba(230, 244, 255, 0.98));
}

.hero-title,
.empty-title,
.order-title,
.detail-title {
  display: block;
  color: #1f2937;
  font-weight: 800;
}

.hero-title {
  font-size: 42rpx;
}

.hero-subtitle,
.empty-desc,
.order-meta,
.order-no,
.order-usage,
.detail-label,
.detail-loading,
.page-meta {
  color: #6b7280;
  font-size: 22rpx;
}

.hero-subtitle {
  display: block;
  margin-top: 10rpx;
}

.empty-card {
  margin-top: 18rpx;
  padding: 30rpx 24rpx;
  text-align: center;
}

.empty-desc {
  display: block;
  margin-top: 10rpx;
  line-height: 1.7;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 18rpx;
}

.order-card {
  padding: 22rpx 22rpx 20rpx;
}

.order-head,
.order-foot,
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.order-meta {
  display: block;
  margin-top: 10rpx;
}

.order-side {
  min-width: 160rpx;
  text-align: right;
}

.order-amount {
  display: block;
  color: #111827;
  font-size: 32rpx;
  font-weight: 900;
}

.order-status {
  display: inline-flex;
  margin-top: 10rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.order-status-pending {
  background: rgba(255, 159, 28, 0.14);
  color: #d97706;
}

.order-status-paid {
  background: rgba(77, 150, 255, 0.12);
  color: #4d96ff;
}

.order-status-partial {
  background: rgba(54, 207, 201, 0.14);
  color: #0f9e95;
}

.order-status-consumed {
  background: rgba(156, 163, 175, 0.16);
  color: #6b7280;
}

.order-foot {
  margin-top: 16rpx;
}

.pagination-bar {
  margin-top: 18rpx;
}

.page-btn {
  min-width: 160rpx;
  height: 72rpx;
  border: none;
  border-radius: 999rpx;
  background: #ffffff;
  color: #4b5563;
  font-size: 22rpx;
  border: 1rpx solid #e5e7eb;
}

.page-btn[disabled] {
  opacity: 0.5;
}

.detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
}

.detail-card {
  width: 100%;
  max-width: 680rpx;
  padding: 28rpx 24rpx;
}

.detail-title {
  font-size: 34rpx;
}

.detail-grid {
  display: grid;
  gap: 14rpx;
  margin-top: 20rpx;
}

.detail-item {
  border-radius: 20rpx;
  background: #f9fbff;
  padding: 18rpx 16rpx;
  display: grid;
  gap: 8rpx;
}

.detail-value {
  color: #1f2937;
  font-size: 24rpx;
  line-height: 1.6;
}
</style>
