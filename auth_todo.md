# 用户认证系统开发任务清单

## Phase 2: 实现用户认证系统（登录/注册页面）
- [ ] 创建API配置文件（axios实例、baseURL）
- [ ] 创建认证API服务文件（auth.service.ts）
- [ ] 创建登录页面组件（Login.tsx）
- [ ] 创建注册页面组件（Register.tsx）
- [ ] 实现验证码发送功能
- [ ] 实现验证码倒计时UI
- [ ] 实现表单验证

## Phase 3: 实现全局认证状态管理
- [ ] 创建AuthContext（React Context）
- [ ] 实现Token存储（localStorage）
- [ ] 实现自动Token刷新
- [ ] 实现受保护路由组件（ProtectedRoute）
- [ ] 在App.tsx中集成认证状态
- [ ] 更新底部导航显示登录状态

## Phase 4: 完善预约流程（暂时保持Mock数据）
- [ ] 在预约前检查登录状态
- [ ] 未登录时跳转到登录页
- [ ] 登录后返回预约页面

## Phase 5: 实现我的预约列表页面
- [ ] 更新Appointments组件显示用户信息
- [ ] 添加退出登录功能

## Phase 6: 测试完整流程
- [ ] 测试注册流程
- [ ] 测试登录流程
- [ ] 测试Token刷新
- [ ] 测试受保护路由
- [ ] 测试退出登录

## Phase 7: 保存并推送
- [ ] Git commit
- [ ] Git push到GitHub
