<template>
  <view class="doc-page">
    <view class="doc-card">
      <text class="doc-title">用户协议</text>
      <text class="doc-sub">当前为静态页面展示版</text>

      <view class="doc-section">
        <text class="sec-title">一、协议说明</text>
        <text class="sec-text">
          本页面用于展示登录流程中的协议跳转能力，暂不包含真实业务条款与接口对接逻辑。
        </text>
      </view>

      <view class="doc-section">
        <text class="sec-title">二、账号规范</text>
        <text class="sec-text">
          后续接入正式登录后，平台将补充账号使用规范、权限边界与行为约束条款。
        </text>
      </view>

      <view class="doc-section">
        <text class="sec-title">三、更新说明</text>
        <text class="sec-text">
          协议内容会根据产品迭代进行更新，更新后会在登录与设置页面同步展示。
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.doc-page {
  min-height: 100vh;
  background: #faf9f4;
  padding: 26rpx;
  box-sizing: border-box;
}

.doc-card {
  background: #fff;
  border-radius: 24rpx;
  border: 1rpx solid rgba(128, 118, 104, 0.12);
  box-shadow: 0 8rpx 24rpx rgba(27, 28, 25, 0.04);
  padding: 30rpx;
}

.doc-title {
  display: block;
  font-size: 42rpx;
  font-weight: 600;
  color: #1b1c19;
}

.doc-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #807668;
}

.doc-section {
  margin-top: 24rpx;
}

.sec-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #4e453a;
}

.sec-text {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.8;
  color: #5f5e5b;
}
</style>
