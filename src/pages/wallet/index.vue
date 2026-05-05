<script setup lang="ts">
import { computed, ref } from "vue";
import { onReachBottom, onShow } from "@dcloudio/uni-app";

import walletApi, { type IIncomeRecord, type IUserWallet, type IWalletLedger } from "@/common/apis/walletApi";
import miniPromptHelper from "@/common/helper/miniPromptHelper";

type TWalletTab = "income" | "ledger";

const wallet = ref<IUserWallet | null>(null);
const withdrawPaidTotal = ref(0);
const withdrawRejectedTotal = ref(0);
const withdrawPendingTotal = ref(0);
const activeTab = ref<TWalletTab>("income");
const incomeItems = ref<IIncomeRecord[]>([]);
const ledgerItems = ref<IWalletLedger[]>([]);
const incomePage = ref(1);
const ledgerPage = ref(1);
const incomeHasMore = ref(true);
const ledgerHasMore = ref(true);
const loading = ref(false);
const listLoading = ref(false);
const pageSize = 10;

const currentItems = computed(() => activeTab.value === "income" ? incomeItems.value : ledgerItems.value);
const hasMore = computed(() => activeTab.value === "income" ? incomeHasMore.value : ledgerHasMore.value);

function money(value?: string | number | null) {
  return Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function incomeStatusText(value?: string | null) {
  const map: Record<string, string> = { UNSETTLED: "未结算", SETTLED: "已结算", REFUNDED: "已退款", CANCELLED: "已取消" };
  return map[String(value || "").toUpperCase()] || value || "--";
}

function incomeStatusClass(value?: string | null) {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "SETTLED") return "status-success";
  if (normalized === "UNSETTLED") return "status-pending";
  return "status-muted";
}

function incomeTypeText(value?: string | null) {
  const map: Record<string, string> = {
    SHOP_COMMISSION: "门店收益",
    PATTERN_SALE: "图纸售卖",
    TEMPLATE_SALE: "模板售卖",
    SERVICE_SALE: "服务收益",
    COURSE_SALE: "课程收益",
  };
  return map[String(value || "").toUpperCase()] || value || "--";
}

function ledgerTypeText(value?: string | null) {
  const map: Record<string, string> = {
    SETTLEMENT_IN: "结算入账",
    WITHDRAW_FREEZE: "提现冻结",
    WITHDRAW_PAID: "提现成功",
    WITHDRAW_REJECT_UNFREEZE: "拒绝解冻",
    MANUAL_ADJUST_IN: "人工调增",
    MANUAL_ADJUST_OUT: "人工调减",
  };
  return map[String(value || "").toUpperCase()] || value || "--";
}

function ledgerSign(item: IWalletLedger) {
  if (item.direction === "IN") return "+";
  if (item.direction === "OUT") return "-";
  return "";
}

function ledgerAmountClass(item: IWalletLedger) {
  if (item.direction === "IN") return "amount-in";
  if (item.direction === "OUT") return "amount-out";
  if (item.direction === "FREEZE") return "amount-freeze";
  if (item.direction === "UNFREEZE") return "amount-unfreeze";
  return "";
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  return String(value).replace("T", " ").slice(0, 16);
}

function incomeSourceName(item: IIncomeRecord) {
  return item.shop_name || item.source_name || "门店";
}

function showIncomeHelp() {
  uni.showModal({
    title: "收益结算说明",
    content: "未结算：订单支付后已生成收益，但还没有进入可提现余额。\n已结算：收益已按结算周期入账到钱包，可提现余额会增加。\n结算周期：每月 15 日和 30 日自动结算符合条件的收益。",
    showCancel: false,
    confirmText: "知道了",
    confirmColor: "#934466",
  });
}

function showLedgerHelp() {
  uni.showModal({
    title: "钱包流水说明",
    content: "钱包流水记录的是钱包余额的实际变化。\n结算入账：已结算收益进入可提现余额。\n提现冻结：提交提现后，提现金额会从可提现余额转到冻结金额，避免重复提现。\n提现成功：平台打款后，冻结金额正式扣除。\n拒绝解冻：提现被拒绝后，冻结金额退回可提现余额。",
    showCancel: false,
    confirmText: "知道了",
    confirmColor: "#934466",
  });
}

function switchTab(tab: TWalletTab) {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  if (tab === "income" && incomeItems.value.length === 0) void loadIncome(true);
  if (tab === "ledger" && ledgerItems.value.length === 0) void loadLedger(true);
}

async function fetchWallet() {
  loading.value = true;
  try {
    const walletResponse = await walletApi.getMyWallet();
    wallet.value = walletResponse.data || null;
    const [paidResponse, rejectedResponse, pendingResponse] = await Promise.all([
      walletApi.getWithdrawRequests({ status: "PAID", page: 1, page_size: 1 }),
      walletApi.getWithdrawRequests({ status: "REJECTED", page: 1, page_size: 1 }),
      walletApi.getWithdrawRequests({ status: "PENDING", page: 1, page_size: 1 }),
    ]);
    withdrawPaidTotal.value = paidResponse.data.total || 0;
    withdrawRejectedTotal.value = rejectedResponse.data.total || 0;
    withdrawPendingTotal.value = pendingResponse.data.total || 0;
  } catch (error) {
    wallet.value = null;
    withdrawPaidTotal.value = 0;
    withdrawRejectedTotal.value = 0;
    withdrawPendingTotal.value = 0;
    miniPromptHelper.fail(error instanceof Error ? error.message : "钱包加载失败");
  } finally {
    loading.value = false;
  }
}

async function loadIncome(reset = false) {
  if (listLoading.value) return;
  if (!reset && !incomeHasMore.value) return;
  listLoading.value = true;
  try {
    const nextPage = reset ? 1 : incomePage.value;
    const response = await walletApi.getIncomeRecords({ page: nextPage, page_size: pageSize });
    const nextItems = response.data.items || [];
    incomeItems.value = reset ? nextItems : [...incomeItems.value, ...nextItems];
    incomePage.value = nextPage + 1;
    incomeHasMore.value = incomeItems.value.length < response.data.total;
  } finally {
    listLoading.value = false;
  }
}

async function loadLedger(reset = false) {
  if (listLoading.value) return;
  if (!reset && !ledgerHasMore.value) return;
  listLoading.value = true;
  try {
    const nextPage = reset ? 1 : ledgerPage.value;
    const response = await walletApi.getLedgers({ page: nextPage, page_size: pageSize });
    const nextItems = response.data.items || [];
    ledgerItems.value = reset ? nextItems : [...ledgerItems.value, ...nextItems];
    ledgerPage.value = nextPage + 1;
    ledgerHasMore.value = ledgerItems.value.length < response.data.total;
  } finally {
    listLoading.value = false;
  }
}

function openWithdraw() {
  uni.navigateTo({ url: "/pages/wallet/withdraw/index" });
}

function openWithdrawRequests() {
  uni.navigateTo({ url: "/pages/wallet/withdraw-requests/index" });
}

onShow(() => {
  void fetchWallet();
  void loadIncome(true);
  if (activeTab.value === "ledger") void loadLedger(true);
});

onReachBottom(() => {
  if (activeTab.value === "income") void loadIncome();
  if (activeTab.value === "ledger") void loadLedger();
});
</script>

<template>
  <view class="wallet-page">
    <view class="asset-card soft-card">
      <view class="bead-glow" />
      <view class="asset-main">
        <view>
          <text class="asset-label">可提现余额</text>
          <view class="asset-amount-row">
            <text class="asset-symbol">¥</text>
            <text class="asset-amount">{{ money(wallet?.available_amount) }}</text>
          </view>
        </view>
        <button class="withdraw-btn" :disabled="loading || wallet?.status !== 'ACTIVE'" @click="openWithdraw">全部提现</button>
      </view>
      <view class="asset-row">
        <view><text>提现中</text><strong>¥{{ money(wallet?.frozen_amount) }}</strong></view>
        <view><text>累计收益</text><strong>¥{{ money(wallet?.total_income_amount) }}</strong></view>
        <view><text>累计提现</text><strong>¥{{ money(wallet?.total_withdraw_amount) }}</strong></view>
      </view>
    </view>

    <view class="withdraw-card soft-card" @click="openWithdrawRequests">
      <view class="section-head">
        <text class="section-title">提现记录</text>
        <view class="view-all">
          <text>查看全部</text>
          <text class="chevron">›</text>
        </view>
      </view>
      <view class="withdraw-stats">
        <view class="stat-tile stat-success">
          <strong>{{ withdrawPaidTotal }}</strong>
          <text>提现成功</text>
        </view>
        <view class="stat-tile stat-error">
          <strong>{{ withdrawRejectedTotal }}</strong>
          <text>提现失败</text>
        </view>
        <view class="stat-tile stat-pending">
          <strong>{{ withdrawPendingTotal }}</strong>
          <text>待处理</text>
        </view>
      </view>
    </view>

    <view class="tab-panel">
      <view class="tabs">
        <button :class="{ active: activeTab === 'income' }" @click="switchTab('income')">收益明细</button>
        <button :class="{ active: activeTab === 'ledger' }" @click="switchTab('ledger')">钱包流水</button>
      </view>

      <view class="list-title-row">
        <text>{{ activeTab === "income" ? "收益明细" : "钱包流水" }}</text>
        <view class="tab-help" @tap="activeTab === 'income' ? showIncomeHelp() : showLedgerHelp()">?</view>
      </view>

      <view v-if="activeTab === 'income'" class="record-list">
        <view v-for="item in incomeItems" :key="item.id" class="record-card soft-card">
          <view class="record-head">
            <view class="record-title-row">
              <view class="record-icon record-icon-primary">店</view>
              <view class="record-title-copy">
                <text>{{ incomeTypeText(item.income_type) }}</text>
                <text class="record-source">{{ incomeSourceName(item) }}</text>
              </view>
            </view>
            <strong class="amount-in">+¥{{ money(item.income_amount) }}</strong>
          </view>
          <view class="record-grid">
            <text>订单号：{{ item.order_no }}</text>
            <text>门店：{{ incomeSourceName(item) }}</text>
            <text>实付：¥{{ money(item.gross_amount) }}</text>
            <text>分成比例：{{ item.profit_sharing_rate }}%</text>
            <view class="status-pill" :class="incomeStatusClass(item.settle_status)">
              <text class="status-dot" />
              <text>{{ incomeStatusText(item.settle_status) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="record-list">
        <view v-for="item in ledgerItems" :key="item.id" class="record-card soft-card">
          <view class="record-head">
            <view class="record-title-row">
              <view class="record-icon record-icon-secondary">账</view>
              <text>{{ ledgerTypeText(item.change_type) }}</text>
            </view>
            <strong :class="ledgerAmountClass(item)">{{ ledgerSign(item) }}¥{{ money(item.amount) }}</strong>
          </view>
          <view class="record-grid">
            <text>可用：¥{{ money(item.available_before) }} → ¥{{ money(item.available_after) }}</text>
            <text>冻结：¥{{ money(item.frozen_before) }} → ¥{{ money(item.frozen_after) }}</text>
            <text>时间：{{ formatDateTime(item.created_at) }}</text>
            <text>{{ item.remark || "无备注" }}</text>
          </view>
        </view>
      </view>

      <view v-if="currentItems.length === 0 && !listLoading" class="empty-state">暂无数据</view>
      <view class="load-state">{{ listLoading ? "加载中..." : (hasMore ? "上拉加载更多" : "没有更多了") }}</view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.wallet-page {
  --surface: #faf8ff;
  --surface-lowest: #ffffff;
  --surface-low: #f2f3ff;
  --surface-high: #e3e7fe;
  --surface-highest: #dde1f8;
  --on-surface: #161b2b;
  --on-variant: #524348;
  --outline: #d7c1c7;
  --primary: #934466;
  --primary-container: #ff9ec4;
  --secondary: #006b5b;
  --secondary-container: #9df3de;
  --tertiary: #6a4cab;
  --tertiary-container: #c7aeff;
  --error: #ba1a1a;
  --error-container: #ffdad6;
  min-height: 100vh;
  padding: 32rpx 24rpx 120rpx;
  background:
    radial-gradient(circle at 92% -4%, rgba(255, 158, 196, 0.24), transparent 34%),
    radial-gradient(circle at 8% 18%, rgba(199, 174, 255, 0.2), transparent 28%),
    var(--surface);
  color: var(--on-surface);
  box-sizing: border-box;
  display: grid;
  align-content: start;
  gap: 28rpx;
}

.soft-card {
  border-radius: 48rpx;
  background: var(--surface-lowest);
  border: 1rpx solid rgba(215, 193, 199, 0.45);
  box-shadow: 0 22rpx 48rpx rgba(43, 48, 65, 0.06);
  box-sizing: border-box;
}

.asset-card {
  position: relative;
  overflow: hidden;
  padding: 36rpx 34rpx 28rpx;
}

.bead-glow {
  position: absolute;
  top: -76rpx;
  right: -72rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 999rpx;
  background: rgba(255, 158, 196, 0.28);
  filter: blur(28rpx);
}

.asset-main {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: flex-start;
  gap: 24rpx;
}

.asset-label {
  display: block;
  color: var(--on-variant);
  font-size: 24rpx;
  line-height: 1.4;
  font-weight: 700;
}

.asset-amount-row {
  margin-top: 14rpx;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  color: var(--primary);
}

.asset-symbol {
  font-size: 34rpx;
  line-height: 1;
  font-weight: 900;
}

.asset-amount {
  font-size: 66rpx;
  line-height: 1;
  font-weight: 900;
}

.withdraw-btn {
  flex-shrink: 0;
  min-width: 178rpx;
  height: 82rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: end;
  line-height: 1;
  color: #ffffff;
  background: linear-gradient(180deg, #a05275 0%, #934466 100%);
  box-shadow: inset 0 4rpx 8rpx rgba(255, 255, 255, 0.28), 0 12rpx 28rpx rgba(147, 68, 102, 0.28);
  font-size: 26rpx;
  font-weight: 900;
}

.withdraw-btn[disabled] {
  opacity: 0.55;
}

.asset-row {
  position: relative;
  z-index: 1;
  margin-top: 36rpx;
  padding-top: 26rpx;
  border-top: 1rpx solid var(--surface-highest);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20rpx;
}

.asset-row view {
  display: grid;
  gap: 8rpx;
}

.asset-row text {
  color: var(--on-variant);
  font-size: 21rpx;
  line-height: 1.3;
}

.asset-row strong {
  color: var(--on-surface);
  font-size: 28rpx;
  line-height: 1.2;
  font-weight: 900;
}

.withdraw-card {
  padding: 28rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 22rpx;
}

.section-title {
  color: var(--on-surface);
  font-size: 34rpx;
  line-height: 1.2;
  font-weight: 900;
}

.view-all {
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: var(--primary);
  font-size: 23rpx;
  line-height: 1.3;
  font-weight: 800;
}

.chevron {
  font-size: 34rpx;
  line-height: 1;
}

.withdraw-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18rpx;
}

.stat-tile {
  min-height: 118rpx;
  border-radius: 32rpx;
  padding: 20rpx 10rpx;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 8rpx;
  text-align: center;
}

.stat-success {
  background: rgba(157, 243, 222, 0.2);
}

.stat-error {
  background: rgba(255, 218, 214, 0.35);
}

.stat-pending {
  background: rgba(199, 174, 255, 0.22);
}

.stat-tile strong {
  color: var(--on-surface);
  font-size: 38rpx;
  line-height: 1;
  font-weight: 900;
}

.stat-tile text {
  color: var(--on-variant);
  font-size: 20rpx;
  line-height: 1.3;
  font-weight: 700;
}

.tab-panel {
  display: grid;
  gap: 22rpx;
}

.tabs {
  width: 100%;
  height: 84rpx;
  padding: 8rpx;
  border-radius: 999rpx;
  background: var(--surface-highest);
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-shadow: inset 0 3rpx 8rpx rgba(43, 48, 65, 0.06);
  box-sizing: border-box;
}

.tabs button {
  flex: 1;
  min-width: 0;
  height: 68rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--on-variant);
  font-size: 25rpx;
  line-height: 1;
  font-weight: 800;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  gap: 10rpx;
}

.tabs .active {
  background: var(--surface-lowest);
  color: var(--primary);
  box-shadow: 0 5rpx 18rpx rgba(43, 48, 65, 0.06);
}

.list-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 0 4rpx;
}

.list-title-row > text {
  color: var(--on-surface);
  font-size: 28rpx;
  line-height: 1.2;
  font-weight: 900;
}

.tab-help {
  flex-shrink: 0;
  width: 40rpx;
  height: 40rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(147, 68, 102, 0.12);
  color: var(--primary);
  font-size: 24rpx;
  line-height: 1;
  font-weight: 900;
  box-shadow: inset 0 2rpx 6rpx rgba(255,255,255,.55);
}

.record-list {
  display: grid;
  gap: 18rpx;
}

.record-card {
  padding: 24rpx;
  border-radius: 32rpx;
  display: grid;
  gap: 18rpx;
}

.record-head {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  align-items: flex-start;
}

.record-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.record-title-row text {
  color: var(--on-surface);
  font-size: 28rpx;
  line-height: 1.25;
  font-weight: 900;
}

.record-title-copy {
  min-width: 0;
  display: grid;
  gap: 4rpx;
}

.record-title-copy .record-source {
  color: var(--on-variant);
  font-size: 22rpx;
  line-height: 1.2;
  font-weight: 700;
}

.record-icon {
  flex-shrink: 0;
  width: 58rpx;
  height: 58rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  line-height: 1;
  font-weight: 900;
  box-shadow: inset 0 3rpx 7rpx rgba(255,255,255,.5);
}

.record-icon-primary {
  background: rgba(255, 158, 196, 0.28);
  color: var(--primary);
}

.record-icon-secondary {
  background: rgba(157, 243, 222, 0.35);
  color: var(--secondary);
}

.record-head strong {
  flex-shrink: 0;
  font-size: 32rpx;
  line-height: 1.2;
  font-weight: 900;
  text-align: right;
}

.amount-in {
  color: var(--secondary);
}

.amount-out {
  color: var(--error);
}

.amount-freeze {
  color: var(--tertiary);
}

.amount-unfreeze {
  color: var(--primary);
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx 16rpx;
  color: var(--on-variant);
  font-size: 22rpx;
  line-height: 1.45;
}

.record-grid > text {
  min-width: 0;
  word-break: break-all;
}

.status-pill {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1;
  font-weight: 800;
  border: 1rpx solid transparent;
}

.status-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
}

.status-success {
  background: rgba(157, 243, 222, 0.28);
  color: var(--secondary);
  border-color: rgba(157, 243, 222, 0.7);
}

.status-success .status-dot {
  background: var(--secondary);
}

.status-pending {
  background: rgba(199, 174, 255, 0.22);
  color: var(--tertiary);
  border-color: rgba(199, 174, 255, 0.55);
}

.status-pending .status-dot {
  background: var(--tertiary);
}

.status-muted {
  background: var(--surface-low);
  color: var(--on-variant);
  border-color: var(--surface-high);
}

.status-muted .status-dot {
  background: var(--outline);
}

.empty-state,
.load-state {
  padding: 22rpx 0 4rpx;
  text-align: center;
  color: var(--outline);
  font-size: 23rpx;
}
</style>
