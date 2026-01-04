<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UserInfo } from '@/common/apis/accountApi'
import { useAccountStore } from '@/store/accountStore'
import commonApi from '@/common/apis/commonApi'

interface Props {
  user: UserInfo
}

const props = defineProps<Props>()

const accountStore = useAccountStore()

// 编辑模式
const isEditing = ref(false)
const loading = ref(false)

// 编辑表单数据
const editForm = ref({
  avatar: props.user.avatar || '',
  nickname: props.user.nickname || '',
  username: props.user.username || '',
  email: props.user.email || ''
})

// 当前显示的头像
const currentAvatar = computed(() => {
  return editForm.value.avatar || props.user.avatar || '/static/logo.png'
})

// 格式化状态文本
const getStateText = (state: string) => {
  return state === '1' ? '正常' : '禁用'
}

// 格式化状态颜色
const getStateColor = (state: string) => {
  return state === '1' ? '#52c41a' : '#ff4d4f'
}

// 点击头像上传
const handleAvatarClick = () => {
  if (!isEditing.value) {
    startEdit()
    return
  }
  
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0]
      loading.value = true
      
      try {
        const uploadRes = await commonApi.uploadFile(tempFilePath)
        if (uploadRes.isSuccess && uploadRes.data) {
          editForm.value.avatar = uploadRes.data.url
          uni.showToast({
            title: '头像上传成功',
            icon: 'success'
          })
        } else {
          uni.showToast({
            title: uploadRes.message || '上传失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('上传头像失败:', error)
        uni.showToast({
          title: '上传失败，请重试',
          icon: 'none'
        })
      } finally {
        loading.value = false
      }
    },
    fail: (error) => {
      console.error('选择图片失败:', error)
    }
  })
}

// 开始编辑
const startEdit = () => {
  isEditing.value = true
  editForm.value = {
    avatar: props.user.avatar || '',
    nickname: props.user.nickname || '',
    username: props.user.username || '',
    email: props.user.email || ''
  }
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
  editForm.value = {
    avatar: props.user.avatar || '',
    nickname: props.user.nickname || '',
    username: props.user.username || '',
    email: props.user.email || ''
  }
}

// 验证用户名格式（只能包含字母、数字、下划线）
const validateUsername = (username: string): boolean => {
  if (!username) return false
  const usernamePattern = /^[a-zA-Z0-9_]+$/
  return usernamePattern.test(username.trim())
}

// 验证邮箱格式
const validateEmail = (email: string): boolean => {
  if (!email) return false
  const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
  return emailPattern.test(email.trim())
}

// 保存更新
const handleSave = async () => {
  // 检查必填字段
  if (!editForm.value.avatar || !editForm.value.nickname || !editForm.value.username || !editForm.value.email) {
    uni.showToast({
      title: '请填写完整信息',
      icon: 'none'
    })
    return
  }

  // 验证用户名格式
  if (!validateUsername(editForm.value.username)) {
    uni.showToast({
      title: '用户名只能包含字母、数字和下划线',
      icon: 'none'
    })
    return
  }

  // 验证邮箱格式
  if (!validateEmail(editForm.value.email)) {
    uni.showToast({
      title: '邮箱格式不正确',
      icon: 'none'
    })
    return
  }

  loading.value = true
  try {
    const success = await accountStore.updateUserInfo({
      avatar: editForm.value.avatar,
      nickname: editForm.value.nickname,
      username: editForm.value.username.trim(),
      email: editForm.value.email.trim()
    })

    if (success) {
      uni.showToast({
        title: '更新成功',
        icon: 'success'
      })
      isEditing.value = false
    } else {
      uni.showToast({
        title: '更新失败，请重试',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    uni.showToast({
      title: '更新失败，请重试',
      icon: 'none'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="info-card card-animate" :style="{ animationDelay: '0.1s' }">
    <view class="card-header">
      <text class="card-title">个人信息</text>
    </view>
    
    <view class="card-body">
      <view class="avatar-section">
        <view class="avatar-wrapper" @click="handleAvatarClick">
          <image
            class="avatar"
            :src="currentAvatar"
            mode="aspectFill"
          />
          <view v-if="isEditing" class="avatar-mask">
            <text class="avatar-edit-icon">📷</text>
            <text class="avatar-edit-text">点击更换</text>
          </view>
          <view v-else class="avatar-edit-hint">
            <text class="avatar-hint-text">点击编辑</text>
          </view>
        </view>
      </view>

      <view class="user-name-section">
        <view class="name-item">
          <text class="name-label">昵称</text>
          <input
            v-if="isEditing"
            v-model="editForm.nickname"
            class="name-input"
            placeholder="请输入昵称"
            :disabled="loading"
          />
          <text v-else class="name-value">{{ props.user.nickname || '-' }}</text>
        </view>
        <view class="name-item">
          <text class="name-label">用户名</text>
          <input
            v-if="isEditing"
            v-model="editForm.username"
            class="name-input"
            placeholder="请输入用户名"
            :disabled="loading"
          />
          <text v-else class="name-value">{{ props.user.username || '-' }}</text>
          <text class="name-desc">（可用于登录管理后台）</text>
        </view>
      </view>

      <view class="info-grid">
        <view class="info-item">
          <text class="info-label">手机号</text>
          <text class="info-value">{{ props.user.phone || '-' }}</text>
          <text class="info-desc">（可用于登录管理后台）</text>
        </view>

        <view class="info-item">
          <text class="info-label">邮箱</text>
          <input
            v-if="isEditing"
            v-model="editForm.email"
            class="info-input"
            type="email"
            placeholder="请输入邮箱"
            :disabled="loading"
          />
          <text v-else class="info-value">{{ props.user.email || '-' }}</text>
        </view>

        <view class="info-item">
          <text class="info-label">账户状态</text>
          <view class="info-value">
            <text 
              class="state-tag" 
              :style="{ color: getStateColor(props.user.state) }"
            >
              {{ getStateText(props.user.state) }}
            </text>
          </view>
        </view>

        <view class="info-item">
          <text class="info-label">账户类型</text>
          <view class="info-value">
            <text 
              class="type-tag" 
              :class="{ 'superuser': props.user.isSuperuser }"
            >
              {{ props.user.isSuperuser ? '超级管理员' : '普通用户' }}
            </text>
          </view>
        </view>
      </view>

      <!-- 编辑操作按钮 -->
      <view v-if="isEditing" class="edit-actions">
        <view class="action-btn cancel-btn" @click="cancelEdit" :class="{ 'disabled': loading }">
          <text class="btn-text">取消</text>
        </view>
        <view class="action-btn save-btn" @click="handleSave" :class="{ 'disabled': loading, 'loading': loading }">
          <text v-if="loading" class="btn-text">保存中...</text>
          <text v-else class="btn-text">保存</text>
        </view>
      </view>
      <view v-else class="edit-trigger">
        <view class="edit-btn" @click="startEdit">
          <text class="edit-btn-text">编辑信息</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* 信息卡片 */
.info-card {
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 30rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.03);
}

/* 卡片进入动画 */
.card-animate {
  opacity: 0;
  transform: translateY(40rpx);
  animation: cardSlideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes cardSlideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  background: #1d1d1f;
  padding: 32rpx;
  position: relative;
  overflow: hidden;
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
  position: relative;
  z-index: 1;
  letter-spacing: 1rpx;
}

.card-body {
  padding: 40rpx 30rpx;
}

/* 头像区域 */
.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 30rpx;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
}

.avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  border: 4rpx solid #f0f0f0;
  background-color: #f5f5f7;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
  animation: avatarZoom 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.avatar-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 160rpx;
  height: 160rpx;
  border-radius: 80rpx;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.avatar-edit-icon {
  font-size: 40rpx;
}

.avatar-edit-text {
  font-size: 20rpx;
  color: #fff;
}

.avatar-edit-hint {
  position: absolute;
  bottom: -40rpx;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

.avatar-hint-text {
  font-size: 22rpx;
  color: #86868b;
}

@keyframes avatarZoom {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  60% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 用户名昵称区域 */
.user-name-section {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-bottom: 30rpx;
  padding: 0 10rpx;
}

.name-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.name-label {
  font-size: 24rpx;
  color: #86868b;
  font-weight: 500;
}

.name-value {
  font-size: 32rpx;
  color: #1d1d1f;
  font-weight: 600;
  letter-spacing: 0.5rpx;
}

.name-desc {
  font-size: 22rpx;
  color: #86868b;
  margin-top: 8rpx;
}

.name-input {
  font-size: 32rpx;
  color: #1d1d1f;
  font-weight: 600;
  letter-spacing: 0.5rpx;
  padding: 12rpx 0;
  border-bottom: 2rpx solid #e5e5e5;
  
  &:focus {
    border-bottom-color: #667eea;
  }
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30rpx 20rpx;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  animation: itemFadeIn 0.5s ease-in-out backwards;
  
  @for $i from 1 through 4 {
    &:nth-child(#{$i}) {
      animation-delay: #{0.1 + $i * 0.05}s;
    }
  }
}

@keyframes itemFadeIn {
  from {
    opacity: 0;
    transform: translateX(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.info-label {
  font-size: 24rpx;
  color: #86868b;
  font-weight: 500;
}

.info-value {
  font-size: 28rpx;
  color: #1d1d1f;
  font-weight: 500;
}

.info-desc {
  font-size: 22rpx;
  color: #86868b;
  margin-top: 8rpx;
}

.info-input {
  font-size: 28rpx;
  color: #1d1d1f;
  font-weight: 500;
  padding: 12rpx 0;
  border-bottom: 2rpx solid #e5e5e5;
  
  &:focus {
    border-bottom-color: #667eea;
  }
}

.state-tag,
.type-tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  background: #f5f5f7;
  font-weight: 500;
  
  &.superuser {
    background: #ffd700;
    color: #1d1d1f;
    font-weight: 600;
  }
}

/* 编辑操作区域 */
.edit-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
  padding-top: 30rpx;
  border-top: 2rpx solid #f0f0f0;
}

.action-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  text-align: center;
  transition: all 0.3s ease;
  
  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }
  
  &:active:not(.disabled) {
    transform: scale(0.98);
  }
}

.cancel-btn {
  background: #f5f5f7;
  
  .btn-text {
    font-size: 28rpx;
    color: #86868b;
    font-weight: 500;
  }
}

.save-btn {
  background: #1d1d1f;
  
  .btn-text {
    font-size: 28rpx;
    color: #fff;
    font-weight: 600;
  }
  
  &.loading {
    background: #86868b;
  }
}

.edit-trigger {
  margin-top: 30rpx;
  padding-top: 30rpx;
  border-top: 2rpx solid #f0f0f0;
}

.edit-btn {
  padding: 24rpx;
  background: #1d1d1f;
  border-radius: 16rpx;
  text-align: center;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
    opacity: 0.9;
  }
}

.edit-btn-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}
</style>

