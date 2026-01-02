# 环境配置说明

## 验证码系统环境配置

本项目的验证码系统会根据 `ENVIRONMENT` 环境变量自动切换行为模式。

### 开发环境（Development）

**配置：**
```bash
ENVIRONMENT=development
# 或
ENVIRONMENT=dev
# 或
ENVIRONMENT=local
```

**行为：**
- ✅ 使用固定验证码：`123456`
- ✅ API响应直接显示验证码
- ✅ 不发送真实短信
- ✅ 便于快速测试

**适用场景：**
- 本地开发
- 单元测试
- 集成测试
- 演示环境

### 生产环境（Production）

**配置：**
```bash
ENVIRONMENT=production
# 或
ENVIRONMENT=prod
# 或
ENVIRONMENT=staging
```

**行为：**
- ✅ 生成随机6位数字验证码
- ✅ API响应不显示验证码
- ✅ 需要集成真实短信服务（Twilio等）
- ✅ 保证安全性

**适用场景：**
- 生产部署
- 预发布环境
- 正式上线

## 配置文件位置

### 本地开发
编辑 `backend/.env` 文件：
```bash
ENVIRONMENT=development
```

### 生产部署
在服务器或容器中设置环境变量：
```bash
export ENVIRONMENT=production
```

或在 Docker Compose 中：
```yaml
environment:
  - ENVIRONMENT=production
```

## 代码实现

### 验证码生成逻辑
文件：`app/crud/verification_code.py`

```python
def generate_code() -> str:
    is_development = (
        settings.ENVIRONMENT.lower() in ['development', 'dev', 'local'] or
        os.getenv('ENVIRONMENT', '').lower() in ['development', 'dev', 'local']
    )
    
    if is_development:
        return '123456'  # 固定验证码
    else:
        return ''.join(random.choices(string.digits, k=6))  # 随机验证码
```

### API响应消息
文件：`app/api/v1/endpoints/auth.py`

```python
if is_development:
    message = f"Verification code sent to {request.phone}. Use code: 123456 (development mode)"
else:
    message = f"Verification code sent to {request.phone}. Please check your SMS."
```

## 测试验证

### 检查当前环境
在Python中运行：
```python
from app.core.config import settings
print(f"Current environment: {settings.ENVIRONMENT}")
```

### 测试验证码生成
```python
from app.crud.verification_code import generate_code
code = generate_code()
print(f"Generated code: {code}")
```

## 注意事项

1. **生产环境必须配置短信服务**
   - 需要集成Twilio、阿里云短信等服务
   - 修改 `auth.py` 中的 `send_verification_code` 函数
   - 添加真实的短信发送逻辑

2. **环境变量优先级**
   - 系统环境变量 > .env 文件
   - 确保生产环境正确设置

3. **安全建议**
   - 生产环境不要使用固定验证码
   - 定期清理过期验证码
   - 限制验证码发送频率

## 切换到生产环境

### 步骤1：更新环境变量
```bash
# 在服务器上设置
export ENVIRONMENT=production
```

### 步骤2：集成短信服务
修改 `app/api/v1/endpoints/auth.py`：
```python
if not is_development:
    # 调用真实短信服务
    send_sms(phone=request.phone, code=verification.code)
```

### 步骤3：重启服务
```bash
uvicorn app.main:app --reload
```

### 步骤4：验证
- 验证码应该是随机的
- API响应不显示验证码
- 用户应该收到真实短信
