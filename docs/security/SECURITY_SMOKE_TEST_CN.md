# 安全冒烟测试（接口级）

本脚本用于发版前快速检查常见 Web 风险是否被拦截：
- 未登录上传拦截
- 伪造图片/头像上传拦截
- `javascript:` 恶意 URL 拦截
- 后台文本字段脚本注入拦截
- SQL 注入风格关键字不会打崩接口

脚本路径：
- `/Users/fengliangli/code/FigmaFrontend/scripts/security_smoke.py`

## 1. 执行前准备

1. 后端服务已启动（默认 `http://localhost:8000`）。
2. 准备一个可登录的超管账号（用于 admin 接口校验）。

## 2. 执行命令

在项目根目录运行：

```bash
ADMIN_PHONE=1231231234 \
ADMIN_PASSWORD='你的密码' \
python3 scripts/security_smoke.py
```

可选参数：

- `API_BASE`：默认 `http://localhost:8000/api/v1`
- `TEST_STORE_ID`：指定用于店铺图片接口测试的店铺 ID（不传则自动取第一个店铺）
- `SECURITY_SMOKE_TIMEOUT`：请求超时秒数，默认 15

示例：

```bash
API_BASE=http://localhost:8000/api/v1 \
TEST_STORE_ID=3 \
ADMIN_PHONE=1231231234 \
ADMIN_PASSWORD='你的密码' \
python3 scripts/security_smoke.py
```

## 3. 结果判定

- 每个用例会输出 `[PASS]` 或 `[FAIL]`
- 最后输出汇总：`Total / Passed / Failed`
- 只要 `Failed > 0`，就不建议发版，需先修复

## 4. 注意事项

- 脚本为“安全冒烟”，不等同于完整渗透测试。
- 建议在每次上线前固定执行一次，并保存输出日志。
- 如果你使用反向代理（Nginx/Ingress），请在生产环境配置：
  - `TRUST_X_FORWARDED_FOR=true`
  - `TRUSTED_PROXY_IPS` 为你的真实代理 IP 列表
