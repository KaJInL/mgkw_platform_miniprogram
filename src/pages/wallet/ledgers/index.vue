<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import walletApi, { type IWalletLedger } from "@/common/apis/walletApi";

const items = ref<IWalletLedger[]>([]);

function sign(item: IWalletLedger) {
  if (item.direction === "IN") return "+";
  if (item.direction === "OUT") return "-";
  return "";
}

async function fetchItems() {
  const response = await walletApi.getLedgers({ page: 1, page_size: 50 });
  items.value = response.data.items || [];
}

onShow(() => void fetchItems());
</script>

<template>
  <view class="list-page">
    <view v-for="item in items" :key="item.id" class="ledger-card">
      <view class="head">
        <text>{{ item.change_type }}</text>
        <strong :class="item.direction.toLowerCase()">{{ sign(item) }}¥{{ item.amount }}</strong>
      </view>
      <view class="meta">
        <text>可用 {{ item.available_before }} → {{ item.available_after }}</text>
        <text>冻结 {{ item.frozen_before }} → {{ item.frozen_after }}</text>
      </view>
      <text class="remark">{{ item.remark || item.created_at }}</text>
    </view>
    <view v-if="items.length === 0" class="empty">暂无钱包流水</view>
  </view>
</template>

<style scoped lang="scss">
.list-page { min-height: 100vh; padding: 24rpx; background: #f7fafc; display: grid; align-content: start; gap: 18rpx; box-sizing: border-box; }
.ledger-card { border-radius: 20rpx; background: #fff; padding: 24rpx; display: grid; gap: 14rpx; box-shadow: 0 10rpx 28rpx rgba(15,23,42,.05); }
.head { display: flex; justify-content: space-between; gap: 16rpx; }
.head text { color: #1f2937; font-size: 28rpx; font-weight: 800; }
.head strong { font-size: 32rpx; }
.in { color: #52d681; }
.out { color: #ff4d6d; }
.freeze { color: #ff9f1c; }
.unfreeze { color: #4d96ff; }
.meta { display: grid; gap: 8rpx; color: #6b7280; font-size: 22rpx; }
.remark { color: #9ca3af; font-size: 22rpx; }
.empty { padding: 80rpx 0; text-align: center; color: #9ca3af; }
</style>
