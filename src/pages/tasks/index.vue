<script setup lang="ts">
import { computed, ref } from "vue";
import { onHide, onShow, onPullDownRefresh } from "@dcloudio/uni-app";

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
const taskItems = ref<IBeadTaskRes<IBeadPatternRes>[]>([]);
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
    const response = await beadPatternApi.listTasks(100);
    const data = (response as any).data;
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
</script>

<template>
  <view class="task-page">
    <MaintenanceMask />
    <view class="page-aurora page-aurora-pink" />
    <view class="page-aurora page-aurora-blue" />

    <view class="hero-card">
      <text class="hero-eyebrow">Task Queue</text>
      <text class="hero-title">生图任务</text>
      <text class="hero-desc">查看已提交的生图任务。处理中任务会自动刷新进度，完成后可直接进入图纸页。</text>
    </view>

    <view class="task-content">
      <view v-if="!taskItems.length && !loading" class="empty-card">
        <text class="empty-title">还没有任务</text>
        <text class="empty-desc">去首页提交一张图片后，这里会自动按时间倒序展示。</text>
      </view>

      <view class="task-grid">
        <view v-for="item in taskItems" :key="item.task_id" class="task-card" :class="{ clickable: item.status === 'success' }" @click="openTask(item)">
          <image v-if="resolveImageUrl(item)" :src="resolveImageUrl(item)" class="task-image" mode="aspectFill" />
          <view v-else class="task-image task-image-empty">
            <text class="task-image-empty-text">暂无原图</text>
          </view>

          <text class="task-subtitle">{{ formatDateTime(item.created_at) }}</text>

          <view class="task-progress-row">
            <view class="task-progress-track">
              <view class="task-progress-fill" :style="{ width: `${Math.max(0, Math.min(100, Number(item.progress || 0)))}%` }" />
            </view>
            <text class="task-progress-text">{{ Math.max(0, Math.min(100, Number(item.progress || 0))) }}%</text>
          </view>

          <view class="task-status-row">
            <text class="task-status" :class="resolveStatusClass(item.status)">{{ resolveStatusText(item.status) }}</text>
          </view>
        </view>
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
  background: linear-gradient(180deg, #fff7fb 0%, #ffffff 32%, #f7fafc 100%);
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
  top: 360rpx;
  left: -80rpx;
  width: 280rpx;
  height: 280rpx;
  background: rgba(77, 150, 255, 0.16);
}

.hero-card,
.task-card,
.empty-card {
  position: relative;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.96);
  border: 1rpx solid rgba(229, 231, 235, 0.9);
  box-shadow: 0 18rpx 42rpx rgba(77, 150, 255, 0.08);
}

.hero-card {
  padding: 28rpx 26rpx;
  background:
    radial-gradient(circle at top right, rgba(255, 214, 10, 0.22), transparent 24%),
    linear-gradient(135deg, rgba(255, 240, 246, 0.98) 0%, rgba(230, 244, 255, 0.98) 100%);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
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
  background: rgba(255, 255, 255, 0.88);
  color: #4d96ff;
  font-size: 20rpx;
  font-weight: 700;
}

.hero-title {
  display: block;
  margin-top: 16rpx;
  color: #1f2937;
  font-size: 42rpx;
  font-weight: 900;
}

.hero-desc {
  display: block;
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.7;
}

.empty-card {
  margin-top: 20rpx;
  padding: 40rpx 30rpx;
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
  padding: 18rpx;
}

.task-card.clickable {
  border-color: rgba(77, 150, 255, 0.18);
}

.task-image {
  width: 100%;
  height: 220rpx;
  border-radius: 22rpx;
  background: #eef2f7;
}

.task-image-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-subtitle {
  display: block;
  margin-top: 16rpx;
  color: #6b7280;
  font-size: 22rpx;
}

.task-status {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 700;
}

.status-success {
  background: rgba(82, 214, 129, 0.16);
  color: #1d8f47;
}

.status-failed {
  background: rgba(255, 77, 109, 0.14);
  color: #d92d54;
}

.status-running,
.status-pending {
  background: rgba(77, 150, 255, 0.12);
  color: #4d96ff;
}

.task-progress-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-top: 16rpx;
}

.task-progress-track {
  flex: 1;
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

.task-status-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14rpx;
}

.task-image-empty-text {
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
  border: 1rpx solid rgba(229, 231, 235, 0.95);
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
</style>
