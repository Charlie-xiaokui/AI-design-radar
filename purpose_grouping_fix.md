# Purpose Grouping Fix

## 修复内容

### 折叠与展开

分组标题和箭头现在共用同一个可点击按钮。点击后会同步更新：

- group 的 `collapsed` class
- source rows 容器的 `hidden` 属性
- 标题的 `aria-expanded`
- 当前产品和 Purpose 对应的 localStorage 记录

原问题的根因是 `.formal-source-list { display: grid; }` 覆盖了浏览器对 `[hidden]` 的默认隐藏样式。现已增加：

```css
.formal-source-list[hidden] { display: none !important; }
```

因此折叠后 rows 会真实隐藏，其他分组不受影响，刷新后仍保持状态。

### Purpose 自动归组

保存 Source 时不再忽略 API 返回结果。前端会立即用返回的 product 更新本地 snapshot，并重新计算 groupedSources、重绘 Inspector。

服务端更新规则也已明确：

- Purpose 未改变：保留原数组位置。
- Purpose 改变：从旧位置移除，插入目标 Purpose 分组底部。
- 更新写回 `data/sources.json`。
- 服务端随后重新生成 Coverage 派生文件。

真实测试将 `source-claude-anthropic-x` 从 `discovery` 改为 `media`：旧分组计数变为 0，Source 立即出现在 Media 分组末尾，刷新后仍保持。

### 拖拽范围

拖拽手柄改为 Source row 内的绝对定位元素，不再占据贯穿所有分组的独立网格列。测试几何结果显示 handle 的顶部和底部完全位于 row 边界内。

Group header：

- 没有 `draggable` 属性
- 不包含 drag handle
- 不参与排序事件

当前只支持同 Purpose 分组内拖拽。跨组 hover 时：

- `dropEffect = none`
- 不显示 Drop Indicator
- 目标组显示红色弱提示和 `not-allowed` 光标

跨组移动必须通过修改 Purpose 并保存完成。

## 测试结果

1. Collapse Identity group：通过，`aria-expanded=false`、rows hidden。
2. Expand Identity group：通过，`aria-expanded=true`、rows visible。
3. Change Purpose discovery -> media：通过，更新请求 `200`。
4. Source moves Discovery -> Media：通过，立即移动到 Media 分组末尾。
5. Refresh keeps new group：通过，JSON 和刷新页面均为 media。
6. Drag within same group：通过，Updates 内部顺序改变，排序请求 `200`。
7. Group header is not draggable：通过，五个标题均无 `draggable`，也不包含 handle。

此外，`npm run test:source-network` 已增加 Purpose 迁移到目标组末尾、刷新持久化、同组排序不影响其他组槽位的回归断言。

## 数据说明

页面验证期间真实修改了 Claude 的 Purpose 和 Updates 顺序。验证结束后已恢复测试前的 `data/sources.json`，并重新生成 Coverage 与 Review 派生文件。
