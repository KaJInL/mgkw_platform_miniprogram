<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import beadPatternApi from "@/common/apis/beadPatternApi";
import paymentApi, { type IPaymentOverview, type IVipPlan } from "@/common/apis/paymentApi";
import { LocalStorageKey } from "@/common/helper/localStorageHelper";
import localStorageHelper from "@/common/helper/localStorageHelper";
import { beadPalette } from "@/common/constants/beadPalette";
import BrandTabBar from "@/common/components/BrandTabBar.vue";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import shopContextHelper from "@/common/helper/shopContextHelper";
import type { IShopItem } from "@/common/apis/shopApi";
import { useAccountStore } from "@/store/accountStore";
import { useAppStateStore } from "@/store/appStateStore";

interface GridPreset {
  label: string;
  columns: number;
}

const PLAN_META: Record<string, { label: string; cta: string }> = {
  MONTH_CARD: { label: "月卡", cta: "开通月卡" },
  SEASON_CARD: { label: "季卡", cta: "开通季卡" },
  YEAR_CARD: { label: "年卡", cta: "开通年卡" },
};

const selectedImagePath = ref("");
const uploadedImageId = ref("");
const generating = ref(false);
const generateSubmitting = ref(false);
const purchasing = ref(false);
const paySheetVisible = ref(false);
const gridWidth = ref(48);
const gridHeight = ref(48);
const sourceImageWidth = ref(1);
const sourceImageHeight = ref(1);
const maxColors = ref(16);
const preserveBackgroundBlank = ref(false);
const boundShop = ref<IShopItem | null>(shopContextHelper.getBoundShopInfo());
const paymentOverview = ref<IPaymentOverview | null>(null);
const accountStore = useAccountStore();
const appStateStore = useAppStateStore();
const { virtualPaymentReviewModeEnabled } = storeToRefs(appStateStore);
const gridSizePresets: GridPreset[] = [
  { label: "26", columns: 26 },
  { label: "48", columns: 48 },
  { label: "96", columns: 96 },
  { label: "128", columns: 128 },
  { label: "160", columns: 160 },
];

const hasImage = computed(() => Boolean(selectedImagePath.value));
const hasBoundShop = computed(() => Boolean(boundShop.value?.shop_code));
const maxColorLimit = beadPalette.length;
const boardCompatibilityText = computed(() => `需使用兼容大于等于 ${gridWidth.value} × ${gridHeight.value} 格的拼豆板`);
const horizontalCutHint = computed(() => {
  const total = gridWidth.value * gridHeight.value;
  return `切成 ${gridWidth.value} 列，约 ${gridHeight.value} 行，最多约 ${total} 颗豆。`;
});
const previewFrameStyle = computed(() => {
  const width = Math.max(sourceImageWidth.value || 1, 1);
  const height = Math.max(sourceImageHeight.value || 1, 1);
  return {
    aspectRatio: `${width} / ${height}`,
  };
});
const defaultVipPlan = computed(() => paymentOverview.value?.vip_plans?.[0] || null);
const vipPlans = computed(() => paymentOverview.value?.vip_plans || []);
const monthCardPriceText = computed(() => defaultVipPlan.value?.price_amount || "0.00");
const singlePriceText = computed(() => paymentOverview.value?.single_generate_price_amount || "0.00");
const vipHighlightText = computed(() => {
  return defaultVipPlan.value?.highlight_text || "月卡有效期内，生成图纸不再单次扣费。";
});
const waitForPaymentAccess = async () => {
  for (let index = 0; index < 6; index += 1) {
    await accountStore.refreshCurrentUser();
    const overviewRes = await paymentApi.getOverview();
    const overview = (overviewRes as any).data as IPaymentOverview;
    paymentOverview.value = overview;
    if (overview?.can_generate) {
      return overview;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error("支付结果同步超时");
};

const normalizeColumns = (value: number) => clamp(Math.round(value || 48), 12, 160);
const normalizeRows = (value: number) => clamp(Math.round(value || 48), 12, 320);
const isPresetActive = (preset: GridPreset) => gridWidth.value === preset.columns;

const applyGridPreset = (preset: GridPreset | number) => {
  const normalizedColumns = normalizeColumns(typeof preset === "number" ? preset : preset.columns);
  gridWidth.value = normalizedColumns;

  if (!sourceImageWidth.value || !sourceImageHeight.value) {
    gridHeight.value = normalizedColumns;
    return;
  }

  gridHeight.value = normalizeRows(normalizedColumns * (sourceImageHeight.value / sourceImageWidth.value));
};

const chooseImage = async () => {
  try {
    const result = await uni.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album"],
    });
    const nextImagePath = result.tempFilePaths?.[0] || "";
    selectedImagePath.value = nextImagePath;

    if (nextImagePath) {
      uni.showLoading({
        title: "上传图片中",
        mask: true,
      });
      const uploadRes = await beadPatternApi.uploadImage(nextImagePath);
      const uploadData = (uploadRes as any).data;
      uploadedImageId.value = uploadData.image_id;
      sourceImageWidth.value = uploadData.width;
      sourceImageHeight.value = uploadData.height;
      applyGridPreset(gridWidth.value);
      uni.hideLoading();
    }
  } catch (error) {
    uni.hideLoading();
    if ((error as { errMsg?: string })?.errMsg?.includes("cancel")) {
      return;
    }
    uni.showToast({
      title: "选择图片失败",
      icon: "none",
    });
  }
};

const startGeneratePattern = async () => {
  if (!selectedImagePath.value || !uploadedImageId.value || generating.value) {
    return;
  }

  generating.value = true;
  uni.showLoading({
    title: "生成图纸中",
    mask: true,
  });

  try {
    const generateRes = await beadPatternApi.generate({
      image_id: uploadedImageId.value,
      width: gridWidth.value,
      height: gridHeight.value,
      max_colors: maxColors.value,
      preserve_background_blank: preserveBackgroundBlank.value,
      preprocess_strategy: "wan27_white_bg_v2",
      palette: beadPalette.map((item) => ({
        id: item.id,
        name: item.name,
        hex: item.hex,
        code: item.code,
      })),
    });
    const task = (generateRes as any).data;
    if (!task?.task_id) {
      throw new Error((generateRes as any)?.message || "生成失败");
    }
    localStorageHelper.remove(LocalStorageKey.LATEST_BEAD_PATTERN);
    uni.hideLoading();
    generating.value = false;
    uni.showToast({
      title: "生图任务提交完成",
      icon: "success",
    });
    return;
  } catch (error) {
    console.error("生成拼豆图纸失败：", error);
    uni.showToast({
      title: "生成失败，请换张图试试",
      icon: "none",
    });
  } finally {
    uni.hideLoading();
    generating.value = false;
  }
};

const generatePattern = async () => {
  if (!accountStore.isLoggedIn) {
    uni.navigateTo({ url: "/pages/login/index" });
    return;
  }
  if (!selectedImagePath.value || !uploadedImageId.value || generating.value || generateSubmitting.value) {
    return;
  }
  generateSubmitting.value = true;
  if (virtualPaymentReviewModeEnabled.value) {
    try {
      await startGeneratePattern();
    } finally {
      generateSubmitting.value = false;
    }
    return;
  }

  try {
    const overviewRes = await paymentApi.getOverview();
    const overview = (overviewRes as any).data as IPaymentOverview;
    paymentOverview.value = overview;
    if (!overview?.can_generate) {
      paySheetVisible.value = true;
      return;
    }
  } catch (error) {
    console.error("读取支付概览失败：", error);
    uni.showToast({
      title: "请先检查登录状态",
      icon: "none",
    });
  } finally {
    generateSubmitting.value = false;
  }
  if (!paymentOverview.value?.can_generate) {
    return;
  }
  await startGeneratePattern();
};

const closePaySheet = () => {
  paySheetVisible.value = false;
};

const purchaseAccess = async (orderType: "single_generate" | "month_card", plan?: IVipPlan | null) => {
  if (purchasing.value) {
    return;
  }
  purchasing.value = true;

  try {
    const targetPlan = orderType === "month_card" ? (plan || defaultVipPlan.value) : null;
    if (orderType === "month_card" && !targetPlan?.plan_code) {
      throw new Error("当前没有可购买的 VIP 套餐");
    }
    uni.showLoading({
      title: orderType === "month_card" ? `开通${PLAN_META[targetPlan?.card_type || "MONTH_CARD"]?.label || "会员"}中` : "购买中",
      mask: true,
    });
    const currentOrderShopCode = shopContextHelper.getCurrentOrderShopCode() || undefined;
    console.log("[home] purchaseAccess:createOrder", {
      orderType,
      planCode: orderType === "month_card" ? targetPlan?.plan_code : undefined,
      currentOrderShopCode,
    });
    const orderRes = await paymentApi.createOrder({
      order_type: orderType,
      plan_code: orderType === "month_card" ? targetPlan?.plan_code : undefined,
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
    paySheetVisible.value = false;
    uni.showToast({
      title: orderType === "month_card" ? `${PLAN_META[targetPlan?.card_type || "MONTH_CARD"]?.label || "会员"}已开通` : "已获得生成权益",
      icon: "success",
    });
    await startGeneratePattern();
  } catch (error) {
    console.error("购买生成权益失败：", error);
    uni.hideLoading();
    uni.showToast({
      title: (error as { errMsg?: string })?.errMsg?.includes("cancel") ? "已取消支付" : "支付失败，请稍后再试",
      icon: "none",
    });
  } finally {
    purchasing.value = false;
  }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const refreshBoundShop = async () => {
  try {
    const pendingQrcodeCode = shopContextHelper.getPendingBindQrcodeCode();
    if (pendingQrcodeCode) {
      const context = await shopContextHelper.fetchPendingBindQrcodeContext(pendingQrcodeCode);
      const resolvedShop = context?.bound_shop || shopContextHelper.getBoundShopInfo();
      boundShop.value = resolvedShop;
      if (resolvedShop?.shop_code) {
        shopContextHelper.setCurrentOrderShopCode(resolvedShop.shop_code);
        console.log("[home] refreshBoundShop:setCurrentOrderShopCode", {
          pendingQrcodeCode,
          resolvedShopCode: resolvedShop.shop_code,
        });
      }
      return;
    }
    boundShop.value = shopContextHelper.getBoundShopInfo();
  } catch (error) {
    console.error("刷新门店上下文失败：", error);
    boundShop.value = shopContextHelper.getBoundShopInfo();
  }
};

onShow(() => {
  void refreshBoundShop();
});
</script>

<template>
  <view class="page">
    <MaintenanceMask />

    <view class="upload-panel">
      <view class="upload-head">
        <view class="upload-copy">
          <text class="upload-eyebrow">图片转拼豆图纸</text>
          <text class="upload-title">上传图片</text>
        </view>
      </view>

      <text class="upload-desc">尽量上传主体清晰、背景简单的图片。复杂图片需要更大尺寸的拼豆板才能兼容更多细节。</text>

      <button class="upload-button primary" @click="chooseImage">选择图片</button>

      <view v-if="hasImage" class="preview-box">
        <view class="preview-frame" :style="previewFrameStyle">
          <view class="preview-accent" />
          <image :src="selectedImagePath" class="preview-image" mode="aspectFit" />
        </view>
      </view>
      <view v-else class="empty-box">
        <text class="empty-title">上传后在这里预览原图</text>
        <text class="empty-desc">建议主体清晰、背景简单。</text>
      </view>
    </view>

    <view class="card">
      <view class="section-head">
        <text class="section-title">生成参数</text>
        <view class="section-pill">3 项</view>
      </view>

      <view class="slider-block size">
        <view class="slider-head">
          <text class="slider-label">横轴切割数量</text>
          <text class="slider-value">{{ gridWidth }} 列，约 {{ gridHeight }} 行</text>
        </view>
        <view class="preset-row">
          <text
            v-for="preset in gridSizePresets"
            :key="preset.label"
            class="preset-chip"
            :class="{ active: isPresetActive(preset) }"
            @click="applyGridPreset(preset)"
          >
            {{ preset.label }}
          </text>
        </view>
        <slider
          :value="gridWidth"
          :min="12"
          :max="160"
          :step="1"
          activeColor="#4D96FF"
          backgroundColor="#DDE7F2"
          block-color="#36CFC9"
          @changing="applyGridPreset($event.detail.value)"
          @change="applyGridPreset($event.detail.value)"
        />
        <text class="slider-tip">{{ horizontalCutHint }}</text>
        <text class="slider-tip">数字越大，细节越多，也更费豆。</text>
        <text class="slider-tip">{{ boardCompatibilityText }}</text>
        <text class="slider-tip">复杂图建议 96 起，简单图可先试 48。</text>
      </view>

      <view class="slider-block colors">
        <view class="slider-head">
          <text class="slider-label">最多颜色</text>
          <text class="slider-value">{{ maxColors }} 色</text>
        </view>
        <slider
          :value="maxColors"
          :min="6"
          :max="maxColorLimit"
          :step="1"
          activeColor="#36CFC9"
          backgroundColor="#DDE7F2"
          block-color="#FF9F1C"
          @changing="maxColors = $event.detail.value"
          @change="maxColors = $event.detail.value"
        />
        <view class="color-meter">
          <view class="color-meter-fill" :style="{ width: `${(maxColors / maxColorLimit) * 100}%` }" />
        </view>
        <text class="slider-tip">颜色越少越省豆，颜色越多细节越完整。</text>
      </view>

      <view class="slider-block blank">
        <view class="slider-head">
          <text class="slider-label">背景留白</text>
          <text class="slider-value">{{ preserveBackgroundBlank ? "保留空白" : "映射成拼豆" }}</text>
        </view>
        <view class="lock-row" @click="preserveBackgroundBlank = !preserveBackgroundBlank">
          <view class="checkbox" :class="{ checked: preserveBackgroundBlank }">
            <text class="checkbox-mark">{{ preserveBackgroundBlank ? "✓" : "" }}</text>
          </view>
          <view class="lock-copy">
            <text class="lock-title">去除背景</text>
            <text class="lock-text">只建议纯色背景进行图片使用</text>
          </view>
        </view>
        <text class="slider-tip">背景太复杂、主体边界不清晰的图片，不支持稳定去除背景。</text>
      </view>

      <button class="generate-button" :disabled="!hasImage || generating || generateSubmitting" @click="generatePattern">
        {{ generating ? "正在生成..." : "生成拼豆图纸" }}
      </button>
    </view>

    <BrandTabBar />

    <view v-if="paySheetVisible" class="pay-sheet-mask" @click="closePaySheet" />
    <view v-if="paySheetVisible" class="pay-sheet">
      <view class="pay-sheet-header">
        <text class="pay-sheet-eyebrow">会员权益</text>
        <text class="pay-sheet-title">当前账号还不能直接生成</text>
        <text class="pay-sheet-desc">{{ paymentOverview?.reason || "可按次购买，也可以直接开通月卡。" }}</text>
      </view>

      <view class="pay-group">
        <text class="pay-group-title">会员充值</text>
        <scroll-view class="vip-scroll" scroll-x :show-scrollbar="false" enhanced>
          <view class="vip-scroll-track">
            <view v-for="plan in vipPlans" :key="plan.id" class="pay-card month vip-card">
            <view class="pay-card-topline">
              <text class="pay-badge vip">{{ PLAN_META[plan.card_type]?.label || "会员" }}</text>
              <text class="pay-card-chip">{{ plan.badge_text || PLAN_META[plan.card_type]?.label || "会员" }}</text>
            </view>
            <text class="pay-card-title premium">{{ plan.plan_name }}</text>
            <view class="pay-card-price-row">
              <text class="pay-card-price">¥{{ plan.price_amount }}</text>
              <text class="pay-card-price-unit">/ {{ plan.duration_days }} 天</text>
              <text v-if="plan.original_price_amount" class="pay-card-original-price">¥{{ plan.original_price_amount }}</text>
            </view>
            <text class="pay-card-desc">{{ plan.highlight_text || vipHighlightText }}</text>
            <view class="pay-card-benefits">
              <text class="pay-card-benefit">✓ 图纸生成更省心</text>
              <text class="pay-card-benefit">✓ 可持续使用会员权益</text>
            </view>
            <view class="pay-card-renew">
              <view class="pay-card-renew-check">
                <text class="pay-card-renew-checkmark">✓</text>
              </view>
              <text class="pay-card-renew-text">默认开通自动续费，可随时取消</text>
            </view>
            <button class="pay-card-button month-btn" :disabled="purchasing" @click="purchaseAccess('month_card', plan)">
              {{ purchasing ? "处理中..." : (PLAN_META[plan.card_type]?.cta || "立即开通") }}
            </button>
          </view>
          </view>
        </scroll-view>
        <text class="pay-group-footnote">开通即表示同意《自动续费服务协议》，续费前将按规则提醒。</text>
      </view>

      <view class="pay-group">
        <text class="pay-group-title">次数充值</text>
        <view class="pay-options single-options">
          <view class="pay-card single single-card-compact">
            <text class="pay-badge">单次</text>
            <text class="pay-card-title">单次生成图纸</text>
            <text class="pay-card-price">¥{{ singlePriceText }}</text>
            <text class="pay-card-desc compact">适合偶尔做一张图。付款后本次可直接生成。</text>
            <button class="pay-card-button single-btn" :disabled="purchasing" @click="purchaseAccess('single_generate')">
              {{ purchasing ? "处理中..." : "购买" }}
            </button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 20rpx 188rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.18), transparent 30%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 40%, #f7fafc 100%);
}

.bound-shop-card,
.upload-panel,
.card {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.1);
}

.bound-shop-card {
  margin-bottom: 16rpx;
  padding: 22rpx 22rpx 20rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.24), transparent 28%),
    linear-gradient(135deg, rgba(255, 240, 246, 0.94) 0%, rgba(230, 244, 255, 0.96) 100%);
  border: 1rpx solid rgba(77, 150, 255, 0.1);
}

.bound-shop-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.bound-shop-eyebrow {
  display: block;
  color: #6b7280;
  font-size: 20rpx;
  letter-spacing: 1rpx;
}

.bound-shop-title {
  display: block;
  margin-top: 8rpx;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.18;
}

.bound-shop-code {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.upload-panel {
  padding: 24rpx 22rpx 20rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.32), transparent 24%),
    linear-gradient(135deg, #ff4d8d 0%, #ff6a5a 20%, #ff9f1c 46%, #36cfc9 72%, #4d96ff 100%);
}

.upload-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.upload-copy {
  display: flex;
  flex-direction: column;
}

.upload-eyebrow {
  color: rgba(255, 255, 255, 0.82);
  font-size: 20rpx;
  letter-spacing: 1rpx;
}

.upload-title {
  display: block;
  margin-top: 8rpx;
  color: #ffffff;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.1;
}

.upload-desc {
  display: block;
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.9);
  font-size: 22rpx;
  line-height: 1.5;
}

.upload-badge {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.94);
  font-size: 20rpx;
  font-weight: 700;
}

.upload-button,
.generate-button {
  height: 82rpx;
  line-height: 82rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
}

.upload-button::after,
.generate-button::after {
  border: none;
}

.upload-button {
  width: 100%;
  margin-top: 18rpx;
}

.upload-button.primary {
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 10rpx 24rpx rgba(31, 41, 55, 0.12);
}

.preview-box,
.empty-box {
  margin-top: 16rpx;
  border-radius: 22rpx;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.08)),
    #ffffff;
}

.preview-box {
  padding: 12rpx;
}

.preview-frame {
  position: relative;
  padding: 10rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #fff0f6 0%, #fffbe6 45%, #e6f4ff 100%);
  min-height: 240rpx;
}

.preview-accent {
  position: absolute;
  inset: 0 0 auto 0;
  height: 12rpx;
  border-radius: 18rpx 18rpx 0 0;
  background: linear-gradient(90deg, #ff4d8d 0%, #ff9f1c 48%, #4d96ff 100%);
}

.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 14rpx;
  background: #ffffff;
}

.empty-box {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  align-items: center;
  justify-content: center;
  min-height: 180rpx;
  padding: 16rpx;
  background:
    linear-gradient(135deg, rgba(255, 240, 246, 0.72), rgba(230, 244, 255, 0.84)),
    #ffffff;
}

.empty-title {
  color: #1f2937;
  font-size: 26rpx;
  font-weight: 700;
}

.empty-desc {
  color: #6b7280;
  font-size: 22rpx;
}

.card {
  margin-top: 16rpx;
  padding: 20rpx 18rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.08), transparent 24%),
    #ffffff;
}

.section-head,
.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 700;
}

.section-pill,
.slider-value {
  color: #4d96ff;
  font-size: 22rpx;
  font-weight: 600;
}

.section-pill {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #e6f4ff;
}

.slider-label {
  color: #6b7280;
  font-size: 22rpx;
}

.slider-block {
  margin-top: 14rpx;
  padding: 16rpx 16rpx 12rpx;
  border-radius: 20rpx;
  border: 1px solid #eef2f7;
}

.slider-block.size {
  background: #fff0f6;
}

.slider-block.colors {
  background: #f6ffed;
}

.slider-block.blank {
  background: #e6f4ff;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 12rpx;
  margin-bottom: 4rpx;
}

.preset-chip {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #6b7280;
  font-size: 20rpx;
  font-weight: 700;
  box-shadow: 0 6rpx 14rpx rgba(31, 41, 55, 0.05);
}

.preset-chip.active {
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
}

.color-meter {
  width: 100%;
  height: 10rpx;
  margin-top: 4rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.8);
}

.color-meter-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #ff9f1c 0%, #52d681 55%, #36cfc9 100%);
}

.slider-tip {
  display: block;
  margin-top: 8rpx;
  color: #9ca3af;
  font-size: 20rpx;
  line-height: 1.45;
}

.lock-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 12rpx;
  padding: 14rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.78);
}

.checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34rpx;
  height: 34rpx;
  margin-top: 2rpx;
  border: 2rpx solid #bfdbfe;
  border-radius: 10rpx;
  background: #ffffff;
  flex-shrink: 0;
}

.checkbox.checked {
  border-color: #4d96ff;
  background: linear-gradient(135deg, #4d96ff 0%, #36cfc9 100%);
}

.checkbox-mark {
  color: #ffffff;
  font-size: 18rpx;
  font-weight: 700;
}

.lock-copy {
  display: flex;
  flex-direction: column;
}

.lock-title {
  color: #1f2937;
  font-size: 22rpx;
  font-weight: 700;
}

.lock-text {
  margin-top: 4rpx;
  color: #6b7280;
  font-size: 20rpx;
  line-height: 1.45;
}

.generate-button {
  margin-top: 16rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #ff6a5a 32%, #4d96ff 100%);
  color: #ffffff;
  box-shadow: 0 14rpx 28rpx rgba(77, 150, 255, 0.22);
}

.generate-button[disabled] {
  opacity: 0.5;
}

.pay-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(15, 23, 42, 0.48);
}

.pay-sheet {
  position: fixed;
  left: 50%;
  top: 50%;
  width: calc(100vw - 56rpx);
  max-width: 700rpx;
  z-index: 1201;
  max-height: calc(100vh - 180rpx);
  border-radius: 34rpx;
  padding: 24rpx 22rpx 24rpx;
  overflow-y: auto;
  transform: translate(-50%, -50%);
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.22), transparent 24%),
    radial-gradient(circle at top left, rgba(77, 150, 255, 0.14), transparent 22%),
    linear-gradient(180deg, rgba(255, 252, 254, 0.99) 0%, rgba(246, 250, 255, 0.98) 100%);
  border: 1rpx solid rgba(255, 255, 255, 0.86);
  box-shadow:
    0 30rpx 72rpx rgba(31, 41, 55, 0.24),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18rpx);
}

.pay-sheet-header {
  display: flex;
  flex-direction: column;
}

.pay-sheet-eyebrow {
  align-self: flex-start;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.pay-sheet-title {
  margin-top: 12rpx;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 800;
}

.pay-sheet-desc {
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.6;
}

.pay-group {
  margin-top: 18rpx;
}

.pay-group-title {
  display: block;
  color: #1f2937;
  font-size: 22rpx;
  font-weight: 800;
}

.pay-options {
  margin-top: 12rpx;
}

.vip-scroll {
  width: 100%;
  margin-top: 12rpx;
  white-space: nowrap;
}

.vip-scroll-track {
  display: inline-flex;
  gap: 14rpx;
  padding-right: 10rpx;
}

.vip-card {
  width: 400rpx;
  min-width: 400rpx;
  white-space: normal;
}

.single-options {
  display: block;
}

.pay-card {
  border-radius: 24rpx;
  padding: 18rpx 18rpx 20rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1rpx solid rgba(77, 150, 255, 0.1);
}

.pay-card.month {
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.16), transparent 24%),
    linear-gradient(140deg, rgba(255, 247, 251, 0.98) 0%, rgba(244, 249, 255, 0.98) 100%);
  border-color: rgba(255, 77, 141, 0.14);
  box-shadow: 0 16rpx 30rpx rgba(255, 77, 141, 0.08);
}

.pay-card.single {
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.12), transparent 24%),
    linear-gradient(140deg, rgba(248, 252, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
}

.pay-card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
}

.pay-badge {
  display: inline-flex;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: #e6f4ff;
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.pay-badge.vip {
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #fff;
}

.pay-card-chip {
  color: #6b7280;
  font-size: 20rpx;
  font-weight: 700;
}

.pay-card-title {
  display: block;
  margin-top: 14rpx;
  color: #1f2937;
  font-size: 26rpx;
  font-weight: 700;
}

.pay-card-title.premium {
  font-size: 30rpx;
  font-weight: 900;
}

.pay-card-price-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10rpx;
}

.pay-card-price {
  display: block;
  margin-top: 10rpx;
  color: #111827;
  font-size: 38rpx;
  font-weight: 900;
}

.pay-card-price-unit {
  color: #6b7280;
  font-size: 20rpx;
  font-weight: 700;
}

.pay-card-original-price {
  color: #9ca3af;
  font-size: 20rpx;
  text-decoration: line-through;
}

.pay-card-desc {
  display: block;
  min-height: 84rpx;
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 20rpx;
  line-height: 1.55;
}

.pay-card-desc.compact {
  min-height: auto;
}

.pay-card-benefits {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 14rpx;
  margin-top: 12rpx;
}

.pay-card-benefit {
  color: #526072;
  font-size: 18rpx;
  line-height: 1.4;
}

.pay-card-renew {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 12rpx;
  padding: 10rpx 12rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(255, 77, 141, 0.08);
}

.pay-card-renew-check {
  width: 28rpx;
  height: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 100%);
  color: #fff;
  flex-shrink: 0;
}

.pay-card-renew-checkmark {
  font-size: 18rpx;
  font-weight: 800;
  line-height: 1;
}

.pay-card-renew-text {
  color: #7b8794;
  font-size: 18rpx;
  line-height: 1.45;
}

.pay-card-button {
  margin-top: 14rpx;
  height: 76rpx;
  line-height: 76rpx;
  border: none;
  border-radius: 999rpx;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}

.pay-card-button::after {
  border: none;
}

.single-btn {
  background: linear-gradient(135deg, #36cfc9 0%, #4d96ff 100%);
}

.month-btn {
  background: linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 100%);
}

.pay-group-footnote {
  display: block;
  margin-top: 10rpx;
  color: #7b8794;
  font-size: 18rpx;
  line-height: 1.5;
}

.single-card-compact .pay-card-desc {
  min-height: auto;
}

</style>
