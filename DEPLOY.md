# MD转Word转换器 - 腾讯云部署指南

## 功能特性

- ✅ 用户登录/注册（邮箱密码）
- ✅ 微信登录
- ✅ 用户登出
- ✅ 付费会员系统（月度/年度会员）
- ✅ 微信支付
- ✅ 支付宝支付
- ✅ 免费额度管理（默认10次免费使用）
- ✅ Markdown 转 Word
- ✅ PDF 解析
- ✅ 数学公式支持（LaTeX）

## 部署步骤

### 1. 腾讯云云开发准备

#### 1.1 创建云开发环境

1. 登录 [腾讯云云开发控制台](https://console.cloud.tencent.com/tcb)
2. 创建新环境或使用现有环境
3. 记录环境ID（如：`mdtoword-xxx`）

#### 1.2 开启认证服务

在云开发控制台中：
1. 进入「设置」→「环境设置」
2. 开启「用户登录」
3. 启用以下登录方式：
   - 匿名登录（用于游客访问）
   - 邮箱密码登录
   - 微信登录（需要配置微信公众号）

### 2. 本地配置

#### 2.1 安装依赖

```bash
npm install
```

#### 2.2 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，将 `VITE_TCB_ENV_ID` 替换为你的云开发环境ID：

```env
VITE_TCB_ENV_ID=mdtoword-xxx  # 替换为你的环境ID
```

### 3. 部署云函数

#### 3.1 安装云函数依赖

```bash
cd cloudbase/functions/payment
npm install

cd ../../auth
npm install
```

#### 3.2 部署云函数

使用云开发 CLI 部署：

```bash
# 安装云开发 CLI
npm install -g @cloudbase/cli

# 登录
tcb login

# 部署云函数
tcb functions:deploy payment
tcb functions:deploy auth
```

### 4. 部署前端

#### 4.1 构建项目

```bash
npm run build
```

#### 4.2 部署到云托管或静态网站托管

**方式一：云托管（推荐）**

```bash
tcb hosting deploy ./dist
```

**方式二：静态网站托管**

在云开发控制台中：
1. 进入「静态网站托管」
2. 点击「上传文件」
3. 上传 `dist` 目录下的所有文件

### 5. 配置数据库

在云开发控制台中创建以下数据库集合：

#### 5.1 users 集合（用户信息表）

```json
{
  "_openid": "用户ID",
  "email": "邮箱",
  "freeQuota": 10,
  "vipExpireTime": "会员到期时间",
  "isVip": false,
  "createdAt": "创建时间",
  "updatedAt": "更新时间"
}
```

#### 5.2 orders 集合（订单记录表）

```json
{
  "orderId": "订单号",
  "userId": "用户ID",
  "planType": "month/year",
  "amount": 1900,
  "status": "pending/paid",
  "paymentMethod": "wechat/alipay",
  "createdAt": "创建时间",
  "paidAt": "支付时间"
}
```

#### 5.3 usage_logs 集合（使用记录表）

```json
{
  "userId": "用户ID",
  "action": "download",
  "count": 1,
  "createdAt": "创建时间"
}
```

### 6. 配置支付（可选）

#### 6.1 微信支付配置

1. **申请微信支付**
   - 在 [微信支付商户平台](https://pay.weixin.qq.com/) 注册商户账号
   - 完成实名认证

2. **配置微信支付参数**
   在云开发控制台中配置支付云函数的环境变量：
   ```env
   WECHAT_APP_ID=your_wechat_app_id
   WECHAT_MCH_ID=your_mch_id
   WECHAT_API_KEY=your_api_key
   WECHAT_NOTIFY_URL=https://your-domain.com/payment/wechat/notify
   ```

3. **安装微信支付SDK**
   ```bash
   cd cloudbase/functions/payment
   npm install wechatpay-node-v3
   ```

#### 6.2 支付宝支付配置

1. **申请支付宝支付**
   - 在 [支付宝开放平台](https://open.alipay.com/) 创建应用
   - 开通网页支付功能

2. **配置支付宝参数**
   在云开发控制台中配置支付云函数的环境变量：
   ```env
   ALIPAY_APP_ID=your_alipay_app_id
   ALIPAY_PRIVATE_KEY=your_private_key
   ALIPAY_PUBLIC_KEY=alipay_public_key
   ALIPAY_NOTIFY_URL=https://your-domain.com/payment/alipay/notify
   ```

3. **安装支付宝SDK**
   ```bash
   cd cloudbase/functions/payment
   npm install alipay-sdk
   ```

#### 6.3 测试支付

使用沙箱环境测试支付功能：
- 微信支付沙箱：[微信支付沙箱文档](https://pay.weixin.qq.com/wiki/doc/api/sandbox/index.html)
- 支付宝沙箱：[支付宝沙箱文档](https://opendocs.alipay.com/common/02kkvq)

## 安全配置

### 1. 数据库权限规则

在云开发控制台中设置数据库权限：

**users 集合**：
- 读取：用户本人可读
- 写入：用户本人可写

**orders 集合**：
- 读取：用户本人可读
- 写入：用户本人可写

### 2. 云函数访问权限

在云开发控制台中设置云函数访问权限为「所有用户可访问」或根据需要进行限制。

## 本地开发

```bash
# 启动开发服务器
npm run dev
```

访问 `http://localhost:5173` 查看效果。

## 注意事项

1. **环境ID**：确保 `.env` 中的环境ID正确
2. **数据库权限**：正确设置数据库权限，确保用户只能访问自己的数据
3. **支付安全**：生产环境中务必使用真实的支付接口
4. **HTTPS**：生产环境建议使用 HTTPS
5. **跨域配置**：如遇跨域问题，在云开发控制台中配置 CORS 规则

## 常见问题

### Q: 如何修改免费额度？

A: 在 `cloudbase/functions/auth/index.js` 中修改 `freeQuota` 的默认值。

### Q: 如何修改会员价格？

A: 在 `src/components/AuthModal.vue` 中修改价格显示。

### Q: 如何添加更多登录方式？

A: 在腾讯云云开发控制台中开启其他登录方式（如微信登录、手机号登录等）。

### Q: 微信登录如何配置？

A: 
1. 在腾讯云云开发控制台开启微信登录
2. 在微信公众平台配置授权域名
3. 在 `.env` 中配置微信公众号的 AppID 和 AppSecret

### Q: 支付回调如何处理？

A: 
1. 在云开发控制台配置支付回调URL
2. 在支付云函数中处理回调逻辑
3. 确保回调URL可以被微信/支付宝服务器访问

## 支付接口对接说明

### 微信支付对接

1. **获取支付参数**
   ```javascript
   const result = await db.callFunction({
     name: 'payment',
     data: {
       action: 'createWeChatPay',
       orderId: 'ORDER123',
       userId: 'user123',
       planType: 'month',
       amount: 1900
     }
   })
   ```

2. **调用支付**
   - 小程序：使用 `wx.requestPayment`
   - H5：跳转到 `result.data.mweb_url`
   - 扫码：展示 `result.data.code_url`

3. **处理回调**
   - 在云函数中接收支付通知
   - 更新订单状态
   - 开通会员权限

### 支付宝支付对接

1. **获取支付URL**
   ```javascript
   const result = await db.callFunction({
     name: 'payment',
     data: {
       action: 'createAliPay',
       orderId: 'ORDER123',
       amount: 1900
     }
   })
   ```

2. **跳转支付**
   ```javascript
   window.location.href = result.data.payUrl
   ```

3. **处理回调**
   - 配置异步通知URL
   - 验证签名
   - 更新订单状态

## 技术支持

如有问题，请查阅：
- [腾讯云云开发文档](https://cloud.tencent.com/document/product/876)
- [Vue 3 文档](https://cn.vuejs.org/)
- [微信支付文档](https://pay.weixin.qq.com/wiki/doc/api/index.html)
- [支付宝支付文档](https://opendocs.alipay.com/open/270)
