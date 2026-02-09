# 预约主流程回归清单（H5 + 后台）

## 目标
验证当前“预约流程走通”在核心链路上可用：
1. H5 过去时间不可预约
2. H5 未来时间可成功预约
3. 后台可处理预约并标记 `No Show`
4. 风控数据能回写（`no_show_30d`）

## 一、执行前准备
1. 启动后端服务（默认 `http://localhost:8000`）
2. 确认数据库已迁移到最新（包含风控表）
3. 准备账号：
   - 普通用户（客户）账号：用于发起预约
   - 管理员账号（超管或已审批店长）：用于标记 `No Show` 和查看风控
4. 确认店铺已配置可预约服务（来自 `service-catalog`）

## 二、一键脚本回归
脚本路径：
- `/Users/fengliangli/code/FigmaFrontend/backend/test_booking_risk_flow.py`

执行命令（在 `backend` 目录）：

```bash
CUSTOMER_PHONE=15551234567 \
CUSTOMER_PASSWORD=your_customer_password \
ADMIN_PHONE=15550000001 \
ADMIN_PASSWORD=your_admin_password \
python test_booking_risk_flow.py
```

可选环境变量：
- `BASE_URL`：默认 `http://localhost:8000/api/v1`
- `STORE_ID` / `SERVICE_ID`：手动指定门店与服务；不填则自动取第一个可用项

## 三、脚本覆盖步骤
1. 客户登录
2. 过去时间下单（预期 400 拒绝）
3. 明天 10:00 下单（预期成功）
4. 客户预约列表可见该预约
5. 管理员标记 `No Show`（预期成功，状态为 `cancelled` 且 `cancel_reason=No show`）
6. 管理员查询风控用户列表，确认该客户 `no_show_30d >= 1`

## 四、通过标准
脚本输出所有关键步骤为 `PASS`，且进程退出码为 `0`。

## 五、人工补充检查（建议）
1. H5 页面：
   - 选择过去时段出现错误提示
   - 切换到未来时段后错误提示自动消失
2. 后台 Appointments 页：
   - 可搜索到该预约（日期/订单号）
   - Detail 抽屉显示订单号，`No Show` 操作成功
3. 后台 Risk Control 页：
   - 能按手机号查到该用户
   - `no_show_30d`、`risk_level` 显示符合预期

