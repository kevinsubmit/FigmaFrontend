# 首页图片流后台可用性增强联调清单（第 3/4 步）

执行时间：2026-02-09（本地）  
执行人：Codex  
关联代码：`/Users/fengliangli/code/FigmaFrontend/admin-dashboard/src/pages/HomeFeedManager.tsx`

## 一、本轮目标
1. 后台可直观看到“首页标签展示顺序”
2. 分类列表支持“全部 / 仅首页显示”快速筛选
3. 图片列表支持一键切换状态（Published / Offline / Draft）
4. 保证 H5 搜索与前后端构建未被回归影响

## 二、已落地功能（后台）
1. 首页标签顺序预览
- 仅展示 `is_active=true && show_on_home=true` 的分类
- 按 `sort_order` 顺序展示，便于运营确认首页标签顺序

2. 分类列表范围筛选
- 支持切换：`全部`、`仅首页显示`
- 在“仅首页显示”视图下，为避免误排序，禁用上下移动按钮

3. 图片状态快捷操作
- 在图片列表行新增快捷按钮：`Publish`、`Offline`、`Draft`
- 一键更新状态并刷新当前列表状态

## 三、可复用联调步骤
1. 打开后台页面：`/home-feed`（超管账号）
2. 检查“首页标签顺序预览”是否按预期显示
3. 将分类列表切换到“仅首页显示”，确认列表与预览一致
4. 选择任意图片，点击 `Offline` / `Publish`，确认状态实时变化
5. 打开 H5 首页，确认标签与图片展示仍正常

## 四、本地执行结果
| 检查项 | 命令/动作 | 结果 |
|---|---|---|
| Admin 构建 | `npm run build`（`admin-dashboard`） | PASS |
| H5 构建 | `npm run build`（`frontend`） | PASS |
| H5 搜索回归脚本 | `./.venv/bin/python backend/test_home_search_regression.py` | PASS |

补充说明：
- 搜索回归脚本结果：`Y2K Pop / y2k pop / French / Classic French Set` 命中正常，`random-no-hit-xyz` 返回 0 条。
- 本轮未改动后端接口契约，仅增强后台可用性与运营操作效率。

## 五、结论
本轮“后台 Home Feed 可用性增强”已完成，且关键构建与搜索回归通过，可继续进入下一步（例如：补充 Playwright/UI 自动化回归）。
