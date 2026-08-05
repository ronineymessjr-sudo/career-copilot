# Career Copilot V2 Complete Platform R2 — 完整源码入口

这是修正后的 **完整平台 R2 源码包**，不是增量补丁。解压目录就是项目根目录，不需要叠加任何旧 ZIP。

## 本版补齐的核心能力

- 完整登录体系：登录、注册、邮箱验证、找回密码、设置新密码、退出登录。
- 可编辑并长期保存的完整用户画像：个人简介、技能、教育、经历、项目、语言、证书、链接和求职偏好。
- 多版本简历库：上传 PDF/DOC/DOCX/TXT、建立主简历、保留通用版本、生成岗位定制版本、归档和下载。
- 简历存储明确分层：结构化内容在 `resume_versions`；原始文件在私有 Supabase Storage 桶 `resume-files`。
- 每个账号每天独立生成岗位推荐，不再只显示静态“今日优先岗位”。
- 每日推荐可自动选择最佳简历、检查资格和材料、准备投递包并放入投递管理。
- 最终外部提交仍由用户确认；不会绕过招聘平台登录、验证码或反机器人机制。

## 完整工作台

- 今日简报与每日推荐
- 岗位发现与完整岗位池
- 岗位来源聚合
- 投递管理与自动准备设置
- 招聘数据看板
- 我的完整画像
- 多版本简历库
- 项目证据

## 部署顺序

部署端先完整阅读：

1. `DEPLOY_WITH_DEEPSPEED.md`
2. `DATABASE_DEPLOYMENT_NOTE.md`
3. `SECRETS_REQUIRED.md`
4. `DEPLOY_CHECKLIST.md`

Windows：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\full_release.ps1 -Deploy
```

Linux / macOS / WSL：

```bash
chmod +x scripts/full_release.sh
./scripts/full_release.sh --deploy
```

数据库迁移必须先 dry-run，禁止 reset 生产数据库。

## 已在交付环境验证

- Node：72 项通过
- Python API：14 项通过
- 合计：86 项通过，0 失败
- TypeScript/TSX 语法解析：94 个文件通过
- CSS 结构检查通过
- Cloudflare 项目验证通过
- 离线生产 Smoke 通过

当前执行环境的内部 npm 镜像缺少 `@langchain/core@1.2.3`，因此这里无法完成依赖安装和 OpenNext 正式构建。部署脚本默认使用官方 npm registry，并强制执行完整 TypeScript 检查与 `cf:build`。

## 不可改变的边界

- 自动化可以推荐、匹配简历、生成材料和准备队列。
- 不自动绕过招聘网站登录、验证码、设备验证或反机器人机制。
- 不保存招聘网站密码、Cookie 或验证码。
- 不把“打开投递页面”记录成“已经投递”。
- 不自动发送邮件或自动外部提交。
