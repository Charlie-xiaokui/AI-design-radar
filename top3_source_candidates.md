# Top 3 Source Candidates

基于 `top3_source_audit.md` 生成。仅补齐缺失 Coverage 维度，不提供重复覆盖来源，不修改 `sources.json`，不自动 Accept。

## OpenAI

当前 Coverage 为 `5/5`，Identity、Updates、Community、Discovery、Media 均已覆盖。

**无候选 Source。**

## Cursor

当前 Coverage 为 `5/5`，Identity、Updates、Community、Discovery、Media 均已覆盖。

**无候选 Source。**

## Manus

| 产品 | URL | Type | Purpose | Priority | 理由 |
| --- | --- | --- | --- | --- | --- |
| Manus | https://manus.im/updates | release_notes | updates | P1 | Manus 官网 Resources 区直接提供的官方 Updates 页面，补齐 Updates。 |
| Manus | https://manus.im/blog | blog | media | P1 | Manus 官方 Blog 包含持续更新的产品功能和工作流案例，补齐 Media。 |
| Manus | https://x.com/manusai | x | discovery | P1 | Manus 官方 Docs 页脚直接链接并确认的官方 X 账号，补齐 Discovery。 |
| Manus | https://events.manus.im/ | community | community | P3 | Manus 官网 Community 区直接链接的官方 Events/Fellows 入口，补齐 Community。 |

### 兼容说明

当前 Source Network 数据模型尚无 `community` / `forum` type，Coverage 的 Community 也仅统计 `github_repo`。因此 Manus Events 是有效的 P3 官方 Community 候选，但在模型支持该类型前不应直接 Accept 为正式 Source。
