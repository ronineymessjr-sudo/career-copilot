# Career Copilot V2 Complete Platform — 完整源码入口

这是最终的 **完整平台源码包**，不是增量补丁。解压后的目录就是项目根目录，不需要再应用 Focus Flow、Light、Carbon 或 Carbon Pro 的旧 ZIP。

## 本次交付解决的问题

- 恢复今日简报和招聘数据看板。
- 恢复岗位发现、岗位来源和完整岗位池。
- 不再只展示少量固定岗位；画像只改变排序，不会删除其他岗位。
- 新账号从中性画像开始，不预填 AI、2028、城市或实习限制。
- 平台共享岗位与个人私有岗位并存。
- 每个账号独立保存画像、评价、简历、证据和投递状态。
- Greenhouse、Lever、Ashby 使用公开 ATS 接口自动聚合。
- 其他招聘平台通过真实 URL 与 JD 导入。
- 最终投递继续要求用户明确确认。

## 工作台入口

核心工作区：今日简报、岗位发现、岗位来源、投递管理、数据看板。

个人资料：我的画像、简历版本、项目证据。

详细架构见：

- `docs/COMPLETE_PLATFORM_ARCHITECTURE.md`
- `docs/SOURCE_COVERAGE.md`

## 推荐部署方式

先让执行端完整读取：

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

在运行 Worker 部署脚本前，先按数据库说明应用待部署迁移。

## 已在交付环境验证

- Node：68 项通过
- Python API：14 项通过
- 合计：82 项通过，0 失败
- TS/TSX 语法解析：90 个文件通过
- CSS：1157 条顶层规则，0 解析错误
- Cloudflare 结构验证通过
- 离线生产 Smoke 通过

完整 `npm install → tsc → OpenNext build` 必须由部署端执行，因为源码包不会包含 `node_modules` 或构建缓存。

## 不可改变的边界

- 不绕过招聘网站登录、验证码、设备验证或反机器人机制。
- 不保存招聘网站密码、Cookie 或验证码。
- 不把“打开投递页面”记录成“已经投递”。
- 不自动发送邮件。
- 最终提交必须由用户明确确认。
- 不把任何真实密钥写入源码或 Git。
