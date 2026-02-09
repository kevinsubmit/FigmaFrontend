# 上传安全加固说明（SQL 注入 / 脚本注入 / 病毒扫描）

## 1. 已落地能力

- 后端 ORM 查询为参数化形式，未发现拼接原始 SQL 执行。
- 图片上传已启用“真实图片内容校验”（不是只看扩展名和 MIME）。
- 图片压缩失败时不再回退保存原始文件，避免伪装脚本落盘。
- 上传文本字段（标题、描述、标签）已拦截 HTML/脚本字符。
- 上传资源响应增加安全头，阻止浏览器嗅探执行。
- 支持可选 ClamAV 扫描（开关可控）。

## 2. ClamAV 配置项（`backend/.env`）

```env
SECURITY_ENABLE_CLAMAV=True
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_SECONDS=5
SECURITY_SCAN_FAIL_CLOSED=True
```

- `SECURITY_ENABLE_CLAMAV=False`：关闭扫描（默认）。
- `SECURITY_SCAN_FAIL_CLOSED=True`：扫描服务不可用时拒绝上传（更安全）。
- `SECURITY_SCAN_FAIL_CLOSED=False`：扫描服务不可用时放行（可用性优先）。

## 3. ClamAV 启动示例

```bash
docker run -d --name nailsdash-clamav -p 3310:3310 clamav/clamav:stable
```

启动后重启后端，使新环境变量生效。

## 4. Nginx 安全配置

- 示例文件：`docs/security/nginx_uploads_hardening.conf`
- 作用：
  - `/uploads/` 增加 `nosniff`、`CSP` 等头
  - 明确拒绝可执行/脚本类扩展名

