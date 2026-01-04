<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSysConfStore, SysConfKeyEnum } from '@/store/sysConfStore'

const sysConfStore = useSysConfStore()

const loading = ref(false)
const content = ref<string>('')

/**
 * 格式化富文本内容
 */
const formatRichText = (html: string): string => {
  if (!html) return ''
  
  // 移除图片标签的样式和尺寸属性，添加响应式样式
  let formatted = html.replace(/<img[^>]*>/gi, (match) => {
    let cleaned = match
    cleaned = cleaned.replace(/style="[^"]+"/gi, '').replace(/style\s*=\s*(['"])[\s\S]*?\1/ig, '')
    cleaned = cleaned.replace(/width="[^"]+"/gi, '').replace(/width='[^']+'/gi, '')
    cleaned = cleaned.replace(/height="[^"]+"/gi, '').replace(/height='[^']+'/gi, '')
    return cleaned.replace(/<img/gi, '<img style="width:100%;height:auto;display:block;"')
  })
  
  return formatted
}

/**
 * 处理后的富文本内容
 */
const processedContent = computed(() => {
  return formatRichText(content.value)
})

/**
 * 加载用户协议内容
 */
const loadContent = async () => {
  loading.value = true
  try {
    // 先尝试从 store 获取
    await sysConfStore.load()
    const agreement = sysConfStore.getConf(SysConfKeyEnum.USER_AGREEMENT)
    
    if (agreement) {
      content.value = agreement
    } else {
      content.value = '<p style="color: #86868b; padding: 40rpx 0; text-align: center;">暂无用户协议内容</p>'
    }
  } catch (error) {
    console.error('加载用户协议失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
    content.value = '<p style="color: #86868b; padding: 40rpx 0; text-align: center;">加载失败，请稍后重试</p>'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadContent()
})
</script>

<template>
  <view class="user-agreement-page">
    <view v-if="loading" class="loading-wrapper">
      <text class="loading-text">加载中...</text>
    </view>
    <view v-else class="content-wrapper">
      <rich-text class="rich-content" :nodes="processedContent"></rich-text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.user-agreement-page {
  min-height: 100vh;
  background-color: #f5f5f7;
}

.loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
  
  .loading-text {
    font-size: 28rpx;
    color: #86868b;
  }
}

.content-wrapper {
  padding: 48rpx 40rpx;
}

.rich-content {
  font-size: 30rpx;
  line-height: 1.8;
  color: #424245;
  word-break: break-all;
  overflow-x: hidden;
}
</style>

