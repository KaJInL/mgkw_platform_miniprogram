<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePatternStore } from "@/store/patternStore";

const patternStore = usePatternStore();
const { downloadModalVisible, downloading, selectedDownloadVariant } = storeToRefs(patternStore);
</script>

<template>
  <view v-if="downloadModalVisible" class="modal-mask" @click="patternStore.closeDownloadModal">
    <view class="download-modal" @click.stop>
      <text class="modal-title">下载图纸</text>
      <text class="modal-desc">
        当前任务已经生成了两张成品图，你可以直接选择下载带色号版或纯净版。
      </text>

      <view class="option-list">
        <button
          class="variant-card"
          :class="{ active: selectedDownloadVariant === 'labeled' }"
          :disabled="downloading"
          @click="patternStore.setSelectedDownloadVariant('labeled')"
        >
          <text class="variant-title">带色号图纸</text>
          <text class="variant-desc">每个格子直接显示色号，适合照图拼豆。</text>
        </button>
        <button
          class="variant-card"
          :class="{ active: selectedDownloadVariant === 'plain' }"
          :disabled="downloading"
          @click="patternStore.setSelectedDownloadVariant('plain')"
        >
          <text class="variant-title">无色号图纸</text>
          <text class="variant-desc">画面更干净，适合只看图案轮廓和配色。</text>
        </button>
      </view>

      <view class="modal-actions">
        <button class="modal-button light" :disabled="downloading" @click="patternStore.closeDownloadModal">取消</button>
        <button
          class="modal-button strong"
          :disabled="downloading"
          @click="patternStore.downloadPattern(selectedDownloadVariant)"
        >
          {{ downloading ? "下载中..." : "确认下载" }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(15, 23, 42, 0.42);
  z-index: 999;
}

.download-modal {
  width: 100%;
  padding: 34rpx 24rpx calc(34rpx + env(safe-area-inset-bottom));
  border-radius: 32rpx 32rpx 0 0;
  background:
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.12), transparent 26%),
    #ffffff;
  box-shadow: 0 -18rpx 48rpx rgba(15, 23, 42, 0.12);
}

.modal-title {
  display: block;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 700;
}

.modal-desc {
  display: block;
  margin-top: 14rpx;
  color: #6b7280;
  font-size: 25rpx;
  line-height: 1.7;
}

.option-list {
  display: grid;
  gap: 16rpx;
  margin-top: 24rpx;
}

.variant-card {
  padding: 22rpx 20rpx;
  border-radius: 24rpx;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  text-align: left;
}

.variant-card.active {
  border-color: #4d96ff;
  background: linear-gradient(135deg, rgba(230, 244, 255, 0.88), rgba(255, 240, 246, 0.72));
}

.variant-card::after {
  border: none;
}

.variant-title {
  display: block;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 700;
}

.variant-desc {
  display: block;
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 23rpx;
  line-height: 1.6;
}

.modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-top: 26rpx;
}

.modal-button {
  height: 88rpx;
  line-height: 88rpx;
  border: none;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
}

.modal-button::after {
  border: none;
}

.modal-button.light {
  background: #eef2f7;
  color: #1f2937;
}

.modal-button.strong {
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
}
</style>
