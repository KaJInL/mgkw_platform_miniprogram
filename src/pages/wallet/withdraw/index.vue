<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";

import walletApi, { type IUserWallet } from "@/common/apis/walletApi";
import miniPromptHelper from "@/common/helper/miniPromptHelper";

const wallet = ref<IUserWallet | null>(null);
const receiptQrcodeUrl = ref("");
const receiptQrcodeFullUrl = ref("");
const bankAccountNo = ref("");
const bankAccountName = ref("");
const bankName = ref("");
const applyRemark = ref("");
const uploading = ref(false);
const submitting = ref(false);

function money(value?: string | number | null) {
  return Number(value || 0).toFixed(2);
}

async function fetchWallet() {
  const response = await walletApi.getMyWallet();
  wallet.value = response.data || null;
}

async function chooseReceiptQrcode() {
  if (uploading.value) return;
  try {
    const result = await uni.chooseImage({ count: 1, sizeType: ["compressed"], sourceType: ["album", "camera"] });
    const filePath = result.tempFilePaths?.[0] || "";
    if (!filePath) return;
    uploading.value = true;
    const response = await walletApi.uploadImage(filePath);
    receiptQrcodeUrl.value = response.data.image_url;
    receiptQrcodeFullUrl.value = response.data.image_full_url;
  } catch (error) {
    miniPromptHelper.fail(error instanceof Error ? error.message : "收款码上传失败");
  } finally {
    uploading.value = false;
  }
}

async function submit() {
  const amount = Number(wallet.value?.available_amount || 0);
  if (amount <= 0) {
    miniPromptHelper.info("当前没有可提现余额");
    return;
  }
  const hasBankInfo = bankAccountNo.value.trim() && bankAccountName.value.trim() && bankName.value.trim();
  if (!receiptQrcodeUrl.value && !hasBankInfo) {
    miniPromptHelper.info("请上传收款码或填写完整银行卡信息");
    return;
  }
  uni.showModal({
    title: "确认全部提现",
    content: `本次将提现当前全部可提现余额 ¥${amount.toFixed(2)}`,
    confirmColor: "#4d96ff",
    success: async ({ confirm }) => {
      if (!confirm || submitting.value) return;
      submitting.value = true;
      try {
        await walletApi.createWithdrawRequest({
          receipt_qrcode_url: receiptQrcodeUrl.value,
          bank_account_no: bankAccountNo.value.trim(),
          bank_account_name: bankAccountName.value.trim(),
          bank_name: bankName.value.trim(),
          apply_remark: applyRemark.value.trim(),
        });
        miniPromptHelper.success("提现申请已提交");
        uni.redirectTo({ url: "/pages/wallet/index" });
      } catch (error) {
        miniPromptHelper.fail(error instanceof Error ? error.message : "提交失败");
      } finally {
        submitting.value = false;
      }
    },
  });
}

onShow(() => {
  void fetchWallet();
});
</script>

<template>
  <view class="withdraw-page">
    <view class="amount-card">
      <text>本次提现金额</text>
      <strong>¥{{ money(wallet?.available_amount) }}</strong>
      <small>系统将自动提取当前全部可提现余额</small>
    </view>

    <view class="form-card">
      <view class="upload-card" @click="chooseReceiptQrcode">
        <image v-if="receiptQrcodeFullUrl" :src="receiptQrcodeFullUrl" mode="aspectFill" />
        <view v-else class="upload-placeholder">
          <text>{{ uploading ? "上传中..." : "上传收款码" }}</text>
          <small>微信/支付宝收款码均可</small>
        </view>
      </view>

      <view class="divider-title">银行卡信息</view>
      <view class="field-row">
        <text>银行卡号</text>
        <input v-model="bankAccountNo" placeholder="请输入银行卡号" />
      </view>
      <view class="field-row">
        <text>户主名称</text>
        <input v-model="bankAccountName" placeholder="请输入户主名称" />
      </view>
      <view class="field-row">
        <text>开户行</text>
        <input v-model="bankName" placeholder="请输入开户行" />
      </view>
      <view class="field-row">
        <text>申请备注</text>
        <textarea v-model="applyRemark" placeholder="可选" />
      </view>
      <button class="submit-btn" :disabled="submitting || uploading" @click="submit">
        {{ submitting ? "提交中..." : "提交全部提现" }}
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.withdraw-page { min-height: 100vh; padding: 26rpx; background: linear-gradient(180deg, #fff6fb 0%, #fff 54%, #f7fafc 100%); box-sizing: border-box; color: #1f2937; }
.amount-card { border-radius: 28rpx; padding: 34rpx 30rpx; color: #fff; background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%); box-shadow: 0 18rpx 44rpx rgba(77,150,255,.22); display: grid; gap: 10rpx; }
.amount-card text { font-size: 24rpx; opacity: .9; }
.amount-card strong { font-size: 60rpx; line-height: 1; }
.amount-card small { font-size: 22rpx; opacity: .86; }
.form-card { margin-top: 24rpx; border-radius: 26rpx; background: #fff; padding: 24rpx; display: grid; gap: 22rpx; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.upload-card { height: 300rpx; border-radius: 22rpx; background: #e6f4ff; border: 2rpx dashed rgba(77,150,255,.36); overflow: hidden; }
.upload-card image { width: 100%; height: 100%; }
.upload-placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10rpx; color: #4d96ff; }
.upload-placeholder text { font-size: 30rpx; font-weight: 900; }
.upload-placeholder small { color: #6b7280; font-size: 22rpx; }
.divider-title { color: #1f2937; font-size: 28rpx; font-weight: 900; }
.field-row { display: grid; gap: 10rpx; }
.field-row text { color: #4b5563; font-size: 24rpx; font-weight: 800; }
input, textarea { min-height: 82rpx; padding: 0 20rpx; border-radius: 16rpx; background: #f7fafc; color: #1f2937; font-size: 28rpx; box-sizing: border-box; }
textarea { height: 142rpx; padding-top: 18rpx; }
.submit-btn { height: 88rpx; border-radius: 999rpx; color: #fff; font-size: 30rpx; font-weight: 900; background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%); }
</style>
