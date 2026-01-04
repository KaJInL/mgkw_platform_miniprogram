<script setup lang="ts">
import {computed} from "vue";
import type {DesignInfo as DesignInfoType, DesignState} from "@/common/apis/designProductApi";

/**
 * 设计作品信息组件
 */
interface Props {
  /** 设计作品信息 */
  design: DesignInfoType
  /** 类目名称 */
  categoryName?: string
  /** 系列名称 */
  seriesName?: string
}

const props = defineProps<Props>();

/**
 * 是否显示官方标识
 */
const isOfficial = computed(() => props.design.isOfficial === '1');

/**
 * 是否有标签
 */
const hasTags = computed(() => {
  // 卫语句：检查标签数组是否存在且有内容
  if (!props.design.tags) return false;
  if (!Array.isArray(props.design.tags)) return false;
  return props.design.tags.length > 0;
});

/**
 * 是否显示基本信息区域
 */
const hasBasicInfo = computed(() => {
  return Boolean(props.categoryName || props.seriesName);
});
</script>

<template>
  <view class="info-section">
    <!-- 标题和状态 -->
    <view class="title-row">
      <text class="title">{{ design.title }}</text>
    </view>

    <!-- 官方标识 -->
    <view v-if="isOfficial" class="official-badge">
      <text class="official-text">官方设计</text>
    </view>

    <!-- 描述 -->
    <view v-if="design.description" class="description">
      <text class="description-text">{{ design.description }}</text>
    </view>

    <!-- 标签 -->
    <view v-if="hasTags" class="tags-container">
      <view class="tag-item" v-for="(tag, index) in design.tags" :key="index">
        <text class="tag-text">{{ tag }}</text>
      </view>
    </view>

    <!-- 基本信息（类目和系列标签） -->
    <view v-if="hasBasicInfo" class="basic-info">
      <view class="info-tags">
        <view v-if="categoryName" class="info-tag category-tag">
          <text class="tag-icon">📁</text>
          <text class="tag-text">{{ categoryName }}</text>
        </view>
        <view v-if="seriesName" class="info-tag series-tag">
          <text class="tag-icon">📂</text>
          <text class="tag-text">{{ seriesName }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.info-section {
  background-color: #fff;
  padding: 40rpx 32rpx;
  border-radius: 0 0 32rpx 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
  margin-bottom: 24rpx;
}

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24rpx;

  .title {
    flex: 1;
    font-size: 44rpx;
    font-weight: 700;
    color: #1d1d1f;
    line-height: 1.3;
    letter-spacing: -1rpx;
    margin-right: 20rpx;
  }
}

.official-badge {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 16rpx;
  background: #1d1d1f;
  border-radius: 12rpx;
  margin-bottom: 32rpx;

  .official-text {
    font-size: 20rpx;
    color: #fff;
    font-weight: 600;
    letter-spacing: 1rpx;
    text-transform: uppercase;
  }
}

.description {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);

  .description-text {
    font-size: 30rpx;
    color: #424245;
    line-height: 1.7;
  }
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 32rpx;

  .tag-item {
    padding: 10rpx 24rpx;
    background-color: #f5f5f7;
    border-radius: 100rpx;

    .tag-text {
      font-size: 24rpx;
      color: #1d1d1f;
      font-weight: 500;
    }
  }
}

.basic-info {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);

  .info-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    align-items: center;
  }

  .info-tag {
    display: inline-flex;
    align-items: center;
    padding: 8rpx 20rpx;
    background-color: #f5f5f7;
    border-radius: 100rpx;
    gap: 8rpx;

    .tag-icon {
      font-size: 24rpx;
      line-height: 1;
    }

    .tag-text {
      font-size: 24rpx;
      color: #1d1d1f;
      font-weight: 500;
    }
  }

  .category-tag {
    background: linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%);
  }

  .series-tag {
    background: linear-gradient(135deg, #f0f0f5 0%, #e0e0e5 100%);
  }
}
</style>
