# 员工数字画像系统

基于 FastAPI + React 的前后端分离系统，用于管理员工全维度档案信息。内网单机部署，非响应式（仅 PC 端）。

## 功能概览

- **登录**：EHR 号 + 密码；1 小时无操作自动登出（后端 token 过期 + 前端空闲检测）
- **修改密码**：个人入口，管理员在用户管理中重置他人密码
- **个人档案**：基础信息、政治面貌、学历学位、家庭关系、简历、奖惩、外部资格、专业成果、语言能力、通讯、技能标签（预定义 + 自定义）；子表支持多条、按时间排序
- **用户管理**（仅管理员）：用户增删改查、批量 Excel 导入、重置密码、启用/禁用（软删除）
- **操作日志**（仅管理员）：仅管理员可见
- **技能标签模板**（仅管理员）：预定义标签维护

## 技术栈

- 后端：FastAPI、SQLAlchemy（async）、SQLite（字段类型兼容 SQL Server，便于后续迁移）
- 前端：React 18、Vite、React Router
- 认证：JWT（60 分钟过期）

## 快速开始

### 后端

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

首次使用可初始化数据库并创建默认管理员：

```bash
cd backend
python init_db.py
# 默认管理员：ehr=admin，密码=1234567
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

浏览器访问前端开发地址（如 http://localhost:5173），接口通过 Vite 代理到 http://127.0.0.1:8000。

### 生产部署（内网单机）

1. 后端：使用 gunicorn + uvicorn 或直接 uvicorn 绑定内网 IP，可配合 Nginx 反向代理。
2. 前端：`npm run build`，将 `dist` 静态资源放到 Nginx 或后端静态目录；API 请求指向后端地址（或同域代理）。
3. 数据库：当前为 SQLite 文件 `digital_portrait.db`；迁移到 SQL Server 时修改 `backend/app/config.py` 中 `DATABASE_URL` 为 SQL Server 连接串即可。

## 数据校验

- 证件号码：18 位身份证格式及校验码
- 手机号：1 开头的 11 位
- 日期：合法日期格式（YYYY-MM-DD 等）

## 权限

- 普通用户：仅查看/编辑自己的档案
- 组长：可查看本组组员档案（仅查看，不可改）
- 管理员：可查看/管理所有用户、用户管理、操作日志、技能标签模板；仅用户管理可改角色/组别/禁用
