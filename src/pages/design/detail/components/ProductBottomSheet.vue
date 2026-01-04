<script setup lang="ts">
import {ref, computed, watch} from "vue";
import type {ProductWithSkusInfo, SkuInfo} from "@/common/apis/designProductApi";

interface Props {
  /** 是否显示 */
  visible: boolean
  /** 产品信息 */
  product?: ProductWithSkusInfo
}

const props = withDefaults(defineProps<Props>(), {
  visible: false
});

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'close': []
  'selectSku': [sku: SkuInfo]
}>();

// 选中的 SKU
const selectedSku = ref<SkuInfo | null>(null);

// 是否显示遮罩
const showMask = computed(() => props.visible);

// 关闭 bottomSheet
const close = () => {
  emit('update:visible', false);
  emit('close');
};

// 点击遮罩关闭
const handleMaskClick = () => {
  close();
};

// 选择 SKU
const handleSelectSku = (sku: SkuInfo) => {
  selectedSku.value = sku;
};

// 确认购买
const handleConfirm = () => {
  if (!selectedSku.value) {
    uni.showToast({
      title: '请选择授权方案',
      icon: 'none'
    });
    return;
  }
  emit('selectSku', selectedSku.value);
  close();
};

// 监听 visible 变化，重置选中状态
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    selectedSku.value = null;
  }
});

// 格式化价格
const formatPrice = (price: number) => {
  return `¥${price.toFixed(2)}`;
};

// 检查 SKU 是否可用（-1 表示无限库存）
const isSkuAvailable = (sku: SkuInfo) => {
  return sku.isEnabled && (sku.stock === -1 || sku.stock > 0);
};

// 检查 SKU 是否售罄
const isSkuSoldOut = (sku: SkuInfo) => {
  return !sku.isEnabled || (sku.stock !== -1 && sku.stock <= 0);
};
</script>

<template>
  <view v-if="showMask" class="bottom-sheet-mask" @click="handleMaskClick">
    <view class="bottom-sheet-container" @click.stop>
      <!-- 顶部拖拽指示器 -->
      <view class="drag-indicator" @click="close"></view>

      <!-- 产品信息 -->
      <view v-if="product" class="product-header">
        <view class="product-title-row">
          <text class="product-name">{{ product.name }}</text>
        </view>
        <view v-if="product.description" class="product-description line-clamp">
          <text>{{ product.description }}</text>
        </view>
      </view>

      <!-- SKU 列表 -->
      <view class="sku-section">
        <view class="section-title">
          <text class="title-text">选择授权方案</text>
        </view>
        <view class="sku-list">
          <view
              v-for="sku in product?.skus"
              :key="sku.id"
              class="sku-item"
              :class="{ 'selected': selectedSku?.id === sku.id, 'disabled': !isSkuAvailable(sku) }"
              @click="handleSelectSku(sku)"
          >
            <view class="sku-info">
              <text class="sku-name">{{ sku.name }}</text>
              <view class="sku-price-row">
                <text class="sku-price">{{ formatPrice(sku.price) }}</text>
                <text v-if="sku.originalPrice && sku.originalPrice > sku.price" class="sku-original-price">
                  {{ formatPrice(sku.originalPrice) }}
                </text>
              </view>
            </view>
            <view class="sku-status">
              <view v-if="selectedSku?.id === sku.id" class="check-icon">✓</view>
              <text v-if="isSkuSoldOut(sku)" class="status-text">已售罄</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作栏 -->
      <view class="bottom-actions">
        <view class="price-info">
          <text v-if="selectedSku" class="total-price">
            合计：
            <text class="price-value">{{ formatPrice(selectedSku.price) }}</text>
          </text>
          <text v-else class="price-hint">请选择授权方案</text>
        </view>
        <view class="confirm-btn" :class="{ 'disabled': !selectedSku }" @click="handleConfirm">
          <text class="btn-text">立即购买</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.line-clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4; /* 行數 */
  overflow: hidden;
  word-break: break-all;
}

.bottom-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.bottom-sheet-container {
  width: 100%;
  max-height: 80vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
  overflow: hidden;
  position: relative;
  z-index: 10000;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.drag-indicator {
  width: 80rpx;
  height: 8rpx;
  background: #d1d1d6;
  border-radius: 4rpx;
  margin: 16rpx auto;
  cursor: pointer;
}

.product-header {
  padding: 32rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.05);
}

.product-title-row {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.product-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #1d1d1f;
}

.product-subtitle {
  font-size: 28rpx;
  color: #86868b;
}

.product-description {
  font-size: 26rpx;
  color: #424245;
  line-height: 1.6;
}

.sku-section {
  flex: 1;
  overflow-y: auto;
  padding: 32rpx;
}

.section-title {
  margin-bottom: 24rpx;

  .title-text {
    font-size: 32rpx;
    font-weight: 700;
    color: #1d1d1f;
  }
}

.sku-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.sku-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #f5f5f7;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &.selected {
    background: #f0f0ff;
    border-color: #1d1d1f;
  }

  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  &:active {
    background: #ebebef;
  }
}

.sku-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.sku-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1d1d1f;
}

.sku-price-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.sku-price {
  font-size: 32rpx;
  font-weight: 700;
  color: #1d1d1f;
}

.sku-original-price {
  font-size: 24rpx;
  color: #86868b;
  text-decoration: line-through;
}

.sku-status {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.check-icon {
  width: 40rpx;
  height: 40rpx;
  background: #1d1d1f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
}

.status-text {
  font-size: 24rpx;
  color: #86868b;
}

.bottom-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  background: #fff;
  gap: 24rpx;
}

.price-info {
  flex: 1;
}

.total-price {
  font-size: 28rpx;
  color: #424245;

  .price-value {
    font-size: 36rpx;
    font-weight: 700;
    color: #1d1d1f;
  }
}

.price-hint {
  font-size: 28rpx;
  color: #86868b;
}

.confirm-btn {
  padding: 20rpx 48rpx;
  background: #1d1d1f;
  border-radius: 100rpx;
  min-width: 200rpx;

  &.disabled {
    background: #d1d1d6;
    pointer-events: none;
  }

  .btn-text {
    font-size: 30rpx;
    font-weight: 600;
    color: #fff;
  }
}
</style>

