<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";

import BrandTabBar from "@/common/components/BrandTabBar.vue";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import shopApi, { type IShopBindQrcodeItem } from "@/common/apis/shopApi";
import { useAccountStore } from "@/store/accountStore";

type TabKey = "UNBOUND" | "BOUND";

const accountStore = useAccountStore();
accountStore.loadCachedUserInfo();

const loading = ref(false);
const generating = ref(false);
const deletingId = ref<number | null>(null);
const downloadingId = ref<number | null>(null);
const activeTab = ref<TabKey>("UNBOUND");
const unboundItems = ref<IShopBindQrcodeItem[]>([]);
const boundItems = ref<IShopBindQrcodeItem[]>([]);
const selectedBoundItem = ref<IShopBindQrcodeItem | null>(null);

const hasPromotionAccess = computed(() => {
  // 推广页同时开放给推广、管理员和超管，便于直营和代操作场景。
  const roleCodes = accountStore.userInfo?.role_codes || [];
  return roleCodes.some((item) => {
    const normalized = String(item || "").trim().toUpperCase();
    return ["SALESPERSON", "ADMIN", "SUPER_ADMIN"].includes(normalized);
  });
});

const currentItems = computed(() => {
  return activeTab.value === "UNBOUND" ? unboundItems.value : boundItems.value;
});

function switchTab(tab: TabKey) {
  activeTab.value = tab;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveShopTitle(item: IShopBindQrcodeItem) {
  const shop = item.bound_shop;
  if (!shop) {
    return "未绑定";
  }
  return shop.display_name || shop.shop_name || shop.shop_code;
}

function resolveSourceTypeText(sourceType: "COMPANY" | "SALESPERSON") {
  return sourceType === "COMPANY" ? "公司直营拓展" : "业务员拓展";
}

async function fetchQrcodeLists() {
  // 推广页分两组数据：
  // - 未绑定二维码：可下载、可删除
  // - 已绑定二维码：可看绑定后的门店详情
  if (!hasPromotionAccess.value) {
    return;
  }
  loading.value = true;
  try {
    const [unboundRes, boundRes] = await Promise.all([
      shopApi.getSalespersonBindQrcodes({
        is_bound: false,
        page: 1,
        page_size: 50,
      }),
      shopApi.getSalespersonBindQrcodes({
        is_bound: true,
        page: 1,
        page_size: 50,
      }),
    ]);
    unboundItems.value = unboundRes.data?.items || [];
    boundItems.value = boundRes.data?.items || [];
    if (selectedBoundItem.value?.id) {
      selectedBoundItem.value = boundItems.value.find((item) => item.id === selectedBoundItem.value?.id) || null;
    }
  } catch (error) {
    miniPromptHelper.fail(error instanceof Error ? error.message : "二维码列表加载失败");
  } finally {
    loading.value = false;
  }
}

async function generateQrcode() {
  if (generating.value) {
    return;
  }
  generating.value = true;
  try {
    await shopApi.generateSalespersonBindQrcode();
    miniPromptHelper.success("新的绑定二维码已生成");
    activeTab.value = "UNBOUND";
    await fetchQrcodeLists();
  } catch (error) {
    miniPromptHelper.fail(error instanceof Error ? error.message : "二维码生成失败");
  } finally {
    generating.value = false;
  }
}

async function deleteQrcode(item: IShopBindQrcodeItem) {
  // 只有未绑定二维码才允许删除；已消耗二维码保留业务痕迹。
  if (item.is_bound || deletingId.value) {
    return;
  }
  deletingId.value = item.id;
  try {
    await shopApi.deleteSalespersonBindQrcode(item.id);
    miniPromptHelper.success("二维码已删除");
    await fetchQrcodeLists();
  } catch (error) {
    miniPromptHelper.fail(error instanceof Error ? error.message : "二维码删除失败");
  } finally {
    deletingId.value = null;
  }
}

async function downloadQrcode(item: IShopBindQrcodeItem) {
  // 下载动作直接保存到系统相册，失败时通常是相册权限或下载链路问题。
  if (!item.mini_program_qrcode_full_url || downloadingId.value) {
    return;
  }
  downloadingId.value = item.id;
  try {
    const downloadResult = await uni.downloadFile({
      url: item.mini_program_qrcode_full_url,
    });
    if (downloadResult.statusCode !== 200 || !downloadResult.tempFilePath) {
      throw new Error("二维码下载失败");
    }

    await uni.saveImageToPhotosAlbum({
      filePath: downloadResult.tempFilePath,
    });
    miniPromptHelper.success("二维码已保存到相册");
  } catch (error) {
    const message = error instanceof Error ? error.message : "二维码保存失败，请检查相册权限";
    miniPromptHelper.fail(message);
  } finally {
    downloadingId.value = null;
  }
}

function openBoundDetail(item: IShopBindQrcodeItem) {
  // 已绑定二维码点击后展示门店详情，便于推广回看绑定结果。
  selectedBoundItem.value = item;
}

function closeBoundDetail() {
  selectedBoundItem.value = null;
}

onMounted(() => {
  void accountStore.refreshCurrentUser();
  void fetchQrcodeLists();
});

onShow(() => {
  void accountStore.refreshCurrentUser();
  void fetchQrcodeLists();
});
</script>

<template>
  <view class="page">
    <MaintenanceMask />
    <view v-if="!hasPromotionAccess" class="empty-access-card">
      <text class="empty-access-title">当前账号没有推广权限</text>
      <text class="empty-access-desc">只有 `SALESPERSON`、`ADMIN` 或 `SUPER_ADMIN` 角色才可以使用这里的推广二维码能力。</text>
    </view>

    <template v-else>
      <view class="hero-card">
        <view class="hero-top">
          <view>
            <text class="hero-eyebrow">Promotion Workspace</text>
            <text class="hero-title">推广门店码</text>
          </view>
          <button class="hero-action" :disabled="generating" @click="generateQrcode">
            {{ generating ? "生成中..." : "生成新二维码" }}
          </button>
        </view>
        <text class="hero-desc">推广人员先生成一张未绑定二维码，店长扫码后会自动创建门店并完成绑定，这张二维码也会立刻从待绑定区移动到已绑定区。</text>
      </view>

      <view class="tab-shell">
        <view class="tab-pill-row">
          <view class="tab-pill" :class="{ active: activeTab === 'UNBOUND' }" @click="switchTab('UNBOUND')">
            <text class="tab-pill-title">未绑定二维码</text>
            <text class="tab-pill-count">{{ unboundItems.length }}</text>
          </view>
          <view class="tab-pill" :class="{ active: activeTab === 'BOUND' }" @click="switchTab('BOUND')">
            <text class="tab-pill-title">已绑定二维码</text>
            <text class="tab-pill-count">{{ boundItems.length }}</text>
          </view>
        </view>

        <view v-if="!loading && currentItems.length === 0" class="empty-panel">
          <text class="empty-panel-title">{{ activeTab === "UNBOUND" ? "还没有未绑定二维码" : "还没有已绑定二维码" }}</text>
          <text class="empty-panel-desc">
            {{ activeTab === "UNBOUND" ? "点击上面的按钮先生成第一张二维码。" : "店长扫码消费后，二维码会出现在这里。" }}
          </text>
        </view>

        <view v-else class="qrcode-list">
          <view
            v-for="item in currentItems"
            :key="item.id"
            class="qrcode-card"
            :class="{ 'qrcode-card-bound': item.is_bound }"
            @click="activeTab === 'BOUND' ? openBoundDetail(item) : undefined"
          >
            <view class="qrcode-head">
              <view>
                <text class="qrcode-code">{{ item.qrcode_code }}</text>
                <text class="qrcode-time">{{ formatDateTime(item.created_at) }}</text>
              </view>
              <text class="qrcode-badge" :class="{ consumed: item.is_bound }">{{ item.is_bound ? "已绑定" : "待使用" }}</text>
            </view>

            <image
              v-if="item.mini_program_qrcode_full_url"
              :src="item.mini_program_qrcode_full_url"
              class="qrcode-image"
              mode="aspectFit"
            />

            <text class="qrcode-detail-line">来源类型：{{ resolveSourceTypeText(item.source_type) }}</text>
            <text v-if="item.is_bound" class="qrcode-detail-line">绑定门店：{{ resolveShopTitle(item) }}</text>
            <text v-if="item.is_bound" class="qrcode-detail-line">绑定时间：{{ formatDateTime(item.bound_at) }}</text>
            <text v-else class="qrcode-detail-line">店长扫码并绑定后，这张码会自动失效并进入已绑定列表。</text>
            <view v-if="!item.is_bound" class="qrcode-action-row">
              <button
                class="qrcode-download-btn"
                :disabled="downloadingId === item.id"
                @click.stop="downloadQrcode(item)"
              >
                {{ downloadingId === item.id ? "下载中..." : "下载二维码" }}
              </button>
              <button class="qrcode-delete-btn" :disabled="deletingId === item.id" @click.stop="deleteQrcode(item)">
                {{ deletingId === item.id ? "删除中..." : "删除二维码" }}
              </button>
            </view>
          </view>
        </view>
      </view>

      <view v-if="selectedBoundItem?.bound_shop" class="detail-sheet-mask" @click="closeBoundDetail">
        <view class="detail-sheet" @click.stop>
          <view class="detail-sheet-head">
            <view>
              <text class="detail-eyebrow">Bound Shop Detail</text>
              <text class="detail-title">{{ selectedBoundItem.bound_shop.display_name || selectedBoundItem.bound_shop.shop_name }}</text>
            </view>
            <text class="detail-code">{{ selectedBoundItem.bound_shop.shop_code }}</text>
          </view>

          <view class="detail-grid">
            <view class="detail-item">
              <text class="detail-label">店长</text>
              <text class="detail-value">{{ selectedBoundItem.bound_shop.owner?.display_name || `用户 #${selectedBoundItem.bound_shop.owner_user_id}` }}</text>
            </view>
            <view class="detail-item">
              <text class="detail-label">联系电话</text>
              <text class="detail-value">{{ selectedBoundItem.bound_shop.contact_phone || "未填写" }}</text>
            </view>
            <view class="detail-item detail-item-full">
              <text class="detail-label">联系人</text>
              <text class="detail-value">{{ selectedBoundItem.bound_shop.contact_name || "未填写" }}</text>
            </view>
            <view class="detail-item detail-item-full">
              <text class="detail-label">详细地址</text>
              <text class="detail-value">{{ selectedBoundItem.bound_shop.address_detail || "未填写" }}</text>
            </view>
            <view class="detail-item detail-item-full">
              <text class="detail-label">二维码消耗时间</text>
              <text class="detail-value">{{ formatDateTime(selectedBoundItem.bound_at) }}</text>
            </view>
          </view>

          <button class="detail-close" @click="closeBoundDetail">关闭详情</button>
        </view>
      </view>
    </template>

    <BrandTabBar />
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 188rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.18), transparent 30%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 40%, #f7fafc 100%);
}

.hero-card,
.tab-shell,
.empty-access-card,
.detail-sheet {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.1);
}

.empty-access-card {
  padding: 28rpx 24rpx;
  text-align: center;
}

.empty-access-title {
  display: block;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 700;
}

.empty-access-desc {
  display: block;
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.6;
}

.hero-card {
  padding: 24rpx 22rpx 22rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.28), transparent 24%),
    linear-gradient(135deg, rgba(255, 77, 141, 0.94) 0%, rgba(255, 159, 28, 0.92) 42%, rgba(77, 150, 255, 0.94) 100%);
}

.hero-top,
.qrcode-head,
.detail-sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.hero-eyebrow,
.hero-desc,
.detail-eyebrow {
  display: block;
}

.hero-eyebrow,
.hero-desc,
.detail-eyebrow {
  color: rgba(255, 255, 255, 0.9);
}

.hero-title {
  display: block;
  margin-top: 8rpx;
  color: #ffffff;
  font-size: 44rpx;
  font-weight: 700;
  line-height: 1.08;
}

.hero-desc {
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1.55;
}

.hero-action {
  min-width: 220rpx;
  height: 82rpx;
  line-height: 82rpx;
  border: none;
  border-radius: 999rpx;
  background: #ffffff;
  color: #1f2937;
  font-size: 24rpx;
  font-weight: 700;
}

.hero-action::after {
  border: none;
}

.tab-shell {
  margin-top: 16rpx;
  padding: 20rpx 18rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.08), transparent 24%),
    #ffffff;
}

.tab-pill-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.tab-pill {
  padding: 18rpx;
  border-radius: 22rpx;
  background: #f8fafc;
  border: 2rpx solid #eef2f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.tab-pill.active {
  background: linear-gradient(135deg, #fff0f6 0%, #e6f4ff 100%);
  border-color: rgba(77, 150, 255, 0.18);
}

.tab-pill-title {
  color: #1f2937;
  font-size: 26rpx;
  font-weight: 700;
}

.tab-pill-count {
  min-width: 56rpx;
  padding: 8rpx 12rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
  text-align: center;
}

.empty-panel {
  margin-top: 18rpx;
  min-height: 260rpx;
  border-radius: 24rpx;
  background:
    linear-gradient(135deg, rgba(255, 240, 246, 0.72), rgba(230, 244, 255, 0.84)),
    #ffffff;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  align-items: center;
  justify-content: center;
  padding: 20rpx;
  text-align: center;
}

.empty-panel-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}

.empty-panel-desc {
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.55;
}

.qrcode-list {
  display: grid;
  gap: 14rpx;
  margin-top: 18rpx;
}

.qrcode-card {
  border-radius: 24rpx;
  border: 1rpx solid rgba(77, 150, 255, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.98));
  padding: 18rpx;
}

.qrcode-card-bound {
  background: linear-gradient(135deg, rgba(255, 240, 246, 0.54), rgba(230, 244, 255, 0.68));
}

.qrcode-code {
  display: block;
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}

.qrcode-time,
.qrcode-detail-line,
.detail-label,
.detail-value,
.detail-eyebrow {
  display: block;
}

.qrcode-time {
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 20rpx;
}

.qrcode-badge {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #fff7e6;
  color: #d97706;
  font-size: 20rpx;
  font-weight: 700;
}

.qrcode-badge.consumed {
  background: #f6ffed;
  color: #2f8a55;
}

.qrcode-image {
  width: 100%;
  height: 340rpx;
  margin-top: 16rpx;
  border-radius: 18rpx;
  background: #ffffff;
}

.qrcode-detail-line {
  margin-top: 12rpx;
  color: #4b5563;
  font-size: 22rpx;
  line-height: 1.55;
}

.qrcode-action-row {
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
  margin-top: 16rpx;
}

.qrcode-download-btn,
.qrcode-delete-btn {
  min-width: 180rpx;
  height: 72rpx;
  line-height: 72rpx;
  border: none;
  font-size: 22rpx;
  font-weight: 700;
}

.qrcode-download-btn {
  border-radius: 999rpx;
  background: linear-gradient(135deg, #36cfc9 0%, #4d96ff 100%);
  color: #ffffff;
}

.qrcode-delete-btn {
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d6d 0%, #ff6a5a 100%);
  color: #ffffff;
}

.qrcode-download-btn::after,
.qrcode-delete-btn::after {
  border: none;
}

.detail-sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1001;
  padding: 32rpx 24rpx;
  background: rgba(15, 23, 42, 0.22);
  display: flex;
  align-items: flex-end;
}

.detail-sheet {
  width: 100%;
  padding: 24rpx 22rpx 22rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.18), transparent 24%),
    linear-gradient(135deg, rgba(255, 240, 246, 0.94), rgba(230, 244, 255, 0.96));
}

.detail-eyebrow {
  color: #6b7280;
  font-size: 20rpx;
}

.detail-title {
  display: block;
  margin-top: 8rpx;
  color: #1f2937;
  font-size: 36rpx;
  font-weight: 700;
}

.detail-code {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 18rpx;
}

.detail-item {
  padding: 16rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.84);
}

.detail-item-full {
  grid-column: 1 / -1;
}

.detail-label {
  color: #6b7280;
  font-size: 20rpx;
}

.detail-value {
  margin-top: 10rpx;
  color: #1f2937;
  font-size: 24rpx;
  line-height: 1.55;
}

.detail-close {
  margin-top: 18rpx;
  height: 82rpx;
  line-height: 82rpx;
  border: none;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
}

.detail-close::after {
  border: none;
}
</style>
