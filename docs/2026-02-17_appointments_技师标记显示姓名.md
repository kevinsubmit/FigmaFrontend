# 2026-02-17 Appointments 技师标记显示姓名

## 背景
原先在预约列表中，指定技师订单只显示统一标签 `Tech`，无法一眼识别具体是哪位技师。

## 本次调整
文件：`admin-dashboard/src/pages/AppointmentsList.tsx`

1. 将 `Tech` 标签改为直接显示技师姓名。
2. 显示规则：
   - 有指定技师（`technician_id` 有值）时展示姓名标记。
   - 若极端情况下姓名暂时不可解析，显示兜底文案 `Assigned`。
3. 两处同步：
   - 左侧 Timeline 卡片右上角
   - 右侧预约列表 Customer 列右上角

## 效果
- 运营无需点开详情即可看到“是否指定技师 + 指定的是谁”。
- 与 `New` 新客标签可并列显示，信息密度更高。
