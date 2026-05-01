<script setup lang="ts">
import { computed, ref } from "vue";
import { onHide, onReachBottom, onShow, onPullDownRefresh } from "@dcloudio/uni-app";

import beadPatternApi, { type IBeadPatternRes, type IBeadTaskRes } from "@/common/apis/beadPatternApi";
import BrandTabBar from "@/common/components/BrandTabBar.vue";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import { useAccountStore } from "@/store/accountStore";
import { usePatternStore } from "@/store/patternStore";

const POLL_INTERVAL_MS = 2500;

const accountStore = useAccountStore();
const patternStore = usePatternStore();

const loading = ref(false);
const loadingMore = ref(false);
const taskItems = ref<IBeadTaskRes<IBeadPatternRes>[]>([]);
const currentPage = ref(1);
const pageSize = ref(12);
const hasMore = ref(false);
let pollTimer: ReturnType<typeof setTimeout> | null = null;

const showLoginMask = computed(() => !accountStore.isLoggedIn);
const processingTasks = computed(() => taskItems.value.filter((item) => ["pending", "running"].includes(String(item.status || "").toLowerCase())));

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveStatusText = (status?: string | null) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "success") return "已完成";
  if (normalized === "failed") return "已失败";
  if (normalized === "running") return "处理中";
  return "排队中";
};

const resolveStatusClass = (status?: string | null) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "success") return "status-success";
  if (normalized === "failed") return "status-failed";
  if (normalized === "running") return "status-running";
  return "status-pending";
};

const resolveImageUrl = (item: IBeadTaskRes<IBeadPatternRes>) => {
  if (!item.image_id) {
    return "";
  }
  return beadPatternApi.resolveAssetUrl(`/pindou-generator-backend/media/file/upload/${item.image_id}`);
};

const stopPolling = () => {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
};

const schedulePolling = () => {
  stopPolling();
  if (!processingTasks.value.length) {
    return;
  }
  pollTimer = setTimeout(() => {
    void refreshProcessingTasks();
  }, POLL_INTERVAL_MS);
};

const mergeTask = (nextTask: IBeadTaskRes<IBeadPatternRes>) => {
  const index = taskItems.value.findIndex((item) => item.task_id === nextTask.task_id);
  if (index < 0) {
    return;
  }
  taskItems.value[index] = {
    ...taskItems.value[index],
    ...nextTask,
  };
};

const loadTasks = async (showRefresh: boolean = false) => {
  if (!accountStore.isLoggedIn) {
    stopPolling();
    taskItems.value = [];
    currentPage.value = 1;
    hasMore.value = false;
    if (showRefresh) {
      uni.stopPullDownRefresh();
    }
    return;
  }
  if (loading.value && !showRefresh) {
    return;
  }
  loading.value = true;
  try {
    const response = await beadPatternApi.listTasks({
      page: 1,
      page_size: pageSize.value,
    });
    const data = (response as any).data;
    currentPage.value = data?.page || 1;
    pageSize.value = data?.page_size || pageSize.value;
    hasMore.value = Boolean(data?.has_more);
    taskItems.value = (data?.items || []) as IBeadTaskRes<IBeadPatternRes>[];
    schedulePolling();
  } catch (error) {
    miniPromptHelper.fail("任务列表加载失败");
  } finally {
    loading.value = false;
    if (showRefresh) {
      uni.stopPullDownRefresh();
    }
  }
};

const loadMoreTasks = async () => {
  if (!accountStore.isLoggedIn || loading.value || loadingMore.value || !hasMore.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const nextPage = currentPage.value + 1;
    const response = await beadPatternApi.listTasks({
      page: nextPage,
      page_size: pageSize.value,
    });
    const data = (response as any).data;
    currentPage.value = data?.page || nextPage;
    pageSize.value = data?.page_size || pageSize.value;
    hasMore.value = Boolean(data?.has_more);
    const nextItems = (data?.items || []) as IBeadTaskRes<IBeadPatternRes>[];
    taskItems.value = [...taskItems.value, ...nextItems];
  } catch (error) {
    miniPromptHelper.fail("加载更多失败");
  } finally {
    loadingMore.value = false;
  }
};

const refreshProcessingTasks = async () => {
  if (!processingTasks.value.length) {
    stopPolling();
    return;
  }
  try {
    const responses = await Promise.all(processingTasks.value.map((item) => beadPatternApi.getTask(item.task_id)));
    responses.forEach((response) => {
      const task = (response as any).data as IBeadTaskRes<IBeadPatternRes>;
      if (task?.task_id) {
        mergeTask(task);
      }
    });
  } catch (error) {
    console.error("刷新任务进度失败：", error);
  } finally {
    schedulePolling();
  }
};

const openTask = (item: IBeadTaskRes<IBeadPatternRes>) => {
  if (item.status !== "success" || !item.result) {
    return;
  }
  patternStore.applyPatternResult(item.result);
  uni.navigateTo({
    url: "/pages/pattern/index",
  });
};

const goLogin = () => {
  uni.navigateTo({
    url: "/pages/login/index",
  });
};

onShow(() => {
  void loadTasks();
});

onHide(() => {
  stopPolling();
});

onPullDownRefresh(() => {
  void loadTasks(true);
});

onReachBottom(() => {
  void loadMoreTasks();
});
</script>

<template>
  <view class="task-page">
    <MaintenanceMask />
    <view class="page-aurora page-aurora-pink" />
    <view class="page-aurora page-aurora-blue" />
    <view class="page-aurora page-aurora-yellow" />

    <view class="hero-card">
      <view class="hero-copy">
        <text class="hero-eyebrow">Task Queue</text>
        <text class="hero-title">生图任务</text>
        <text class="hero-desc">查看已提交的生图任务。处理中任务会自动刷新进度，完成后可进入详情页并选择下载带色号或无色号图纸。</text>
      </view>
      <view class="hero-strip">
        <view class="hero-stat hero-stat-pink">
          <text class="hero-stat-value">{{ processingTasks.length }}</text>
          <text class="hero-stat-label">处理中</text>
        </view>
        <view class="hero-stat hero-stat-blue">
          <text class="hero-stat-value">{{ taskItems.length }}</text>
          <text class="hero-stat-label">当前列表</text>
        </view>
      </view>
    </view>

    <view class="task-content">
      <view v-if="!taskItems.length && !loading" class="empty-card">
        <text class="empty-title">还没有任务</text>
        <text class="empty-desc">去首页提交一张图片后，这里会自动按时间倒序展示。</text>
      </view>

      <view class="task-grid">
        <view v-for="item in taskItems" :key="item.task_id" class="task-card" :class="{ clickable: item.status === 'success' }" @click="openTask(item)">
          <view class="task-image-wrap">
            <image v-if="resolveImageUrl(item)" :src="resolveImageUrl(item)" class="task-image" mode="aspectFill" />
            <view v-else class="task-image task-image-empty">
              <text class="task-image-empty-text">暂无原图</text>
            </view>
            <view class="task-image-overlay">
              <text class="task-time">{{ formatDateTime(item.created_at) }}</text>
              <text class="task-status" :class="resolveStatusClass(item.status)">{{ resolveStatusText(item.status) }}</text>
            </view>
          </view>

          <view class="task-body">
            <view class="task-head">
              <text class="task-name">{{ item.status === "success" ? "图纸已就绪" : "图纸生成中" }}</text>
              <text class="task-progress-text">{{ Math.max(0, Math.min(100, Number(item.progress || 0))) }}%</text>
            </view>
            <text class="task-subtitle">{{ item.message || "等待处理" }}</text>

            <view class="task-progress-row">
              <view class="task-progress-track">
                <view class="task-progress-fill" :style="{ width: `${Math.max(0, Math.min(100, Number(item.progress || 0)))}%` }" />
              </view>
            </view>

            <text class="task-tip">{{ item.status === "success" ? "生成好了，点进去选下载版本" : "后台队列处理中" }}</text>
          </view>
        </view>
      </view>

      <view v-if="taskItems.length > 0" class="load-more-bar">
        <text v-if="loadingMore" class="load-more-text">加载更多中...</text>
        <text v-else-if="hasMore" class="load-more-text">上拉加载更多</text>
        <text v-else class="load-more-text">没有更多任务了</text>
      </view>

      <view v-if="showLoginMask" class="login-mask">
        <view class="login-mask-card">
          <text class="login-mask-badge">登录后可见</text>
          <text class="login-mask-title">需要登录才能访问这个页面</text>
          <text class="login-mask-desc">登录后可以查看你的生图任务记录、处理进度和已完成结果。</text>
          <button class="login-mask-button" @click="goLogin">去登录</button>
        </view>
      </view>
    </view>

    <BrandTabBar />
  </view>
</template>

<style scoped lang="scss">
.task-page {
  position: relative;
  min-height: 100vh;
  padding: 24rpx 24rpx 180rpx;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fff6fb 0%, #ffffff 34%, #f7fafc 100%);
  overflow: hidden;
}

.page-aurora {
  position: absolute;
  border-radius: 9999rpx;
  filter: blur(60rpx);
  opacity: 0.5;
  pointer-events: none;
}

.page-aurora-pink {
  top: 40rpx;
  right: -60rpx;
  width: 260rpx;
  height: 260rpx;
  background: rgba(255, 77, 141, 0.18);
}

.page-aurora-blue {
  top: 320rpx;
  left: -80rpx;
  width: 280rpx;
  height: 280rpx;
  background: rgba(77, 150, 255, 0.16);
}

.page-aurora-yellow {
  top: 720rpx;
  right: -60rpx;
  width: 240rpx;
  height: 240rpx;
  background: rgba(255, 214, 10, 0.16);
}

.load-more-bar {
  display: flex;
  justify-content: center;
  padding: 24rpx 0 8rpx;
}

.load-more-text {
  color: #94a3b8;
  font-size: 24rpx;
}

.hero-card {
  padding: 34rpx 30rpx;
  border-radius: 32rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.28), transparent 28%),
    linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  box-shadow: 0 24rpx 56rpx rgba(77, 150, 255, 0.14);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
  margin-top: 18rpx;
}

.task-content {
  position: relative;
  min-height: 520rpx;
}

.hero-eyebrow {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.92);
  font-size: 20rpx;
  font-weight: 700;
}

.hero-title {
  display: block;
  margin-top: 16rpx;
  color: #ffffff;
  font-size: 54rpx;
  font-weight: 700;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.92);
  font-size: 24rpx;
  line-height: 1.7;
}

.hero-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16rpx;
  margin-top: 24rpx;
}

.hero-stat {
  padding: 20rpx 22rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.18);
}

.hero-stat-pink {
  background: rgba(255, 240, 246, 0.18);
}

.hero-stat-blue {
  background: rgba(230, 244, 255, 0.18);
}

.hero-stat-value {
  display: block;
  color: #ffffff;
  font-size: 34rpx;
  font-weight: 700;
}

.hero-stat-label {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 22rpx;
}

.empty-card {
  margin-top: 20rpx;
  padding: 40rpx 30rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 22rpx 54rpx rgba(31, 41, 55, 0.08);
  text-align: center;
}

.empty-title {
  color: #1f2937;
  font-size: 30rpx;
  font-weight: 800;
}

.empty-desc {
  display: block;
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}

.task-card {
  overflow: hidden;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 22rpx 54rpx rgba(31, 41, 55, 0.08);
}

.task-card.clickable {
  transform: translateZ(0);
}

.task-image-wrap {
  position: relative;
  padding: 18rpx 18rpx 0;
}

.task-image {
  width: 100%;
  height: 240rpx;
  border-radius: 24rpx;
  background: #eef2f7;
}

.task-image-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-image-overlay {
  position: absolute;
  left: 34rpx;
  right: 34rpx;
  bottom: 18rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.task-time {
  display: inline-flex;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.84);
  color: #4b5563;
  font-size: 20rpx;
}

.task-status {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
  color: #ffffff;
}

.status-success {
  background: #52d681;
}

.status-failed {
  background: #ff4d6d;
}

.status-running,
.status-pending {
  background: #4d96ff;
}

.task-body {
  padding: 20rpx 22rpx 24rpx;
}

.task-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.task-name {
  color: #1f2937;
  font-size: 28rpx;
  font-weight: 700;
}

.task-subtitle {
  display: block;
  margin-top: 10rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.6;
}

.task-progress-row {
  margin-top: 16rpx;
}

.task-progress-track {
  height: 14rpx;
  border-radius: 999rpx;
  background: #e5edf7;
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
}

.task-progress-text {
  color: #4d96ff;
  font-size: 22rpx;
  font-weight: 700;
}

.task-image-empty-text {
  color: #9ca3af;
  font-size: 22rpx;
}

.task-tip {
  display: block;
  margin-top: 14rpx;
  color: #9ca3af;
  font-size: 22rpx;
}

.login-mask {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16rpx);
}

.login-mask-card {
  width: 100%;
  max-width: 560rpx;
  padding: 44rpx 36rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 20rpx 44rpx rgba(77, 150, 255, 0.14);
  text-align: center;
}

.login-mask-badge {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(77, 150, 255, 0.12);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.login-mask-title {
  display: block;
  margin-top: 20rpx;
  color: #1f2937;
  font-size: 34rpx;
  font-weight: 800;
}

.login-mask-desc {
  display: block;
  margin-top: 14rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}

.login-mask-button {
  margin-top: 28rpx;
  height: 88rpx;
  line-height: 88rpx;
  border: none;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #ff4d8d 0%, #4d96ff 100%);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: 0 16rpx 30rpx rgba(77, 150, 255, 0.2);
}

@media (max-width: 640rpx) {
  .task-grid {
    grid-template-columns: 1fr;
  }
}
</style>
