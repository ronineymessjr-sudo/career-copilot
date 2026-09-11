# 微信小程序审核版发布说明

## 目标

让腾讯审核人员可以从小程序首页直接看到可用的公开 Demo，并验证微信登录链路；审核版不自动投递、不自动发信、不读取微信社交关系，也不要求审核人员先创建 Supabase 账号。

## 发布前必须完成

1. 在微信公众平台注册小程序并取得 AppID、AppSecret。
2. 将 `apps/miniprogram/project.config.json` 的 `appid` 换成真实 AppID。
3. 在 Cloudflare Worker secrets 配置 `WECHAT_MINIPROGRAM_APP_ID` 和 `WECHAT_MINIPROGRAM_SECRET`。
4. 将 `career-copilot-v2.photomagic.workers.dev` 配置为 request 合法域名。
5. 准备小程序名称、头像、服务类目、隐私保护指引、用户协议、客服联系方式和审核测试说明。
6. 用微信开发者工具上传体验版，真机检查首页、登录页、公开 Demo 和异常提示。

`app.json` 已开启 `__usePrivacyCheck__`，登录流程会先执行 `wx.requirePrivacyAuthorize`，再调用 `wx.login`；开发者工具或较旧基础库不支持该方法时，会回退到页面勾选状态。

## 审核测试路径

```text
首页 → 直接体验公开 Demo → 查看运行版本与审核边界
首页 → 微信登录 → 登录完成提示 → 返回公开 Demo
```

登录接口只做服务端 `code2Session` 校验；`openid` 和 `session_key` 不返回客户端。当前审核版不把微信身份映射成 Supabase 私有用户，因此不会绕过现有 RLS。若要开放简历、岗位和投递记录，需另行设计微信身份绑定、注销和解绑流程。

## 审核后的第二阶段

- 建立 `career_copilot.wechat_identities`，只保存加密后的身份映射和审计字段。
- 通过服务端受控会话访问 Supabase，不把 service key 或 JWT secret 放入小程序。
- 让用户主动同意隐私条款后再保存简历、岗位或投递记录。
- 保持人工确认优先：小程序可以生成材料和草稿，但不自动替用户提交外部申请。
