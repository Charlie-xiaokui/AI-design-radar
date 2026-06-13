# Source Inspector Validation

验证日期：2026-06-12  
验证产品：Cursor  
验证方式：在真实管理页面执行删除与 HTML5 拖拽，接受原生确认框，并在每一步读取实际落盘的 `data/sources.json`。

## 结论

删除 source 和拖拽排序均真实工作，HTTP 请求均返回 `200`，刷新页面后状态保持。

## A. 删除 Source

- 删除对象：`cursor-github-repo`
- 删除前 sources 数量：`5`
- 删除后 sources 数量：`4`
- UI 移除耗时：约 `264ms`
- UI 立即消失：通过
- `sources.json` 记录减少：通过
- 刷新后仍不存在：通过
- Coverage 重新计算：通过，`5/5` -> `4/5`
- 删除请求状态：`200`

删除前顺序：

```text
cursor-homepage
cursor-changelog
cursor-github-repo
cursor-docs
cursor-x
```

删除后、刷新后的顺序：

```text
cursor-homepage
cursor-changelog
cursor-docs
cursor-x
```

## B. 拖拽排序

操作：将最后一条 `cursor-x` 拖到第一位。

拖拽前顺序：

```text
cursor-homepage
cursor-changelog
cursor-docs
cursor-x
```

拖拽后顺序：

```text
cursor-x
cursor-homepage
cursor-changelog
cursor-docs
```

- UI 顺序变化：通过
- `sources.json` 数组顺序变化：通过
- 刷新后顺序保持：通过
- 排序请求状态：`200`

## 实际修改的 sources.json 片段

删除并拖拽后的实际落盘片段如下：

```json
{
  "product_name": "Cursor",
  "sources": [
    {
      "id": "cursor-x",
      "type": "x",
      "url": "https://x.com/cursor_ai",
      "purpose": "discovery"
    },
    {
      "id": "cursor-homepage",
      "type": "homepage",
      "url": "https://cursor.com/",
      "purpose": "identity"
    },
    {
      "id": "cursor-changelog",
      "type": "release_notes",
      "url": "https://cursor.com/changelog",
      "purpose": "updates"
    },
    {
      "id": "cursor-docs",
      "type": "docs",
      "url": "https://docs.cursor.com/",
      "purpose": "media"
    }
  ]
}
```

## 数据处理

以上片段是验证过程中真实写入的数据。证据采集完成后，已恢复验证前的 `data/sources.json`，避免删除 Cursor 的正式 GitHub source 污染开发数据。
