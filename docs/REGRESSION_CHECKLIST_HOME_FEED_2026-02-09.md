# 首页标签与图片管理联调回归清单（可执行）

执行时间：2026-02-09 09:40 EST  
执行环境：`http://localhost:8000`（本地后端）

## 一、回归目标
1. 超管可正常读取首页分类与专题配置
2. `show_on_home=false` 的分类不会出现在 H5 顶部标签
3. H5 标题搜索逻辑正确（命中/不命中）
4. 专题接口可用

## 二、执行步骤（可复用）
1. 超管登录接口验证
- `POST /api/v1/auth/login`

2. 后台分类接口验证
- `GET /api/v1/pins/admin/tags`
- 检查返回字段包含：`show_on_home`

3. H5标签接口验证
- `GET /api/v1/pins/tags`
- 确认仅返回 `is_active=true && show_on_home=true` 的分类

4. 搜索验证（按标题）
- `GET /api/v1/pins?search=Y2K%20Pop`
- `GET /api/v1/pins?search=random-no-hit-xyz`

5. 专题接口验证
- `GET /api/v1/pins/admin/theme`
- `GET /api/v1/pins/theme/public`

## 三、实测结果
| 检查项 | 结果 | 说明 |
|---|---|---|
| 超管登录 | PASS | status=200 |
| 后台分类列表接口 | PASS | status=200, count=15 |
| 分类包含 `show_on_home` 字段 | PASS | sample keys: `name/sort_order/is_active/show_on_home/...` |
| H5标签接口可用 | PASS | status=200, count=12 |
| 隐藏标签不出现在H5标签 | PASS | 隐藏标签未泄露到 `/pins/tags` |
| 标题搜索命中（`Y2K Pop`） | PASS | 返回 `Y2K Pop` |
| 标题搜索无匹配返回0 | PASS | `random-no-hit-xyz` 返回 0 条 |
| 专题设置接口可用 | PASS | admin/public 均为 200 |

## 四、结论
首页标签与图片管理主链路当前回归通过，可继续进入下一项（搜索体验细节优化/运营侧体验增强）。
