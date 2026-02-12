# 2026-02-12 后台导航调整（Staff / Customers）

## 调整目标
仅调整后台管理系统菜单位置，不改业务逻辑与页面功能。

## 变更内容
1. 左侧主导航新增顺序：
- Dashboard
- Appointments
- Staff / Technicians
- Customers
- Stores
- Promotions
- More

2. More 页面移除重复入口：
- 移除 `Staff / Technicians`
- 移除 `Customers`

## 涉及文件
- `admin-dashboard/src/layout/navConfig.ts`
- `admin-dashboard/src/pages/More.tsx`

## 验证结果
- `admin-dashboard` 构建通过。
- 导航入口可正常跳转到：
  - `/admin/staff`
  - `/admin/customers`
