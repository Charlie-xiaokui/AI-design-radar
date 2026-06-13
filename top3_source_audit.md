# Source Coverage Audit: OpenAI, Cursor, Manus

Audit date: 2026-06-12  
Scope: read-only audit of `data/sources.json`. No source was added, edited, accepted, or deleted.

Candidate rules follow `source_candidate_policy.md`: only verified P1 official sources, P2 Product Hunt, and P3 official Community sources are listed. Third-party blogs, press coverage, aggregators, SEO sites, mirrors, and personal sites are excluded.

## OpenAI

### 1. 当前 Sources

| Type | Purpose | URL | Status |
| --- | --- | --- | --- |
| homepage | identity | https://openai.com/ | active |
| release_notes | updates | https://help.openai.com/en/articles/6825453-chatgpt-release-notes | active |
| github_repo | community | https://github.com/openai | active |
| docs | media | https://platform.openai.com/docs/ | active |
| x | discovery | https://x.com/OpenAI | active |
| rss | updates | https://openai.com/news/rss.xml | active |

### 2. Coverage Score

**5/5**

### 3. 缺失维度

| Dimension | Status |
| --- | --- |
| Identity | 已覆盖 |
| Updates | 已覆盖，2 条 |
| Community | 已覆盖 |
| Discovery | 已覆盖 |
| Media | 已覆盖 |

### 4. 建议补充 Source

| Priority | URL | Type | Purpose | Reason |
| --- | --- | --- | --- | --- |
| P1 | https://openai.com/news/ | news | updates | OpenAI 官方 News，提供产品发布、工程与研究更新；官网已直接列出该入口。 |
| P1 | https://www.youtube.com/OpenAI | youtube | media | OpenAI 官网页脚直接链接的官方 YouTube，适合视频演示和发布直播素材。 |
| P3 | https://community.openai.com/ | community | community | OpenAI 官网 Developers 区直接链接的官方开发者社区。 |

说明：当前 Coverage 已满分，这些建议用于增强更新、媒体和社区冗余，不增加 Coverage Score。

## Cursor

### 1. 当前 Sources

| Type | Purpose | URL | Status |
| --- | --- | --- | --- |
| homepage | identity | https://cursor.com/ | active |
| release_notes | updates | https://cursor.com/changelog | active |
| github_repo | community | https://github.com/getcursor/cursor | active |
| docs | media | https://docs.cursor.com/ | active |
| x | discovery | https://x.com/cursor_ai | active |

### 2. Coverage Score

**5/5**

### 3. 缺失维度

| Dimension | Status |
| --- | --- |
| Identity | 已覆盖 |
| Updates | 已覆盖 |
| Community | 已覆盖 |
| Discovery | 已覆盖 |
| Media | 已覆盖 |

### 4. 建议补充 Source

| Priority | URL | Type | Purpose | Reason |
| --- | --- | --- | --- | --- |
| P1 | https://cursor.com/blog | blog | media | Cursor 官方 Blog 持续发布产品和设计变化，并包含图片、视频与产品案例。 |
| P1 | https://www.youtube.com/@cursor_ai | youtube | media | Cursor Blog 的 Videos 区直接链接该官方频道，适合收集 UI 演示视频。 |
| P3 | https://forum.cursor.com/ | community | community | Cursor 官网直接链接的官方 Forum，包含官方 Announcements、Showcase 和用户工作流。 |

说明：Cursor 官网同时列出第三方 Press 链接；这些媒体转载不符合候选策略，未纳入建议。

## Manus

### 1. 当前 Sources

| Type | Purpose | URL | Status |
| --- | --- | --- | --- |
| homepage | identity | https://manus.im/ | active |
| x | discovery | 空 | disabled，等待人工确认 |

### 2. Coverage Score

**1/5**

### 3. 缺失维度

| Dimension | Status |
| --- | --- |
| Identity | 已覆盖 |
| Updates | **缺失** |
| Community | **缺失** |
| Discovery | **缺失** |
| Media | **缺失** |

### 4. 建议补充 Source

| Priority | URL | Type | Purpose | Reason |
| --- | --- | --- | --- | --- |
| P1 | https://manus.im/updates | release_notes | updates | Manus 官网 Resources 区直接提供的官方 Updates 页面。 |
| P1 | https://manus.im/blog | blog | media | Manus 官方 Blog 持续发布产品功能和工作流案例，近期仍有高频产品内容。 |
| P1 | https://x.com/manusai | x | discovery | Manus 官方 Docs 页脚直接链接的 X 账号，已由第一方页面确认，不再属于猜测地址。 |
| P3 | https://events.manus.im/ | community | community | Manus 官网 Community 区直接链接的官方 Events/Fellows 社区入口。 |

采用前三条可补齐 Updates、Discovery、Media。Community 建议存在模型兼容问题：当前 Source Network `type` 枚举没有 `community/forum`，且 Coverage Community 仅统计 `github_repo`；本次只记录审计候选，不修改模型或数据。

## Audit Summary

| Product | Score | Missing Identity | Missing Updates | Missing Community | Missing Discovery | Missing Media |
| --- | ---: | --- | --- | --- | --- | --- |
| OpenAI | 5/5 | No | No | No | No | No |
| Cursor | 5/5 | No | No | No | No | No |
| Manus | 1/5 | No | Yes | Yes | Yes | Yes |

No P2 Product Hunt URL was included because no first-party page reviewed in this audit confirmed a specific official Product Hunt listing for these products.
