<script setup lang="ts">
import { computed, ref } from "vue";

import { useAccountStore } from "@/store/accountStore";

interface TabItem {
  text: string;
  pagePath: string;
  icon: "home" | "mine" | "sales" | "task";
  accent: "warm" | "cool" | "brand";
  requiresPromotionAccess?: boolean;
}

const accountStore = useAccountStore();
accountStore.loadCachedUserInfo();

const hasPromotionAccess = computed(() => {
  const roleCodes = accountStore.userInfo?.role_codes || [];
  return roleCodes.some((item) => {
    const normalized = String(item || "").trim().toUpperCase();
    return ["SALESPERSON", "ADMIN", "SUPER_ADMIN"].includes(normalized);
  });
});

const allTabs: TabItem[] = [
  {
    text: "首页",
    pagePath: "/pages/home/index",
    icon: "home",
    accent: "warm",
  },
  {
    text: "任务",
    pagePath: "/pages/tasks/index",
    icon: "task",
    accent: "cool",
  },
  {
    text: "推广",
    pagePath: "/pages/salesperson/index",
    icon: "sales",
    accent: "brand",
    requiresPromotionAccess: true,
  },
  {
    text: "我的",
    pagePath: "/pages/mine/index",
    icon: "mine",
    accent: "cool",
  },
];

const visibleTabs = computed(() => {
  return allTabs.filter((item) => {
    if (item.requiresPromotionAccess && !hasPromotionAccess.value) {
      return false;
    }
    return true;
  });
});

const currentRoutePath = computed(() => {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  return `/${current?.route || ""}`;
});

const getSelectedIndex = () => {
  const index = visibleTabs.value.findIndex((item) => item.pagePath === currentRoutePath.value);
  return index >= 0 ? index : 0;
};

const selected = computed(() => getSelectedIndex());
const transitioningIndex = ref(-1);

const switchTab = (index: number) => {
  const target = visibleTabs.value[index];
  if (!target || selected.value === index) {
    return;
  }
  transitioningIndex.value = index;
  setTimeout(() => {
    uni.switchTab({
      url: target.pagePath,
    });
  }, 120);
};
</script>

<template>
  <view class="tabbar-host">
    <view class="tabbar-shadow" />
    <view class="tabbar-shell">
      <view
        v-for="(item, index) in visibleTabs"
        :key="item.pagePath"
        class="tab-item"
        :class="[
          currentRoutePath === item.pagePath ? 'active' : '',
          transitioningIndex === index ? 'is-pressing' : '',
          item.accent === 'warm' ? 'accent-warm' : item.accent === 'brand' ? 'accent-brand' : 'accent-cool',
        ]"
        @click="switchTab(index)"
      >
        <view class="tab-item-glow" />
        <view class="tab-icon-wrap">
          <view v-if="item.icon === 'home'" class="tab-icon home-icon">
            <view class="home-roof" />
            <view class="home-body" />
            <view class="home-door" />
          </view>
          <view v-else-if="item.icon === 'mine'" class="tab-icon mine-icon">
            <view class="mine-head" />
            <view class="mine-body" />
          </view>
          <view v-else-if="item.icon === 'sales'" class="tab-icon sales-icon">
            <view class="sales-pin" />
            <view class="sales-stem" />
            <view class="sales-dot" />
          </view>
          <view v-else class="tab-icon task-icon">
            <view class="task-line task-line-top" />
            <view class="task-line task-line-middle" />
            <view class="task-line task-line-bottom" />
            <view class="task-dot task-dot-top" />
            <view class="task-dot task-dot-bottom" />
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
  bottom: 0;
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
  margin: 0 22rpx 0;
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
  overflow: hidden;
  transform: translateY(0) scale(1);
  transition:
    transform 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.tab-item-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: radial-gradient(circle at top center, rgba(255, 255, 255, 0.3), transparent 58%);
}

.tab-item.active {
  color: #ffffff;
  transform: translateY(-4rpx) scale(1.01);
  box-shadow: 0 12rpx 28rpx rgba(77, 150, 255, 0.22);
  animation: activeTabLift 0.22s ease;
}

.tab-item.active .tab-item-glow {
  opacity: 1;
}

.tab-item.is-pressing {
  transform: translateY(-2rpx) scale(0.96);
}

.tab-item.active.accent-warm {
  background: linear-gradient(135deg, #ff4d8d 0%, #ff9f1c 100%);
}

.tab-item.active.accent-cool {
  background: linear-gradient(135deg, #36cfc9 0%, #4d96ff 100%);
}

.tab-item.active.accent-brand {
  background: linear-gradient(135deg, #ff9f1c 0%, #4d96ff 100%);
}

.tab-icon-wrap {
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.tab-icon {
  position: relative;
}

.tab-item.active .tab-icon-wrap {
  transform: translateY(-1rpx);
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

.sales-icon {
  width: 38rpx;
  height: 38rpx;
}

.sales-pin {
  position: absolute;
  top: 0;
  left: 8rpx;
  width: 22rpx;
  height: 22rpx;
  border: 5rpx solid currentColor;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
}

.sales-stem {
  position: absolute;
  left: 17rpx;
  top: 17rpx;
  width: 5rpx;
  height: 16rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.sales-dot {
  position: absolute;
  top: 8rpx;
  left: 13rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: currentColor;
}

.task-icon {
  width: 38rpx;
  height: 34rpx;
}

.task-line {
  position: absolute;
  left: 12rpx;
  right: 0;
  height: 4rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.task-line-top {
  top: 5rpx;
}

.task-line-middle {
  top: 14rpx;
}

.task-line-bottom {
  top: 23rpx;
}

.task-dot {
  position: absolute;
  left: 0;
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: currentColor;
}

.task-dot-top {
  top: 3rpx;
}

.task-dot-bottom {
  top: 21rpx;
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

@keyframes activeTabLift {
  0% {
    transform: translateY(2rpx) scale(0.96);
  }
  100% {
    transform: translateY(-4rpx) scale(1.01);
  }
}
</style>
