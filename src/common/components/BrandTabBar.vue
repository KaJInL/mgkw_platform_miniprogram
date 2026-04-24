<script setup lang="ts">
const tabs = [
  {
    text: "首页",
    pagePath: "/pages/home/index",
    icon: "home",
    accent: "warm",
  },
  {
    text: "我的",
    pagePath: "/pages/mine/index",
    icon: "mine",
    accent: "cool",
  },
];

const getSelectedIndex = () => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const currentRoute = `/${current?.route || ""}`;
  const index = tabs.findIndex((item) => item.pagePath === currentRoute);
  return index >= 0 ? index : 0;
};

const selected = getSelectedIndex();

const switchTab = (index: number) => {
  const target = tabs[index];
  if (!target || selected === index) {
    return;
  }
  uni.switchTab({
    url: target.pagePath,
  });
};
</script>

<template>
  <view class="tabbar-host">
    <view class="tabbar-shadow" />
    <view class="tabbar-shell">
      <view
        v-for="(item, index) in tabs"
        :key="item.pagePath"
        class="tab-item"
        :class="[
          selected === index ? 'active' : '',
          item.accent === 'warm' ? 'accent-warm' : 'accent-cool',
        ]"
        @click="switchTab(index)"
      >
        <view class="tab-icon-wrap">
          <view v-if="item.icon === 'home'" class="tab-icon home-icon">
            <view class="home-roof" />
            <view class="home-body" />
            <view class="home-door" />
          </view>
          <view v-else class="tab-icon mine-icon">
            <view class="mine-head" />
            <view class="mine-body" />
          </view>
        </view>
        <text class="tab-label">{{ item.text }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.tabbar-host {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 998;
  pointer-events: none;
}

.tabbar-shadow {
  position: absolute;
  left: 26rpx;
  right: 26rpx;
  bottom: 20rpx;
  height: 120rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, rgba(255, 77, 141, 0.18), rgba(77, 150, 255, 0.16));
  filter: blur(20rpx);
}

.tabbar-shell {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 0 22rpx calc(env(safe-area-inset-bottom) + 16rpx);
  padding: 14rpx;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 999rpx;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.9)),
    linear-gradient(90deg, rgba(255, 77, 141, 0.08), rgba(77, 150, 255, 0.08));
  box-shadow:
    0 18rpx 46rpx rgba(31, 41, 55, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18rpx);
}

.tab-item {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  height: 86rpx;
  border-radius: 999rpx;
  color: #7a8494;
}

.tab-item.active {
  color: #ffffff;
  box-shadow: 0 12rpx 28rpx rgba(77, 150, 255, 0.22);
}

.tab-item.active.accent-warm {
  background: linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 100%);
}

.tab-item.active.accent-cool {
  background: linear-gradient(135deg, #36cfc9 0%, #4d96ff 100%);
}

.tab-icon-wrap {
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tab-icon {
  position: relative;
}

.tab-label {
  max-width: 120rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 22rpx;
  font-weight: 700;
  letter-spacing: 0.5rpx;
}

.home-icon {
  width: 38rpx;
  height: 34rpx;
}

.home-roof {
  position: absolute;
  top: 0;
  left: 7rpx;
  width: 24rpx;
  height: 24rpx;
  border-top: 6rpx solid currentColor;
  border-left: 6rpx solid currentColor;
  border-radius: 6rpx 0 0 0;
  transform: rotate(45deg);
}

.home-body {
  position: absolute;
  left: 7rpx;
  bottom: 0;
  width: 24rpx;
  height: 18rpx;
  border: 5rpx solid currentColor;
  border-radius: 8rpx;
  background: transparent;
}

.home-door {
  position: absolute;
  left: 16rpx;
  bottom: 0;
  width: 8rpx;
  height: 12rpx;
  border-radius: 4rpx 4rpx 0 0;
  background: currentColor;
}

.mine-icon {
  width: 38rpx;
  height: 38rpx;
}

.mine-head {
  position: absolute;
  top: 0;
  left: 10rpx;
  width: 18rpx;
  height: 18rpx;
  border: 5rpx solid currentColor;
  border-radius: 50%;
}

.mine-body {
  position: absolute;
  left: 5rpx;
  bottom: 1rpx;
  width: 28rpx;
  height: 15rpx;
  border: 5rpx solid currentColor;
  border-bottom: 0;
  border-radius: 18rpx 18rpx 0 0;
}
</style>
