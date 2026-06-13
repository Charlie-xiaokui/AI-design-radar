# Inspect Button Regression Fix

## Symptom

Coverage Dashboard 的 Product 名称和 Action / Inspect 点击后，Inspector 内容会被写入 DOM，但 `<dialog>` 没有保持打开，因此页面看起来没有任何反应。

## Root Cause

问题包含两个边界：

1. `renderInspector()` 在触发点击的同一事件周期内同步调用 `showModal()`。当前浏览器会让刚打开的 dialog 立即结束打开状态，造成标题和内容已更新、`dialog.open` 却仍为 `false`。
2. Dashboard 只使用 `coverage.source_id` 精确查找 `sources[].id`。当 Coverage 数据来自旧文件、只有 `product_name`，或调用方传入 slug 时，查找静默失败。

Candidate Pipeline 不是数据损坏源，但它扩大了 Inspector 渲染内容，使这次 UI 回归在最近改动后暴露出来。

## Fix

新增统一入口：

```text
openInspector(productKey)
  -> match sources by id
  -> fallback to slug
  -> fallback to product_name
  -> render Inspector
  -> defer dialog.showModal() until the click event has completed
```

Coverage 行会先把 `source_id` 或 `product_name` 映射到当前 `sources.json` 中真实存在的产品 id，再写入 `data-coverage-inspect`。

以下入口均调用 `openInspector(productKey)`：

- Product 名称按钮
- Action / Inspect 按钮
- Previous Product / Next Product 导航

按钮显式设置 `type=button`，避免未来被嵌入表单时触发表单提交。

## Inspector Content

打开后保留并验证：

- Formal Sources
- Suggested Sources / Candidate Pool
- `+ Add Source`
- Audit 汇总和 Source 运行状态

## Regression Tests

`npm run test:inspector-navigation` 覆盖：

1. Manus Coverage `source_id` 映射到 Manus。
2. Claude Coverage `source_id` 映射到 Claude。
3. Cursor Coverage `source_id` 映射到 Cursor。
4. slug 可以打开对应 Inspector。
5. product_name 可以打开对应 Inspector。
6. Candidate Pipeline 仍由 Inspector 渲染。
7. Inspector 仍包含 Formal Sources 和 Add Source。
8. dialog 打开被延迟到触发点击结束后。

## Browser Verification

在更新后的本地页面中进行了真实点击：

| Interaction | Result |
| --- | --- |
| Manus Action / Inspect | Inspector 打开，标题 Manus，Formal Sources 可见，4 条 Candidate 可见，Add Source 可见 |
| Claude Action / Inspect | Inspector 打开，标题 Claude，Formal Sources 和 Add Source 可见 |
| Cursor Action / Inspect | Inspector 打开，标题 Cursor，Formal Sources 和 Add Source 可见 |
| Manus Product 名称 | Inspector 打开，标题 Manus，4 条 Candidate 可见 |

浏览器控制台没有 error 或 warning。

`data/sources.json` 未被修改。
