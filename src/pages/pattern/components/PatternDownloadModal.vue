<script setup lang="ts">
import { storeToRefs } from "pinia";
import { usePatternStore } from "@/store/patternStore";

const patternStore = usePatternStore();
const { downloadModalVisible, exportWithLabels, downloading } = storeToRefs(patternStore);

const handleExportLabelSwitch = (event: any) => {
  patternStore.setExportWithLabels(Boolean(event?.detail?.value));
};
</script>

<template>
  <view v-if="downloadModalVisible" class="modal-mask" @click="patternStore.closeDownloadModal">
    <view class="download-modal" @click.stop>
      <text class="modal-title">下载图纸</text>
      <text class="modal-desc">
        导出到相册前，可以决定是否在每个像素格中直接显示色号，方便对着图案完成拼豆。
      </text>

      <view class="option-card">
        <view class="option-copy">
          <text class="option-title">像素格显示色号</text>
          <text class="option-desc">开启后，导出图纸会在每个格子里直接标注色号。</text>
        </view>
        <switch
          :checked="exportWithLabels"
          color="#4D96FF"
          style="transform: scale(0.88)"
          @change="handleExportLabelSwitch"
        />
      </view>

      <view class="modal-actions">
        <button class="modal-button light" :disabled="downloading" @click="patternStore.closeDownloadModal">取消</button>
        <button class="modal-button strong" :disabled="downloading" @click="patternStore.downloadPattern">
          {{ downloading ? "导出中..." : "确认下载" }}
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

.option-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  margin-top: 24rpx;
  padding: 24rpx 22rpx;
  border-radius: 24rpx;
  background: #f9fafb;
}

.option-copy {
  flex: 1;
}

.option-title {
  display: block;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 700;
}

.option-desc {
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
