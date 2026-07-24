# Career Copilot V2

面向中国在校生的证据驱动 AI 求职操作系统。

它把岗位聚合、资格核验、匹配评分、真实项目证据检索、简历定制、审批、投递管理、面试复盘和 Offer 跟踪放在一个统一工作台中。当前版本坚持 approval-first：不会自动登录招聘平台、绕过验证码或把“推荐”误记为“已投递”。

## 当前完成度

- [x] 产品 PRD、架构与设计系统
- [x] FastAPI 本地 API
- [x] SQLite 本地开发模式
- [x] Supabase PostgreSQL + pgvector 生产 Schema
- [x] 地域、届别、出勤、周期和公司规模规则评分
- [x] Career Evidence 驱动的材料生成
- [x] 三版真实简历资产
- [x] 审批、申请、面试、Offer 数据模型
- [x] Next.js 产品页面骨架
- [x] 无依赖可演示原型
- [x] 自动化测试与烟雾测试
- [ ] Supabase Auth 与线上数据层
- [ ] LangGraph Checkpointer
- [ ] 招聘来源适配器
- [ ] Gmail 草稿与飞书审批
- [ ] 部署

## 项目结构

```text
apps/web          Next.js 产品工作台
apps/api          FastAPI 业务 API 与本地 SQLite 模式
supabase          PostgreSQL + pgvector 迁移
prototype         可立即打开的高保真交互原型
assets/resumes    AI Agent、AI 产品、本地过渡三版简历
docs              PRD、架构、设计系统、路线图
```

## 立即查看原型

```powershell
cd prototype
python -m http.server 4173
```

打开 `http://127.0.0.1:4173`。

## 运行 API

```powershell
cd apps/api
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\seed.py
python scripts\prepare_top.py
uvicorn app.main:app --reload --port 8000
```

打开：

- 产品原型：`http://127.0.0.1:8000/`
- API 文档：`http://127.0.0.1:8000/docs`
- 日报接口：`http://127.0.0.1:8000/api/daily-report`

## 运行测试

```powershell
cd apps/api
pytest -q
```

## Next.js 前端

```powershell
cd apps/web
npm install
npm run dev
```

## 安全边界

- 邮件岗位：默认只生成草稿，不自动发送
- 公司官网：未来只辅助填表，提交前人工确认
- 招聘平台：只生成待办与招呼语，不自动点击
- 所有简历生成内容必须引用 Career Vault 的真实项目证据
- 缺失届别、出勤或周期时必须进入核验队列

## 部署交接

代码、产品与测试由本仓库负责；Supabase 项目、Cloudflare、域名、密钥和生产部署交给用户的执行 Agent 完成。
