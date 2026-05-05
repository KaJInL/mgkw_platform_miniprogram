<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import walletApi, { type IIncomeRecord } from "@/common/apis/walletApi";

const items = ref<IIncomeRecord[]>([]);
const activeStatus = ref("");
const statusOptions = ["", "UNSETTLED", "SETTLED", "REFUNDED", "CANCELLED"];

function statusText(value: string) {
  const map: Record<string, string> = { UNSETTLED: "未结算", SETTLED: "已结算", REFUNDED: "已退款", CANCELLED: "已取消" };
  return value ? map[value] || value : "全部";
}

async function fetchItems() {
  const response = await walletApi.getIncomeRecords({ settle_status: activeStatus.value || undefined, page: 1, page_size: 50 });
  items.value = response.data.items || [];
}

onShow(() => void fetchItems());
</script>

<template>
  <view class="list-page">
    <view class="tabs">
      <button v-for="status in statusOptions" :key="status || 'ALL'" :class="{ active: activeStatus === status }" @click="activeStatus = status; fetchItems()">
        {{ statusText(status) }}
      </button>
    </view>
    <view class="cards">
      <view v-for="item in items" :key="item.id" class="record-card">
        <view class="head">
          <text>{{ item.income_type }}</text>
          <strong>+¥{{ item.income_amount }}</strong>
        </view>
        <view class="grid">
          <text>订单 {{ item.order_no }}</text>
          <text>实付 ¥{{ item.gross_amount }}</text>
          <text>分润 {{ item.profit_sharing_rate }}%</text>
          <text>{{ statusText(item.settle_status) }}</text>
        </view>
        <text class="remark">{{ item.remark || item.paid_at }}</text>
      </view>
      <view v-if="items.length === 0" class="empty">暂无收益明细</view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.list-page { min-height: 100vh; padding: 24rpx; background: #f7fafc; box-sizing: border-box; }
.tabs { display: flex; gap: 12rpx; overflow-x: auto; padding-bottom: 18rpx; }
.tabs button { flex-shrink: 0; padding: 14rpx 22rpx; border-radius: 999rpx; background: #fff; color: #6b7280; font-size: 24rpx; }
.tabs .active { background: #4d96ff; color: #fff; }
.cards { display: grid; gap: 18rpx; }
.record-card { border-radius: 20rpx; background: #fff; padding: 24rpx; display: grid; gap: 16rpx; box-shadow: 0 10rpx 28rpx rgba(15,23,42,.05); }
.head { display: flex; justify-content: space-between; gap: 16rpx; align-items: center; }
.head text { color: #1f2937; font-size: 28rpx; font-weight: 800; }
.head strong { color: #52d681; font-size: 34rpx; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10rpx; color: #6b7280; font-size: 22rpx; }
.remark { color: #9ca3af; font-size: 22rpx; }
.empty { padding: 80rpx 0; text-align: center; color: #9ca3af; }
</style>
