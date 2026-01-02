# NailsDash 本地部署指南

本指南将帮助您在本地电脑上运行NailsDash美甲预约平台的前后端项目。

---

## 📋 前置要求

在开始之前，请确保您的电脑已安装以下软件：

### 必需软件

| 软件 | 版本要求 | 下载地址 |
|------|----------|----------|
| **Git** | 最新版本 | https://git-scm.com/downloads |
| **Python** | 3.11+ | https://www.python.org/downloads/ |
| **Node.js** | 18+ | https://nodejs.org/ |
| **MySQL** | 8.0+ | https://dev.mysql.com/downloads/ |

### 可选软件

- **VS Code** - 推荐的代码编辑器：https://code.visualstudio.com/
- **Postman** - API测试工具：https://www.postman.com/downloads/
- **MySQL Workbench** - 数据库管理工具：https://dev.mysql.com/downloads/workbench/

---

## 🚀 快速开始

### 步骤1：克隆项目代码

打开终端（Windows用户打开PowerShell或Git Bash），执行以下命令：

```bash
# 克隆项目到本地
git clone https://github.com/kevinsubmit/Nailsdashh5.git

# 进入项目目录
cd Nailsdashh5
```

克隆完成后，您的项目目录结构应该是这样的：

```
Nailsdashh5/
├── frontend/     # React前端代码
├── backend/      # FastAPI后端代码
└── README.md     # 项目说明
```

---

## 🗄️ 步骤2：配置数据库

### 方案A：使用本地MySQL（推荐用于开发）

#### 2.1 安装MySQL

**Windows用户**：
1. 下载MySQL安装包：https://dev.mysql.com/downloads/installer/
2. 运行安装程序，选择"Developer Default"
3. 设置root密码（请记住这个密码）

**Mac用户**：
```bash
# 使用Homebrew安装
brew install mysql

# 启动MySQL服务
brew services start mysql

# 设置root密码
mysql_secure_installation
```

**Linux用户**：
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# 启动MySQL服务
sudo systemctl start mysql

# 设置root密码
sudo mysql_secure_installation
```

#### 2.2 创建数据库

打开MySQL命令行或MySQL Workbench，执行以下SQL命令：

```sql
-- 创建数据库
CREATE DATABASE nailsdash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建数据库用户（可选，推荐）
CREATE USER 'nailsdash_user'@'localhost' IDENTIFIED BY 'your_password_here';

-- 授予权限
GRANT ALL PRIVILEGES ON nailsdash.* TO 'nailsdash_user'@'localhost';
FLUSH PRIVILEGES;
```

**注意**：请将 `your_password_here` 替换为您自己的密码。

### 方案B：使用SQLite（最简单，适合快速测试）

如果您不想安装MySQL，可以使用SQLite（但功能会受限）：

```bash
# 无需安装，Python自带SQLite支持
# 只需在后端配置中使用SQLite连接字符串即可
```

---

## 🔧 步骤3：配置后端

### 3.1 进入后端目录

```bash
cd backend
```

### 3.2 创建Python虚拟环境

**Windows用户**：
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate
```

**Mac/Linux用户**：
```bash
# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate
```

激活成功后，您的命令行前面会显示 `(venv)`。

### 3.3 安装Python依赖

```bash
# 升级pip（推荐）
pip install --upgrade pip

# 安装所有依赖包
pip install -r requirements.txt
```

这个过程可能需要几分钟，请耐心等待。

### 3.4 配置环境变量

创建 `.env` 文件（复制示例文件）：

**Windows用户**：
```bash
copy .env.example .env
```

**Mac/Linux用户**：
```bash
cp .env.example .env
```

然后编辑 `.env` 文件，修改以下配置：

#### 如果使用本地MySQL：

```env
# 数据库配置
DATABASE_URL=mysql+pymysql://nailsdash_user:your_password_here@localhost:3306/nailsdash

# JWT密钥（请生成一个随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# JWT过期时间
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS配置（允许前端访问）
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173

# 环境
ENVIRONMENT=development
```

#### 如果使用SQLite：

```env
# 数据库配置（使用SQLite）
DATABASE_URL=sqlite:///./nailsdash.db

# 其他配置同上...
```

**重要提示**：
- 将 `your_password_here` 替换为您在步骤2.2中设置的数据库密码
- 将 `your-super-secret-jwt-key-change-this-in-production` 替换为一个随机字符串（可以使用在线生成器）

### 3.5 初始化数据库

```bash
# 创建数据库表
python init_db.py
```

如果看到 "All tables created successfully!" 的消息，说明数据库初始化成功。

### 3.6 启动后端服务器

```bash
# 启动开发服务器
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

看到以下输出说明后端启动成功：

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**测试后端**：
- 打开浏览器访问：http://localhost:8000
- 应该看到：`{"message": "Welcome to NailsDash API"}`
- API文档：http://localhost:8000/api/docs

**保持这个终端窗口打开**，后端服务器需要一直运行。

---

## 💻 步骤4：配置前端

### 4.1 打开新的终端窗口

**重要**：不要关闭后端服务器的终端窗口，打开一个新的终端。

### 4.2 进入前端目录

```bash
# 从项目根目录进入前端目录
cd frontend
```

### 4.3 安装Node.js依赖

```bash
# 安装所有依赖包
npm install
```

这个过程可能需要几分钟，请耐心等待。如果遇到网络问题，可以尝试：

```bash
# 使用淘宝镜像（国内用户推荐）
npm install --registry=https://registry.npmmirror.com
```

### 4.4 配置环境变量

创建 `.env` 文件：

**Windows用户**：
```bash
echo VITE_API_BASE_URL=http://localhost:8000 > .env
```

**Mac/Linux用户**：
```bash
echo "VITE_API_BASE_URL=http://localhost:8000" > .env
```

或者手动创建 `.env` 文件，内容如下：

```env
VITE_API_BASE_URL=http://localhost:8000
```

### 4.5 启动前端开发服务器

```bash
# 启动开发服务器
npm run dev
```

看到以下输出说明前端启动成功：

```
VITE v6.3.5  ready in 162 ms

➜  Local:   http://localhost:3001/
➜  Network: use --host to expose
```

**测试前端**：
- 打开浏览器访问：http://localhost:3001
- 应该看到登录测试页面

---

## ✅ 步骤5：验证安装

### 5.1 检查服务状态

确保两个服务都在运行：

| 服务 | 地址 | 状态检查 |
|------|------|----------|
| 后端API | http://localhost:8000 | 访问应显示欢迎消息 |
| API文档 | http://localhost:8000/api/docs | 显示Swagger UI |
| 前端应用 | http://localhost:3001 | 显示登录测试页面 |

### 5.2 测试用户注册

1. 打开浏览器访问：http://localhost:3001
2. 点击 "Register" 按钮
3. 填写注册信息：
   - Email: test@example.com
   - Username: testuser
   - Password: Test123456!
4. 点击 "Register" 按钮提交
5. 如果注册成功，会自动切换到登录模式

### 5.3 测试用户登录

1. 在登录表单中输入：
   - Email: test@example.com
   - Password: Test123456!
2. 点击 "Login" 按钮
3. 检查后端终端日志，应该看到：
   ```
   INFO: 127.0.0.1:xxxxx - "POST /api/v1/auth/login HTTP/1.1" 200 OK
   ```

如果以上步骤都成功，恭喜您！项目已经在本地成功运行了！🎉

---

## 🛠️ 常见问题解决

### 问题1：端口被占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::8000
```

**解决方案**：

**Windows用户**：
```bash
# 查找占用端口的进程
netstat -ano | findstr :8000

# 终止进程（将PID替换为实际的进程ID）
taskkill /PID <PID> /F
```

**Mac/Linux用户**：
```bash
# 查找占用端口的进程
lsof -i :8000

# 终止进程（将PID替换为实际的进程ID）
kill -9 <PID>
```

或者修改端口号：
```bash
# 后端使用其他端口
uvicorn app.main:app --port 8001

# 前端会自动选择可用端口
```

### 问题2：数据库连接失败

**错误信息**：
```
sqlalchemy.exc.OperationalError: (pymysql.err.OperationalError) (2003, "Can't connect to MySQL server")
```

**解决方案**：

1. **检查MySQL服务是否启动**：

   **Windows**：打开"服务"应用，查找MySQL服务并启动
   
   **Mac**：
   ```bash
   brew services start mysql
   ```
   
   **Linux**：
   ```bash
   sudo systemctl start mysql
   ```

2. **检查数据库配置**：
   - 确认 `.env` 文件中的数据库用户名和密码正确
   - 确认数据库名称已创建

3. **测试数据库连接**：
   ```bash
   mysql -u nailsdash_user -p
   # 输入密码后应该能登录
   ```

### 问题3：Python包安装失败

**错误信息**：
```
ERROR: Could not find a version that satisfies the requirement...
```

**解决方案**：

1. **升级pip**：
   ```bash
   pip install --upgrade pip
   ```

2. **检查Python版本**：
   ```bash
   python --version
   # 应该是 Python 3.11 或更高
   ```

3. **使用国内镜像**（国内用户）：
   ```bash
   pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
   ```

### 问题4：npm安装失败

**错误信息**：
```
npm ERR! network timeout
```

**解决方案**：

1. **使用淘宝镜像**（国内用户推荐）：
   ```bash
   npm install --registry=https://registry.npmmirror.com
   ```

2. **清除npm缓存**：
   ```bash
   npm cache clean --force
   npm install
   ```

3. **删除node_modules重新安装**：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 问题5：CORS跨域错误

**错误信息**（浏览器控制台）：
```
Access to XMLHttpRequest at 'http://localhost:8000' from origin 'http://localhost:3001' has been blocked by CORS policy
```

**解决方案**：

检查后端 `.env` 文件中的CORS配置：
```env
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173
```

确保包含前端的实际端口号。

---

## 📚 开发工具推荐

### VS Code扩展

安装以下VS Code扩展可以提升开发体验：

**Python开发**：
- Python (Microsoft)
- Pylance
- Python Debugger

**前端开发**：
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- ESLint
- Prettier

**通用工具**：
- GitLens
- Thunder Client (API测试)
- Better Comments

### 浏览器扩展

**Chrome/Edge**：
- React Developer Tools
- Redux DevTools (如果使用Redux)
- JSON Viewer

---

## 🔄 日常开发流程

### 启动开发环境

每次开发时，需要启动两个服务：

**终端1 - 后端**：
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload
```

**终端2 - 前端**：
```bash
cd frontend
npm run dev
```

### 停止开发环境

在各自的终端窗口按 `Ctrl+C` 停止服务。

### 更新代码

```bash
# 拉取最新代码
git pull origin main

# 更新后端依赖
cd backend
pip install -r requirements.txt

# 更新前端依赖
cd ../frontend
npm install
```

---

## 📖 下一步学习

现在您已经成功运行了项目，可以：

1. **查看API文档**：http://localhost:8000/api/docs
2. **阅读数据库设计**：`backend/DATABASE_DESIGN.md`
3. **查看测试报告**：`backend/TEST_REPORT.md`
4. **学习项目架构**：`README.md`

---

## 💡 开发提示

### 后端开发

- 修改代码后会自动重启（`--reload` 参数）
- 查看日志了解请求处理过程
- 使用 `http://localhost:8000/api/docs` 测试API

### 前端开发

- 修改代码后会自动热重载
- 打开浏览器开发者工具（F12）查看网络请求
- 使用React DevTools调试组件

### 数据库管理

**查看数据**：
```bash
mysql -u nailsdash_user -p
USE nailsdash;
SELECT * FROM backend_users;
```

**重置数据库**：
```bash
# 删除所有表
DROP DATABASE nailsdash;
CREATE DATABASE nailsdash CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 重新初始化
python init_db.py
```

---

## 🆘 获取帮助

如果遇到问题：

1. **查看日志**：后端和前端的终端都会显示详细的错误信息
2. **检查配置**：确认 `.env` 文件配置正确
3. **查看文档**：阅读项目根目录的 `README.md`
4. **搜索错误**：将错误信息复制到Google搜索

---

## 🎉 恭喜！

您已经成功在本地运行NailsDash项目！现在可以开始开发新功能了。

**快速命令参考**：

```bash
# 启动后端
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# 启动前端
cd frontend && npm run dev

# 查看API文档
open http://localhost:8000/api/docs

# 访问前端
open http://localhost:3001
```

祝您开发愉快！🚀
