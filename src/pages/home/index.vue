<script setup lang="ts">
import { computed, ref } from "vue";
import beadPatternApi from "@/common/apis/beadPatternApi";
import { LocalStorageKey } from "@/common/helper/localStorageHelper";
import localStorageHelper from "@/common/helper/localStorageHelper";
import { beadPalette } from "@/common/constants/beadPalette";

interface GridPreset {
  label: string;
  width: number;
  height: number;
}

const selectedImagePath = ref("");
const uploadedImageId = ref("");
const generating = ref(false);
const gridWidth = ref(48);
const gridHeight = ref(48);
const sourceImageWidth = ref(1);
const sourceImageHeight = ref(1);
const maxColors = ref(16);
const preserveBackgroundBlank = ref(true);
const gridSizePresets: GridPreset[] = [
  { label: "26", width: 26, height: 26 },
  { label: "48", width: 48, height: 48 },
  { label: "96", width: 96, height: 96 },
  { label: "128", width: 128, height: 128 },
  { label: "160", width: 160, height: 160 },
];

const hasImage = computed(() => Boolean(selectedImagePath.value));
const maxColorLimit = beadPalette.length;
const boardCompatibilityText = computed(() => `需使用兼容大于等于 ${gridWidth.value} × ${gridHeight.value} 格的拼豆板`);

const normalizeDimension = (value: number) => clamp(Math.round(value || 48), 12, 160);
const isExactSquarePreset = (preset: GridPreset) => preset.width <= 26 && preset.width === preset.height;
const isPresetActive = (preset: GridPreset) => {
  if (isExactSquarePreset(preset)) {
    return gridWidth.value === preset.width && gridHeight.value === preset.height;
  }
  return Math.max(gridWidth.value, gridHeight.value) === preset.width;
};

const applyGridPreset = (preset: GridPreset | number) => {
  const normalizedPreset = normalizeDimension(typeof preset === "number" ? preset : Math.max(preset.width, preset.height));
  if (typeof preset !== "number" && isExactSquarePreset(preset)) {
    gridWidth.value = normalizeDimension(preset.width);
    gridHeight.value = normalizeDimension(preset.height);
    return;
  }

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
      <view class="upload-head">
        <view class="upload-copy">
          <text class="upload-eyebrow">图片转拼豆图纸</text>
          <text class="upload-title">上传图片</text>
        </view>
        <view class="upload-badge">品牌渐变</view>
      </view>

      <text class="upload-desc">尽量上传主体清晰、背景简单的图片。复杂图片需要更大尺寸的拼豆板才能兼容更多细节。</text>

      <button class="upload-button primary" @click="chooseImage">选择图片</button>

      <view v-if="hasImage" class="preview-box">
        <view class="preview-frame">
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
          <text class="slider-label">图纸尺寸</text>
          <text class="slider-value">{{ gridWidth }} × {{ gridHeight }} 格</text>
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
        <text class="slider-tip">`26` 为最小推荐规格，其余档位按原图比例自动计算。</text>
        <text class="slider-tip">{{ boardCompatibilityText }}</text>
        <text class="slider-tip">复杂图片、多人图、背景丰富的图片，建议选择更大尺寸的拼豆板。</text>
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
        <text class="slider-tip">当前色板共 {{ maxColorLimit }} 色。</text>
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
            <text class="lock-title">保留背景为空白</text>
            <text class="lock-text">适合人物、物件、头像等独立图案。</text>
          </view>
        </view>
      </view>

      <button class="generate-button" :disabled="!hasImage || generating" @click="generatePattern">
        {{ generating ? "正在生成..." : "生成拼豆图纸" }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 20rpx 28rpx;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.18), transparent 30%),
    linear-gradient(180deg, #fff6fb 0%, #ffffff 40%, #f7fafc 100%);
}

.upload-panel,
.card {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.1);
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
  height: 240rpx;
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

</style>
