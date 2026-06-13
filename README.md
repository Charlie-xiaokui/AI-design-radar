# AI Design Radar - Source Registry

本地 JSON 驱动的 AI 产品信源管理模块。它包含 21 条 seed 数据、可视化 CRUD 管理页、导入导出、人工 URL 标记，以及基础 URL/GitHub 巡检器。

## 运行

要求 Node.js 24+。项目使用 Node 原生 TypeScript type stripping，不依赖第三方包。

```bash
npm start
```

打开 `http://127.0.0.1:4173`。

开发模式：

```bash
npm run dev
```

执行巡检：

```bash
npm run scan-sources
```

执行最近 30 天信源审计：

```bash
npm run audit-sources
```

输出：

- `data/source_audit.json`: 产品活跃度、页面媒体计数、评分和采集优先级。
- `source_audit_report.md`: 按 Tier 1/2/3 排序的人工可读报告与推荐原因。
- `source_registry_diagnostics.md`: 零更新高媒体、Homepage 错误、缺少 updates/media 源和待确认 X 地址。

管理页的 Source Inspector 优先展示产品的 `sources[]` 信号实体及其 purpose/status。URL 状态与错误来自 URL 级 `source_health.json`；最近更新时间及截图/GIF/视频数量来自产品级 `source_audit.json`，界面会明确标记这一数据范围。

诊断筛选支持 `updates_30d = 0`、Audit 媒体分大于等于 4、Medium/Low 采集优先级及 Health 错误，便于定位“媒体丰富但没有识别到更新”的信源配置问题。

Changelog 日期使用页面 `time[datetime]`、结构化日期字段和 ISO 日期文本做启发式识别；GitHub Release 使用公开 API；RSS 同时支持 RSS 与 Atom。不抓取 X 页面内容。

产品可额外配置 `release_notes_url`、`anthropic_news_url`、`claude_code_github_url`、`claude_code_releases_url` 和 `claude_code_rss_url`。这些 Release Notes、News、GitHub Release 与 Feed 会参与活跃度计算；Homepage 仅用于主页媒体检查，403 等失败不会直接扣减 `activity_score` 或采集优先级。

每个产品以 `sources[]` 作为 Source Network v2 信号模型。每条 source 保存 collector、最近检查/更新时间、独立媒体计数和 health。只有 `purpose=updates` 的活动信号计入 `updates_30d`，只有 `purpose=media` 计入媒体统计；`identity`、`discovery` 和 `community` 不计入活跃分。旧扁平 URL 字段继续保留用于兼容。

手动重新生成审核清单：

```bash
npm run generate:source-review
```

重新生成 Registry 诊断：

```bash
npm run generate:registry-diagnostics
```

生成 Source Coverage 数据与报告：

```bash
npm run generate:source-coverage
```

批量生成已知候选源，全部保持人工审核状态：

```bash
npm run suggest:sources
```

从 updates 页面提取轻量媒体/发现候选：

```bash
npm run discover:source-followups
```

Follow-up Scanner 只读取更新页面中的链接，不绕过反爬虫，也不抓取 X 页面内容。候选源必须在 Source Inspector 中 Accept 后才会进入正式 `sources[]`。

可选环境变量：

```bash
PORT=4173
HOST=127.0.0.1
SCAN_TIMEOUT_MS=12000
GITHUB_TOKEN=github_token_here
```

`GITHUB_TOKEN` 不是必需项，但可提高 GitHub API rate limit。

## 数据文件

- `data/sources.json`: Source 主数据，只保存产品和信源配置。
- `data/source_health.json`: 自动巡检结果，每次全量巡检后覆盖。
- `data/source_reviews.json`: 人工确认结果，与自动结果分开保存，避免被巡检覆盖。
- `source_review.md`: 产品设计模式、媒体分、信号分和审核状态清单；管理页修改 Source 后自动更新。
- `source_registry_diagnostics.md`: Registry 信号覆盖与异常诊断。

“待人工校对”定义为：产品至少有一个 URL 自动检查 `ok=true`，且对应 `manual_verified=false`。

## 巡检行为

- Homepage、Changelog、Product Hunt：读取状态、最终 URL、HTML title、meta description、`og:image` 和 `og:video`。
- GitHub：额外检查仓库是否存在、是否有 Release、README 是否包含图片/GIF/视频 Markdown、最新 Release 时间。
- X：只发起基础可访问性请求，不读取或解析页面正文。
- 不包含验证码、代理轮换、浏览器伪装或其他反爬绕过逻辑。

跳转通过请求前后的 URL 是否变化判断。超时由 `AbortController` 控制。

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/registry` | 获取 sources、health、reviews 快照 |
| POST | `/api/sources` | 新增 Source |
| PUT | `/api/sources/:id` | 编辑、暂停或恢复 Source |
| DELETE | `/api/sources/:id` | 删除 Source 及关联结果 |
| GET | `/api/sources/export` | 导出 `sources.json` |
| POST | `/api/sources/import` | 校验并替换 Source 列表 |
| POST | `/api/scan` | 运行一次全量巡检 |
| PUT | `/api/reviews/:sourceId/:sourceType` | 更新人工 URL 标记 |

## 迁移到 Supabase

页面只依赖 HTTP API，扫描器只依赖 `SourceRepository`，因此迁移时不需要重写 UI 或扫描规则。

建议建立三张表：

1. `sources`: 对应 `Source`，`id` 为主键，`slug` 唯一，枚举字段用 check constraint。
2. `source_health`: 以 `(source_id, source_type)` 为唯一键，保存最近一次结果；如需历史趋势，可改为 append-only 并增加索引。
3. `source_reviews`: 以 `(source_id, source_type)` 为联合主键，保存人工确认和媒体标记。

实施步骤：

1. 新建 `SupabaseSourceRepository implements SourceRepository`。
2. 新建 Supabase 版 metadata repository，实现 health/review 的查询与 upsert。
3. 在服务启动时按环境变量选择 JSON 或 Supabase repository。
4. 用 `sources.json` 做一次性 seed 导入。
5. 为管理 API 增加认证，并在 Supabase 配置 RLS；巡检写入使用服务端 service role，前端不暴露该密钥。
6. 将 `scan-sources` 放入 Supabase Cron、GitHub Actions 或独立 worker；扫描函数本身无需修改。

## 注意

当前 `npm run typecheck` 使用 Node 内置 TypeScript parser 做零依赖语法验证。团队项目中建议安装 `typescript` 和 `@types/node`，再将命令替换为 `tsc --noEmit`，获得完整静态类型检查。
