# Runtime Filter Regression Fix

## Symptom

前端抛出：

```text
Cannot read properties of undefined (reading 'filter')
```

异常会中断 Inspector 渲染，连带表现为 Coverage Inspect、查看信号源以及 dialog 关闭按钮失效。

## Root Cause

Candidate Pipeline 新增后，前端直接执行 `snapshot.candidates.filter(...)`。旧服务响应、候选文件缺失或部分缓存数据没有 `candidates` 字段时，该值为 `undefined`。

同类风险还存在于：

- `product.sources.filter/map`
- `product.suggested_sources.filter/map`
- `snapshot.coverage.filter`
- `snapshot.sources/health/audit/reviews` 的数组操作

候选渲染异常发生在 Inspector 主渲染流程内，因此会阻断 Formal Sources 后续交互，并造成打开/关闭行为看起来完全失效。

## Defensive Normalization

所有 `/api/registry` 和导入后的 Snapshot 现在先经过统一规范化：

```text
sources             -> []
health              -> []
reviews             -> []
audit               -> []
candidates          -> []
coverage            -> []
product.sources     -> []
product.suggested_sources -> []
product.source_types -> []
recommendations     -> {}
```

前端数组读取统一使用 `safeArray()`、`productSources()` 和 `snapshotSources()`。服务端候选、推荐、Follow-up、Accept 和 Formal Source 操作也增加了旧数据兼容保护。

## Candidate Panel

Suggested Sources 从独立 `data/source_candidates.json` 对应的 Snapshot `candidates` 读取。

候选与产品可通过以下任一值匹配：

- product id
- slug
- product_name

仅显示 `pending_review`。候选池不存在、为空或当前产品没有候选时显示：

```text
暂无待审核候选信号源
```

候选区具有独立的最小渲染保护。即使候选记录格式异常，也只回退为空状态并记录 Console error，不会阻断 Formal Sources、Add Source 或 Dashboard。

## Dialog Close Handling

两个 dialog 使用独立显式关闭按钮：

- `closeSourceDialog` 只关闭新增/编辑 Source dialog。
- `closeInspector` 只关闭 Source Inspector。

关闭处理会执行 `preventDefault()` 和 `stopPropagation()`，不依赖嵌套表单或 `method=dialog` 的隐式提交行为。

## Regression Tests

自动测试覆盖：

1. `product.sources` 缺失时规范化为 `[]`。
2. `product.suggested_sources` 缺失时规范化为 `[]`。
3. `source_candidates.json` 对应数据为空或缺失时规范化为 `[]`。
4. Coverage 缺失时规范化为 `[]`。
5. Candidate Pipeline 仍接入 Inspector。
6. Suggested Sources 空状态存在。
7. 候选渲染具有独立异常保护。
8. Add Source 与 Inspector 使用独立关闭处理。

## Browser Verification

在全新构建的 Source Registry 页面中真实验证：

| Step | Result |
| --- | --- |
| 刷新页面 | 页面正常加载 |
| 点击 Manus Inspect | 打开 Manus Inspector，显示 Formal Sources、4 条 Candidate、Add Source |
| 关闭 Manus Inspector | 仅 Inspector 关闭 |
| 点击 Claude Inspect | 打开 Claude Inspector，Suggested Sources 显示空状态 |
| 点击列表“查看信号源” | 打开对应 Manus Inspector |
| 打开新增 Source | Source dialog 正常打开 |
| 点击新增 Source 关闭按钮 | 仅 Source dialog 关闭 |
| 检查 Console | 无 error、warning 或 `filter undefined` 异常 |

`data/sources.json` 未被修改。
