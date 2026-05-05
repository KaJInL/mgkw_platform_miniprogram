<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import paymentApi, { type IPaymentOverview } from "@/common/apis/paymentApi";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import { useAccountStore } from "@/store/accountStore";
import { useAppStateStore } from "@/store/appStateStore";
import BrandTabBar from "@/common/components/BrandTabBar.vue";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import shopContextHelper from "@/common/helper/shopContextHelper";
import shopApi, { type IShopOwnerIncomeDashboardRes } from "@/common/apis/shopApi";
import ProfileSection from "./components/ProfileSection.vue";
import ShopOwnerSection from "./components/ShopOwnerSection.vue";
import SettingsSection from "./components/SettingsSection.vue";

const accountStore = useAccountStore();
const appStateStore = useAppStateStore();
const { virtualPaymentReviewModeEnabled } = storeToRefs(appStateStore);
// 先尝试用本地缓存秒开页面，避免初次渲染闪烁。
accountStore.loadCachedUserInfo();
const ownerDashboard = ref<IShopOwnerIncomeDashboardRes | null>(null);
const loadingOwnerDashboard = ref(false);
const paymentOverview = ref<IPaymentOverview | null>(null);

// 页面层只保留最小状态：是否登录。
const isLoggedIn = computed(() => accountStore.isLoggedIn);
const hasShopOwnerRole = computed(() => {
  // 店长经营入口只看角色，不强依赖当前是否已绑定某一家门店。
  const roleCodes = accountStore.userInfo?.role_codes || [];
  return roleCodes.some((item) => String(item || "").trim().toUpperCase() === "SHOP_OWNER");
});
const vipPriceText = computed(() => paymentOverview.value?.vip_plans?.[0]?.price_amount || "0.00");
const vipExpiresText = computed(() => {
  const raw = accountStore.userInfo?.vip_expires_at || paymentOverview.value?.vip_status?.expires_at || "";
  return raw ? String(raw).replace("T", " ").slice(0, 16) : "";
});

const handleAvatarTap = () => {
  if (!accountStore.isLoggedIn) {
    uni.navigateTo({
      url: "/pages/login/index",
    });
    return;
  }
  uni.navigateTo({
    url: "/pages/settings/profile/index",
  });
};

const handleGoSetting = () => {
  uni.navigateTo({
    url: "/pages/settings/index",
  });
};

const handleGoFreePatterns = () => {
  uni.navigateTo({
    url: "/pages/free-patterns/index",
  });
};

const handleGoOrderCenter = () => {
  if (virtualPaymentReviewModeEnabled.value) {
    miniPromptHelper.info("虚拟支付审核模式已开启，订单入口已隐藏");
    return;
  }
  if (!accountStore.isLoggedIn) {
    uni.navigateTo({
      url: "/pages/login/index",
    });
    return;
  }
  uni.navigateTo({
    url: "/pages/order-center/index",
  });
};

const handleGoRecharge = () => {
  if (virtualPaymentReviewModeEnabled.value) {
    miniPromptHelper.info("虚拟支付审核模式已开启，当前无需购买即可生成");
    return;
  }
  if (!accountStore.isLoggedIn) {
    uni.navigateTo({
      url: "/pages/login/index",
    });
    return;
  }
  uni.navigateTo({
    url: "/pages/recharge/index",
  });
};

const handleScanShopBindCode = async () => {
  if (!accountStore.isLoggedIn) {
    uni.navigateTo({
      url: "/pages/login/index",
    });
    return;
  }
  try {
    const result = await uni.scanCode({
      onlyFromCamera: true,
      scanType: ["qrCode"],
    });
    console.log("shop bind scan result:", result);
    console.log("shop bind scan raw text:", result.result || "");
    console.log("shop bind scan path:", (result as { path?: string }).path || "");
    console.log("shop bind scan rawData:", (result as { rawData?: string }).rawData || "");
    const sid = shopContextHelper.extractSidFromText(
      (result as { path?: string }).path
      || result.result
      || (result as { rawData?: string }).rawData
      || ""
    );
    console.log("shop bind parsed sid:", sid);
    if (!sid) {
      miniPromptHelper.info("未识别到有效的门店绑定二维码");
      return;
    }
    uni.navigateTo({
      url: `/pages/shop/bind/index?sid=${encodeURIComponent(sid)}`,
    });
  } catch (error) {
    if ((error as { errMsg?: string })?.errMsg?.includes("cancel")) {
      return;
    }
    miniPromptHelper.fail("扫码失败，请重试");
  }
};

const handleLogout = () => {
  if (!accountStore.isLoggedIn) {
    miniPromptHelper.info("当前未登录");
    return;
  }

  uni.showModal({
    title: "退出登录",
    content: "确认退出当前账号吗？",
    confirmColor: "#dc2626",
    success: ({ confirm }) => {
      if (!confirm) {
        return;
      }
      accountStore.clearAuthState();
      miniPromptHelper.success("已退出登录");
    },
  });
};

const handleOpenShopOwnerConsole = () => {
  uni.navigateTo({
    url: "/pages/shop-owner/console/index",
  });
};

const fetchOwnerDashboard = async () => {
  // 店长经营卡片先吃 mock 看板数据，后续支付接入后后端可直接替换真实统计。
  if (!accountStore.isLoggedIn || !hasShopOwnerRole.value) {
    ownerDashboard.value = null;
    return;
  }
  loadingOwnerDashboard.value = true;
  try {
    const response = await shopApi.getShopOwnerIncomeDashboard();
    ownerDashboard.value = response.data || null;
  } catch (error) {
    ownerDashboard.value = null;
  } finally {
    loadingOwnerDashboard.value = false;
  }
};

const fetchPaymentOverview = async () => {
  // Mine 页只拿展示所需的会员概览，不在这里发起购买。
  if (!accountStore.isLoggedIn) {
    paymentOverview.value = null;
    return;
  }
  if (virtualPaymentReviewModeEnabled.value) {
    paymentOverview.value = null;
    return;
  }
  try {
    const response = await paymentApi.getOverview();
    paymentOverview.value = (response as any).data as IPaymentOverview;
  } catch (error) {
    paymentOverview.value = null;
  }
};

onShow(() => {
  // 每次进入「我的」页都刷新一次用户信息，保证展示最新资料。
  void accountStore.refreshCurrentUser().then(() => {
    // 角色刷新后再拉店长看板，避免刚绑定门店时出现角色未更新的瞬时状态。
    void fetchOwnerDashboard();
    void fetchPaymentOverview();
  });
});
</script>

<template>
  <view class="mine-page">
    <MaintenanceMask />
    <view class="page-aurora page-aurora-pink" />
    <view class="page-aurora page-aurora-blue" />
    <view class="page-grid" />
    <scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
      <view class="content-inner">
        <ProfileSection
          :vip-price-text="vipPriceText"
          @avatar-tap="handleAvatarTap"
          @go-recharge="handleGoRecharge"
        />
        <ShopOwnerSection
          v-if="isLoggedIn && hasShopOwnerRole"
          :dashboard="ownerDashboard"
          :loading="loadingOwnerDashboard"
          @open-console="handleOpenShopOwnerConsole"
        />
        <SettingsSection
          :is-logged-in="isLoggedIn"
          @go-order-center="handleGoOrderCenter"
          @go-free-patterns="handleGoFreePatterns"
          @go-setting="handleGoSetting"
          @scan-shop-bind-code="handleScanShopBindCode"
          @logout="handleLogout"
        />
      </view>
    </scroll-view>
    <BrandTabBar />
  </view>
</template>

<style scoped lang="scss">
.mine-page {
  position: relative;
  min-height: 100vh;
  background:
    linear-gradient(180deg, #fff7fb 0%, #ffffff 32%, #f7fafc 100%);
  color: #1f2937;
  overflow: hidden;
}

.page-aurora {
  position: absolute;
  border-radius: 999rpx;
  filter: blur(18rpx);
  pointer-events: none;
}

.page-aurora-pink {
  top: -120rpx;
  left: -80rpx;
  width: 360rpx;
  height: 360rpx;
  background: radial-gradient(circle, rgba(255, 77, 141, 0.18) 0%, rgba(255, 77, 141, 0) 74%);
}

.page-aurora-blue {
  top: 160rpx;
  right: -120rpx;
  width: 420rpx;
  height: 420rpx;
  background: radial-gradient(circle, rgba(77, 150, 255, 0.16) 0%, rgba(77, 150, 255, 0) 76%);
}

.page-grid {
  position: absolute;
  inset: 0;
  opacity: 0.28;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.74) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(255, 255, 255, 0.74) 1rpx, transparent 1rpx);
  background-size: 36rpx 36rpx;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.72), transparent 68%);
  pointer-events: none;
}

.content-scroll {
  position: relative;
  z-index: 1;
  height: 100vh;
}

.content-inner {
  padding: 36rpx 28rpx 188rpx;
  display: flex;
  flex-direction: column;
  gap: 26rpx;
  box-sizing: border-box;
}

.page-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24rpx;
  padding: 8rpx 4rpx 2rpx;
}

.page-kicker {
  display: block;
  color: #ff4d8d;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 3rpx;
}

.page-title {
  display: block;
  margin-top: 10rpx;
  color: #1f2937;
  font-size: 54rpx;
  line-height: 1.04;
  font-weight: 900;
}

.page-brief {
  max-width: 260rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.55;
  text-align: right;
}
</style>
