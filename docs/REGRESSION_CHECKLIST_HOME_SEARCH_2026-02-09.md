# H5 首页搜索回归清单（按标题匹配）

执行时间：2026-02-09 09:42 EST  
执行环境：`http://localhost:8000`

## 一、检查目标
1. 搜索只按图片标题匹配（不按分类标签）
2. 大小写不敏感
3. 无匹配关键字返回 0 条
4. 前端触发方式为“用户确认后触发”（Enter / 点击搜索图标）

## 二、执行方式
脚本：`/Users/fengliangli/code/FigmaFrontend/backend/test_home_search_regression.py`

执行命令：
```bash
source /Users/fengliangli/code/FigmaFrontend/backend/venv311/bin/activate
python /Users/fengliangli/code/FigmaFrontend/backend/test_home_search_regression.py
```

## 三、实测结果
| 查询词 | 期望 | 实际 | 结果 |
|---|---|---|---|
| `Y2K Pop` | 命中标题 | 1 条：`Y2K Pop` | PASS |
| `y2k pop` | 大小写不敏感命中 | 1 条：`Y2K Pop` | PASS |
| `French` | 命中含该词标题 | 1 条：`Classic French Set` | PASS |
| `Classic French Set` | 精确标题命中 | 1 条：`Classic French Set` | PASS |
| `random-no-hit-xyz` | 无匹配 | 0 条 | PASS |

## 四、补充确认（代码）
- 搜索栏文案：`Search by title (e.g. Classic French Set)`
- 搜索触发：
  - Enter
  - 点击搜索图标
- 无输入确认时不会自动发起搜索请求

## 五、结论
当前 H5 首页搜索逻辑符合预期：按标题搜索、大小写不敏感、无匹配返回空结果。
