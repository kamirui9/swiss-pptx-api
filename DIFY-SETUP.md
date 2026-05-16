# Dify 工作流搭建指南

> DSL 版本：v0.6.0 | 模型：deepseek-v4-pro (via langgenius/tongyi) | 更新日期：2026-05-16

## 方式 A：一键导入（推荐，30 秒）

1. Dify → 创建应用 → 类型：**工作流** → 名称：`Swiss PPTX 生成器`
2. 进入工作流编辑器 → 右上角 **导入 DSL** → 选择项目根目录的 `dify-workflow.yml`
3. Dify 会自动提示安装依赖插件 `langgenius/tongyi`（用于 deepseek-v4-pro 模型）
4. 配置环境变量 `pptx_url`（默认 `http://host.docker.internal:3000`，Dify 与 API 同机部署无需修改）
5. 发布 → 即可使用

### DSL 内置特性

- **日语/中文/英文三语自动检测**：Step 0 语言检测 → 自动选择对应字体栈
- **最大 23 项条形图**（全量展示，7pt bar + 3pt gap）
- **垂直填充策略**：`flex:1;min-height:0` + `justify-content:space-between`
- **所有字号 ≥ 5pt**，所有 gap ≥ 3pt（杜绝 4pt/1.5pt 等导致重叠的值）
- **琥珀色纪律**：仅用于数据异常，不做装饰
- **HTTP 重试**：3 次，间隔 100ms，超时 connect 30s / read 60s / write 30s

---

## 方式 B：手动搭建（5 分钟）

## 整体结构

```
[开始] → [LLM 生成] → [Code 清洗] → [HTTP 请求] → [输出]
```

## 前置配置

1. Dify → 设置 → 模型供应商 → 添加 DeepSeek（或其他模型）的 API Key
2. 确保 `http://host.docker.internal:3000` 或你的服务器 IP 可达

---

## Step 1: 创建应用

- 类型：**工作流**
- 名称：Swiss PPTX 生成器

---

## Step 2: 配置开始节点

双击「开始」节点，添加输入变量：

| 变量名 | 类型 | 必填 |
|--------|------|------|
| `analysis_input` | 段落 | ✅ |

---

## Step 3: 添加 LLM 节点（生成 Swiss HTML）

从左侧拖入 **LLM** 节点，连接开始节点。

**模型**：推荐 `deepseek-v4-pro`（via langgenius/tongyi 插件），也可用 `deepseek-chat`

**System Prompt**：打开 `prompts/swiss-html-system-prompt.md`，复制全部内容粘贴。

**User Prompt**：
```
{{#start.analysis_input#}}
```

**参数**：Temperature = 0，Max Tokens = 32768

---

## Step 4: 添加 Code 节点（HTML 清洗）

从左侧拖入 **Code** 节点，连接 LLM 节点。

**语言**：Python3

**输入变量**：

| 变量名 | 来源 |
|--------|------|
| `raw_text` | `{{#LLM节点名.text#}}` |

**代码**（复制粘贴）：
```python
import re
import json

def main(raw_text: str) -> dict:
    text = raw_text.strip()

    # 去 markdown 代码块
    m = re.search(r'```(?:html)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if m:
        text = m.group(1).strip()

    # 找 HTML 文档边界
    doctype_idx = text.find('<!DOCTYPE')
    html_start = text.find('<html')

    start_idx = doctype_idx if doctype_idx != -1 else html_start
    html_end = text.rfind('</html>')

    if start_idx == -1 or html_end == -1 or html_end <= start_idx:
        return {"html": "", "filename": "report", "error": "No valid HTML document found", "payload": ""}

    html = text[start_idx:html_end + 7]

    # 基本结构验证
    if '<body' not in html:
        return {"html": "", "filename": "report", "error": "Missing <body> tag", "payload": ""}

    # 从 title 标签提取文件名
    filename = "report"
    title_m = re.search(r'<title>(.*?)</title>', html)
    if title_m:
        raw_title = title_m.group(1).strip()
        clean = re.sub(r'[^\w\s-]', '', raw_title)[:50]
        filename = clean if clean else "report"

    # 构造安全的 JSON payload
    payload = json.dumps({"html": html, "filename": filename}, ensure_ascii=False)

    return {"html": html, "filename": filename, "payload": payload, "error": ""}
```

**输出变量**（在 Code 节点输出配置中添加）：

| 变量名 | 类型 |
|--------|------|
| `html` | string |
| `filename` | string |
| `payload` | string |
| `error` | string |

---

## Step 5: 添加 HTTP 请求节点

从左侧拖入 **HTTP 请求** 节点，连接 Code 节点。

| 配置项 | 值 |
|--------|-----|
| 方法 | POST |
| URL | `http://host.docker.internal:3000/api/generate-from-html` |
| Headers | `Content-Type: application/json` |
| Body 类型 | JSON |
| Body 内容 | `{{#Code节点名.payload#}}` |

**注意**：Body 必须用 `{{#Code节点名.payload#}}`，因为 Code 节点已将 HTML 和 filename 封装为安全的 JSON 字符串。

---

## Step 6: 配置输出节点

连接 HTTP 节点到「输出」节点，输出变量选择 `{{#HTTP节点名.files#}}`（不是 `body`，因为 PPTX 是二进制文件）。

---

## 测试

在 Dify 输入框粘贴 `/Users/kamirui/swiss-pptx-api/test-input-sample.txt` 的内容，点击运行。

---

## 调试

- 如果「输出」节点显示错误 JSON → 检查 Code 节点的 `error` 输出，常见：LLM 输出不是 HTML 格式
- 如果 HTTP 返回 400 → HTML 缺失或不合法，检查 LLM 是否输出了 ```html 代码块包裹
- 如果 HTTP 返回 422 → html2pptx 转换失败（HTML 中可能使用了渐变、CSS 变量、4pt 字号等禁止项），查看 Dify 日志中的 `detail` 字段
- 如果生成的 PPTX 排版拥挤 → LLM 生成的 HTML 中 bar chart items 过多，建议控制在 23 条以内（全量展示上限）
- 如果文字重叠 → 检查是否有 gap < 3pt 或字号 < 5pt 的元素
