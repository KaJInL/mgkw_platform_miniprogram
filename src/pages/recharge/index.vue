<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import paymentApi, { type IPaymentOverview, type IVipPlan } from "@/common/apis/paymentApi";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import shopContextHelper from "@/common/helper/shopContextHelper";
import { useAccountStore } from "@/store/accountStore";

const PLAN_META: Record<string, { label: string; accent: string; cta: string }> = {
  MONTH_CARD: {
    label: "月卡",
    accent: "高频推荐",
    cta: "开通月卡",
  },
  SEASON_CARD: {
    label: "季卡",
    accent: "更划算",
    cta: "开通季卡",
  },
  YEAR_CARD: {
    label: "年卡",
    accent: "长期推荐",
    cta: "开通年卡",
  },
};

const accountStore = useAccountStore();
const loading = ref(false);
const purchasing = ref(false);
const overview = ref<IPaymentOverview | null>(null);

const vipPlans = computed(() => overview.value?.vip_plans || []);
const hasVip = computed(() => Boolean(accountStore.userInfo?.is_vip_active));
const currentVipTitle = computed(() => accountStore.userInfo?.vip_badge_text || accountStore.userInfo?.vip_plan_name || "拼豆会员");
const lowestVipPrice = computed(() => vipPlans.value[0]?.price_amount || "0.00");
const singlePrice = computed(() => overview.value?.single_generate_price_amount || "0.00");
const singleGenerateQuotaRemaining = computed(() => Math.max(0, Number(overview.value?.single_generate_quota_remaining || accountStore.userInfo?.single_generate_quota_remaining || 0)));
const vipExpiresText = computed(() => {
  const raw = accountStore.userInfo?.vip_expires_at || overview.value?.vip_status?.expires_at || "";
  return raw ? String(raw).replace("T", " ").slice(0, 16) : "";
});

const waitForPaymentAccess = async () => {
  for (let index = 0; index < 6; index += 1) {
    await accountStore.refreshCurrentUser();
    const res = await paymentApi.getOverview();
    overview.value = (res as any).data as IPaymentOverview;
    if (overview.value?.vip_status?.is_active || overview.value?.has_single_quota) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error("支付结果同步超时");
};

const loadOverview = async () => {
  if (!accountStore.isLoggedIn) {
    miniPromptHelper.info("请先登录");
    uni.redirectTo({ url: "/pages/login/index" });
    return;
  }
  loading.value = true;
  try {
    const res = await paymentApi.getOverview();
    overview.value = (res as any).data as IPaymentOverview;
  } finally {
    loading.value = false;
  }
};

const purchaseSingle = async () => {
  await purchase({ orderType: "single_generate" });
};

const purchaseVipPlan = async (plan: IVipPlan) => {
  await purchase({
    orderType: "month_card",
    planCode: plan.plan_code,
    loadingTitle: `开通${PLAN_META[plan.card_type]?.label || "会员"}中`,
    successTitle: `${PLAN_META[plan.card_type]?.label || "会员"}已开通`,
  });
};

const purchase = async ({
  orderType,
  planCode,
  loadingTitle,
  successTitle,
}: {
  orderType: "single_generate" | "month_card";
  planCode?: string;
  loadingTitle?: string;
  successTitle?: string;
}) => {
  if (purchasing.value) {
    return;
  }
  purchasing.value = true;
  try {
    if (orderType === "month_card" && !planCode) {
      throw new Error("当前没有可购买的会员套餐");
    }
    uni.showLoading({
      title: loadingTitle || "购买中",
      mask: true,
    });
    const currentOrderShopCode = shopContextHelper.getCurrentOrderShopCode() || undefined;
    const orderRes = await paymentApi.createOrder({
      order_type: orderType,
      plan_code: planCode,
      shop_code: currentOrderShopCode,
    });
    const order = (orderRes as any).data;
    const payParams = order?.pay_params;
    if (!payParams) {
      throw new Error("未获取到支付参数");
    }
    uni.hideLoading();
    await uni.requestPayment({
      provider: "wxpay",
      timeStamp: payParams.timeStamp,
      nonceStr: payParams.nonceStr,
      package: payParams.package,
      signType: payParams.signType,
      paySign: payParams.paySign,
    });
    await waitForPaymentAccess();
    miniPromptHelper.success(successTitle || "权益已到账");
  } catch (error) {
    uni.hideLoading();
    if ((error as { errMsg?: string })?.errMsg?.includes("cancel")) {
      miniPromptHelper.info("已取消支付");
    } else {
      miniPromptHelper.fail("支付失败，请稍后重试");
    }
  } finally {
    purchasing.value = false;
  }
};

onShow(() => {
  void loadOverview();
});
</script>

<template>
  <view class="recharge-page">
    <MaintenanceMask />
    <view class="hero-banner" :class="{ 'hero-banner-active': hasVip }">
      <view class="hero-main">
        <text class="hero-label">{{ hasVip ? "VIP 会员中" : "会员充值" }}</text>
        <text class="hero-title">
          {{ hasVip ? currentVipTitle : "开通会员，生成更省心" }}
        </text>
        <text class="hero-desc">
          {{ hasVip ? `当前会员有效期至 ${vipExpiresText}` : "会员套餐和次数充值已分开，按使用频率自由选择。" }}
        </text>
      </view>
      <view class="hero-side">
        <text class="hero-side-label">{{ hasVip ? "当前状态" : "会员低至" }}</text>
        <text class="hero-side-value">{{ hasVip ? "VIP" : `¥${lowestVipPrice}` }}</text>
      </view>
    </view>

    <view class="status-card">
      <text class="status-title">当前权益</text>
      <text class="status-desc">剩余单次生成次数 {{ singleGenerateQuotaRemaining }}</text>
    </view>

    <view class="section-card membership-section">
      <view class="section-head">
        <view>
          <text class="section-tag">MEMBERSHIP</text>
          <text class="section-title">会员充值</text>
        </view>
        <text class="section-tip">后续可支持自动续费</text>
      </view>

      <view class="membership-grid">
        <view v-for="plan in vipPlans" :key="plan.id" class="membership-card" :class="plan.card_type.toLowerCase()">
          <view class="membership-card-top">
            <text class="membership-badge">{{ plan.badge_text || PLAN_META[plan.card_type]?.accent }}</text>
            <text class="membership-accent">{{ PLAN_META[plan.card_type]?.accent }}</text>
          </view>
          <text class="membership-name">{{ plan.plan_name }}</text>
          <view class="membership-price-row">
            <text class="membership-price">¥{{ plan.price_amount }}</text>
            <text v-if="plan.original_price_amount" class="membership-original-price">¥{{ plan.original_price_amount }}</text>
          </view>
          <text class="membership-duration">{{ plan.duration_days }} 天有效期</text>
          <text class="membership-desc">{{ plan.highlight_text || "适合持续生成拼豆图纸的用户。" }}</text>
          <text class="membership-note">{{ plan.benefit_text || "开通后生成图纸不再单次扣费。" }}</text>
          <button class="membership-button" :disabled="loading || purchasing" @click="purchaseVipPlan(plan)">
            {{ purchasing ? "处理中..." : (PLAN_META[plan.card_type]?.cta || "立即开通") }}
          </button>
        </view>
      </view>
    </view>

    <view class="section-card single-section">
      <view class="section-head">
        <view>
          <text class="section-tag section-tag-blue">SINGLE</text>
          <text class="section-title">次数充值</text>
        </view>
        <text class="section-tip">偶尔做图时更灵活</text>
      </view>

      <view class="single-card">
        <view class="single-copy">
          <text class="single-badge">单次购买</text>
          <text class="single-name">单次生成图纸</text>
          <text class="single-desc">适合偶尔做一张图，付一次用一次，不影响会员体系。</text>
        </view>
        <view class="single-action">
          <text class="single-price">¥{{ singlePrice }}</text>
          <button class="single-button" :disabled="loading || purchasing" @click="purchaseSingle">
            {{ purchasing ? "处理中..." : "购买" }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.recharge-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 40rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.24), transparent 24%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 42%, #f4f9ff 100%);
}

.hero-banner,
.section-card,
.status-card,
.membership-card,
.single-card {
  border-radius: 30rpx;
  border: 1rpx solid rgba(229, 231, 235, 0.9);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.08);
}

.hero-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 30rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.28), transparent 24%),
    linear-gradient(135deg, rgba(255, 240, 246, 0.98) 0%, rgba(230, 244, 255, 0.98) 100%);
}

.hero-banner-active {
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.3), transparent 22%),
    linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 40%, #4d96ff 100%);
}

.hero-main {
  min-width: 0;
  flex: 1;
}

.hero-label {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.hero-title {
  display: block;
  margin-top: 16rpx;
  color: #1f2937;
  font-size: 42rpx;
  font-weight: 900;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}

.hero-banner-active .hero-title,
.hero-banner-active .hero-desc,
.hero-banner-active .hero-side-label,
.hero-banner-active .hero-side-value {
  color: #ffffff;
}

.hero-side {
  display: flex;
  min-width: 144rpx;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.hero-side-label {
  color: #6b7280;
  font-size: 20rpx;
  font-weight: 700;
}

.hero-side-value {
  margin-top: 8rpx;
  color: #111827;
  font-size: 44rpx;
  font-weight: 900;
}

.status-card {
  margin-top: 18rpx;
  padding: 24rpx 26rpx;
}

.status-title {
  display: block;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 800;
}

.status-desc {
  display: block;
  margin-top: 10rpx;
  color: #4d96ff;
  font-size: 24rpx;
  font-weight: 700;
}

.section-card {
  margin-top: 22rpx;
  padding: 26rpx 24rpx;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.section-tag {
  display: inline-flex;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 77, 141, 0.1);
  color: #ff4d8d;
  font-size: 20rpx;
  font-weight: 700;
}

.section-tag-blue {
  background: rgba(77, 150, 255, 0.12);
  color: #4d96ff;
}

.section-title {
  display: block;
  margin-top: 16rpx;
  color: #1f2937;
  font-size: 36rpx;
  font-weight: 900;
}

.section-tip {
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.6;
  text-align: right;
}

.membership-grid {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 20rpx;
}

.membership-card {
  padding: 24rpx;
}

.membership-card.month_card {
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.18), transparent 26%),
    linear-gradient(145deg, #fff7fb 0%, #f4f9ff 100%);
}

.membership-card.season_card {
  background:
    radial-gradient(circle at top right, rgba(54, 207, 201, 0.2), transparent 26%),
    linear-gradient(145deg, #f7fffd 0%, #f5f8ff 100%);
}

.membership-card.year_card {
  background:
    radial-gradient(circle at top right, rgba(255, 159, 28, 0.2), transparent 28%),
    linear-gradient(145deg, #fffaf4 0%, #f7fbff 100%);
}

.membership-card-top,
.membership-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.membership-badge {
  display: inline-flex;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #ff4d8d;
  font-size: 20rpx;
  font-weight: 700;
}

.membership-accent {
  color: #6b7280;
  font-size: 22rpx;
  font-weight: 700;
}

.membership-name {
  display: block;
  margin-top: 18rpx;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 900;
}

.membership-price {
  color: #111827;
  font-size: 54rpx;
  font-weight: 900;
}

.membership-original-price {
  color: #9ca3af;
  font-size: 24rpx;
  text-decoration: line-through;
}

.membership-duration,
.membership-desc,
.membership-note {
  display: block;
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.7;
}

.membership-button,
.single-button {
  margin-top: 18rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 800;
}

.membership-button {
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
}

.membership-button::after,
.single-button::after {
  border: none;
}

.single-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-top: 20rpx;
  padding: 24rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.14), transparent 24%),
    linear-gradient(145deg, #f8fbff 0%, #ffffff 100%);
}

.single-copy {
  min-width: 0;
  flex: 1;
}

.single-badge {
  display: inline-flex;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(77, 150, 255, 0.12);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.single-name {
  display: block;
  margin-top: 16rpx;
  color: #1f2937;
  font-size: 32rpx;
  font-weight: 900;
}

.single-desc {
  display: block;
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.7;
}

.single-action {
  display: flex;
  min-width: 210rpx;
  flex-direction: column;
  align-items: flex-end;
}

.single-price {
  color: #111827;
  font-size: 48rpx;
  font-weight: 900;
}

.single-button {
  width: 210rpx;
  height: 84rpx;
  line-height: 84rpx;
  background: linear-gradient(135deg, #36cfc9 0%, #4d96ff 100%);
  color: #ffffff;
}
</style>
