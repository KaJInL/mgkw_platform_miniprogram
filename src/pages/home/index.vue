<script setup lang="ts">
import { computed, ref } from "vue";
import beadPatternApi from "@/common/apis/beadPatternApi";
import { LocalStorageKey } from "@/common/helper/localStorageHelper";
import localStorageHelper from "@/common/helper/localStorageHelper";
import { beadPalette } from "@/common/constants/beadPalette";

const selectedImagePath = ref("");
const uploadedImageId = ref("");
const generating = ref(false);
const gridWidth = ref(48);
const gridHeight = ref(48);
const sourceImageWidth = ref(1);
const sourceImageHeight = ref(1);
const maxColors = ref(16);
const preserveBackgroundBlank = ref(true);
const gridSizePresets = [48, 96, 128, 160];

const hasImage = computed(() => Boolean(selectedImagePath.value));
const maxColorLimit = beadPalette.length;

const normalizeDimension = (value: number) => clamp(Math.round(value || 48), 12, 160);

const applyGridPreset = (value: number) => {
  const normalizedPreset = normalizeDimension(value);
  if (!sourceImageWidth.value || !sourceImageHeight.value) {
    gridWidth.value = normalizedPreset;
    gridHeight.value = normalizedPreset;
    return;
  }

  if (sourceImageWidth.value >= sourceImageHeight.value) {
    gridWidth.value = normalizedPreset;
    gridHeight.value = normalizeDimension(normalizedPreset * (sourceImageHeight.value / sourceImageWidth.value));
    return;
  }

  gridHeight.value = normalizedPreset;
  gridWidth.value = normalizeDimension(normalizedPreset * (sourceImageWidth.value / sourceImageHeight.value));
};

const chooseImage = async (sourceType: Array<"album" | "camera">) => {
  try {
    const result = await uni.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType,
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

const generatePattern = async () => {
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
      palette: beadPalette.map((item) => ({
        id: item.id,
        name: item.name,
        hex: item.hex,
        code: item.code,
      })),
    });
    const task = (generateRes as any).data;
    localStorageHelper.remove(LocalStorageKey.LATEST_BEAD_PATTERN);
    localStorageHelper.set(LocalStorageKey.PENDING_BEAD_PATTERN_DRAFT, {
      taskId: task.task_id,
      sourceImagePath: selectedImagePath.value,
      sourceWidth: sourceImageWidth.value,
      sourceHeight: sourceImageHeight.value,
      targetWidth: gridWidth.value,
      targetHeight: gridHeight.value,
      maxColors: maxColors.value,
      preserveBackgroundBlank: preserveBackgroundBlank.value,
    }, 15 * 60);
    uni.hideLoading();
    generating.value = false;
    uni.navigateTo({
      url: `/pages/pattern/index?task_id=${encodeURIComponent(task.task_id)}`,
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
</script>

<template>
  <view class="page">
    <view class="upload-panel">
      <view class="upload-copy">
        <text class="upload-eyebrow">图片转拼豆图纸</text>
        <text class="upload-title">上传图片</text>
        <text class="upload-desc">支持人物、头像、物件与像素风图片。建议主体清晰、背景简单。</text>
      </view>
      <button class="upload-button" @click="chooseImage(['album'])">从相册上传图片</button>

      <view v-if="hasImage" class="preview-box">
        <image :src="selectedImagePath" class="preview-image" mode="aspectFit" />
      </view>
      <view v-else class="empty-box">
        <text class="empty-title">上传后会在这里显示原图</text>
        <text class="empty-desc">选好尺寸、颜色数和留白方式后，即可生成拼豆图纸。</text>
      </view>
    </view>

    <view class="card">
      <view class="section-head">
        <text class="section-title">生成参数</text>
      </view>

      <view class="slider-block">
        <view class="slider-head">
        <text class="slider-label">图纸尺寸</text>
          <text class="slider-value">{{ gridWidth }} × {{ gridHeight }} 格</text>
        </view>
        <view class="preset-row">
          <text
            v-for="preset in gridSizePresets"
            :key="preset"
            class="preset-chip"
            :class="{ active: gridWidth === preset || gridHeight === preset }"
            @click="applyGridPreset(preset)"
          >
            {{ preset }}
          </text>
        </view>
        <text class="slider-tip">仅支持预设尺寸；最大不超过 160，系统会按原图比例自动计算另一边。</text>
      </view>

      <view class="slider-block">
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
          backgroundColor="#E5E7EB"
          block-color="#FF9F1C"
          @changing="maxColors = $event.detail.value"
          @change="maxColors = $event.detail.value"
        />
        <text class="slider-tip">当前色板共 {{ maxColorLimit }} 色，可直接用滑杆调到上限。</text>
      </view>

      <view class="slider-block">
        <view class="slider-head">
          <text class="slider-label">背景留白</text>
          <text class="slider-value">{{ preserveBackgroundBlank ? "保留空白" : "映射成拼豆" }}</text>
        </view>
        <view class="lock-row" @click="preserveBackgroundBlank = !preserveBackgroundBlank">
          <view class="checkbox" :class="{ checked: preserveBackgroundBlank }">
            <text class="checkbox-mark">{{ preserveBackgroundBlank ? "✓" : "" }}</text>
          </view>
          <text class="lock-text">保留背景为空白，不把边缘背景区域强制映射为拼豆</text>
        </view>
        <text class="slider-tip">建议默认开启，适合人物、物件、头像等独立图案。</text>
      </view>
    </view>

    <button class="generate-button" :disabled="!hasImage || generating" @click="generatePattern">
      {{ generating ? "正在生成..." : "生成拼豆图纸" }}
    </button>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 28rpx 24rpx 40rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.18), transparent 30%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 40%, #f7fafc 100%);
}

.upload-panel,
.card {
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24rpx 60rpx rgba(77, 150, 255, 0.12);
}

.upload-panel {
  padding: 34rpx 28rpx 28rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.38), transparent 26%),
    linear-gradient(135deg, #ff4d8d 0%, #ff6a5a 22%, #ff9f1c 48%, #36cfc9 72%, #4d96ff 100%);
}

.upload-copy {
  display: flex;
  flex-direction: column;
}

.upload-eyebrow {
  color: rgba(255, 255, 255, 0.82);
  font-size: 22rpx;
  letter-spacing: 1rpx;
}

.upload-title {
  display: block;
  margin-top: 14rpx;
  color: #ffffff;
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1.12;
}

.upload-desc {
  display: block;
  margin-top: 18rpx;
  color: rgba(255, 255, 255, 0.92);
  font-size: 28rpx;
  line-height: 1.6;
}

.upload-button,
.generate-button {
  height: 96rpx;
  line-height: 96rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.upload-button::after,
.generate-button::after {
  border: none;
}

.upload-button {
  width: 100%;
  margin-top: 26rpx;
  background: #ffffff;
  color: #1f2937;
}

.card {
  margin-top: 22rpx;
  padding: 28rpx 24rpx;
}

.section-head,
.slider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}

.section-meta,
.slider-value {
  color: #4d96ff;
  font-size: 24rpx;
  font-weight: 600;
}

.preview-box,
.empty-box {
  margin-top: 22rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.08)),
    #ffffff;
}

.preview-box {
  padding: 18rpx;
}

.preview-image {
  width: 100%;
  height: 420rpx;
  border-radius: 22rpx;
}

.empty-box {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  align-items: center;
  justify-content: center;
  min-height: 280rpx;
  padding: 20rpx;
}

.empty-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 700;
}

.empty-desc,
.slider-label {
  color: #6b7280;
  font-size: 24rpx;
}

.slider-block {
  margin-top: 26rpx;
  padding: 22rpx 20rpx 10rpx;
  border-radius: 24rpx;
  background: #f9fafb;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
  margin-bottom: 8rpx;
}

.preset-chip {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #6b7280;
  font-size: 22rpx;
}

.preset-chip.active {
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
}

.slider-tip {
  display: block;
  margin-top: 8rpx;
  color: #9ca3af;
  font-size: 22rpx;
}

.generate-button {
  margin-top: 24rpx;
  background: linear-gradient(135deg, #36cfc9 0%, #52d681 100%);
  color: #ffffff;
}

.generate-button[disabled] {
  opacity: 0.5;
}

</style>
