<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import accountApi from "@/common/apis/accountApi";
import MaintenanceMask from "@/common/components/MaintenanceMask.vue";
import miniPromptHelper from "@/common/helper/miniPromptHelper";
import { useAccountStore } from "@/store/accountStore";

const accountStore = useAccountStore();
const saving = ref(false);
const uploadingAvatar = ref(false);
const localAvatarPreview = ref("");

const form = reactive({
  nickname: "",
  real_name: "",
  email: "",
  avatar_url: "",
  avatar_full_url: "",
  bio: "",
});

const syncForm = () => {
  const user = accountStore.userInfo;
  form.nickname = user?.nickname || "";
  form.real_name = user?.real_name || "";
  form.email = user?.email || "";
  form.avatar_url = user?.avatar_url || "";
  form.avatar_full_url = user?.avatar_full_url || "";
  form.bio = user?.bio || "";
  localAvatarPreview.value = "";
};

const avatarPreviewUrl = computed(() => {
  if (localAvatarPreview.value) {
    return localAvatarPreview.value;
  }
  if (accountApi.canRenderImageUrl(form.avatar_full_url)) {
    return form.avatar_full_url;
  }
  if (accountApi.canRenderImageUrl(form.avatar_url)) {
    return form.avatar_url;
  }
  return "";
});

const chooseAvatar = async () => {
  if (uploadingAvatar.value) {
    return;
  }

  try {
    const result = await uni.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
    });
    const filePath = result.tempFilePaths?.[0] || "";
    if (!filePath) {
      return;
    }

    uploadingAvatar.value = true;
    localAvatarPreview.value = filePath;
    const uploadResult = await accountStore.uploadAvatar(filePath);
    if (!uploadResult.success || !uploadResult.avatarUrl) {
      localAvatarPreview.value = "";
      miniPromptHelper.fail(uploadResult.message || "头像上传失败");
      return;
    }
    form.avatar_url = uploadResult.avatarUrl;
    form.avatar_full_url = uploadResult.avatarFullUrl || "";
    miniPromptHelper.success("头像已上传");
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) {
      miniPromptHelper.fail("头像选择失败");
    }
  } finally {
    uploadingAvatar.value = false;
  }
};

const saveProfile = async () => {
  if (saving.value) {
    return;
  }
  if (form.email.trim() && !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(form.email.trim())) {
    miniPromptHelper.fail("请输入有效邮箱");
    return;
  }

  saving.value = true;
  try {
    const result = await accountStore.updateUserInfo({
      nickname: form.nickname.trim(),
      real_name: form.real_name.trim(),
      email: form.email.trim(),
      avatar_url: form.avatar_url.trim(),
      bio: form.bio.trim(),
    });
    if (!result.success) {
      miniPromptHelper.fail(result.message || "保存失败");
      return;
    }
    syncForm();
    miniPromptHelper.success("资料已保存");
    setTimeout(() => {
      uni.navigateBack();
    }, 450);
  } finally {
    saving.value = false;
  }
};

onShow(async () => {
  if (!accountStore.isLoggedIn) {
    miniPromptHelper.info("请先登录");
    uni.redirectTo({ url: "/pages/login/index" });
    return;
  }
  await accountStore.refreshCurrentUser();
  syncForm();
});
</script>

<template>
  <view class="profile-edit-page">
    <MaintenanceMask />
    <view class="header-card">
      <text class="page-title">个人资料</text>
      <text class="page-desc">头像会上传到服务器，系统只保存头像访问地址。</text>
    </view>

    <view class="form-card">
      <view class="avatar-row">
        <view class="avatar-preview" @click="chooseAvatar">
          <image v-if="avatarPreviewUrl" class="avatar-image" :src="avatarPreviewUrl" mode="aspectFill" />
          <text v-else class="avatar-text">{{ (form.nickname || form.real_name || "用").slice(0, 1) }}</text>
        </view>
        <view class="avatar-copy">
          <text class="avatar-title">头像</text>
          <text class="avatar-desc">{{ uploadingAvatar ? "上传中..." : "点击头像选择图片" }}</text>
        </view>
      </view>

      <label class="field">
        <text class="field-label">昵称</text>
        <input v-model.trim="form.nickname" class="field-input" placeholder="例如：拼豆小王" maxlength="64" />
      </label>

      <label class="field">
        <text class="field-label">真实姓名</text>
        <input v-model.trim="form.real_name" class="field-input" placeholder="可选，仅用于账号识别" maxlength="64" />
      </label>

      <label class="field">
        <text class="field-label">邮箱</text>
        <input v-model.trim="form.email" class="field-input" type="text" placeholder="name@example.com" maxlength="128" />
      </label>

      <label class="field">
        <text class="field-label">个人简介</text>
        <textarea v-model.trim="form.bio" class="bio-input" placeholder="写一句简单介绍" maxlength="500" />
      </label>

      <button class="save-button" :disabled="saving || uploadingAvatar" @click="saveProfile">
        {{ saving ? "保存中..." : "保存资料" }}
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.profile-edit-page {
  min-height: 100vh;
  padding: 28rpx;
  box-sizing: border-box;
  background: #f7fafc;
}

.header-card,
.form-card {
  border-radius: 28rpx;
  background: #ffffff;
  border: 1rpx solid #e5e7eb;
  box-shadow: 0 12rpx 28rpx rgba(31, 41, 55, 0.05);
}

.header-card {
  padding: 30rpx;
  border-top: 8rpx solid #4d96ff;
}

.page-title {
  display: block;
  color: #1f2937;
  font-size: 40rpx;
  font-weight: 800;
  line-height: 1.2;
}

.page-desc {
  display: block;
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 1.6;
}

.form-card {
  margin-top: 22rpx;
  padding: 26rpx;
  display: grid;
  gap: 24rpx;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding-bottom: 22rpx;
  border-bottom: 1rpx solid #e5e7eb;
}

.avatar-preview {
  width: 116rpx;
  height: 116rpx;
  border-radius: 58rpx;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid rgba(77, 150, 255, 0.28);
  background: #e6f4ff;
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-text {
  color: #4d96ff;
  font-size: 44rpx;
  font-weight: 800;
}

.avatar-copy {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.avatar-title,
.field-label {
  color: #1f2937;
  font-size: 25rpx;
  font-weight: 800;
}

.avatar-desc {
  color: #6b7280;
  font-size: 22rpx;
}

.field {
  display: grid;
  gap: 10rpx;
}

.field-input,
.bio-input {
  width: 100%;
  box-sizing: border-box;
  border: 2rpx solid #e5e7eb;
  border-radius: 18rpx;
  background: #f9fafb;
  color: #1f2937;
  font-size: 26rpx;
}

.field-input {
  height: 88rpx;
  padding: 0 22rpx;
}

.bio-input {
  min-height: 154rpx;
  padding: 20rpx 22rpx;
  line-height: 1.6;
}

.save-button {
  height: 90rpx;
  border: none;
  border-radius: 22rpx;
  color: #ffffff;
  font-size: 29rpx;
  font-weight: 800;
  background: #4d96ff;
  box-shadow: 0 14rpx 26rpx rgba(77, 150, 255, 0.22);
}

.save-button[disabled] {
  opacity: 0.62;
}
</style>
