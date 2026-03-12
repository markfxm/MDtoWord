# 环境变量配置指南

## 目录
- [1. 前端环境变量](#1-前端环境变量)
- [2. 云函数环境变量](#2-云函数环境变量)
- [3. 如何获取各项配置](#3-如何获取各项配置)
- [4. 配置验证](#4-配置验证)

---

## 1. 前端环境变量

### 1.1 获取环境ID

1. 访问 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 选择你的环境
3. 在"环境设置"中找到**环境ID**
   - 格式类似：`mdtoword-xxxxx` 或 `mdtoword-8g8xxxxx`

### 1.2 创建 `.env` 文件

在项目根目录创建 `.env` 文件：

```env
# 腾讯云 CloudBase 环境ID
VITE_TCB_ENV_ID=mdtoword-8g8xxxxx

# 微信支付配置（可选，如果不需要微信支付可以留空）
VITE_WECHAT_APPID=wx1234567890abcdef

# 支付宝配置（可选，如果不需要支付宝支付可以留空）
VITE_ALIPAY_APPID=2021001234567890
```

### 1.3 环境变量说明

| 变量名 | 说明 | 是否必需 | 示例 |
|--------|------|---------|------|
| `VITE_TCB_ENV_ID` | CloudBase 环境ID | ✅ 必需 | `mdtoword-8g8xxxxx` |
| `VITE_WECHAT_APPID` | 微信开放平台 AppID | ❌ 可选 | `wx1234567890abcdef` |
| `VITE_ALIPAY_APPID` | 支付宝开放平台 AppID | ❌ 可选 | `2021001234567890` |

### 1.4 不同环境配置

本地开发使用 `.env.local`：
```bash
# 本地开发环境
VITE_TCB_ENV_ID=mdtoword-dev-xxxxx
```

生产环境使用 `.env.production`：
```bash
# 生产环境
VITE_TCB_ENV_ID=mdtoword-prod-xxxxx
```

---

## 2. 云函数环境变量

云函数环境变量需要在**腾讯云控制台**手动配置，不能通过代码文件设置。

### 2.1 登录腾讯云控制台

访问：https://console.cloud.tencent.com/tcb

### 2.2 配置 auth 云函数环境变量

1. 点击左侧菜单 **"云函数"**
2. 选择 **"auth"** 函数
3. 点击 **"函数配置"** → **"环境变量"** → **"编辑"**
4. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|---|------|
| `TCB_ENV_ID` | `你的环境ID` | CloudBase 环境ID |
| `FREE_QUOTA` | `10` | 新用户免费额度（次数） |
| `VIP_MONTH_PRICE` | `99` | 月度会员价格（元） |
| `VIP_YEAR_PRICE` | `599` | 年度会员价格（元） |

**示例配置**：
```env
TCB_ENV_ID=mdtoword-8g8xxxxx
FREE_QUOTA=10
VIP_MONTH_PRICE=99
VIP_YEAR_PRICE=599
```

### 2.3 配置 payment 云函数环境变量

1. 点击 **"payment"** 函数
2. 点击 **"函数配置"** → **"环境变量"** → **"编辑"**
3. 添加基础配置：

```env
# 基础配置（必需）
TCB_ENV_ID=mdtoword-8g8xxxxx

# 微信支付配置（如果使用微信支付，以下为必需）
WECHAT_APPID=wx1234567890abcdef
WECHAT_MCH_ID=1234567890
WECHAT_API_V3_KEY=your_api_v3_key_here
WECHAT_CERT_SERIAL_NO=your_cert_serial_no

# 支付宝配置（如果使用支付宝支付，以下为必需）
ALIPAY_APPID=2021001234567890
ALIPAY_PRIVATE_KEY=your_private_key_here
ALIPAY_PUBLIC_KEY=alipay_public_key_here
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

**环境变量说明**：

| 变量名 | 说明 | 是否必需 |
|--------|------|---------|
| **基础配置** |
| `TCB_ENV_ID` | CloudBase 环境ID | ✅ 必需 |
| **微信支付** |
| `WECHAT_APPID` | 微信开放平台 AppID | 微信支付必需 |
| `WECHAT_MCH_ID` | 微信商户号 | 微信支付必需 |
| `WECHAT_API_V3_KEY` | 微信 APIv3 密钥 | 微信支付必需 |
| `WECHAT_CERT_SERIAL_NO` | 微信证书序列号 | 微信支付必需 |
| **支付宝** |
| `ALIPAY_APPID` | 支付宝开放平台 AppID | 支付宝必需 |
| `ALIPAY_PRIVATE_KEY` | 应用私钥 | 支付宝必需 |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥 | 支付宝必需 |
| `ALIPAY_GATEWAY` | 支付宝网关地址 | 支付宝必需 |

### 2.4 保存配置

点击"保存"按钮，等待配置生效（约10-30秒）。

---

## 3. 如何获取各项配置

### 3.1 获取 CloudBase 环境ID

1. 访问 https://console.cloud.tencent.com/tcb
2. 选择你的环境
3. 在"环境设置"页面，找到"环境信息"
4. 复制"环境ID"

### 3.2 获取微信支付配置

#### 步骤1：注册微信商户号

1. 访问 https://pay.weixin.qq.com
2. 使用营业执照注册微信商户号
3. 等待审核通过（通常1-3个工作日）

#### 步骤2：获取商户信息

在微信商户平台获取：
- **商户号（MCH_ID）**：在"账户中心"查看
- **AppID**：在"产品中心"查看

#### 步骤3：设置 API 密钥

1. 进入微信商户平台 → "账户中心" → "API安全"
2. 设置"APIv3 密钥"（32位字符串，建议使用随机生成器）
3. 下载并保存这个密钥

#### 步骤4：申请商户证书

1. 在"API安全"页面下载证书
2. 证书文件格式：`.p12`
3. 提取证书序列号（可以在证书详情中查看）

### 3.3 获取支付宝配置

#### 步骤1：注册支付宝开放平台账号

1. 访问 https://open.alipay.com
2. 注册并登录支付宝开放平台
3. 完成企业认证

#### 步骤2：创建应用

1. 进入"控制台" → "网页/移动应用"
2. 点击"创建应用"
3. 选择应用类型：**网页应用**
4. 填写应用信息并提交审核

#### 步骤3：获取 AppID

应用创建后，在应用详情页面可以找到 **AppID**

#### 步骤4：生成密钥

1. 在应用详情中，点击"加签方式"下的"设置"
2. 选择"公钥"模式
3. 使用支付宝提供的工具生成密钥对：
   - 应用私钥（应用自己持有）
   - 应用公钥（上传到支付宝）

#### 步骤5：配置公钥

1. 将生成的应用公钥复制到支付宝控制台
2. 支付宝会生成对应的支付宝公钥
3. 保存支付宝公钥

**密钥格式示例**：
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----
```

---

## 4. 配置验证

### 4.1 验证前端环境变量

在代码中打印环境变量：

```javascript
// 在 src/utils/tcb.js 中添加
console.log('环境ID:', import.meta.env.VITE_TCB_ENV_ID)
```

检查控制台输出是否正确。

### 4.2 验证云函数环境变量

在云函数中添加测试代码：

```javascript
// cloudbase/functions/auth/index.js
exports.main = async (event) => {
  console.log('环境变量:', {
    TCB_ENV_ID: process.env.TCB_ENV_ID,
    FREE_QUOTA: process.env.FREE_QUOTA,
    VIP_MONTH_PRICE: process.env.VIP_MONTH_PRICE
  })
  // ...
}
```

然后在腾讯云控制台查看云函数日志。

### 4.3 测试数据库连接

```javascript
// 在浏览器控制台测试
import tcb from '@cloudbase/js-sdk'

const app = tcb.init({
  env: import.meta.env.VITE_TCB_ENV_ID
})

try {
  await app.auth().getLoginState()
  console.log('✓ 数据库连接成功')
} catch (error) {
  console.error('✗ 数据库连接失败:', error)
}
```

---

## 常见问题

### Q1: 环境变量修改后不生效？

**A**: 需要重启开发服务器：
```bash
# 停止服务器 (Ctrl+C)
# 重新启动
npm run dev
```

对于云函数，环境变量修改后大约10-30秒生效。

### Q2: 云函数无法读取环境变量？

**A**:
1. 确认环境变量已保存
2. 等待10-30秒让配置生效
3. 查看云函数日志确认变量是否正确加载

### Q3: 支付密钥如何安全存储？

**A**:
- ❌ 不要将密钥提交到 Git
- ✅ 使用环境变量存储
- ✅ 将 `.env` 添加到 `.gitignore`
- ✅ 定期更换密钥

### Q4: 本地开发如何测试？

**A**:
1. 使用 `.env.local` 文件配置本地开发环境ID
2. 或者使用共享的开发环境ID
3. 本地开发建议使用测试环境

---

## 环境变量最佳实践

### ✅ 推荐做法

1. **使用不同的环境**
   - 开发环境：`mdtoword-dev`
   - 测试环境：`mdtoword-test`
   - 生产环境：`mdtoword-prod`

2. **密钥管理**
   - 使用密码管理器存储密钥
   - 定期更换密钥
   - 不同环境使用不同密钥

3. **文档记录**
   - 记录所有密钥的生成时间
   - 记录密钥的过期时间
   - 保存密钥的备份（安全位置）

4. **Git 忽略**
   ```gitignore
   # 环境变量文件
   .env
   .env.local
   .env.*.local
   ```

### ❌ 避免做法

1. ❌ 将 `.env` 文件提交到 Git
2. ❌ 在代码中硬编码密钥
3. ❌ 将密钥泄露给第三方
4. ❌ 使用弱密码或简单密钥
5. ❌ 在公开场合讨论密钥

---

## 完整配置清单

部署前请确认以下配置：

- [ ] `.env` 文件已创建，包含 `VITE_TCB_ENV_ID`
- [ ] `auth` 云函数环境变量已配置
- [ ] `payment` 云函数环境变量已配置（如果使用支付）
- [ ] 数据库集合已创建（users, orders, usage_logs）
- [ ] 云函数已部署
- [ ] 静态网站已部署
- [ ] （可选）微信支付已配置
- [ ] （可选）支付宝已配置

---

## 快速参考

### 前端环境变量文件位置
```
MDtoWord/
├── .env                # 生产环境变量
├── .env.local          # 本地开发环境变量（不提交）
├── .env.development    # 开发环境变量
└── .env.production     # 生产环境变量（构建时使用）
```

### 云函数环境变量配置位置
```
腾讯云控制台 → CloudBase → 云函数 → [auth/payment] → 函数配置 → 环境变量
```

---

## 技术支持

- CloudBase 文档：https://docs.cloudbase.net
- 微信支付文档：https://pay.weixin.qq.com/wiki/doc/api
- 支付宝文档：https://opendocs.alipay.com
- 如有问题，查看 CloudBase 控制台日志
