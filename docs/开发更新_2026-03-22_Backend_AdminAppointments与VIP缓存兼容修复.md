# 2026-03-22 Backend Admin Appointments 与 VIP 缓存兼容修复

## 问题
后台管理页 `Appointments` 页面请求：

- `GET /api/v1/appointments/admin?limit=200&include_full_phone=false`

浏览器表现为 CORS 报错，但后端真实问题是接口先返回了 `500`。

日志中的根因：

- `'dict' object has no attribute 'level'`

## 原因
`load_vip_level_rows(...)` 走缓存层后返回的是 `dict` 列表。
但以下两个调用方仍按 ORM row / object 方式取字段：

- `backend/app/api/v1/endpoints/appointments.py`
- `backend/app/api/v1/endpoints/vip.py`

因此在读取：

- `row.level`
- `row.min_spend`
- `row.min_visits`
- `row.benefit`
- `row.is_active`

时触发 `AttributeError`。

## 修复
在两个入口统一增加 `_field(...)` 兼容层：

- `dict` -> `row.get(...)`
- ORM row/object -> `getattr(...)`

不改缓存层契约，只修使用方。

## 验证
修复后实测：

- `GET /api/v1/appointments/admin?limit=5&include_full_phone=false` -> `200 OK`
- `GET /api/v1/vip/admin/levels` -> `200 OK`

并且响应头已包含：

- `access-control-allow-origin: http://127.0.0.1:3100`

说明之前的浏览器报错是接口 `500` 引发的表象，不是 CORS 配置缺失。
