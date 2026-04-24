<template>
  <view class="settings-page">
    <view class="settings-card">
      <text class="title">设置</text>
      <text class="desc">设置页面占位，后续可接入账号、安全、通知等配置。</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background: #f9f8f6;
  padding: 28rpx;
  box-sizing: border-box;
}

.settings-card {
  background: #fff;
  border-radius: 24rpx;
  border: 1rpx solid rgba(128, 118, 104, 0.1);
  box-shadow: 0 8rpx 24rpx rgba(27, 28, 25, 0.04);
  padding: 32rpx;
}

.title {
  display: block;
  font-size: 42rpx;
  line-height: 1.2;
  font-weight: 600;
  color: #1b1c19;
}

.desc {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.7;
  color: #6b7280;
}
</style>
