# MDtoWord 腾讯云部署指南

## 前提条件

1. 已安装 Node.js (建议 v16+)
2. 已安装 npm/yarn
3. 已有腾讯云账号

---

## 第一步：登录腾讯云 CloudBase

1. 打开 VS Code 右侧菜单栏
2. 点击 **CloudBase** 图标
3. 点击"登录"按钮
4. 使用微信扫码登录

---

## 第二步：创建云开发环境

1. 登录后访问 https://console.cloud.tencent.com/tcb
2. 点击"新建环境"
3. 填写环境信息：
   - **环境名称**：`mdtoword`
   - **付费方式**：选择"按量付费"（推荐）
   - **产品套餐**：选择免费版或基础版
4. 等待环境创建完成（约1-2分钟）
5. 复制你的**环境ID**（格式类似：`mdtoword-xxx`）

---

## 第三步：配置项目环境变量

在项目根目录创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

编辑 `.env` 文件，填写以下信息：

```env
# 云开发环境配置
VITE_TCB_ENV_ID=你的环境ID

# 微信支付配置（可选）
VITE_WECHAT_APPID=你的微信AppID
VITE_WECHAT_MCH_ID=你的微信商户号

# 支付宝支付配置（可选）
VITE_ALIPAY_APPID=你的支付宝AppID
```

---

## 第四步：安装 CloudBase CLI

```bash
# 全局安装 CloudBase CLI
npm install -g @cloudbase/cli

# 验证安装
cloudbase -v
```

登录 CloudBase：

```bash
cloudbase login
```

使用微信扫码登录。

---

## 第五步：部署云函数

进入项目根目录，执行以下命令：

```bash
# 部署所有云函数
cloudbase functions:deploy

# 或单独部署某个函数
cloudbase functions:deploy auth
cloudbase functions:deploy payment
```

等待部署完成（约1-2分钟）。

---

## 第六步：配置数据库

### 方法一：通过腾讯云控制台（推荐）

1. 访问 https://console.cloud.tencent.com/tcb
2. 选择你的环境 `mdtoword`
3. 点击左侧菜单"数据库"
4. 点击"新建集合"

创建以下3个集合：

#### 1. users 集合（用户信息表）

```
集合名称：users
权限设置：所有用户可读，仅创建者可写
```

**字段结构**：
- `_id` (string) - 用户ID
- `email` (string) - 用户邮箱
- `phone` (string) - 用户手机号
- `isVip` (boolean) - 是否为会员
- `vipExpireTime` (number) - 会员过期时间戳
- `freeQuota` (number) - 免费额度（默认10）
- `remainingQuota` (number) - 剩余额度
- `createdAt` (number) - 创建时间戳
- `updatedAt` (number) - 更新时间戳

#### 2. orders 集合（订单表）

```
集合名称：orders
权限设置：所有用户可读，仅创建者可写
```

**字段结构**：
- `_id` (string) - 订单ID
- `userId` (string) - 用户ID
- `orderNo` (string) - 订单号
- `productId` (string) - 商品ID
- `productName` (string) - 商品名称
- `amount` (number) - 订单金额（分）
- `status` (string) - 订单状态：pending/paid/failed/refunded
- `paymentMethod` (string) - 支付方式：wechat/alipay
- `transactionId` (string) - 支付平台交易号
- `paidAt` (number) - 支付时间戳
- `createdAt` (number) - 创建时间戳

#### 3. usage_logs 集合（使用日志表）

```
集合名称：usage_logs
权限设置：所有用户可读，仅创建者可写
```

**字段结构**：
- `_id` (string) - 日志ID
- `userId` (string) - 用户ID
- `action` (string) - 操作类型
- `quotaUsed` (number) - 使用的配额
- `createdAt` (number) - 创建时间戳

### 方法二：通过 CLI 部署（可选）

```bash
# 导入数据库集合（需要先创建 collections.json）
cloudbase database:import cloudbase/database/collections.json
```

---

## 第七步：配置云函数环境变量

1. 访问 https://console.cloud.tencent.com/tcb
2. 选择你的环境
3. 点击左侧菜单"云函数"
4. 选择 `auth` 函数，点击"配置" → "环境变量"
5. 添加以下环境变量：

```env
TCB_ENV_ID=你的环境ID
FREE_QUOTA=10
VIP_MONTH_PRICE=99
VIP_YEAR_PRICE=599
```

6. 对 `payment` 函数重复以上步骤，并添加：

```env
TCB_ENV_ID=你的环境ID

# 微信支付（如果使用）
WECHAT_APPID=你的微信AppID
WECHAT_MCH_ID=你的微信商户号
WECHAT_API_V3_KEY=你的微信APIv3密钥
WECHAT_CERT_PATH=./certs/wechat_cert.p12
WECHAT_CERT_SERIAL_NO=你的证书序列号

# 支付宝（如果使用）
ALIPAY_APPID=你的支付宝AppID
ALIPAY_PRIVATE_KEY=你的应用私钥
ALIPAY_PUBLIC_KEY=支付宝公钥
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do
```

---

## 第八步：构建项目

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build
```

构建完成后，`dist` 文件夹包含所有静态文件。

---

## 第九步：部署静态网站

### 方法一：通过 CloudBase CLI 部署（推荐）

```bash
# 部署静态网站
cloudbase hosting:deploy dist

# 或指定路径
cloudbase hosting:deploy ./dist -e 你的环境ID
```

### 方法二：通过腾讯云控制台

1. 访问 https://console.cloud.tencent.com/tcb
2. 选择你的环境
3. 点击左侧菜单"静态网站托管"
4. 点击"设置" → "上传文件"
5. 选择 `dist` 文件夹中的所有文件上传
6. 或使用命令行工具：`cloudbase hosting:deploy dist`

---

## 第十步：配置域名（可选）

1. 在"静态网站托管"页面
2. 点击"设置" → "域名管理"
3. 添加自定义域名
4. 按提示配置 DNS 解析

如果使用 CloudBase 提供的域名，格式类似：
```
https://你的环境ID.service.tcloudbase.com
```

---

## 第十一步：配置支付（可选）

### 微信支付配置

1. 注册微信商户号：https://pay.weixin.qq.com
2. 获取以下信息：
   - 商户号 (mch_id)
   - APIv3 密钥
   - 商户证书
3. 在云函数环境变量中配置

### 支付宝配置

1. 注册支付宝开放平台：https://open.alipay.com
2. 创建应用并获取：
   - AppID
   - 应用私钥
   - 支付宝公钥
3. 在云函数环境变量中配置

详细配置参考：`PAYMENT_CONFIG.md`

---

## 验证部署

1. 访问你的网站域名
2. 测试以下功能：
   - [ ] 邮箱注册/登录
   - [ ] 匿名登录
   - [ ] 查看剩余额度
   - [ ] 使用 Markdown 转换功能
   - [ ] 额度是否正确扣除
   - [ ] （可选）会员购买
   - [ ] （可选）支付功能

---

## 常见问题

### 1. 云函数部署失败

检查：
- 环境ID是否正确
- 是否有足够的权限
- 云函数依赖是否正确安装

### 2. 数据库连接失败

检查：
- 环境ID是否正确
- 数据库集合是否已创建
- 权限设置是否正确

### 3. 支付功能不可用

- 确保已正确配置支付相关的环境变量
- 检查商户号和密钥是否正确
- 查看 CloudFunction 日志排查错误

### 4. 静态网站访问 404

- 确保已正确部署 `dist` 文件夹
- 检查域名配置
- 查看 CloudBase 控制台的网站托管日志

---

## 更新部署

当代码更新后，只需重新构建和部署：

```bash
# 构建新版本
npm run build

# 重新部署网站
cloudbase hosting:deploy dist

# 如果云函数有更新，重新部署云函数
cloudbase functions:deploy
```

---

## 项目结构

```
MDtoWord/
├── src/
│   ├── components/
│   │   ├── MDtoWord.vue       # 主组件
│   │   ├── UserMenu.vue       # 用户菜单
│   │   └── AuthModal.vue      # 登录/注册弹窗
│   └── utils/
│       └── tcb.js             # 腾讯云工具函数
├── cloudbase/
│   ├── functions/
│   │   ├── auth/              # 认证云函数
│   │   └── payment/           # 支付云函数
│   └── database/
│       └── collections.json   # 数据库集合定义
├── dist/                      # 构建输出目录
├── .env                       # 环境变量配置
├── cloudbaserc.json           # CloudBase 配置文件
└── DEPLOY.md                  # 部署文档
```

---

## 技术支持

- 腾讯云 CloudBase 文档：https://docs.cloudbase.net
- Vue 3 文档：https://vuejs.org
- 如有问题，请查看 CloudBase 控制台的日志和错误信息
