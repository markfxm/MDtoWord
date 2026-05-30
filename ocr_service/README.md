# 本地结构化 OCR 服务

这个服务为前端的“上传图片”提供本地结构化 OCR，默认地址：

```text
http://127.0.0.1:8765
```

## 安装

建议使用独立虚拟环境。Pix2Text 首次运行会下载模型，耗时较长。

```powershell
cd E:\MDtoWord
python -m venv .venv-ocr
.\.venv-ocr\Scripts\Activate.ps1
pip install -r .\ocr_service\requirements.txt
```

## 启动

```powershell
npm run ocr:serve:venv
```

或直接运行：

```powershell
python -m uvicorn ocr_service.app:app --host 127.0.0.1 --port 8765
```

## Smoke Test

```powershell
npm run ocr:smoke:venv -- "C:\Users\fengx\Desktop\文字图片3.png"
```

脚本会在终端输出 JSON，其中包含 `markdown`、`blocks`、`assets` 和 `engine`。
