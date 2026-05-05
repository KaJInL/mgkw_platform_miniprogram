<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import walletApi, { type IWithdrawRequest } from "@/common/apis/walletApi";
import miniPromptHelper from "@/common/helper/miniPromptHelper";

const item = ref<IWithdrawRequest | null>(null);

const statusMeta = computed(() => {
  const status = String(item.value?.status || "").toUpperCase();
  const map: Record<string, { text: string; className: string; hint: string }> = {
    PENDING: { text: "待处理", className: "status-pending", hint: "系统已接收您的提现申请" },
    PAID: { text: "已打款", className: "status-paid", hint: "平台已完成打款处理" },
    REJECTED: { text: "已拒绝", className: "status-rejected", hint: "本次提现申请未通过审核" },
    CANCELLED: { text: "已取消", className: "status-cancelled", hint: "本次提现申请已取消" },
  };
  return map[status] || { text: item.value?.status || "--", className: "status-cancelled", hint: "提现状态已更新" };
});

const processSteps = computed(() => {
  const current = item.value;
  const status = String(current?.status || "").toUpperCase();
  const isRejected = status === "REJECTED";
  const isPaid = status === "PAID";
  const isCancelled = status === "CANCELLED";
  return [
    {
      title: isCancelled ? "提交申请后取消" : "提交提现申请",
      desc: "平台已收到您的提现资料",
      time: formatDate(current?.applied_at),
      state: current?.applied_at ? "done" : "todo",
    },
    {
      title: isRejected ? "平台审核未通过" : "平台审核",
      desc: isRejected ? (current?.audit_remark || "请查看处理备注") : "核对收款信息与可提现金额",
      time: formatDate(current?.audited_at),
      state: isRejected ? "failed" : (current?.audited_at ? "done" : (status === "PENDING" ? "current" : "todo")),
    },
    {
      title: isPaid ? "打款完成" : "打款至收款账户",
      desc: isPaid ? "款项已按审核金额打出" : "审核通过后平台会安排打款",
      time: formatDate(current?.paid_at),
      state: isPaid ? "done" : (isRejected || isCancelled ? "disabled" : "todo"),
    },
  ];
});

function money(value?: string | number | null) {
  return Number(value || 0).toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  return String(value).replace("T", " ").slice(0, 16);
}

function goBack() {
  uni.navigateBack();
}

function copyWithdrawNo() {
  if (!item.value?.withdraw_no) return;
  uni.setClipboardData({
    data: item.value.withdraw_no,
    success: () => miniPromptHelper.success("已复制提现单号"),
  });
}

function previewImage(url?: string | null) {
  if (!url) return;
  uni.previewImage({ urls: [url], current: url });
}

async function fetchDetail(id: number) {
  try {
    const response = await walletApi.getWithdrawRequests({ page: 1, page_size: 100 });
    item.value = (response.data.items || []).find((entry) => Number(entry.id) === id) || null;
    if (!item.value) {
      miniPromptHelper.info("提现记录不存在");
    }
  } catch (error) {
    miniPromptHelper.fail(error instanceof Error ? error.message : "提现详情加载失败");
  }
}

onLoad((query) => {
  const id = Number(query?.id || 0);
  if (id > 0) {
    void fetchDetail(id);
  }
});
</script>

<template>
  <view class="detail-page">
    <view v-if="item" class="content">
      <view class="status-card tactile-card">
        <view class="status-glow" :class="statusMeta.className" />
        <view class="status-chip" :class="statusMeta.className">
          <text class="chip-dot" />
          <text>{{ statusMeta.text }}</text>
        </view>
        <view class="amount-block">
          <text>提现金额</text>
          <strong>¥{{ money(item.amount) }}</strong>
        </view>
        <view class="withdraw-no" @click="copyWithdrawNo">
          <text>单号：{{ item.withdraw_no }}</text>
          <text class="copy-mark">复制</text>
        </view>
        <text class="status-hint">{{ statusMeta.hint }}</text>
      </view>

      <view class="info-card tactile-card">
        <view class="section-head section-primary">
          <text class="section-dot" />
          <text>申请信息</text>
        </view>
        <view class="section-body">
          <view class="info-row"><text>申请时间</text><strong>{{ formatDate(item.applied_at) }}</strong></view>
          <view class="info-row"><text>申请备注</text><strong class="remark">{{ item.apply_remark || "--" }}</strong></view>
        </view>
      </view>

      <view class="info-card tactile-card">
        <view class="section-head section-secondary">
          <text class="section-dot" />
          <text>收款信息</text>
        </view>
        <view class="section-body">
          <view class="info-row"><text>户主名称</text><strong>{{ item.account_name || "--" }}</strong></view>
          <view class="info-row"><text>银行卡号</text><strong class="mono">{{ item.account_no || "--" }}</strong></view>
          <view class="info-row"><text>开户行</text><strong>{{ item.bank_name || "--" }}</strong></view>
          <view v-if="item.receipt_qrcode_full_url" class="image-block" @click="previewImage(item.receipt_qrcode_full_url)">
            <image :src="item.receipt_qrcode_full_url" class="preview-image" mode="aspectFit" />
            <text>收款码</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-card tactile-card">
      <text>提现详情加载中...</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  --surface: #faf8ff;
  --surface-lowest: #ffffff;
  --surface-low: #f2f3ff;
  --surface-high: #e3e7fe;
  --surface-highest: #dde1f8;
  --primary: #934466;
  --primary-container: #ff9ec4;
  --secondary: #006b5b;
  --secondary-container: #9df3de;
  --tertiary: #6a4cab;
  --tertiary-container: #c7aeff;
  --on-surface: #161b2b;
  --on-variant: #524348;
  --outline: #d7c1c7;
  --pending: #f59e0b;
  --pending-container: #fef3c7;
  --error: #ba1a1a;
  --error-container: #ffdad6;
  min-height: 100vh;
  padding: 116rpx 24rpx 48rpx;
  background: var(--surface);
  box-sizing: border-box;
  color: var(--on-surface);
}

.top-bar {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 20;
  width: 100%;
  height: 92rpx;
  padding: 0 28rpx;
  border-bottom: 1rpx solid rgba(255, 158, 196, 0.18);
  border-radius: 0 0 32rpx 32rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 8rpx 20rpx rgba(255, 158, 196, 0.16);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.back-btn,
.top-spacer {
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn {
  color: var(--primary-container);
  font-size: 54rpx;
  line-height: 1;
  font-weight: 900;
}

.page-title {
  color: var(--primary-container);
  font-size: 34rpx;
  line-height: 1.2;
  font-weight: 900;
}

.content {
  display: grid;
  gap: 24rpx;
}

.tactile-card {
  border: 1rpx solid var(--surface-highest);
  border-radius: 32rpx;
  background: var(--surface-lowest);
  box-shadow: 0 8rpx 36rpx rgba(43, 48, 65, 0.06);
  overflow: hidden;
}

.status-card {
  position: relative;
  padding: 34rpx 28rpx 30rpx;
  display: grid;
  justify-items: center;
  gap: 20rpx;
  text-align: center;
}

.status-glow {
  position: absolute;
  top: -62rpx;
  right: -52rpx;
  width: 220rpx;
  height: 220rpx;
  border-radius: 999rpx;
  opacity: 0.45;
  filter: blur(18rpx);
}

.status-chip {
  position: relative;
  z-index: 1;
  height: 58rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 24rpx;
  line-height: 1;
  font-weight: 900;
  box-shadow: inset 0 3rpx 8rpx rgba(255,255,255,.56), 0 6rpx 18rpx rgba(43,48,65,.08);
}

.chip-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.status-pending {
  color: var(--pending);
  background: var(--pending-container);
}

.status-paid {
  color: var(--secondary);
  background: rgba(157, 243, 222, 0.42);
}

.status-rejected {
  color: var(--error);
  background: var(--error-container);
}

.status-cancelled {
  color: var(--on-variant);
  background: var(--surface-high);
}

.amount-block {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10rpx;
}

.amount-block text {
  color: var(--on-variant);
  font-size: 24rpx;
  line-height: 1.2;
  font-weight: 700;
}

.amount-block strong {
  color: var(--primary);
  font-size: 70rpx;
  line-height: 1;
  font-weight: 900;
}

.withdraw-no {
  max-width: 100%;
  height: 54rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  background: var(--surface-low);
  color: var(--on-variant);
  display: flex;
  align-items: center;
  gap: 10rpx;
  box-sizing: border-box;
}

.withdraw-no text:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 22rpx;
  line-height: 1.2;
}

.copy-mark {
  flex-shrink: 0;
  color: var(--primary);
  font-size: 22rpx;
  line-height: 1;
  font-weight: 900;
}

.status-hint {
  color: var(--on-variant);
  font-size: 23rpx;
  line-height: 1.4;
}

.info-card {
  display: grid;
}

.section-head {
  min-height: 76rpx;
  padding: 0 24rpx;
  border-bottom: 1rpx solid var(--surface-highest);
  display: flex;
  align-items: center;
  gap: 14rpx;
  font-size: 30rpx;
  line-height: 1.2;
  font-weight: 900;
  box-sizing: border-box;
}

.section-primary {
  background: rgba(255, 158, 196, 0.12);
}

.section-secondary {
  background: rgba(157, 243, 222, 0.2);
}

.section-tertiary {
  background: rgba(199, 174, 255, 0.2);
}

.section-primary .section-dot {
  background: var(--primary);
  box-shadow: 0 0 12rpx rgba(147,68,102,.4);
}

.section-secondary .section-dot {
  background: var(--secondary);
  box-shadow: 0 0 12rpx rgba(0,107,91,.36);
}

.section-tertiary .section-dot {
  background: var(--tertiary);
  box-shadow: 0 0 12rpx rgba(106,76,171,.36);
}

.section-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 999rpx;
}

.section-body {
  padding: 22rpx 24rpx;
  display: grid;
  gap: 20rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  color: var(--on-variant);
  font-size: 26rpx;
  line-height: 1.45;
}

.info-row > text {
  flex-shrink: 0;
}

.info-row strong {
  min-width: 0;
  color: var(--on-surface);
  text-align: right;
  font-size: 26rpx;
  line-height: 1.45;
  font-weight: 800;
  word-break: break-all;
}

.info-row .remark {
  padding: 8rpx 14rpx;
  border-radius: 16rpx;
  background: var(--surface-high);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.image-block {
  padding: 16rpx;
  border-radius: 24rpx;
  background: var(--surface-low);
  display: grid;
  gap: 12rpx;
}

.image-block text {
  color: var(--on-variant);
  font-size: 23rpx;
  line-height: 1.2;
  font-weight: 800;
}

.preview-image {
  width: 100%;
  height: 340rpx;
  border-radius: 18rpx;
  background: var(--surface-lowest);
}

.timeline {
  position: relative;
  padding: 28rpx 24rpx 6rpx;
  display: grid;
  gap: 34rpx;
}

.timeline-step {
  position: relative;
  display: flex;
  gap: 22rpx;
  align-items: flex-start;
}

.timeline-node {
  position: relative;
  z-index: 2;
  width: 42rpx;
  height: 42rpx;
  border: 8rpx solid var(--surface-lowest);
  border-radius: 999rpx;
  background: var(--surface-highest);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  line-height: 1;
  font-weight: 900;
  box-sizing: border-box;
}

.timeline-line {
  position: absolute;
  left: 20rpx;
  top: 48rpx;
  bottom: -38rpx;
  width: 3rpx;
  background: var(--surface-highest);
}

.timeline-step.done .timeline-node {
  background: var(--secondary);
  box-shadow: 0 0 16rpx rgba(0,107,91,.24);
}

.timeline-step.current .timeline-node {
  background: var(--pending);
  box-shadow: 0 0 16rpx rgba(245,158,11,.28);
}

.timeline-step.failed .timeline-node {
  background: var(--error);
  box-shadow: 0 0 16rpx rgba(186,26,26,.22);
}

.timeline-step.disabled {
  opacity: 0.56;
}

.timeline-copy {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 8rpx;
}

.timeline-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18rpx;
}

.timeline-title-row text {
  color: var(--on-surface);
  font-size: 27rpx;
  line-height: 1.35;
  font-weight: 900;
}

.timeline-title-row strong {
  flex-shrink: 0;
  color: var(--on-variant);
  font-size: 22rpx;
  line-height: 1.35;
  font-weight: 700;
}

.timeline-desc {
  color: var(--on-variant);
  font-size: 23rpx;
  line-height: 1.4;
}

.process-fields {
  padding-top: 12rpx;
}

.empty-card {
  padding: 40rpx 24rpx;
  text-align: center;
  color: var(--on-variant);
  font-size: 26rpx;
  line-height: 1.4;
}
</style>
