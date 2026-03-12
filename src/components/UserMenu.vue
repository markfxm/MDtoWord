<template>
  <div class="user-menu-container">
    <!-- 未登录状态 -->
    <div v-if="!user" class="user-status">
      <div class="quota-info">
        <span class="quota-count">剩余 {{ quota }} 次免费使用</span>
      </div>
      <button class="auth-btn login-btn" @click="openLogin">登录</button>
      <button class="auth-btn vip-btn" @click="openVip">开通会员</button>
    </div>

    <!-- 已登录状态 -->
    <div v-else class="user-status logged-in">
      <div class="user-info" @click="showDropdown = !showDropdown">
        <div class="avatar">
          {{ user.email ? user.email[0].toUpperCase() : 'U' }}
        </div>
        <div class="user-details">
          <div class="user-email">{{ userEmail }}</div>
          <div class="vip-status" :class="{ 'vip-active': isVip }">
            {{ isVip ? '会员有效期至 ' + vipExpireDate : '免费用户' }}
          </div>
        </div>
        <svg class="dropdown-arrow" :class="{ active: showDropdown }" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      <!-- 下拉菜单 -->
      <div v-if="showDropdown" class="dropdown-menu">
        <div class="menu-item quota-display">
          <span>剩余额度：</span>
          <span class="quota-number">{{ isVip ? '无限' : quota + ' 次' }}</span>
        </div>
        <div v-if="!isVip" class="menu-item vip-upgrade" @click="openVip">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          开通会员
        </div>
        <div class="menu-item" @click="handleLogout">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          退出登录
        </div>
      </div>
    </div>

    <!-- 认证弹窗 -->
    <AuthModal
      :show-modal="showAuthModal"
      :mode="authMode"
      @close="showAuthModal = false"
      @success="handleAuthSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getCurrentUser, logout, checkVipStatus, decreaseQuota, anonymousLogin } from '../utils/tcb'
import AuthModal from './AuthModal.vue'

const user = ref(null)
const isVip = ref(false)
const quota = ref(10)
const vipExpireDate = ref('')
const showDropdown = ref(false)
const showAuthModal = ref(false)
const authMode = ref('login')

// 计算邮箱显示（脱敏）
const userEmail = computed(() => {
  if (!user.value?.email) return '未登录用户'
  const email = user.value.email
  const [name, domain] = email.split('@')
  const maskedName = name.length > 3 ? name.slice(0, 2) + '***' + name.slice(-1) : name
  return `${maskedName}@${domain}`
})

// 初始化用户信息
const initUserInfo = async () => {
  try {
    const currentUser = await getCurrentUser()
    if (currentUser) {
      user.value = currentUser
      await refreshQuota()
    } else {
      // 尝试匿名登录获取免费额度
      await anonymousLogin()
      const anonymousUser = await getCurrentUser()
      if (anonymousUser) {
        user.value = anonymousUser
        await refreshQuota()
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// 刷新配额信息
const refreshQuota = async () => {
  if (!user.value) return

  try {
    const status = await checkVipStatus(user.value.uid)
    isVip.value = status.isVip
    quota.value = status.remainingQuota
    if (status.vipExpireTime) {
      const date = new Date(status.vipExpireTime)
      vipExpireDate.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
  } catch (error) {
    console.error('刷新配额失败:', error)
  }
}

// 使用前检查配额
const checkQuotaAndDecrease = async () => {
  if (isVip.value) {
    return { canUse: true }
  }

  if (quota.value <= 0) {
    showAuthModal.value = true
    authMode.value = 'vip'
    return { canUse: false, reason: 'quota_exceeded' }
  }

  try {
    await decreaseQuota(user.value.uid)
    quota.value -= 1
    return { canUse: true }
  } catch (error) {
    console.error('扣除配额失败:', error)
    return { canUse: false, reason: 'error' }
  }
}

// 打开登录
const openLogin = () => {
  authMode.value = 'login'
  showAuthModal.value = true
}

// 打开通会员
const openVip = () => {
  authMode.value = 'vip'
  showAuthModal.value = true
  showDropdown.value = false
}

// 处理登出
const handleLogout = async () => {
  if (!confirm('确定要退出登录吗？')) return

  try {
    await logout()
    user.value = null
    isVip.value = false
    quota.value = 10
    showDropdown.value = false

    // 重新匿名登录
    await initUserInfo()
    alert('已退出登录')
  } catch (error) {
    console.error('登出失败:', error)
    alert('登出失败，请重试')
  }
}

// 处理认证成功
const handleAuthSuccess = async () => {
  await initUserInfo()
}

onMounted(() => {
  initUserInfo()
})

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (!event.target.closest('.user-menu-container')) {
    showDropdown.value = false
  }
}

document.addEventListener('click', handleClickOutside)

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 暴露方法给父组件
defineExpose({
  checkQuotaAndDecrease
})
</script>

<style scoped>
.user-menu-container {
  position: relative;
}

.user-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quota-info {
  font-size: 0.875rem;
  color: #6b7280;
}

.quota-count {
  background: #f3f4f6;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-weight: 500;
}

.auth-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.login-btn {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.login-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.vip-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.vip-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2);
}

.logged-in {
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-info:hover {
  background: #f3f4f6;
}

.avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.95rem;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.user-email {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
}

.vip-status {
  font-size: 0.75rem;
  color: #6b7280;
}

.vip-status.vip-active {
  color: #f59e0b;
  font-weight: 500;
}

.dropdown-arrow {
  color: #9ca3af;
  transition: transform 0.2s;
}

.dropdown-arrow.active {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  min-width: 200px;
  overflow: hidden;
  z-index: 100;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.menu-item {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.menu-item:hover {
  background: #f9fafb;
}

.quota-display {
  border-bottom: 1px solid #e5e7eb;
  cursor: default;
}

.quota-display:hover {
  background: white;
}

.quota-number {
  font-weight: 600;
  color: #2563eb;
  margin-left: auto;
}

.vip-upgrade {
  color: #f59e0b;
  font-weight: 500;
}

.vip-upgrade:hover {
  background: #fffbeb;
}

.vip-upgrade svg {
  flex-shrink: 0;
}
</style>
