# Dify 工作流集成指南

## 架构

```
Dify Workflow
  │
  ├─ [1] LLM 节点
  │   输入：用户自然语言（如"生成冰箱各区域销售排名PPT"）
  │   输出：结构化 JSON（标题、KPI、图表数据、发现、建议）
  │
  ├─ [2] HTTP 请求节点
  │   POST http://your-server:3000/api/generate
  │   Body: {{LLM节点输出的JSON}}
  │   返回：.pptx 文件
  │
  └─ [3] 文件输出
      保存 PPTX 供下载
```

## Dify 配置步骤

### Step 1: 部署 API 服务

在 Ubuntu 服务器上：

```bash
# 克隆或上传项目
cd /opt/swiss-pptx-api

# 复制 .env
cp .env.example .env

# 启动
docker compose up -d

# 验证
curl http://localhost:3000/api/health
```

### Step 2: Dify 中配置 HTTP 请求节点

**节点类型**: HTTP 请求

**配置**:
- 方法: `POST`
- URL: `http://your-server-ip:3000/api/generate`
- Headers: `Content-Type: application/json`
- Body: JSON (来自上一个 LLM 节点的输出)

**响应处理**:
- 类型: 文件
- 文件名: `{{filename}}.pptx`

### Step 3: LLM 节点 System Prompt

让 LLM 将用户输入转为符合 API schema 的 JSON：

```
你是一个数据报告分析助手。根据用户的输入，输出符合以下 JSON Schema 的结构化数据。

## JSON Schema

{
  "filename": "英文短文件名（不含扩展名）",
  "title": {
    "text": "单行断言标题，强调核心数据发现"
  },
  "tag": "英文标签，如 SUPPLY CHAIN · MAY 2026",
  "lang": "zh 或 ja（根据内容语言）",
  "summary_kpis": [
    { "value": "数值", "unit": "单位", "note": "说明", "accent": false },
    { "value": "高亮数值", "unit": "单位", "note": "说明", "accent": true },
    { "value": "警告数值", "unit": "单位", "note": "说明", "warn": true }
  ],
  "bar_chart": {
    "col_label": "图表列标题",
    "val_label": "数值列标题",
    "max_value": 最大值的原始数字,
    "items": [
      { "rank": 1, "label": "名称", "value": 原始数字, "accent": true },
      { "rank": 2, "label": "名称", "value": 原始数字 },
      { "rank": 3, "label": "名称", "value": 负数, "warn": true }
    ]
  },
  "findings": {
    "title": "发现区块标题",
    "items": [
      { "bold": "加粗部分", "text": " 后续文字", "accent": true },
      { "bold": "加粗部分", "text": " 后续文字", "warn": true }
    ]
  },
  "diagnoses": {
    "items": [
      { "num": "①", "text": "诊断文字" }
    ]
  },
  "actions": {
    "items": [
      { "title": "建议标题", "desc": "建议详情" },
      { "title": "紧急建议", "desc": "详情", "warn": true }
    ]
  },
  "comparison": {
    "title": "对比标题",
    "max": 对比最大值,
    "items": [
      { "label": "名称", "label_val": "显示数值", "value": 原始数字 },
      { "label": "名称", "label_val": "显示数值", "value": 原始数字, "warn": true }
    ]
  },
  "footer": "页脚免责声明"
}

## 规则
1. 输出纯 JSON，不要 markdown 代码块包裹
2. 图表条数 ≤ 23 条
3. 发现 3-4 条，诊断 1-3 条，建议 1-3 条
4. 标题为一句话的断言（≤ 50 字）
5. 使用原始数字值，不要用"万"等中文单位
```

### Step 4: 工作流测试

1. 在 Dify 中输入："生成上个月各区域冰箱销售排行榜"
2. LLM 节点将自然语言转为 JSON
3. HTTP 节点发送 JSON 给 API
4. API 返回 .pptx 文件供下载

## API 参考

### POST /api/generate

**请求体**: JSON（见上方 Schema）

**响应**:
- 成功: `200` + `.pptx` 文件二进制
- 验证失败: `400` + `{"error": "..."}`
- 转换失败: `422` + `{"error": "...", "detail": "...", "debug_html": "..."}`
- 服务器错误: `500` + `{"error": "..."}`

**响应 Headers**:
```
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="xxx.pptx"
```

### GET /api/health

**响应**: `{"status":"ok","service":"swiss-pptx-api"}`

## 模型容量参考

| 模型 | 单请求 Token | 成功率 |
|------|-------------|--------|
| GPT-4o / Claude | ~2,000 output | 高 |
| DeepSeek-V3 | ~2,500 output | 中高 |
| Qwen 72B | ~2,000 output | 中 |

小型模型（7B-14B）可能在 JSON Schema 严格遵循上有困难，建议使用 ≥ 70B 模型。
