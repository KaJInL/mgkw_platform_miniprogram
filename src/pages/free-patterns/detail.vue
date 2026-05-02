<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import freePatternApi, { type IFreePatternItem } from "@/common/apis/freePatternApi";

const detail = ref<IFreePatternItem | null>(null);
const loading = ref(false);
const downloading = ref(false);
const selectedVariant = ref<"labeled" | "plain">("labeled");

const selectedImageUrl = computed(() => {
  if (!detail.value) {
    return "";
  }
  return selectedVariant.value === "plain"
    ? (detail.value.plain_full_url || detail.value.plain_url || detail.value.labeled_full_url || detail.value.labeled_url || "")
    : (detail.value.labeled_full_url || detail.value.labeled_url || detail.value.plain_full_url || detail.value.plain_url || "");
});

const loadDetail = async (patternId: number) => {
  loading.value = true;
  try {
    const response = await freePatternApi.getDetail(patternId);
    detail.value = (response as any).data || null;
  } catch (error) {
    detail.value = null;
    uni.showToast({
      title: "图纸详情加载失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
  }
};

const downloadFile = (url: string) =>
  new Promise<string>((resolve, reject) => {
    uni.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
          resolve(res.tempFilePath);
          return;
        }
        reject(new Error("download failed"));
      },
      fail: reject,
    });
  });

const saveCurrentVariant = async () => {
  const imageUrl = selectedImageUrl.value;
  if (!imageUrl || downloading.value) {
    return;
  }
  downloading.value = true;
  uni.showLoading({
    title: "下载图纸中",
    mask: true,
  });
  try {
    const tempFilePath = await downloadFile(imageUrl);
    await uni.saveImageToPhotosAlbum({ filePath: tempFilePath });
    uni.showToast({
      title: "已保存到相册",
      icon: "success",
    });
  } catch (error) {
    uni.showToast({
      title: "下载失败，请稍后重试",
      icon: "none",
    });
  } finally {
    uni.hideLoading();
    downloading.value = false;
  }
};

onLoad((options) => {
  const patternId = Number(options?.id || 0);
  if (!patternId) {
    uni.showToast({
      title: "图纸不存在",
      icon: "none",
    });
    return;
  }
  void loadDetail(patternId);
});
</script>

<template>
  <view class="detail-page">
    <MaintenanceMask />
    <view v-if="detail" class="detail-wrap">
      <view class="headline-card">
        <text class="headline-title">{{ detail.title }}</text>
        <text v-if="detail.subtitle" class="headline-subtitle">{{ detail.subtitle }}</text>
        <view class="tag-row">
          <text v-for="tag in detail.tags" :key="tag" class="tag-chip">{{ tag }}</text>
        </view>
      </view>

      <view class="preview-card">
        <view class="variant-switch">
          <view class="variant-chip" :class="{ active: selectedVariant === 'labeled' }" @click="selectedVariant = 'labeled'">
            带色号
          </view>
          <view class="variant-chip" :class="{ active: selectedVariant === 'plain' }" @click="selectedVariant = 'plain'">
            无色号
          </view>
        </view>
        <image class="preview-image" :src="selectedImageUrl" mode="widthFix" />
      </view>

      <view v-if="detail.description" class="description-card">
        <text class="section-title">图纸说明</text>
        <text class="section-desc">{{ detail.description }}</text>
      </view>

      <button class="download-button" :disabled="downloading" @click="saveCurrentVariant">
        {{ downloading ? "下载中..." : `下载${selectedVariant === 'labeled' ? '带色号' : '无色号'}图纸` }}
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 40rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.18), transparent 28%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 40%, #f7fafc 100%);
}

.detail-wrap {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.headline-card,
.preview-card,
.description-card {
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.1);
}

.headline-card {
  padding: 30rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.24), transparent 28%),
    linear-gradient(135deg, rgba(255, 77, 141, 0.12), rgba(77, 150, 255, 0.12));
}

.headline-title,
.headline-subtitle,
.section-title,
.section-desc,
.tag-chip {
  display: block;
}

.headline-title {
  color: #1f2937;
  font-size: 40rpx;
  line-height: 1.3;
  font-weight: 800;
}

.headline-subtitle {
  margin-top: 12rpx;
  color: #4b5563;
  font-size: 24rpx;
  line-height: 1.7;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 18rpx;
}

.tag-chip {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #ff4d8d;
  font-size: 20rpx;
  font-weight: 700;
}

.preview-card,
.description-card {
  padding: 24rpx;
}

.variant-switch {
  display: flex;
  gap: 14rpx;
  margin-bottom: 18rpx;
}

.variant-chip {
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: #eef2f7;
  color: #4b5563;
  font-size: 24rpx;
  font-weight: 700;
}

.variant-chip.active {
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
}

.preview-image {
  width: 100%;
  border-radius: 24rpx;
  background: #f3f4f6;
}

.section-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 800;
}

.section-desc {
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.75;
}

.download-button {
  height: 92rpx;
  line-height: 92rpx;
  border: none;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 38%, #36cfc9 72%, #4d96ff 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 800;
  box-shadow: 0 16rpx 30rpx rgba(77, 150, 255, 0.16);
}

.download-button::after {
  border: none;
}
</style>
