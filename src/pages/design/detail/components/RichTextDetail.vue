<script setup lang="ts">
import {computed} from "vue";

/**
 * 富文本详情组件
 */
interface Props {
  /** 富文本内容 */
  detail: string
  /** 是否有权限查看 */
  hasPermission?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasPermission: false
});

/**
 * 移除图片标签的样式和尺寸属性
 */
const removeImageAttributes = (html: string): string => {
  return html.replace(/<img[^>]*>/gi, (match) => {
    let cleaned = match;
    cleaned = cleaned.replace(/style="[^"]+"/gi, '').replace(/style\s*=\s*(['"])[\s\S]*?\1/ig, '');
    cleaned = cleaned.replace(/width="[^"]+"/gi, '').replace(/width='[^']+'/gi, '');
    cleaned = cleaned.replace(/height="[^"]+"/gi, '').replace(/height='[^']+'/gi, '');
    return cleaned;
  });
};

/**
 * 标准化样式属性
 */
const normalizeStyles = (html: string): string => {
  return html.replace(/style="[^"]+"/gi, (match) => {
    return match.replace(/width:[^;]+;/gi, 'width:100%;');
  });
};

/**
 * 移除换行标签
 */
const removeBrTags = (html: string): string => {
  return html.replace(/<br[^>]*>/gi, '');
};

/**
 * 添加响应式图片样式
 */
const addResponsiveImageStyle = (html: string): string => {
  return html.replace(/<img/gi, '<img style="width:100%;height:auto;display:block;"');
};

/**
 * 格式化富文本
 */
const formatRichText = (html: string): string => {
  // 卫语句：检查输入是否有效
  if (!html) return '';
  
  let content = html;
  content = removeImageAttributes(content);
  content = normalizeStyles(content);
  content = removeBrTags(content);
  content = addResponsiveImageStyle(content);
  
  return content;
};

/**
 * 处理富文本内容，限制图片宽度
 */
const processedDetail = computed(() => {
  // 如果没有详情内容，返回占位符（用于显示遮罩）
  if (!props.detail) {
    return '<p style="color: #86868b; padding: 40rpx 0; text-align: center;">作品详情已锁定</p>';
  }
  
  return formatRichText(props.detail);
});
</script>

<template>
  <view class="detail-section">
    <view class="section-title">
      <text class="title-text">作品详情</text>
    </view>
    <view class="detail-content-wrapper">
      <view class="detail-content" :class="{ 'locked': !hasPermission }">
        <rich-text class="rich-content" :nodes="processedDetail"></rich-text>
      </view>
      
      <!-- 权限遮罩 -->
      <view v-if="!hasPermission" class="permission-overlay">
        <view class="overlay-content">
          <view class="lock-icon">🔒</view>
          <text class="lock-text">请购买后解锁</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-section {
  background-color: #fff;
  margin: 24rpx 32rpx;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
}

.section-title {
  padding: 32rpx 32rpx 0;
  background-color: #fff;

  .title-text {
    font-size: 34rpx;
    font-weight: 700;
    color: #1d1d1f;
  }
}

.detail-content-wrapper {
  position: relative;
}

.detail-content {
  position: relative;
}

.detail-content.locked {
  filter: blur(8rpx);
  pointer-events: none;
  user-select: none;
}

.rich-content {
  padding: 32rpx;
  font-size: 30rpx;
  line-height: 1.8;
  color: #424245;
  word-break: break-all;
  overflow-x: hidden;
}

.permission-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 0 0 24rpx 24rpx;
  pointer-events: auto;
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  position: relative;
  z-index: 101;
  filter: none !important;
}

.lock-icon {
  font-size: 64rpx;
  opacity: 0.8;
  filter: none !important;
}

.lock-text {
  font-size: 28rpx;
  color: #1d1d1f;
  font-weight: 600;
  filter: none !important;
}
</style>
