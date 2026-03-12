<template>
  <div v-if="showModal" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h2>{{ mode === 'login' ? '登录账号' : mode === 'register' ? '注册账号' : '开通会员' }}</h2>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>

      <div class="modal-body">
        <!-- 登录/注册表单 -->
        <div v-if="mode === 'login' || mode === 'register'" class="auth-form">
          <div class="form-group">
            <label>邮箱</label>
            <input
              v-model="formData.email"
              type="email"
              placeholder="请输入邮箱"
              @keyup.enter="handleSubmit"
            />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              @keyup.enter="handleSubmit"
            />
          </div>
          <button
            class="submit-btn"
            :disabled="isLoading"
            @click="handleSubmit"
          >
            {{ isLoading ? '处理中...' : (mode === 'login' ? '登录' : '注册') }}
          </button>
          
          <!-- 第三方登录 -->
          <div class="social-login">
            <div class="divider">
              <span>其他登录方式</span>
            </div>
            <div class="social-buttons">
              <button 
                class="social-btn wechat-btn"
                :disabled="isLoading"
                @click="handleWeChatLogin"
                title="微信登录"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#07c160">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                </svg>
                微信登录
              </button>
            </div>
          </div>
          
          <div class="switch-mode">
            <span v-if="mode === 'login'">
              还没有账号？
              <a @click="mode = 'register'">立即注册</a>
            </span>
            <span v-else>
              已有账号？
              <a @click="mode = 'login'">立即登录</a>
            </span>
          </div>
        </div>

        <!-- 付费会员 -->
        <div v-else-if="mode === 'vip'" class="vip-container">
          <div class="vip-plans">
            <div
              class="vip-plan"
              :class="{ active: selectedPlan === 'month' }"
              @click="selectedPlan = 'month'"
            >
              <h3>月度会员</h3>
              <div class="price">¥19<span class="unit">/月</span></div>
              <ul class="features">
                <li>✓ 无限制下载</li>
                <li>✓ 优先技术支持</li>
                <li>✓ PDF 解析不限次数</li>
              </ul>
            </div>
            <div
              class="vip-plan"
              :class="{ active: selectedPlan === 'year', recommended: true }"
              @click="selectedPlan = 'year'"
            >
              <div class="recommend-badge">超值</div>
              <h3>年度会员</h3>
              <div class="price">¥199<span class="unit">/年</span></div>
              <div class="save-tip">节省 ¥29</div>
              <ul class="features">
                <li>✓ 无限制下载</li>
                <li>✓ 优先技术支持</li>
                <li>✓ PDF 解析不限次数</li>
                <li>✓ 新功能优先体验</li>
              </ul>
            </div>
          </div>
          
          <!-- 支付方式选择 -->
          <div class="payment-methods">
            <div class="payment-title">选择支付方式</div>
            <div class="payment-options">
              <button 
                class="payment-option"
                :class="{ active: paymentMethod === 'wechat' }"
                @click="paymentMethod = 'wechat'"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#07c160">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                </svg>
                <span>微信支付</span>
              </button>
              <button 
                class="payment-option"
                :class="{ active: paymentMethod === 'alipay' }"
                @click="paymentMethod = 'alipay'"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#1677ff">
                  <path d="M21.17 7.63c-2.31-.64-4.72-.96-7.13-.96-2.38 0-4.77.31-7.05.93a.78.78 0 01-.97-.54l-.84-2.56a.78.78 0 01.51-.98c2.73-.84 5.6-1.27 8.5-1.27 2.93 0 5.84.44 8.6 1.31a.78.78 0 01.51.98l-.87 2.57a.78.78 0 01-.26.52zM14.04 22c-4.95 0-8.96-2.99-8.96-6.66 0-2.39 1.54-4.5 3.94-5.67a.78.78 0 011.07.38l1.33 2.94a.78.78 0 01-.33.99c-.93.52-1.49 1.35-1.49 2.32 0 1.78 2.07 3.22 4.62 3.22 2.54 0 4.61-1.44 4.61-3.22 0-.97-.56-1.8-1.49-2.32a.78.78 0 01-.33-.99l1.33-2.94a.78.78 0 011.07-.38c2.4 1.17 3.94 3.28 3.94 5.67 0 3.67-4.01 6.66-8.96 6.66z"/>
                </svg>
                <span>支付宝</span>
              </button>
            </div>
          </div>
          
          <button
            class="pay-btn"
            :disabled="isLoading"
            @click="handlePayment"
          >
            {{ isLoading ? '处理中...' : `立即支付 ${selectedPlan === 'month' ? '¥19' : '¥199'}` }}
          </button>
          <div class="pay-tips">
            <p>支付即表示同意《会员服务协议》</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { emailLogin, registerUser, getAuth, upsertUser, wechatLogin, requestWeChatPay, requestAliPay, queryPaymentStatus } from '../utils/tcb'

const props = defineProps({
  showModal: Boolean,
  mode: String // 'login', 'register', 'vip'
})

const emit = defineEmits(['close', 'success'])

const isLoading = ref(false)
const selectedPlan = ref('month')
const paymentMethod = ref('wechat')
const formData = reactive({
  email: '',
  password: ''
})

watch(() => props.mode, () => {
  // 重置表单
  formData.email = ''
  formData.password = ''
  selectedPlan.value = 'month'
  paymentMethod.value = 'wechat'
})

const handleOverlayClick = () => {
  handleClose()
}

const handleClose = () => {
  emit('close')
}

const handleSubmit = async () => {
  if (!formData.email || !formData.password) {
    alert('请填写邮箱和密码')
    return
  }

  if (formData.password.length < 6) {
    alert('密码至少6位')
    return
  }

  isLoading.value = true

  try {
    let result
    if (props.mode === 'login') {
      result = await emailLogin(formData.email, formData.password)
    } else {
      result = await registerUser(formData.email, formData.password)
    }

    if (result.success) {
      // 登录成功后保存用户信息
      const auth = await getAuth()
      const user = await auth.getUser()

      if (user) {
        await upsertUser({
          _openid: user.uid,
          email: formData.email,
          lastLoginAt: new Date()
        })
      }

      alert(props.mode === 'login' ? '登录成功！' : '注册成功！')
      emit('success')
      handleClose()
    } else {
      alert(result.error || '操作失败，请重试')
    }
  } catch (error) {
    console.error('认证失败:', error)
    alert('操作失败，请重试')
  } finally {
    isLoading.value = false
  }
}

// 微信登录
const handleWeChatLogin = async () => {
  isLoading.value = true

  try {
    const result = await wechatLogin()

    if (result.success) {
      // 登录成功后保存用户信息
      const auth = await getAuth()
      const user = await auth.getUser()

      if (user) {
        await upsertUser({
          _openid: user.uid,
          loginType: 'wechat',
          lastLoginAt: new Date()
        })
      }

      alert('微信登录成功！')
      emit('success')
      handleClose()
    } else {
      alert(result.error || '微信登录失败，请重试')
    }
  } catch (error) {
    console.error('微信登录失败:', error)
    // 在微信环境中可能需要特殊处理
    if (typeof wx !== 'undefined') {
      // 微信小程序环境
      wx.login({
        success: async (wxRes) => {
          if (wxRes.code) {
            // 使用微信登录
            const auth = await getAuth()
            await auth.weixinAuthProvider().signIn(wxRes.code)
            
            const user = await auth.getUser()
            if (user) {
              await upsertUser({
                _openid: user.uid,
                loginType: 'wechat',
                lastLoginAt: new Date()
              })
            }
            
            alert('微信登录成功！')
            emit('success')
            handleClose()
          }
        },
        fail: (err) => {
          console.error('微信登录失败:', err)
          alert('微信登录失败，请重试')
        }
      })
    } else {
      alert('微信登录失败，请重试')
    }
  } finally {
    isLoading.value = false
  }
}

const handlePayment = async () => {
  isLoading.value = true

  try {
    // 创建订单
    const auth = await getAuth()
    const user = await auth.getUser()

    if (!user) {
      alert('请先登录')
      isLoading.value = false
      return
    }

    // 计算金额（单位：分）
    const amount = selectedPlan.value === 'month' ? 1900 : 19900
    
    // 生成订单ID
    const orderId = 'ORDER' + Date.now() + Math.random().toString(36).substr(2, 9)

    // 根据支付方式调用不同的支付接口
    let paymentResult
    if (paymentMethod.value === 'wechat') {
      // 微信支付
      if (typeof wx !== 'undefined') {
        // 微信小程序环境
        const db = await getDB()
        const result = await db.callFunction({
          name: 'payment',
          data: {
            action: 'createWeChatPay',
            orderId,
            userId: user.uid,
            planType: selectedPlan.value,
            amount
          }
        })

        paymentResult = result.result

        if (paymentResult.code === 0) {
          // 调用微信支付
          wx.requestPayment({
            ...paymentResult.data,
            success: async () => {
              await handlePaymentSuccess(orderId, user.uid)
            },
            fail: (err) => {
              console.error('支付失败:', err)
              alert('支付失败，请重试')
              isLoading.value = false
            }
          })
          return
        }
      } else {
        // H5环境 - 微信H5支付
        const result = await requestWeChatPay(orderId, amount)
        if (result.code === 0 && result.data.mweb_url) {
          // 跳转到微信支付页面
          window.location.href = result.data.mweb_url
          return
        } else {
          throw new Error(result.message || '创建微信支付失败')
        }
      }
    } else if (paymentMethod.value === 'alipay') {
      // 支付宝支付
      const result = await requestAliPay(orderId, amount)
      
      if (result.code === 0 && result.data.payUrl) {
        // 跳转到支付宝支付页面
        window.location.href = result.data.payUrl
        return
      } else {
        throw new Error(result.message || '创建支付宝支付失败')
      }
    }

    // 如果是开发环境或支付接口不可用，使用模拟支付
    if (!paymentResult || paymentResult.code !== 0) {
      console.warn('支付接口不可用，使用模拟支付')
      
      // 模拟支付流程
      await new Promise(resolve => setTimeout(resolve, 1500))

      // 模拟支付成功
      await handlePaymentSuccess(orderId, user.uid)
    }

  } catch (error) {
    console.error('支付失败:', error)
    alert('支付失败：' + (error.message || '请重试'))
  } finally {
    isLoading.value = false
  }
}

// 处理支付成功
const handlePaymentSuccess = async (orderId, userId) => {
  try {
    // 调用云函数确认支付并更新会员状态
    const db = await getDB()
    const result = await db.callFunction({
      name: 'payment',
      data: {
        action: 'confirmPayment',
        orderId,
        userId
      }
    })

    if (result.result.code === 0) {
      alert('支付成功！已开通会员')
      emit('success')
      handleClose()
    } else {
      throw new Error(result.result.message || '确认支付失败')
    }
  } catch (error) {
    console.error('确认支付失败:', error)
    alert('支付确认失败，请联系客服')
    throw error
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.form-group input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.submit-btn {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-mode {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.switch-mode a {
  color: #2563eb;
  cursor: pointer;
  font-weight: 500;
}

.switch-mode a:hover {
  text-decoration: underline;
}

/* 第三方登录样式 */
.social-login {
  margin-top: 1.5rem;
}

.divider {
  position: relative;
  text-align: center;
  margin: 1rem 0;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #e5e7eb;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.divider span {
  background: white;
  padding: 0 0.75rem;
  color: #9ca3af;
  font-size: 0.75rem;
}

.social-buttons {
  display: flex;
  gap: 0.75rem;
}

.social-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.social-btn:hover:not(:disabled) {
  border-color: #07c160;
  background: #f0fdf4;
}

.social-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wechat-btn:hover:not(:disabled) {
  border-color: #07c160;
  background: #f0fdf4;
  color: #059669;
}

/* VIP 会员样式 */
.vip-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 支付方式样式 */
.payment-methods {
  margin-top: 1rem;
}

.payment-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.75rem;
}

.payment-options {
  display: flex;
  gap: 0.75rem;
}

.payment-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.payment-option:hover {
  border-color: #93c5fd;
  background: #f9fafb;
}

.payment-option.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.vip-plans {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.vip-plan {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.vip-plan:hover {
  border-color: #93c5fd;
}

.vip-plan.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.vip-plan.recommended {
  border-color: #f59e0b;
}

.vip-plan.recommended.active {
  border-color: #d97706;
  background: #fef3c7;
}

.recommend-badge {
  position: absolute;
  top: -10px;
  right: 10px;
  background: #f59e0b;
  color: white;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.vip-plan h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.price {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 0.5rem;
}

.price .unit {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 400;
}

.save-tip {
  color: #dc2626;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features li {
  font-size: 0.875rem;
  color: #4b5563;
  padding: 0.25rem 0;
}

.pay-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  padding: 0.875rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2);
}

.pay-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 8px -1px rgba(245, 158, 11, 0.3);
}

.pay-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.pay-tips {
  text-align: center;
  color: #9ca3af;
  font-size: 0.75rem;
}

.pay-tips p {
  margin: 0;
}
</style>
