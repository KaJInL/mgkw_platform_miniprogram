<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";

import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import shopApi, { type IShopBindQrcodeItem, type IShopItem } from "@/common/apis/shopApi";
import shopContextHelper from "@/common/helper/shopContextHelper";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import { useAccountStore } from "@/store/accountStore";

const accountStore = useAccountStore();
accountStore.loadCachedUserInfo();

const loading = ref(false);
const binding = ref(false);
const launchQrcodeCode = ref("");
const qrcodeContext = ref<IShopBindQrcodeItem | null>(null);
const boundShop = ref<IShopItem | null>(shopContextHelper.getBoundShopInfo());
const form = reactive({
  shop_name: "",
  display_name: "",
  contact_name: "",
  contact_phone: "",
  address_detail: "",
  remark: "",
});
const errors = reactive({
  shop_name: "",
  contact_name: "",
  contact_phone: "",
});

const hasPendingQrcode = computed(() => Boolean(qrcodeContext.value?.qrcode_code) && !qrcodeContext.value?.is_bound);
const hasBoundShop = computed(() => Boolean(boundShop.value?.shop_code));
const salespersonText = computed(() => {
  const salesperson = qrcodeContext.value?.generated_by_salesperson;
  if (!salesperson) {
    return "官方渠道";
  }
  return salesperson.display_name || salesperson.real_name || salesperson.username || "业务员";
});

const normalizePhone = (value: string) => {
  const compact = value.replace(/[\s-]/g, "");
  if (compact.startsWith("+86")) {
    return compact.slice(3);
  }
  if (compact.startsWith("86") && compact.length > 11) {
    return compact.slice(2);
  }
  return compact;
};

const clearErrors = () => {
  errors.shop_name = "";
  errors.contact_name = "";
  errors.contact_phone = "";
};

const validateForm = () => {
  // 绑定页表单只校验门店落库必需字段，其余字段允许后续补齐。
  clearErrors();
  form.shop_name = form.shop_name.trim();
  form.display_name = form.display_name.trim();
  form.contact_name = form.contact_name.trim();
  form.contact_phone = normalizePhone(form.contact_phone.trim());
  form.address_detail = form.address_detail.trim();
  form.remark = form.remark.trim();

  if (!form.shop_name) {
    errors.shop_name = "请输入门店名称";
  }
  if (!form.contact_name) {
    errors.contact_name = "请输入联系人姓名";
  }
  if (!form.contact_phone) {
    errors.contact_phone = "请输入联系人手机号";
  } else if (!/^(?:\+?\d{6,20})$/.test(form.contact_phone)) {
    errors.contact_phone = "请输入有效手机号";
  }

  return !errors.shop_name && !errors.contact_name && !errors.contact_phone;
};

interface BindShopFormSubmitEvent {
  detail?: {
    value?: Record<string, string | undefined>;
  };
}

const refreshContext = async () => {
  // 页面每次展示时都按当前路由参数里的 sid 重新读取二维码上下文。
  const qrcodeCode = launchQrcodeCode.value;
  if (!qrcodeCode) {
    qrcodeContext.value = null;
    boundShop.value = shopContextHelper.getBoundShopInfo();
    return;
  }

  loading.value = true;
  try {
    const response = await shopApi.getBindQrcodeContext(qrcodeCode);
    qrcodeContext.value = response?.data || null;
    boundShop.value = qrcodeContext.value?.bound_shop || shopContextHelper.getBoundShopInfo();
  } catch (error) {
    console.error("读取绑定二维码上下文失败：", error);
    miniPromptHelper.fail(error instanceof Error ? error.message : "二维码信息读取失败");
  } finally {
    loading.value = false;
  }
};

const consumeBindQrcode = async (event?: BindShopFormSubmitEvent | { detail?: { value?: Record<string, string | undefined> } }) => {
  // 原生 form 提交后，统一从 detail.value 回填到本地状态再做校验与绑定请求。
  const qrcodeCode = qrcodeContext.value?.qrcode_code;
  if (!qrcodeCode || binding.value) {
    return;
  }
  if (!accountStore.isLoggedIn) {
    uni.navigateTo({
      url: "/pages/login/index",
    });
    return;
  }
  const submittedValue = event?.detail?.value || {};
  form.shop_name = String(submittedValue.shop_name || form.shop_name || "");
  form.display_name = String(submittedValue.display_name || form.display_name || "");
  form.contact_name = String(submittedValue.contact_name || form.contact_name || "");
  form.contact_phone = String(submittedValue.contact_phone || form.contact_phone || "");
  form.address_detail = String(submittedValue.address_detail || form.address_detail || "");
  form.remark = String(submittedValue.remark || form.remark || "");
  if (!validateForm()) {
    miniPromptHelper.info("请先补齐门店基础信息");
    return;
  }

  binding.value = true;
  try {
    const response = await shopApi.consumeBindQrcode({
      qrcode_code: qrcodeCode,
      shop_name: form.shop_name,
      display_name: form.display_name || undefined,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      address_detail: form.address_detail || undefined,
      remark: form.remark || undefined,
    });
    const payload = response?.data;
    if (!payload?.shop) {
      throw new Error("门店绑定结果为空");
    }
    boundShop.value = payload.shop;
    shopContextHelper.setCurrentOrderShopCode(payload.shop.shop_code);
    shopContextHelper.setBoundShopInfo(payload.shop);
    qrcodeContext.value = null;
    await accountStore.refreshCurrentUser();
    miniPromptHelper.success(payload.owner_role_bound ? "绑定成功，并已开通店长角色" : "绑定成功");
    setTimeout(() => {
      uni.switchTab({
        url: "/pages/home/index",
      });
    }, 500);
  } catch (error) {
    miniPromptHelper.fail(error instanceof Error ? error.message : "门店绑定失败");
  } finally {
    binding.value = false;
  }
};

const handleSubmit = (event: unknown) => {
  // 模板层用同步 handler 承接，再转发给 async 逻辑，避免 submit 事件类型不兼容。
  void consumeBindQrcode(event as BindShopFormSubmitEvent);
};

const goLogin = () => {
  uni.navigateTo({
    url: "/pages/login/index",
  });
};

const goHome = () => {
  uni.switchTab({
    url: "/pages/home/index",
  });
};

const goMine = () => {
  uni.switchTab({
    url: "/pages/mine/index",
  });
};

onLoad((options) => {
  launchQrcodeCode.value = shopContextHelper.parseLaunchSid((options || {}) as Record<string, unknown>);
});

onShow(() => {
  // 进入页面时刷新登录态与二维码上下文，保证绑定成功后角色立即可见。
  void accountStore.refreshCurrentUser();
  void refreshContext();
});
</script>

<template>
  <view class="page">
    <MaintenanceMask />
    <view class="page-head">
      <text class="page-title">绑定门店</text>
      <text class="page-desc">填写门店基础资料后确认绑定。</text>
    </view>

    <view v-if="loading" class="card loading-card">
      <text class="loading-title">读取二维码信息中...</text>
    </view>

    <view v-else-if="hasPendingQrcode" class="card bind-card">
      <view class="context-head">
        <view>
          <text class="context-label">待绑定二维码</text>
          <text class="context-code">{{ qrcodeContext?.qrcode_code }}</text>
        </view>
        <text class="context-badge">可绑定</text>
      </view>

      <text class="context-line">发码人：{{ salespersonText }}</text>
      <text class="context-line">绑定成功后，会把当前账号设为该门店店长。</text>

      <form @submit="handleSubmit">
        <view class="form-grid">
          <view class="field">
            <text class="field-label">门店名称 *</text>
            <input v-model.trim="form.shop_name" name="shop_name" class="field-input" placeholder="请输入门店名称" />
            <text v-if="errors.shop_name" class="field-error">{{ errors.shop_name }}</text>
          </view>

          <view class="field">
            <text class="field-label">门店展示名称</text>
            <input
              v-model.trim="form.display_name"
              name="display_name"
              class="field-input"
              placeholder="可选，不填默认同门店名称"
            />
          </view>

          <view class="field">
            <text class="field-label">联系人 *</text>
            <input v-model.trim="form.contact_name" name="contact_name" class="field-input" placeholder="请输入联系人姓名" />
            <text v-if="errors.contact_name" class="field-error">{{ errors.contact_name }}</text>
          </view>

          <view class="field">
            <text class="field-label">联系电话 *</text>
            <input
              v-model.trim="form.contact_phone"
              name="contact_phone"
              class="field-input"
              type="number"
              placeholder="请输入联系人手机号"
            />
            <text v-if="errors.contact_phone" class="field-error">{{ errors.contact_phone }}</text>
          </view>

          <view class="field">
            <text class="field-label">详细地址</text>
            <input
              v-model.trim="form.address_detail"
              name="address_detail"
              class="field-input"
              placeholder="请输入门店详细地址"
            />
          </view>

          <view class="field">
            <text class="field-label">备注</text>
            <textarea
              v-model.trim="form.remark"
              name="remark"
              class="field-textarea"
              maxlength="255"
              placeholder="可选备注"
            />
          </view>
        </view>

        <view class="action-row">
          <button v-if="!accountStore.isLoggedIn" class="action-btn primary" @click="goLogin">登录后绑定</button>
          <button v-else class="action-btn primary" :disabled="binding" form-type="submit">
            {{ binding ? "绑定中..." : "确认绑定门店" }}
          </button>
        </view>
      </form>
    </view>

    <view v-else-if="hasBoundShop" class="card success-card">
      <text class="success-title">该二维码已完成绑定</text>
      <text class="success-shop">{{ boundShop?.display_name || boundShop?.shop_name }}</text>
      <text class="success-line">门店编码：{{ boundShop?.shop_code }}</text>
      <text class="success-line">联系人：{{ boundShop?.contact_name || "未填写" }}</text>
      <text class="success-line">联系电话：{{ boundShop?.contact_phone || "未填写" }}</text>
      <text class="success-line">地址：{{ boundShop?.address_detail || "未填写" }}</text>
      <button class="action-btn primary" @click="goHome">返回首页</button>
    </view>

    <view v-else class="card empty-card">
      <text class="empty-title">没有可绑定的门店二维码</text>
      <text class="empty-desc">请重新扫描有效二维码，或联系业务员重新生成。</text>
      <button class="action-btn ghost" @click="goMine">返回我的</button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f6f7fb;
}

.page-head,
.card {
  box-sizing: border-box;
}

.page-head {
  padding: 8rpx 4rpx 12rpx;
}

.page-title,
.page-desc,
.context-label,
.context-line,
.loading-title,
.success-title,
.success-shop,
.success-line,
.empty-title,
.empty-desc {
  display: block;
}

.page-title {
  color: #1f2937;
  font-size: 42rpx;
  font-weight: 700;
  line-height: 1.12;
}

.page-desc {
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.55;
}

.card {
  margin-top: 16rpx;
  padding: 24rpx 22rpx 26rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 1rpx solid #e8ecf2;
  box-shadow: 0 12rpx 28rpx rgba(15, 23, 42, 0.05);
}

.context-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.context-label {
  color: #6b7280;
  font-size: 20rpx;
  letter-spacing: 1rpx;
}

.context-code {
  display: block;
  margin-top: 8rpx;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 700;
}

.context-badge {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #eef5ff;
  color: #316dca;
  font-size: 20rpx;
  font-weight: 700;
}

.context-line,
.loading-title,
.success-line,
.empty-desc {
  margin-top: 12rpx;
  color: #4b5563;
  font-size: 24rpx;
  line-height: 1.6;
}

.form-grid {
  display: grid;
  gap: 14rpx;
  margin-top: 18rpx;
}

.field {
  display: grid;
  gap: 8rpx;
}

.field-label {
  color: #4b5563;
  font-size: 22rpx;
  font-weight: 700;
}

.field-input,
.field-textarea {
  width: 100%;
  box-sizing: border-box;
  display: block;
  border-radius: 16rpx;
  border: 2rpx solid #dde4ee;
  background: #fbfcfe;
  color: #1f2937;
  font-size: 24rpx;
  padding: 0 18rpx;
}

.field-input {
  height: 88rpx;
  line-height: 88rpx;
}

.field-textarea {
  min-height: 188rpx;
  padding: 18rpx;
  line-height: 1.6;
}

.field-error {
  color: #ff4d6d;
  font-size: 20rpx;
}

.action-row {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.action-btn {
  width: 100%;
  height: 84rpx;
  line-height: 84rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.action-btn::after {
  border: none;
}

.action-btn.primary {
  background: #1f2937;
  color: #ffffff;
}

.action-btn.ghost {
  background: #f3f4f6;
  color: #374151;
}

.success-title,
.empty-title {
  display: block;
  color: #1f2937;
  font-size: 32rpx;
  font-weight: 700;
}

.success-shop {
  display: block;
  margin-top: 10rpx;
  color: #1f2937;
  font-size: 36rpx;
  font-weight: 700;
}

.success-card .action-btn,
.empty-card .action-btn {
  margin-top: 20rpx;
}
</style>
