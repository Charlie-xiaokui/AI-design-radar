# Source Candidate Policy

## Candidate Priority

候选 Source 使用独立的审核层级，不改变正式 Source 现有的 1-5 priority 数据结构。

### P1

- 官网
- 官方博客或 News
- 官方 Release Notes
- 官方 GitHub Repo / Releases / Releases RSS
- 官方 RSS
- 官方 X
- 官方 YouTube

P1 confidence 默认 `0.96`。Accept 后映射为正式 Source priority `5`。

### P2

- Product Hunt 产品页面

P2 confidence 默认 `0.75`。Accept 后映射为正式 Source priority `3`。

### P3

- 官方 Discord
- 官方 Community / Forum

P3 confidence 默认 `0.62`。Accept 后映射为正式 Source priority `2`。

## Official Ownership

普通网页必须属于产品已有官网、Docs、Blog、News、Release Notes、Changelog、RSS 或正式 Sources 的官方域名或子域名。

GitHub、X、YouTube、Discord 等平台 URL 必须来自官方更新页面的直接链接，或来自人工维护的官方推荐配置。系统不会仅凭账号名称猜测官方身份。

## Forbidden Sources

候选生成会拒绝：

- 第三方博客平台和个人发布
- 媒体转载与科技媒体报道
- 聚合站、软件目录与评测站
- SEO 页面
- mirror / unofficial / fan site

当前显式拒绝包括 Medium、Substack、Dev.to、Hashnode、TechCrunch、VentureBeat、AlternativeTo、G2、Capterra、SaaSworthy、SourceForge 等域名，以及 URL 中的 mirror、unofficial、aggregator、directory、SEO 等信号。

## Generation Flow

1. 原有关键词分类先判断链接是否可能属于发布、博客、News 或视频。
2. Candidate Policy 再验证官方归属和禁止规则。
3. 通过后 reason 增加 `[P1]`、`[P2]` 或 `[P3]` 前缀。
4. Suggested Sources 管理页显示候选层级。
5. 候选仍需人工 Accept，不会自动进入正式 Sources。
