# 2026-02-22 Customers 推荐关系可见化

## 目标
在后台管理系统中查看客户推荐关系：
- 该客户是被谁推荐注册的
- 该客户推荐了哪些人注册

## 后端
新增接口：
- `GET /api/v1/customers/admin/{customer_id}/referrals`

返回结构：
- `referred_by`: 当前客户的推荐人（可为空）
- `invited_users`: 当前客户推荐注册的用户列表

字段包含：
- 关系类型、用户ID、用户姓名、手机号（默认脱敏）、推荐状态、注册时间、奖励状态

权限与隐私：
- 仅后台管理账号可访问（沿用 customers 管理权限）
- `include_full_phone=true` 仅超管可用
- 店铺管理员超出本店范围的关联用户将显示为 `Out of scope customer`，手机号返回 `-`

## 前端（Admin Customers）
在 `Customer Detail` 右侧弹窗新增 `Referrals` 区块：
- `Referred By`
- `Invited Users (N)`

并新增后端版本兼容降级：
- 若接口返回 `404`，页面不报错
- 显示“当前后端版本暂不支持客户推荐关系接口”提示
- 其他客户信息继续正常展示

## 另外同步文案
H5 Referral 页面文案调整为“注册即送券”：
- 从“first booking”改为“right after registration / immediately after successful registration”

## 涉及文件
- `backend/app/api/v1/endpoints/customers.py`
- `admin-dashboard/src/api/customers.ts`
- `admin-dashboard/src/pages/Customers.tsx`
- `frontend/src/components/ReferralPage.tsx`
