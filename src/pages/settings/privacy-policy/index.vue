<template>
  <view class="doc-page">
    <view class="doc-card">
      <text class="doc-title">隐私政策</text>
      <text class="doc-sub">当前为静态页面展示版</text>

      <view class="doc-section">
        <text class="sec-title">一、信息使用范围</text>
        <text class="sec-text">
          当前版本仅用于页面表现与交互验证，不采集或上传真实业务数据。
        </text>
      </view>

      <view class="doc-section">
        <text class="sec-title">二、数据安全说明</text>
        <text class="sec-text">
          后续接入正式接口后，将补充数据存储、访问控制、传输加密等具体安全策略。
        </text>
      </view>

      <view class="doc-section">
        <text class="sec-title">三、用户权利</text>
        <text class="sec-text">
          用户可在正式上线后通过设置页面查看、更新、删除相关信息并撤回授权。
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
