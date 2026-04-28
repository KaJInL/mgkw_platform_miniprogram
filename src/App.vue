<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useAccountStore } from "@/store/accountStore";
import { useAppStateStore } from "@/store/appStateStore";
import commonApi from "@/common/apis/commonApi";
import shopContextHelper from "@/common/helper/shopContextHelper";

const accountStore = useAccountStore();
const appStateStore = useAppStateStore();

const syncSystemStatus = async () => {
  try {
    const response = await commonApi.getSystemStatus();
    const data = (response as any).data || {};
    appStateStore.setMaintenanceModeEnabled(Boolean(data.maintenance_mode_enabled));
    appStateStore.setVirtualPaymentReviewModeEnabled(Boolean(data.virtual_payment_review_mode_enabled));
  } catch (error) {
    console.error("读取系统状态失败：", error);
  }
};

const syncCurrentUser = async () => {
  await accountStore.refreshUserInfoOnAppOpen();
};

const syncLaunchShopContext = async (options?: Record<string, unknown>) => {
  try {
    await shopContextHelper.rememberLaunchSid(options);
  } catch (error) {
    console.error("门店上下文绑定失败：", error);
  }
};

const syncShowShopContext = async (options?: Record<string, unknown>) => {
  try {
    await shopContextHelper.rememberShowSid(options);
  } catch (error) {
    console.error("门店上下文刷新失败：", error);
  }
};

const toLaunchRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as Record<string, unknown>;
};

onLaunch((options) => {
  console.log("Framework app launch");
  void syncCurrentUser();
  void syncSystemStatus();
  void syncLaunchShopContext(toLaunchRecord(options));
});

onShow((options) => {
  console.log("Framework app show");
  void syncCurrentUser();
  void syncSystemStatus();
  void syncShowShopContext(toLaunchRecord(options));
});

onHide(() => {
  console.log("Framework app hide");
});
</script>
