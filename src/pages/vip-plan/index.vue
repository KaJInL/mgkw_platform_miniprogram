<template>
  <view class="vip-plan-page" :class="{ 'page-visible': pageVisible }">
    <!-- 页面标题区域 -->
    <view class="header-section">
      <view class="header-content">
        <view class="title-wrapper">
          <text class="title-main">尊享会员</text>
          <text class="title-sub">EXCLUSIVE MEMBERSHIP</text>
          <view class="title-line"></view>
        </view>
      </view>
    </view>

    <!-- VIP套餐列表 -->
    <view class="content-section">
      <view v-if="loading" class="loading-wrapper">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="dataList.length > 0" class="vip-list">
        <view
          v-for="(item, index) in dataList"
          :key="item.id"
          class="vip-card"
          :class="{ 'is-featured': index === 0 }"
          :style="{ animationDelay: `${index * 0.15}s` }"
        >
          <!-- 推荐标签 -->
          <view class="featured-tag" v-if="index === 0">
            <view class="tag-line"></view>
            <text class="featured-text">RECOMMENDED</text>
            <view class="tag-line"></view>
          </view>

          <!-- 卡片装饰背景 -->
          <view class="card-bg-decoration"></view>

          <!-- 头部区域 -->
          <view class="card-header">
            <view class="header-main">
              <text class="card-title">{{ item.name }}</text>
            </view>
            <text v-if="item.subtitle" class="card-subtitle">{{ item.subtitle }}</text>
            <view class="card-divider" v-if="item.subtitle"></view>
          </view>

          <!-- 价格展示 -->
          <view class="price-section">
            <view class="price-wrapper">
              <text class="price-symbol">¥</text>
              <text class="price-value">{{ formatPrice(item.price || 0) }}</text>
            </view>
            <view class="original-price" v-if="item.originalPrice">
              <text class="original-label">原价</text>
              <text class="original-value">¥{{ formatPrice(item.originalPrice) }}</text>
            </view>
          </view>

          <!-- VIP权益信息 -->
          <view class="features-section">
            <!-- 时长 -->
            <view class="feature-row" v-if="item.vipPlan">
              <view class="feature-dot"></view>
              <text class="feature-text">有效期 {{ item.vipPlan.days }} 天</text>
            </view>
            
            <!-- 描述 -->
            <view class="feature-row" v-if="item.description">
              <view class="feature-dot"></view>
              <text class="feature-text">{{ item.description }}</text>
            </view>

            <!-- 套餐权益（可折叠） -->
            <view class="privilege-block" v-if="item.vipPlan?.privileges" @tap.stop="togglePrivilege(item.id)">
              <view class="privilege-header">
                <view class="privilege-label">
                  <view class="privilege-dot"></view>
                  <text class="privilege-title">套餐权益</text>
                </view>
                <view class="privilege-arrow" :class="{ 'is-expanded': expandedMap[item.id] }">
                  <text class="arrow-icon">→</text>
                </view>
              </view>
              <view class="privilege-content" v-if="expandedMap[item.id]">
                <view class="privilege-divider"></view>
                <rich-text :nodes="item.vipPlan.privileges" class="privilege-rich-text"></rich-text>
              </view>
            </view>
          </view>

          <!-- 购买按钮 -->
          <view class="card-footer">
            <view class="buy-button" @click.stop="handleBuy(item)">
              <text class="buy-text">立即开通</text>
              <view class="buy-underline"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="empty-wrapper">
        <view class="empty-content">
          <text class="empty-text">暂无VIP套餐</text>
          <text class="empty-desc">敬请期待更多优惠活动</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import productApi, { type VipProductInfo } from '@/common/apis/productApi'
import orderApi from '@/common/apis/orderApi'

// ------------------- 状态定义 -------------------

// 列表数据
const dataList = ref<VipProductInfo[]>([])
const loading = ref(false)
// 权益折叠状态映射
const expandedMap = reactive<Record<number, boolean>>({})
// 购买加载状态
const buyingMap = reactive<Record<number, boolean>>({})
// 页面展示状态
const pageVisible = ref(false)

// ------------------- 方法定义 -------------------

// 获取列表
const fetchList = async () => {
  loading.value = true
  try {
    const res = await productApi.queryVipProductList()
    if (!res.isSuccess) {
      uni.showToast({
        title: res.message || '获取列表失败',
        icon: 'none'
      })
      return
    }
    console.log('获取列表成功：', res.data.list)
    // 注意：后端返回的是 { list: VipProductInfo[] } 格式
    dataList.value = res.data?.list || []
  } catch (error) {
    console.error(error)
    uni.showToast({
      title: '系统错误，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}

// 格式化金额
const formatPrice = (price: any) => {
  const num = parseFloat(price)
  return isNaN(num) ? '0' : num % 1 === 0 ? num.toFixed(0) : num.toFixed(2)
}

// 切换权益折叠状态
const togglePrivilege = (id: number) => {
  if (expandedMap[id] === undefined) {
    expandedMap[id] = false
  }
  expandedMap[id] = !expandedMap[id]
}

// 卡片点击事件
const handleCardClick = (item: VipProductInfo) => {
  // 可以在这里添加卡片点击逻辑，例如展开权益详情
}

// 购买按钮点击事件
const handleBuy = async (item: VipProductInfo) => {
  // 防止重复点击
  if (buyingMap[item.id]) {
    return
  }

  // 检查商品是否已发布
  if (!item.isPublished) {
    uni.showToast({
      title: '该商品暂未上架',
      icon: 'none'
    })
    return
  }

  // 检查是否有 SKU 信息
  if (!item.skuId) {
    uni.showToast({
      title: '商品信息异常，请稍后重试',
      icon: 'none'
    })
    return
  }

  try {
    // 设置加载状态
    buyingMap[item.id] = true
    
    // 显示加载提示
    uni.showLoading({
      title: '创建订单中...',
      mask: true
    })

    // 创建订单，使用真实的商品ID和SKU ID
    const res = await orderApi.createOrder({
      productId: item.productId,
      skuId: item.skuId
    })

    // 隐藏加载提示
    uni.hideLoading()

    if (!res.isSuccess || !res.data) {
      uni.showToast({
        title: res.message || '创建订单失败',
        icon: 'none'
      })
      return
    }

    // 创建订单成功，跳转到支付页面
    const orderId = res.data.orderId
    uni.navigateTo({
      url: `/pages/order/order-payment/index?orderId=${orderId}`
    })

  } catch (error) {
    // 隐藏加载提示
    uni.hideLoading()
    console.error('创建订单失败:', error)
    uni.showToast({
      title: '创建订单失败，请重试',
      icon: 'none'
    })
  } finally {
    // 清除加载状态
    buyingMap[item.id] = false
  }
}

// 生命周期
onMounted(() => {
  fetchList()
  // 延迟触发进入动画
  setTimeout(() => {
    pageVisible.value = true
  }, 100)
})
</script>

<style scoped lang="scss">
.vip-plan-page {
  min-height: 100vh;
  background: #ffffff;
  padding-bottom: 80rpx;
  opacity: 0;
  transform: translateY(20rpx);
  transition: opacity 1s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &.page-visible {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 页面标题区域 */
.header-section {
  padding: 80rpx 40rpx 100rpx;
  position: relative;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.02) 0%, transparent 100%);
}

.header-content {
  position: relative;
  z-index: 1;
}

.title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  align-items: flex-start;
}

.title-main {
  font-size: 64rpx;
  font-weight: 300;
  color: #000000;
  letter-spacing: 8rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.title-sub {
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 300;
  letter-spacing: 4rpx;
  text-transform: uppercase;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.title-line {
  width: 60rpx;
  height: 1rpx;
  background: linear-gradient(90deg, #000000 0%, transparent 100%);
  margin-top: 8rpx;
}

/* 内容区域 */
.content-section {
  padding: 0 40rpx;
  position: relative;
  z-index: 2;
}

.loading-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
  gap: 40rpx;
  
  .loading-spinner {
    width: 48rpx;
    height: 48rpx;
    border: 2rpx solid rgba(0, 0, 0, 0.2);
    border-top-color: #000000;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .loading-text {
    font-size: 24rpx;
    color: rgba(0, 0, 0, 0.5);
    font-weight: 300;
    letter-spacing: 2rpx;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* VIP套餐列表 */
.vip-list {
  display: flex;
  flex-direction: column;
  gap: 60rpx;
}

.vip-card {
  position: relative;
  background: #ffffff;
  border: 1rpx solid rgba(0, 0, 0, 0.15);
  border-radius: 0;
  padding: 60rpx 50rpx;
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: hidden;
  animation: slideUp 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) backwards;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
  
  &.is-featured {
    border-color: rgba(0, 0, 0, 0.3);
    background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
    box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.08);
    
    .card-bg-decoration {
      opacity: 0.15;
    }
  }
  
  &:active {
    transform: scale(0.995);
    border-color: rgba(0, 0, 0, 0.4);
  }
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(60rpx); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

.card-bg-decoration {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(0, 0, 0, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.1;
  transition: opacity 0.6s ease;
}

.featured-tag {
  position: absolute;
  top: 50rpx;
  right: 50rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  
  .tag-line {
    width: 30rpx;
    height: 1rpx;
    background: rgba(0, 0, 0, 0.4);
  }
  
  .featured-text {
    color: rgba(0, 0, 0, 0.6);
    font-size: 18rpx;
    font-weight: 300;
    letter-spacing: 4rpx;
    text-transform: uppercase;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
}

/* 卡片头部 */
.card-header {
  margin-bottom: 50rpx;
  padding-right: 120rpx;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 48rpx;
  font-weight: 300;
  color: #000000;
  letter-spacing: 4rpx;
  line-height: 1.4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.card-subtitle {
  font-size: 24rpx;
  color: rgba(0, 0, 0, 0.4);
  display: block;
  font-weight: 300;
  letter-spacing: 1rpx;
  line-height: 1.6;
}

.card-divider {
  width: 40rpx;
  height: 1rpx;
  background: rgba(0, 0, 0, 0.2);
  margin-top: 24rpx;
}

/* 价格展示 */
.price-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 60rpx;
  padding-bottom: 50rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.1);
}

.price-wrapper {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.price-symbol {
  font-size: 36rpx;
  color: #000000;
  font-weight: 300;
  letter-spacing: 2rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.price-value {
  font-size: 80rpx;
  color: #000000;
  font-weight: 200;
  line-height: 1;
  letter-spacing: 2rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.original-price {
  display: flex;
  align-items: center;
  gap: 12rpx;
  
  .original-label {
    font-size: 22rpx;
    color: rgba(0, 0, 0, 0.3);
    font-weight: 300;
  }
  
  .original-value {
    text-decoration: line-through;
    color: rgba(0, 0, 0, 0.3);
    font-size: 28rpx;
    font-weight: 300;
  }
}

/* 权益部分 */
.features-section {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  margin-bottom: 60rpx;
}

.feature-row {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}

.feature-dot {
  width: 6rpx;
  height: 6rpx;
  background: #000000;
  border-radius: 50%;
  margin-top: 12rpx;
  flex-shrink: 0;
}

.feature-text {
  font-size: 28rpx;
  color: rgba(0, 0, 0, 0.7);
  flex: 1;
  line-height: 1.8;
  font-weight: 300;
  letter-spacing: 1rpx;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 套餐权益色块 */
.privilege-block {
  border: 1rpx solid rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  margin-top: 8rpx;
  
  &:active {
    border-color: rgba(0, 0, 0, 0.25);
  }
}

.privilege-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 0;
  transition: all 0.4s ease;
  user-select: none;
}

.privilege-label {
  display: flex;
  align-items: center;
  gap: 20rpx;
  flex: 1;
}

.privilege-dot {
  width: 6rpx;
  height: 6rpx;
  background: #000000;
  border-radius: 50%;
  flex-shrink: 0;
}

.privilege-title {
  font-size: 28rpx;
  font-weight: 300;
  color: rgba(0, 0, 0, 0.9);
  letter-spacing: 2rpx;
}

.privilege-arrow {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  
  .arrow-icon {
    font-size: 28rpx;
    color: rgba(0, 0, 0, 0.6);
    font-weight: 300;
    transform: rotate(-45deg);
  }
  
  &.is-expanded {
    transform: rotate(90deg);
  }
}

.privilege-content {
  padding: 0 0 32rpx;
  animation: expandDown 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.privilege-divider {
  width: 100%;
  height: 1rpx;
  background: rgba(0, 0, 0, 0.1);
  margin-bottom: 32rpx;
}

@keyframes expandDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-20rpx);
  }
  to {
    opacity: 1;
    max-height: 2000rpx;
    transform: translateY(0);
  }
}

.privilege-rich-text {
  font-size: 26rpx;
  color: rgba(0, 0, 0, 0.6);
  line-height: 2;
  word-break: break-all;
  font-weight: 300;
  letter-spacing: 0.5rpx;
}

/* 卡片底部 */
.card-footer {
  margin-top: auto;
}

.buy-button {
  background: transparent;
  border: 1rpx solid rgba(0, 0, 0, 0.4);
  height: 100rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #000000;
  font-size: 28rpx;
  font-weight: 300;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent);
    transition: left 0.6s ease;
  }
  
  &:active {
    border-color: rgba(0, 0, 0, 0.6);
    background: rgba(0, 0, 0, 0.05);
    
    &::before {
      left: 100%;
    }
  }
}

.buy-text {
  letter-spacing: 6rpx;
  text-transform: uppercase;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  position: relative;
  z-index: 1;
}

.buy-underline {
  width: 0;
  height: 1rpx;
  background: #000000;
  margin-top: 8rpx;
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.buy-button:active .buy-underline {
  width: 60rpx;
}

/* 空状态 */
.empty-wrapper {
  padding: 200rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-content {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.empty-text {
  font-size: 32rpx;
  color: rgba(0, 0, 0, 0.4);
  font-weight: 300;
  letter-spacing: 2rpx;
}

.empty-desc {
  font-size: 24rpx;
  color: rgba(0, 0, 0, 0.2);
  font-weight: 300;
  letter-spacing: 1rpx;
}
</style>
