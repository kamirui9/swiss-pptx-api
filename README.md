# swiss-pptx-api

数据分析结果 → Swiss IKB 风格 PPTX 自动生成。

## 快速开始

```bash
cp .env.example .env
docker compose up -d
```

## API

### POST /api/generate

见 `test-payload.json` 和 `DIFY-GUIDE.md`。

## Dify 导入

1. 在 Dify 中选择 **导入 DSL 文件**
2. 选择 `dify-workflow.yml`
3. 导入后，修改 **HTTP PPTX 生成** 节点的 URL：
   - 同一台机器 Docker 部署：`http://host.docker.internal:3000/api/generate`
   - 局域网 IP：`http://192.168.x.x:3000/api/generate`
   - 公网服务器：`https://your-domain.com/api/generate`

## 文件说明

| 文件 | 用途 |
|------|------|
| `server.js` | Express API 服务 |
| `html2pptx.js` | HTML→PPTX 转换引擎 |
| `templates/swiss-template.js` | Swiss IKB HTML 模板生成器 |
| `dify-workflow.yml` | Dify 工作流 DSL（直接导入） |
| `test-payload.json` | 测试数据 |
| `test-api.sh` | 快速测试脚本 |
| `DIFY-GUIDE.md` | Dify 集成详细步骤 |
| `docker-compose.yml` | Docker Compose 部署配置 |
| `Dockerfile` | Docker 镜像定义 |
