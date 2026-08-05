# Career Copilot V2 — 完整源码包入口

这是 **完整项目源码**，不是增量补丁。不要再依次应用 Focus Flow、Light、Carbon 或 Carbon Pro ZIP。

## 当前版本

- 产品：Career Copilot V2
- 源码版本：1.0.1 + Carbon Pro Workbench
- 前端：Next.js 15 / React 19 / TypeScript
- 运行时：OpenNext + Cloudflare Workers
- 数据库：Supabase PostgreSQL
- 调度：Cloudflare Scheduler Worker
- 线上 Worker：`career-copilot-v2`
- 调度 Worker：`career-copilot-scheduler`

## 最快部署方式

### Windows PowerShell

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\full_release.ps1 -Deploy
```

### Linux / macOS / WSL

```bash
chmod +x scripts/full_release.sh
./scripts/full_release.sh --deploy
```

脚本会按顺序执行：

1. 安装依赖
2. 生成 Cloudflare 类型
3. 运行 Node 测试
4. 运行投递与简历匹配测试
5. 运行 Python API 测试
6. 运行 TypeScript 检查
7. 运行 Cloudflare 项目结构验证
8. 构建 OpenNext Worker
9. 在传入 `-Deploy` / `--deploy` 时部署 Web 与 Scheduler

## 给自动执行端

把根目录的 `DEPLOY_WITH_DEEPSPEED.md` 整份交给 DeepSpeed / DeepSeek / Codex 执行端。

## 重要边界

- 不自动绕过招聘网站登录、验证码或反机器人验证。
- 不保存招聘网站密码、Cookie 或验证码。
- 不把“打开投递页面”记录成“投递成功”。
- 最终提交仍需用户明确确认。
- 不要把任何真实密钥写入仓库。

## 已验证

- Node 核心测试：50 项通过
- 投递与简历匹配测试：11 项通过
- Python API 测试：14 项通过
- 合计：75 项通过，0 失败
- Cloudflare Milestone 08.1 验证通过

## 部署前的凭证

如果是在原 Cloudflare 账户中重新部署同名 Worker，现有 Worker secrets 通常会保留。新环境需要配置的变量见 `SECRETS_REQUIRED.md`。数据库必须保留现有生产项目，详见 `DATABASE_DEPLOYMENT_NOTE.md`。
