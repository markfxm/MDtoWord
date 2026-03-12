# 环境变量配置步骤（图文指引）

## 📋 快速开始

---

## 第1步：创建前端环境变量文件

### 1.1 找到项目根目录

在项目根目录（`E:/Google AI Studio/MDtoWord`）下创建 `.env` 文件

### 1.2 编辑 .env 文件

```env
# 腾讯云 CloudBase 环境ID
VITE_TCB_ENV_ID=mdtoword-8g8xxxxx
```

**如何获取环境ID**：
1. 访问 https://console.cloud.tencent.com/tcb
2. 选择你的环境
3. 在页面顶部可以看到环境ID，格式如：`mdtoword-8g8xxxxx`
4. 复制这个ID到 `.env` 文件中

---

## 第2步：配置云函数环境变量（auth）

### 2.1 进入腾讯云控制台

1. 打开浏览器，访问：https://console.cloud.tencent.com/tcb
2. 找到你的环境并点击进入

### 2.2 找到云函数页面

在左侧菜单栏中，找到并点击 **"云函数"**

### 2.3 选择 auth 云函数

在云函数列表中，找到 **"auth"** 函数，点击进入

### 2.4 配置环境变量

1. 点击顶部的 **"函数配置"** 标签
2. 找到 **"环境变量"** 部分
3. 点击 **"编辑"** 按钮

### 2.5 添加环境变量

在弹出的编辑框中，点击 **"添加环境变量"**，逐个添加以下变量：

```
变量名：TCB_ENV_ID
变量值：mdtoword-8g8xxxxx（替换为你的环境ID）

变量名：FREE_QUOTA
变量值：10

变量名：VIP_MONTH_PRICE
变量值：99

变量名：VIP_YEAR_PRICE
变量值：599
```

**重要提示**：
- 变量名必须完全一致（区分大小写）
- 变量值不要加引号
- 每添加一个变量后点击"确定"
- 最后点击"保存"

---

## 第3步：配置云函数环境变量（payment）

### 3.1 返回云函数列表

点击面包屑导航返回云函数列表

### 3.2 选择 payment 云函数

找到并点击 **"payment"** 函数

### 3.3 配置环境变量

重复第2步的操作，添加以下环境变量：

#### 基础配置（必需）

```
变量名：TCB_ENV_ID
变量值：mdtoword-8g8xxxxx（替换为你的环境ID）
```

#### 微信支付配置（如果使用）

```
变量名：WECHAT_APPID
变量值：wx1234567890abcdef

变量名：WECHAT_MCH_ID
变量值：1234567890

变量名：WECHAT_API_V3_KEY
变量值：your_32_character_api_key_here

变量名：WECHAT_CERT_SERIAL_NO
变量值：your_cert_serial_no
```

#### 支付宝配置（如果使用）

```
变量名：ALIPAY_APPID
变量值：2021001234567890

变量名：ALIPAY_PRIVATE_KEY
变量值：-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----

变量名：ALIPAY_PUBLIC_KEY
变量值：-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhki...
-----END PUBLIC KEY-----

变量名：ALIPAY_GATEWAY
变量值：https://openapi.alipay.com/gateway.do
```

**注意**：
- 如果暂时不需要支付功能，可以只配置 `TCB_ENV_ID`
- 密钥需要包含完整的头尾标记（-----BEGIN/END...）
- 密钥值不要加引号
- 换行符在控制台输入时会自动处理

### 3.4 保存配置

点击"保存"按钮，等待配置生效（约10-30秒）

---

## 第4步：验证配置

### 4.1 检查前端环境变量

在终端运行：

```bash
cd E:/Google/AI Studio/MDtoWord
npm run dev
```

启动后，在浏览器控制台（F12）查看是否有环境变量加载的错误

### 4.2 检查云函数环境变量

1. 返回云函数列表
2. 点击任意云函数
3. 点击"日志"标签
4. 点击"测试"按钮，运行一个测试用例
5. 查看日志输出，确认环境变量是否正确加载

---

## 常见错误及解决方法

### 错误1：环境变量不生效

**症状**：代码中读取不到环境变量

**解决方法**：
- 前端：重启开发服务器（Ctrl+C，然后 `npm run dev`）
- 云函数：等待10-30秒，或重新部署云函数

### 错误2：云函数配置按钮找不到

**症状**：在云函数页面找不到"函数配置"标签

**解决方法**：
- 确保你点击的是具体的某个云函数，而不是云函数列表
- 在云函数详情页面才能看到配置选项

### 错误3：环境变量保存失败

**症状**：点击保存后报错

**解决方法**：
- 检查变量名是否正确（区分大小写）
- 检查变量值是否包含特殊字符
- 尝试删除后重新添加

### 错误4：密钥格式错误

**症状**：支付时报密钥格式错误

**解决方法**：
- 确保密钥包含完整的头尾标记
- 检查密钥是否有多余的空格或换行
- 确认使用的是正确的密钥类型（公钥/私钥）

---

## 完整配置示例

### 前端 .env 文件

```env
# 腾讯云 CloudBase 环境ID
VITE_TCB_ENV_ID=mdtoword-8g8xxxxx

# 微信支付（可选）
VITE_WECHAT_APPID=wx1234567890abcdef

# 支付宝（可选）
VITE_ALIPAY_APPID=2021001234567890
```

### auth 云函数环境变量

```
TCB_ENV_ID = mdtoword-8g8xxxxx
FREE_QUOTA = 10
VIP_MONTH_PRICE = 99
VIP_YEAR_PRICE = 599
```

### payment 云函数环境变量

```
# 基础配置
TCB_ENV_ID = mdtoword-8g8xxxxx

# 微信支付（如果使用）
WECHAT_APPID = wx1234567890abcdef
WECHAT_MCH_ID = 1234567890
WECHAT_API_V3_KEY = your_api_v3_key_here
WECHAT_CERT_SERIAL_NO = your_cert_serial_no

# 支付宝（如果使用）
ALIPAY_APPID = 2021001234567890
ALIPAY_PRIVATE_KEY = -----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----
ALIPAY_PUBLIC_KEY = -----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhki...
-----END PUBLIC KEY-----
ALIPAY_GATEWAY = https://openapi.alipay.com/gateway.do
```

---

## 下一步

配置完环境变量后，接下来需要：

1. ✅ 创建数据库集合（参考 DEPLOY_GUIDE.md）
2. ✅ 部署云函数（参考 DEPLOY_GUIDE.md）
3. ✅ 部署静态网站（参考 DEPLOY_GUIDE.md）
4. ✅ 测试各项功能

---

## 需要帮助？

- 📖 详细配置指南：查看 `ENV_CONFIG.md`
- 📖 完整部署指南：查看 `DEPLOY_GUIDE.md`
- 📖 支付配置指南：查看 `PAYMENT_CONFIG.md`

如有问题，可以查看 CloudBase 控制台的日志和错误信息。
