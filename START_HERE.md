# Career Copilot V2 Complete Platform R4 — 完整源码入口

这是独立的 **R3 完整源码包**，解压目录就是项目根目录，不需要叠加 R2 或任何旧补丁。

## R3 核心流程

用户选择岗位后，系统会：

1. 按用户画像核验岗位条件；
2. 从多份简历中选择最佳版本，或根据完整画像生成岗位定制版；
3. 生成招呼语、求职信、邮件主题与正文、自我介绍、申请理由、项目回答和到岗回答；
4. 生成可打印并保存为 PDF 的定制简历；
5. 保存完整投递材料包与附件清单；
6. 有招聘邮箱时打开预填邮件；有真实申请链接时一键跳转该页面；
7. 用户在外部渠道完成最终提交后，返回工作台确认已投递。

项目证据是可选增强项。岗位明确要求作品集、GitHub、代码样例或成绩单时，系统才会提示补齐对应材料。

## 工作台能力

- 登录、注册、邮箱验证、密码恢复
- 完整用户画像
- 私有多版本简历库
- 每个账号独立的每日推荐
- Greenhouse、Lever、Ashby 等公开 ATS 岗位聚合
- 完整岗位池与个性化排序
- 完整投递包与定制简历
- 邮件预填和真实申请链接跳转
- 项目证据、投递记录和数据看板

## 部署前阅读

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

数据库必须先执行 dry-run，禁止对生产数据库执行 reset。

## 安全边界

- 不保存招聘平台密码、Cookie 或验证码。
- 不绕过登录、验证码、设备验证或反机器人机制。
- 不自动向外部平台提交，也不自动发送邮件。
- 打开邮件或招聘页面不等于已经投递。
- 只有用户确认外部提交完成后，系统才记录为已投递。
