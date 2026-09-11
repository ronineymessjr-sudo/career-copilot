# 微信小程序审核版发布说明

## 目标

让授权成员通过微信登录进入内部工作台；小程序不提供免登录 Demo、不做公开访客入口、不自动投递、不自动发信，也不读取微信社交关系。

## 发布前必须完成

1. 在微信公众平台注册小程序并取得 AppID、AppSecret。
2. 将 `apps/miniprogram/project.config.json` 的 `appid` 换成真实 AppID。
3. 在 Cloudflare Worker secrets 配置 `WECHAT_MINIPROGRAM_APP_ID` 和 `WECHAT_MINIPROGRAM_SECRET`。
4. 将 `career-copilot-v2.photomagic.workers.dev` 配置为 request 合法域名。
5. 准备小程序名称、头像、服务类目、隐私保护指引、用户协议和客服联系方式。
6. 用微信开发者工具上传体验版，真机检查登录页、内部工作台和异常提示。

`app.json` 已开启 `__usePrivacyCheck__`，登录流程会先执行 `wx.requirePrivacyAuthorize`，再调用 `wx.login`；开发者工具或较旧基础库不支持该方法时，会回退到页面勾选状态。

## 内部测试路径

```text
首页 → 微信登录 → 登录完成提示 → 进入内部工作台 → 打开受保护的 Web 工作台
未登录 → 任何工作台页面 → 自动返回登录页
```

登录接口只做服务端 `code2Session` 校验；`openid` 和 `session_key` 不返回客户端。当前小程序只提供内部入口门禁，个人数据仍由 Web 端 Bearer Auth 保护，不会绕过现有 RLS。若要直接在小程序内开放简历、岗位和投递记录，需另行设计微信身份绑定、注销和解绑流程。

## 审核后的第二阶段

- 建立 `career_copilot.wechat_identities`，只保存加密后的身份映射和审计字段。
- 通过服务端受控会话访问 Supabase，不把 service key 或 JWT secret 放入小程序。
- 让用户主动同意隐私条款后再保存简历、岗位或投递记录。
- 保持人工确认优先：小程序可以生成材料和草稿，但不自动替用户提交外部申请。
