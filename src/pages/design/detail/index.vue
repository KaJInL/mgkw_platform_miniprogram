<script setup lang="ts">
import {onLoad} from "@dcloudio/uni-app";
import {ref, computed} from "vue";
import designProductApi from "@/common/apis/designProductApi";
import type {DesignInfo as DesignInfoRes, ProductWithSkusInfo, SkuInfo} from "@/common/apis/designProductApi";
import {useCategoryStore} from "@/store/categoryStore";
import orderApi from "@/common/apis/orderApi";
import LoadingState from "./components/LoadingState.vue";
import EmptyState from "./components/EmptyState.vue";
import ResourceLink from "./components/ResourceLink.vue";
import Model3DPreview from "./components/Model3DPreview.vue";
import RichTextDetail from "./components/RichTextDetail.vue";
import ImageGallery from "./components/ImageGallery.vue";
import DesignInfo from "@/pages/design/detail/components/DesignInfo.vue";
import ProductBottomSheet from "./components/ProductBottomSheet.vue";
import {SysConfKeyEnum, useSysConfStore} from "@/store/sysConfStore";

// 设计作品详情
const designDetail = ref<DesignInfoRes | null>(null);
// 产品信息
const productInfo = ref<ProductWithSkusInfo | null>(null);
// 是否有权限查看完整详情
const hasPermission = ref(false);
// 加载状态
const loading = ref(true);
// bottomSheet 显示状态
const showBottomSheet = ref(false);
// 分类和系列 Store
const categoryStore = useCategoryStore();

/**
 * 获取类目名称
 */
const categoryName = computed(() => {
  if (!designDetail.value?.categoryId) return '';
  const category = categoryStore.categoryList.find(c => c.id === designDetail.value?.categoryId);
  return category?.name || '';
});

/**
 * 获取系列名称
 */
const seriesName = computed(() => {
  if (!designDetail.value?.seriesId) return '';
  const series = categoryStore.seriesList.find(s => s.id === designDetail.value?.seriesId);
  return series?.name || '';
});

/**
 * 获取设计作品详情
 */
const fetchDesignDetail = async (designId: number) => {
  try {
    loading.value = true;
    const res = await designProductApi.getDesignProductDetail({designId});
    if (res.data) {
      hasPermission.value = res.data.hasPermission || false;
      if (res.data.design) {
        designDetail.value = res.data.design;
      }
      if (res.data.product) {
        productInfo.value = res.data.product;
      }
    }
  } catch (error) {
    console.error('获取设计作品详情失败:', error);
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

/**
 * 打开购买 bottomSheet
 */
const handleBuy = () => {
  if (!productInfo.value) {
    uni.showToast({
      title: '商品信息加载中',
      icon: 'none'
    });
    return;
  }
  showBottomSheet.value = true;
};

/**
 * 选择 SKU 后的处理 - 创建订单并跳转到支付页面
 */
const handleSelectSku = async (sku: SkuInfo) => {
  try {
    // 显示加载提示
    uni.showLoading({
      title: '创建订单中...',
      mask: true
    });

    // 调用创建订单API
    const res = await orderApi.createOrder({
      productId: String(sku.productId),
      skuId: String(sku.id)
    });

    // 隐藏加载提示
    uni.hideLoading();

    // 检查响应
    if (res.isSuccess && res.data.orderId) {
      // 创建订单成功，跳转到支付页面
      uni.navigateTo({
        url: `/pages/order/order-payment/index?orderId=${res.data.orderId}`
      });
      return
    }
      // 创建订单失败
      uni.showToast({
        title: res.message || '创建订单失败，请重试',
        icon: 'none',
        duration: 2000
      });
  } catch (error) {
    // 隐藏加载提示
    uni.hideLoading();
    console.error('创建订单失败:', error);
    uni.showToast({
      title: '创建订单失败，请重试',
      icon: 'none',
      duration: 2000
    });
  }
};


const confStore = useSysConfStore()
const logo = confStore.getConf(SysConfKeyEnum.LOGO)

function onShareAppMessage(res: any) {
  return {
    title: "美工开物小程序",
    path: "/pages/recommend/index",
    imageUrl: logo ?? ""
  }
}

function onShareTimeline(res: any) {
  return {
    title: designDetail.value?.title ?? "美工开物小程序",
    path: "pages/design/detail/index?id=" + String(designDetail.value?.productId ?? 1),
    imageUrl: designDetail.value!.images[0]!!
  }
}

onLoad((options ) => {

  // 初始化分类和系列数据
  if (categoryStore.categoryList.length === 0) {
    categoryStore.getCategoryList();
  }
  if (categoryStore.seriesList.length === 0) {
    categoryStore.getSeriesList();
  }

  if (options!!.id) {
    const designId = Number(options!!.id);
    if (!isNaN(designId)) {
      fetchDesignDetail(designId);
    } else {
      uni.showToast({
        title: '参数错误',
        icon: 'none'
      });
    }
  } else {
    uni.showToast({
      title: '缺少必要参数',
      icon: 'none'
    });
  }
});
</script>

<template>
  <view class="design-detail-page">
    <!-- 加载中 -->
    <LoadingState v-if="loading" />

    <!-- 详情内容 -->
    <view v-else-if="designDetail" class="detail-content">
      <!-- 作品信息 -->
      <DesignInfo
        :design="designDetail"
        :categoryName="categoryName"
        :seriesName="seriesName"
      />

      <!-- 资源链接 -->
      <ResourceLink
        v-if="designDetail.hasResourceUrl || designDetail.resourceUrl"
        :resourceUrl="designDetail.resourceUrl || ''"
        :hasPermission="hasPermission"
      />

      <!-- 3D模型预览（bottomSheet显示时隐藏，避免层级冲突） -->
      <Model3DPreview
        v-if="designDetail.model3DUrl && !showBottomSheet"
        :modelUrl="designDetail.model3DUrl"
      />

      <!-- 作品详情（富文本） -->
      <RichTextDetail
        v-if="designDetail.hasDetail || designDetail.detail"
        :detail="designDetail.detail || ''"
        :hasPermission="hasPermission"
      />

      <!-- 图片列表 -->
      <ImageGallery :images="designDetail.images" />
    </view>

    <!-- 空状态 -->
    <EmptyState v-else />

    <!-- 底部购买按钮（无权限时显示） -->
    <view v-if="!loading && designDetail && !hasPermission && productInfo" class="bottom-buy-bar">
      <view class="buy-btn" @click="handleBuy">
        <text class="buy-btn-text">立即购买</text>
      </view>
    </view>

    <!-- 产品选择 bottomSheet -->
    <ProductBottomSheet
      v-model:visible="showBottomSheet"
      :product="productInfo"
      @select-sku="handleSelectSku"
    />
  </view>
</template>

<style scoped lang="scss">
.design-detail-page {
  min-height: 100vh;
  background-color: #fbfbfd;
}

.detail-content {
  min-height: 100vh;
  background-color: #fbfbfd;
  padding-bottom: 120rpx; /* 为底部购买按钮留出空间 */
}

.bottom-buy-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.buy-btn {
  width: 100%;
  padding: 24rpx;
  background: #1d1d1f;
  border-radius: 100rpx;
  text-align: center;
  box-sizing: border-box;

  .buy-btn-text {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }

  &:active {
    background: #2d2d2f;
  }
}
</style>
