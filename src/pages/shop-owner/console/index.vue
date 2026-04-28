<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";

import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import shopApi, { type IShopOwnerIncomeDashboardRes } from "@/common/apis/shopApi";
import miniPromptHelper from "@/common/helper/miniPromptHelper";

type RangeKey = "7D" | "30D" | "90D" | "365D";

const loading = ref(false);
const activeRange = ref<RangeKey>("30D");
const dashboard = ref<IShopOwnerIncomeDashboardRes | null>(null);

const rangeOptions: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: "7D", label: "近 7 天", days: 7 },
  { key: "30D", label: "近 30 天", days: 30 },
  { key: "90D", label: "近 90 天", days: 90 },
  { key: "365D", label: "近 1 年", days: 365 },
];

const formatMoney = (value?: number) => {
  const normalized = Number(value || 0);
  return `¥${normalized.toFixed(2)}`;
};

const downloadShopQrcode = async (item: IShopOwnerIncomeDashboardRes["items"][number]) => {
  const qrcodeUrl = item.shop.bind_qrcode_full_url || "";
  if (!qrcodeUrl) {
    miniPromptHelper.info("当前门店没有可下载的二维码");
    return;
  }
  try {
    uni.showLoading({
      title: "下载二维码中",
      mask: true,
    });
    const response = await uni.downloadFile({
      url: qrcodeUrl,
    });
    if (response.statusCode !== 200 || !response.tempFilePath) {
      throw new Error("二维码下载失败");
    }
    await uni.saveImageToPhotosAlbum({
      filePath: response.tempFilePath,
    });
    miniPromptHelper.success("二维码已保存到相册");
  } catch (error) {
    if ((error as { errMsg?: string })?.errMsg?.includes("cancel")) {
      miniPromptHelper.info("已取消保存");
    } else {
      miniPromptHelper.fail("二维码保存失败，请检查相册权限");
    }
  } finally {
    uni.hideLoading();
  }
};

const dateRangeText = computed(() => {
  if (!dashboard.value) {
    return "";
  }
  return `${dashboard.value.date_from} 至 ${dashboard.value.date_to}`;
});

const buildDateRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  const format = (value: Date) => {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  return {
    date_from: format(start),
    date_to: format(end),
  };
};

const fetchDashboard = async (rangeKey: RangeKey = activeRange.value) => {
  const rangeConfig = rangeOptions.find((item) => item.key === rangeKey) || rangeOptions[1];
  activeRange.value = rangeConfig.key;
  loading.value = true;
  try {
    const response = await shopApi.getShopOwnerIncomeDashboard(buildDateRange(rangeConfig.days));
    dashboard.value = response.data || null;
  } catch (error) {
    miniPromptHelper.fail(error instanceof Error ? error.message : "店铺收入加载失败");
  } finally {
    loading.value = false;
  }
};

onLoad(() => {
  void fetchDashboard("30D");
});

onShow(() => {
  if (!dashboard.value) {
    void fetchDashboard(activeRange.value);
  }
});
</script>

<template>
  <view class="page">
    <MaintenanceMask />
    <view class="hero-card">
      <text class="hero-eyebrow">Shop Console</text>
      <text class="hero-title">店铺管理</text>
      <text class="hero-desc">查看各门店的 mock 经营收入。当前为假数据，后续支付接入后会替换为真实统计。</text>
    </view>

    <view class="range-row">
      <view
        v-for="item in rangeOptions"
        :key="item.key"
        class="range-chip"
        :class="{ active: activeRange === item.key }"
        @click="fetchDashboard(item.key)"
      >
        {{ item.label }}
      </view>
    </view>

    <view class="summary-card">
      <text class="summary-range">{{ dateRangeText }}</text>
      <view v-if="dashboard" class="summary-grid">
        <view class="summary-item">
          <text class="summary-label">总收入</text>
          <text class="summary-value">{{ formatMoney(dashboard.summary.total_income) }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">图纸生成</text>
          <text class="summary-value">{{ formatMoney(dashboard.summary.pattern_income) }}</text>
        </view>
        <view class="summary-item">
          <text class="summary-label">会员开通</text>
          <text class="summary-value">{{ formatMoney(dashboard.summary.membership_income) }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading" class="list-card">
      <text class="loading-text">经营数据加载中...</text>
    </view>

    <view v-else-if="dashboard?.items?.length" class="list-card">
      <view v-for="item in dashboard.items" :key="item.shop.id" class="shop-card">
        <view class="shop-head">
          <view class="shop-head-copy">
            <text class="shop-title">{{ item.shop.display_name || item.shop.shop_name }}</text>
            <text class="shop-code">{{ item.shop.shop_code }}</text>
          </view>
          <text class="shop-source">{{ item.shop.source_type === "COMPANY" ? "官方拓展" : "推广拓展" }}</text>
        </view>

        <view class="shop-main">
          <view class="shop-meta-grid">
            <view class="shop-meta-item">
              <text class="shop-meta-label">联系人</text>
              <text class="shop-meta-value">{{ item.shop.contact_name || "未填写" }}</text>
            </view>
            <view class="shop-meta-item">
              <text class="shop-meta-label">联系电话</text>
              <text class="shop-meta-value">{{ item.shop.contact_phone || "未填写" }}</text>
            </view>
          </view>

          <view class="income-grid">
            <view class="income-item">
              <text class="income-label">总收入</text>
              <text class="income-value">{{ formatMoney(item.income.total_income) }}</text>
            </view>
            <view class="income-item">
              <text class="income-label">图纸生成</text>
              <text class="income-value">{{ formatMoney(item.income.pattern_income) }}</text>
            </view>
            <view class="income-item">
              <text class="income-label">会员开通</text>
              <text class="income-value">{{ formatMoney(item.income.membership_income) }}</text>
            </view>
          </view>

          <button class="shop-qrcode-btn shop-qrcode-btn-full" :disabled="!item.shop.bind_qrcode_full_url" @click="downloadShopQrcode(item)">
            下载店铺二维码
          </button>
        </view>
      </view>
    </view>

    <view v-else class="list-card">
      <text class="loading-text">当前没有可展示的门店收入数据</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.18), transparent 30%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 40%, #f7fafc 100%);
}

.hero-card,
.summary-card,
.list-card {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.1);
}

.hero-card {
  padding: 24rpx 22rpx 22rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.28), transparent 24%),
    linear-gradient(135deg, #ff4d8d 0%, #ff6a5a 20%, #ff9f1c 46%, #36cfc9 72%, #4d96ff 100%);
}

.hero-eyebrow,
.hero-desc,
.summary-range,
.loading-text,
.shop-code,
.summary-label,
.income-label {
  display: block;
}

.hero-eyebrow,
.hero-desc {
  color: rgba(255, 255, 255, 0.9);
}

.hero-title {
  display: block;
  margin-top: 8rpx;
  color: #ffffff;
  font-size: 44rpx;
  font-weight: 700;
}

.hero-desc {
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1.55;
}

.range-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.range-chip {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #6b7280;
  font-size: 22rpx;
  border: 1rpx solid #e5e7eb;
}

.range-chip.active {
  background: #1f2937;
  color: #ffffff;
  border-color: #1f2937;
}

.summary-card,
.list-card {
  margin-top: 18rpx;
  padding: 22rpx 20rpx;
}

.summary-range {
  color: #6b7280;
  font-size: 22rpx;
}

.summary-grid,
.income-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 16rpx;
}

.summary-item,
.income-item {
  border-radius: 22rpx;
  padding: 18rpx 16rpx;
  background: #f8fafc;
}

.summary-label,
.income-label {
  color: #6b7280;
  font-size: 20rpx;
}

.summary-value,
.income-value {
  display: block;
  margin-top: 8rpx;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 700;
}

.loading-text {
  color: #6b7280;
  font-size: 24rpx;
}

.shop-card {
  border-radius: 24rpx;
  border: 1rpx solid rgba(77, 150, 255, 0.1);
  background:
    linear-gradient(145deg, rgba(255, 240, 246, 0.9), rgba(230, 244, 255, 0.92)),
    #ffffff;
  padding: 18rpx;
}

.shop-head-copy {
  min-width: 0;
}

.shop-card + .shop-card {
  margin-top: 14rpx;
}

.shop-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
}

.shop-title {
  display: block;
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}

.shop-code {
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 20rpx;
}

.shop-source {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.shop-qrcode-btn {
  height: 66rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #4d96ff 0%, #36cfc9 100%);
  color: #ffffff;
  font-size: 22rpx;
  font-weight: 700;
  border: none;
}

.shop-qrcode-btn[disabled] {
  opacity: 0.45;
}

.shop-main {
  display: grid;
  gap: 16rpx;
  margin-top: 18rpx;
}

.shop-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.shop-meta-item {
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.82);
  border: 1rpx solid rgba(77, 150, 255, 0.08);
  padding: 14rpx 16rpx;
  display: grid;
  gap: 8rpx;
}

.shop-meta-label {
  color: #6b7280;
  font-size: 18rpx;
}

.shop-meta-value {
  color: #1f2937;
  font-size: 24rpx;
  font-weight: 600;
}

.shop-qrcode-btn-full {
  width: 100%;
}

@media (max-width: 980px) {
  .shop-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
