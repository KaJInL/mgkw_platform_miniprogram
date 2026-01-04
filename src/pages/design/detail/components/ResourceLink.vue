<script setup lang="ts">
/**
 * 资源链接组件
 */
interface Props {
  /** 资源URL */
  resourceUrl: string
  /** 是否有权限查看 */
  hasPermission?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  hasPermission: false
});

/**
 * 显示成功提示
 */
const showSuccessToast = () => {
  uni.showToast({
    title: '复制成功',
    icon: 'success'
  });
};

/**
 * 显示失败提示
 */
const showFailToast = () => {
  uni.showToast({
    title: '复制失败',
    icon: 'none'
  });
};

/**
 * 复制资源URL到粘贴板
 */
const copyResourceUrl = (url: string) => {
  // 检查权限
  if (!props.hasPermission) {
    uni.showToast({
      title: '请购买后解锁',
      icon: 'none'
    });
    return;
  }
  
  // 卫语句：检查URL是否有效
  if (!url) {
    uni.showToast({
      title: '暂无资源链接',
      icon: 'none'
    });
    return;
  }

  uni.setClipboardData({
    data: url,
    success: showSuccessToast,
    fail: showFailToast
  });
};
</script>

<template>
  <view class="resource-section">
    <view class="section-title">
      <text class="title-text">资源链接</text>
    </view>
    <view class="resource-content-wrapper">
      <view class="resource-content" :class="{ 'locked': !hasPermission }">
        <view class="resource-url-container" @click="copyResourceUrl(resourceUrl)">
          <view class="link-icon">🔗</view>
          <text class="resource-url">{{ resourceUrl || '资源链接已锁定' }}</text>
          <view class="copy-btn">
            <text class="btn-text">复制</text>
          </view>
        </view>
        <text class="resource-hint">点击复制链接，请在浏览器中打开下载</text>
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
.resource-section {
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


.resource-url-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #f5f5f7;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  
  &:active {
    background-color: #ebebef;
  }
}

.link-icon {
  margin-right: 20rpx;
  font-size: 32rpx;
}

.resource-url {
  flex: 1;
  font-size: 26rpx;
  color: #1d1d1f;
  word-break: break-all;
  margin-right: 20rpx;
  line-height: 1.5;
  font-family: monospace;
}

.copy-btn {
  padding: 10rpx 24rpx;
  background: #1d1d1f;
  border-radius: 100rpx;
  
  .btn-text {
    font-size: 24rpx;
    color: #fff;
    font-weight: 500;
  }
}

.resource-hint {
  font-size: 24rpx;
  color: #86868b;
  text-align: center;
  display: block;
}

.resource-content-wrapper {
  position: relative;
  padding: 32rpx;
}

.resource-content {
  position: relative;
}

.resource-content.locked {
  filter: blur(8rpx);
  pointer-events: none;
  user-select: none;
}

.permission-overlay {
  position: absolute;
  top: 32rpx;
  left: 32rpx;
  right: 32rpx;
  bottom: 32rpx;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 24rpx;
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
