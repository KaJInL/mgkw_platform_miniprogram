<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  desc: string
  delay?: string
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <view class="function-item" :style="{ '--delay': delay }" @click="handleClick">
    <view class="item-top">
      <text class="item-icon">{{ icon }}</text>
      <text class="item-arrow">→</text>
    </view>
    <view class="item-content">
      <text class="item-cn-title">{{ title }}</text>
      <text class="item-cn-desc">{{ desc }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.function-item {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  height: 200rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.03);
  transition: all 0.3s ease;
  animation: itemFadeUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) backwards;
  animation-delay: var(--delay);

  &:active {
    transform: scale(0.98);
    background: #fafafa;
  }
}

.item-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.item-icon {
  font-size: 48rpx;
}

.item-arrow {
  font-size: 32rpx;
  color: #d1d1d6;
  font-weight: 300;
  transform: rotate(-45deg); /* 斜向箭头 */
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.item-cn-title {
  font-size: 30rpx;
  color: #1d1d1f;
  font-weight: 600;
  letter-spacing: 1rpx;
}

.item-cn-desc {
  font-size: 22rpx;
  color: #86868b;
}

@keyframes itemFadeUp {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>





