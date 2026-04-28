<script setup lang="ts">
import type { IShopOwnerIncomeDashboardRes } from "@/common/apis/shopApi";

interface Props {
  dashboard: IShopOwnerIncomeDashboardRes | null;
  loading: boolean;
}

defineProps<Props>();

defineEmits<{
  (e: "openConsole"): void;
}>();

const formatMoney = (value?: number) => {
  const normalized = Number(value || 0);
  return `¥${normalized.toFixed(2)}`;
};

const resolvedSummary = (dashboard?: IShopOwnerIncomeDashboardRes | null) => {
  // 没有返回看板时先用 0 占位，确保入口仍然可见。
  return dashboard?.summary || {
    total_income: 0,
    pattern_income: 0,
    membership_income: 0,
  };
};
</script>

<template>
  <view class="owner-block">
    <view class="owner-card" @click="$emit('openConsole')">
      <view class="owner-ribbon" />
      <view class="owner-grid-glow owner-grid-glow-one" />
      <view class="owner-grid-glow owner-grid-glow-two" />
      <view class="owner-card-head">
        <view>
          <text class="owner-card-eyebrow">Shop Console</text>
          <text class="owner-card-title">店铺管理</text>
          <text class="owner-card-brief">按门店查看图纸生成收入与会员开通收入</text>
        </view>
        <text class="owner-card-arrow">›</text>
      </view>

      <text v-if="loading" class="owner-loading">收入数据加载中...</text>

      <view v-else class="owner-stats">
        <view class="owner-stat">
          <text class="owner-stat-label">总收入</text>
          <text class="owner-stat-value">{{ formatMoney(resolvedSummary(dashboard).total_income) }}</text>
        </view>
        <view class="owner-stat">
          <text class="owner-stat-label">图纸生成</text>
          <text class="owner-stat-value">{{ formatMoney(resolvedSummary(dashboard).pattern_income) }}</text>
        </view>
        <view class="owner-stat">
          <text class="owner-stat-label">会员开通</text>
          <text class="owner-stat-value">{{ formatMoney(resolvedSummary(dashboard).membership_income) }}</text>
        </view>
      </view>

      <text class="owner-foot">
        {{ dashboard ? `已接入 ${dashboard.shop_count} 家门店 · 点击查看按门店和时间筛选的详细数据` : "点击查看各门店收入、图纸生成收入和会员开通收入" }}
      </text>
    </view>
  </view>
</template>

<style scoped>
.owner-block {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.owner-card {
  position: relative;
  overflow: hidden;
  border-radius: 34rpx;
  padding: 28rpx 24rpx 24rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.12), transparent 26%),
    radial-gradient(circle at bottom left, rgba(54, 207, 201, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 252, 0.98)),
    #ffffff;
  border: 1rpx solid rgba(77, 150, 255, 0.12);
  box-shadow:
    0 16rpx 36rpx rgba(77, 150, 255, 0.08),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.7);
}

.owner-ribbon {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 10rpx;
  background: linear-gradient(90deg, #4d96ff 0%, #36cfc9 52%, #52d681 100%);
}

.owner-grid-glow {
  position: absolute;
  border-radius: 999rpx;
  pointer-events: none;
}

.owner-grid-glow-one {
  top: -30rpx;
  right: -24rpx;
  width: 180rpx;
  height: 180rpx;
  background: radial-gradient(circle, rgba(77, 150, 255, 0.16) 0%, rgba(77, 150, 255, 0) 70%);
}

.owner-grid-glow-two {
  left: -20rpx;
  bottom: -50rpx;
  width: 150rpx;
  height: 150rpx;
  background: radial-gradient(circle, rgba(54, 207, 201, 0.12) 0%, rgba(54, 207, 201, 0) 72%);
}

.owner-card-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.owner-card-eyebrow {
  display: block;
  color: #4d96ff;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.owner-card-title {
  display: block;
  margin-top: 6rpx;
  color: #1f2937;
  font-size: 36rpx;
  font-weight: 800;
}

.owner-card-brief {
  display: block;
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.5;
}

.owner-card-arrow {
  min-width: 54rpx;
  height: 54rpx;
  border-radius: 27rpx;
  background: linear-gradient(135deg, #4d96ff 0%, #36cfc9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 34rpx;
  line-height: 1;
  box-shadow: 0 10rpx 18rpx rgba(77, 150, 255, 0.2);
}

.owner-loading,
.owner-foot {
  display: block;
  margin-top: 14rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.6;
}

.owner-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 20rpx;
  position: relative;
  z-index: 1;
}

.owner-stat {
  border-radius: 26rpx;
  padding: 20rpx 16rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(77, 150, 255, 0.08);
  display: grid;
  gap: 8rpx;
  box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.72);
}

.owner-stat:nth-child(1) {
  background: linear-gradient(180deg, rgba(230, 244, 255, 0.98), rgba(255, 255, 255, 0.94));
}

.owner-stat:nth-child(2) {
  background: linear-gradient(180deg, rgba(246, 255, 237, 0.98), rgba(255, 255, 255, 0.94));
}

.owner-stat:nth-child(3) {
  background: linear-gradient(180deg, rgba(255, 240, 246, 0.98), rgba(255, 255, 255, 0.94));
}

.owner-stat-label {
  color: #6b7280;
  font-size: 20rpx;
}

.owner-stat-value {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 800;
}
</style>
