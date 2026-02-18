# VIP 等级后台可配置（超管）

## 本次实现
- 新增 `vip_level_configs` 数据表，存储 VIP 等级规则。
- 新增超管接口：
  - `GET /api/v1/vip/admin/levels`：读取等级配置
  - `PUT /api/v1/vip/admin/levels`：批量保存等级配置
- 原接口升级：
  - `GET /api/v1/vip/levels` 与 `GET /api/v1/vip/status` 改为优先读取数据库配置（无配置时回退默认值）。
- 后台管理新增页面：
  - `More -> VIP Levels`（仅超级管理员可见）
  - 可配置：`Level`、`最低消费金额`、`最低到店次数`、`权益说明`、`启用状态`

## 规则校验
- 必须保留 `Level 0`
- `Level` 不能重复
- `min_spend`、`min_visits` 必须 `>= 0`
- 等级阈值需递增（金额和次数都不能比上一档小）
- 权益说明不能为空

## 数据迁移
- Alembic：`backend/alembic/versions/20260218_210000_add_vip_level_configs.py`
- 自动写入默认 0-10 档 VIP 规则

## 对业务的影响
- H5 Profile、Settings 的 VIP 展示会随后台配置变化实时生效（无需前端改代码）。
