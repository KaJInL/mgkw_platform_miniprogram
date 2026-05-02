<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onPullDownRefresh } from "@dcloudio/uni-app";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import freePatternApi, { type IFreePatternItem } from "@/common/apis/freePatternApi";

const loading = ref(false);
const items = ref<IFreePatternItem[]>([]);

const waterfallColumns = computed(() => {
  const columns: [IFreePatternItem[], IFreePatternItem[]] = [[], []];
  const heights = [0, 0];
  for (const item of items.value) {
    const width = Number(item.cover_width || 1);
    const height = Number(item.cover_height || width || 1);
    const estimatedHeight = Math.max(280, (height / Math.max(width, 1)) * 320 + 180);
    const targetIndex = heights[0] <= heights[1] ? 0 : 1;
    columns[targetIndex].push(item);
    heights[targetIndex] += estimatedHeight;
  }
  return columns;
});

const openDetail = (item: IFreePatternItem) => {
  uni.navigateTo({
    url: `/pages/free-patterns/detail?id=${item.id}`,
  });
};

const loadPatterns = async () => {
  loading.value = true;
  try {
    const response = await freePatternApi.list();
    items.value = (response as any).data || [];
  } catch (error) {
    items.value = [];
    uni.showToast({
      title: "免费图纸加载失败",
      icon: "none",
    });
  } finally {
    loading.value = false;
    uni.stopPullDownRefresh();
  }
};

onLoad(() => {
  void loadPatterns();
});

onPullDownRefresh(() => {
  void loadPatterns();
});
</script>

<template>
  <view class="free-pattern-page">
    <MaintenanceMask />
    <view class="hero-card">
      <text class="hero-eyebrow">Free Pattern Library</text>
      <text class="hero-title">免费图纸灵感库</text>
      <text class="hero-desc">挑一张喜欢的图纸，直接查看带色号版或纯净版，并保存到相册慢慢拼。</text>
    </view>

    <view v-if="!loading && items.length === 0" class="empty-card">
      <text class="empty-title">还没有上架的免费图纸</text>
      <text class="empty-desc">稍后再来看看，我们会持续补充新的拼豆灵感。</text>
    </view>

    <view v-else class="waterfall-wrap">
      <view class="waterfall-column">
        <view v-for="item in waterfallColumns[0]" :key="item.id" class="pattern-card" @click="openDetail(item)">
          <image class="pattern-cover" :src="item.cover_full_url || item.cover_url" mode="widthFix" />
          <view class="pattern-body">
            <view class="tag-row">
              <text v-for="tag in item.tags" :key="tag" class="tag-chip">{{ tag }}</text>
            </view>
            <text class="pattern-title">{{ item.title }}</text>
            <text v-if="item.subtitle" class="pattern-subtitle">{{ item.subtitle }}</text>
          </view>
        </view>
      </view>
      <view class="waterfall-column">
        <view v-for="item in waterfallColumns[1]" :key="item.id" class="pattern-card" @click="openDetail(item)">
          <image class="pattern-cover" :src="item.cover_full_url || item.cover_url" mode="widthFix" />
          <view class="pattern-body">
            <view class="tag-row">
              <text v-for="tag in item.tags" :key="tag" class="tag-chip">{{ tag }}</text>
            </view>
            <text class="pattern-title">{{ item.title }}</text>
            <text v-if="item.subtitle" class="pattern-subtitle">{{ item.subtitle }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.free-pattern-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 40rpx;
  box-sizing: border-box;
  background:
    radial-gradient(circle at top left, rgba(255, 77, 141, 0.18), transparent 26%),
    radial-gradient(circle at top right, rgba(77, 150, 255, 0.16), transparent 28%),
    linear-gradient(180deg, #fff7fb 0%, #ffffff 40%, #f7fafc 100%);
}

.hero-card,
.empty-card,
.pattern-card {
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.1);
}

.hero-card {
  padding: 34rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.28), transparent 28%),
    linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 32%, #36cfc9 70%, #4d96ff 100%);
}

.hero-eyebrow,
.hero-title,
.hero-desc,
.empty-title,
.empty-desc,
.pattern-title,
.pattern-subtitle,
.tag-chip {
  display: block;
}

.hero-eyebrow {
  color: rgba(255, 255, 255, 0.76);
  font-size: 20rpx;
  letter-spacing: 2rpx;
}

.hero-title {
  margin-top: 10rpx;
  color: #ffffff;
  font-size: 42rpx;
  font-weight: 800;
}

.hero-desc {
  margin-top: 14rpx;
  color: rgba(255, 255, 255, 0.92);
  font-size: 24rpx;
  line-height: 1.7;
}

.empty-card {
  margin-top: 24rpx;
  padding: 42rpx 28rpx;
  text-align: center;
}

.empty-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 800;
}

.empty-desc {
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}

.waterfall-wrap {
  display: flex;
  gap: 18rpx;
  align-items: flex-start;
  margin-top: 24rpx;
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.pattern-card {
  overflow: hidden;
}

.pattern-cover {
  width: 100%;
  display: block;
  background: #f3f4f6;
}

.pattern-body {
  padding: 18rpx 18rpx 20rpx;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.tag-chip {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(77, 150, 255, 0.1);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.pattern-title {
  margin-top: 14rpx;
  color: #1f2937;
  font-size: 30rpx;
  line-height: 1.35;
  font-weight: 800;
}

.pattern-subtitle {
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 1.6;
}
</style>
