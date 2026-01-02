# 前端手机号认证更新待办清单

## 需要完成的任务

### Phase 1: 更新API接口定义
- [ ] 更新 `src/api/auth.ts` 中的 RegisterData 接口（phone必填，email可选，添加verification_code）
- [ ] 更新 LoginData 接口（支持phone登录）
- [ ] 添加发送验证码API函数 `sendVerificationCode(phone, code_type)`
- [ ] 添加验证验证码API函数 `verifyCode(phone, code, code_type)`

### Phase 2: 更新注册页面UI
- [ ] 更新 `src/components/LoginTest.tsx` 注册表单
- [ ] 将phone字段改为必填
- [ ] 将email字段改为可选
- [ ] 添加验证码输入框
- [ ] 添加"发送验证码"按钮
- [ ] 实现60秒倒计时功能
- [ ] 添加验证码发送状态提示

### Phase 3: 更新登录页面
- [ ] 支持使用phone或email登录
- [ ] 更新登录表单UI

### Phase 4: 测试
- [ ] 测试发送验证码功能
- [ ] 测试注册流程（phone + verification_code）
- [ ] 测试登录流程
- [ ] 测试错误处理（验证码错误、过期等）

### Phase 5: 推送到GitHub
- [ ] 提交所有更改
- [ ] 推送到远程仓库
