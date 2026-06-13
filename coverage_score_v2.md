# Coverage Score v2

Generated at: 2026-06-11T02:17:51.893Z

## 旧规则

旧版为 8 分制：updates +2、media +2、discovery +1、community +1、任意 GitHub source +1、多个 X source +1。Identity/homepage 不单独计分，因此重复配置 X 账号可以提高 Coverage Score。

## 新规则

新版为 5 分制，每项能力最多 1 分：

| Capability | Eligible Sources | Score |
| --- | --- | ---: |
| identity | active homepage with purpose=identity | 1 |
| updates | release_notes, news, rss, github_releases, github_releases_rss with purpose=updates | 1 |
| community | github_repo with purpose=community | 1 |
| discovery | x or youtube with purpose=discovery | 1 |
| media | blog, docs, or youtube with purpose=media | 1 |

同一能力配置多个 source 只提高冗余度，不增加 Coverage Score。多个 X source 不再额外加分。五项能力全部具备即为 5/5。

## 受影响产品

由于评分量表和 identity 定义均发生变化，下列产品的数值分数发生变化：

| Product | Old Score | New Score | Missing Capability |
| --- | ---: | ---: | --- |
| Claude | 8/8 | 5/5 | none |
| Cursor | 7/8 | 5/5 | none |
| v0 | 5/8 | 4/5 | community |
| Lovable | 5/8 | 4/5 | community |
| Bolt | 7/8 | 5/5 | none |
| Manus | 0/8 | 1/5 | updates, community, discovery, media |
| Replit | 5/8 | 4/5 | updates |
| OpenAI | 7/8 | 5/5 | none |
| Figma AI | 5/8 | 4/5 | community |
| Notion AI | 5/8 | 4/5 | community |
| Linear | 5/8 | 4/5 | community |
| OpenHands | 7/8 | 5/5 | none |
| Cline | 7/8 | 5/5 | none |
| Continue | 7/8 | 5/5 | none |
| Flowise | 7/8 | 5/5 | none |
| Dify | 7/8 | 5/5 | none |
| n8n | 7/8 | 5/5 | none |
| Langflow | 7/8 | 5/5 | none |
| ComfyUI | 6/8 | 4/5 | discovery |
| Supabase AI | 7/8 | 5/5 | none |

Claude 是多个 X source 直接影响旧分数的产品：第二个 X 在旧规则中贡献 1 分，在新规则中仅作为冗余来源，不再加分。

## 新的 Top10 排名

同分产品按产品名称排序；同类 source 数量不用于打破平分。

| Rank | Product | Score | Identity | Updates | Community | Discovery | Media |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Bolt | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 2 | Claude | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 3 | Cline | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 4 | Continue | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 5 | Cursor | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 6 | Dify | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 7 | Flowise | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 8 | Langflow | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 9 | n8n | 5/5 | 1 | 1 | 1 | 1 | 1 |
| 10 | OpenAI | 5/5 | 1 | 1 | 1 | 1 | 1 |
