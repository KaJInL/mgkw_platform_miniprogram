<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import walletApi, { type IWithdrawRequest } from "@/common/apis/walletApi";

const items = ref<IWithdrawRequest[]>([]);

function statusText(value: string) {
  const map: Record<string, string> = { PENDING: "待处理", PAID: "已打款", REJECTED: "已拒绝", CANCELLED: "已取消" };
  return map[value] || value;
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  return String(value).replace("T", " ").slice(0, 16);
}

function openDetail(item: IWithdrawRequest) {
  uni.navigateTo({ url: `/pages/wallet/withdraw-requests/detail?id=${item.id}` });
}

async function fetchItems() {
  const response = await walletApi.getWithdrawRequests({ page: 1, page_size: 50 });
  items.value = response.data.items || [];
}

onShow(() => void fetchItems());
</script>

<template>
  <view class="list-page">
    <view v-for="item in items" :key="item.id" class="withdraw-card" @click="openDetail(item)">
      <view class="amount-block">
        <text>提现金额</text>
        <strong>¥{{ Number(item.amount || 0).toFixed(2) }}</strong>
      </view>
      <view class="right-block">
        <text class="status" :class="item.status.toLowerCase()">{{ statusText(item.status) }}</text>
        <text class="date">{{ formatDate(item.applied_at) }}</text>
      </view>
    </view>
    <view v-if="items.length === 0" class="empty">暂无提现记录</view>
  </view>
</template>

<style scoped lang="scss">
.list-page { min-height: 100vh; padding: 24rpx; background: linear-gradient(180deg, #fff6fb 0%, #fff 56%, #f7fafc 100%); display: grid; align-content: start; gap: 18rpx; box-sizing: border-box; }
.withdraw-card { border-radius: 22rpx; background: #fff; padding: 24rpx; display: flex; align-items: center; justify-content: space-between; gap: 20rpx; box-shadow: 0 10rpx 28rpx rgba(15,23,42,.05); border: 1rpx solid rgba(77,150,255,.08); }
.amount-block { display: grid; gap: 8rpx; min-width: 0; }
.amount-block text { color: #6b7280; font-size: 22rpx; }
.amount-block strong { color: #1f2937; font-size: 38rpx; line-height: 1; }
.right-block { display: grid; gap: 10rpx; text-align: right; flex-shrink: 0; }
.status { font-size: 24rpx; font-weight: 900; }
.date { color: #9ca3af; font-size: 22rpx; }
.pending { color: #ff9f1c; }
.paid { color: #52d681; }
.rejected { color: #ff4d6d; }
.cancelled { color: #9ca3af; }
.empty { padding: 80rpx 0; text-align: center; color: #9ca3af; }
</style>
