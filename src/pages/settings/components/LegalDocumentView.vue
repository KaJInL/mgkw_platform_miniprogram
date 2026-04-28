<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import legalDocumentApi from "@/common/apis/legalDocumentApi";
import { isResponseSuccess } from "@/common/apis/base/res";

type DocType = "user-agreement" | "privacy-policy";

interface Props {
  docType: DocType;
  title: string;
  subtitle: string;
}

const props = defineProps<Props>();

const loading = ref(true);
const content = ref("");
const loadError = ref("");

const resolveContent = (payload: { user_agreement?: string; privacy_policy?: string }) => {
  if (props.docType === "user-agreement") {
    return payload.user_agreement || "";
  }
  return payload.privacy_policy || "";
};

const sections = computed(() => {
  const normalized = (content.value || "").replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      const firstLine = lines[0] || "";
      const hasTitle = /^(特别提示|生效日期|更新日期|运营者|一、|二、|三、|四、|五、|六、|七、|八、|九、|十、|附则)/.test(firstLine);
      return {
        title: hasTitle ? firstLine : "",
        body: hasTitle ? lines.slice(1).join("\n") : lines.join("\n"),
      };
    });
});

const loadDocument = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const response = await legalDocumentApi.getLegalDocuments();
    if (!isResponseSuccess(response)) {
      throw new Error(response.message || "加载失败");
    }
    content.value = resolveContent(response.data || {});
  } catch (error) {
    content.value = "";
    loadError.value = (error as Error)?.message || "加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  void loadDocument();
});
</script>

<template>
  <view class="doc-page">
    <MaintenanceMask />
    <view class="doc-aurora doc-aurora-pink" />
    <view class="doc-aurora doc-aurora-blue" />

    <view class="doc-hero">
      <text class="doc-kicker">LEGAL DOCUMENT</text>
      <text class="doc-title">{{ title }}</text>
      <text class="doc-subtitle">{{ subtitle }}</text>
    </view>

    <view class="doc-card">
      <view v-if="loading" class="doc-state">
        <text class="doc-state-title">加载中</text>
        <text class="doc-state-desc">正在获取最新协议内容...</text>
      </view>

      <view v-else-if="loadError" class="doc-state">
        <text class="doc-state-title">加载失败</text>
        <text class="doc-state-desc">{{ loadError }}</text>
        <view class="doc-state-action" @click="loadDocument">重新加载</view>
      </view>

      <view v-else-if="!sections.length" class="doc-state">
        <text class="doc-state-title">暂无内容</text>
        <text class="doc-state-desc">后台尚未发布该协议文本。</text>
      </view>

      <view v-else class="doc-sections">
        <view v-for="(section, index) in sections" :key="`${index}-${section.title}`" class="doc-section">
          <text v-if="section.title" class="sec-title">{{ section.title }}</text>
          <text class="sec-text">{{ section.body }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.doc-page {
  position: relative;
  min-height: 100vh;
  padding: 28rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fff7fb 0%, #ffffff 42%, #f7fafc 100%);
  overflow: hidden;
}

.doc-aurora {
  position: absolute;
  border-radius: 999rpx;
  pointer-events: none;
}

.doc-aurora-pink {
  top: -100rpx;
  left: -60rpx;
  width: 320rpx;
  height: 320rpx;
  background: radial-gradient(circle, rgba(255, 77, 141, 0.16) 0%, rgba(255, 77, 141, 0) 74%);
}

.doc-aurora-blue {
  top: 180rpx;
  right: -100rpx;
  width: 360rpx;
  height: 360rpx;
  background: radial-gradient(circle, rgba(77, 150, 255, 0.14) 0%, rgba(77, 150, 255, 0) 74%);
}

.doc-hero,
.doc-card {
  position: relative;
  z-index: 1;
}

.doc-hero {
  padding: 12rpx 8rpx 0;
}

.doc-kicker {
  display: block;
  color: #ff4d8d;
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.doc-title {
  display: block;
  margin-top: 12rpx;
  color: #1f2937;
  font-size: 50rpx;
  font-weight: 900;
  line-height: 1.08;
}

.doc-subtitle {
  display: block;
  margin-top: 14rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.7;
}

.doc-card {
  margin-top: 24rpx;
  border-radius: 34rpx;
  padding: 30rpx 28rpx;
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid rgba(229, 231, 235, 0.92);
  box-shadow:
    0 18rpx 42rpx rgba(77, 150, 255, 0.08),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.78);
}

.doc-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14rpx;
  padding: 16rpx 6rpx;
}

.doc-state-title {
  color: #1f2937;
  font-size: 32rpx;
  font-weight: 800;
}

.doc-state-desc {
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}

.doc-state-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 180rpx;
  height: 76rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: 700;
}

.doc-sections {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.doc-section {
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid rgba(243, 244, 246, 0.96);
}

.doc-section:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.sec-title {
  display: block;
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 800;
  line-height: 1.6;
}

.sec-text {
  display: block;
  margin-top: 10rpx;
  color: #4b5563;
  font-size: 24rpx;
  line-height: 1.88;
  white-space: pre-wrap;
}
</style>
