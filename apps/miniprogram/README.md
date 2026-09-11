# Career Copilot 微信小程序

这是面向微信开发者工具的内部使用入口。小程序端先完成微信登录，再进入内部工作台；不提供免登录 Demo，不把 Supabase 密钥、Cloudflare 密钥或第三方平台凭证放入客户端。

## 本地导入

1. 安装微信开发者工具。
2. 导入本目录 `apps/miniprogram`。
3. 在 `project.config.json` 中把 `appid` 替换为你自己的小程序 AppID；`touristappid` 只用于查看静态页面。
4. 在微信公众平台把 `career-copilot-v2.photomagic.workers.dev` 加入 request 合法域名。
5. 使用真机或开发者工具预览 `pages/index/index`，未完成微信登录时会被引导到登录页，不能进入工作台。

`app.json` 已打开微信隐私检查；登录前同时经过页面勾选和 `wx.requirePrivacyAuthorize`（旧基础库会自动降级为页面勾选）。

## 登录链路

小程序调用 `wx.login()` 获取短期 code，然后 POST 到 `/api/wechat/session`。服务端用 `WECHAT_MINIPROGRAM_APP_ID` 和 `WECHAT_MINIPROGRAM_SECRET` 调用微信 `code2Session`，只返回审核版会话状态，不把 openid 或 session_key 返回客户端。

正式启用前，在 Cloudflare Worker secrets 中配置：

```text
WECHAT_MINIPROGRAM_APP_ID
WECHAT_MINIPROGRAM_SECRET
```

密钥只放 Worker secret，不提交仓库，不写进 `config.js`。

## 内部使用路径

- 首页 → 微信登录 → 内部工作台 → 打开受保护的 Web 工作台。
- 未登录状态不会展示工作台内容，也不会提供免登录入口。
- 工作台不自动发送邮件、不自动投递、不读取微信好友、通讯录或精准位置。
- 小程序 sitemap 已禁止搜索收录，避免被当成公开入口发现。

## 当前边界

这一版先解决“小程序内部入口 + 微信 code 校验 + 登录门禁”。个人工作台的 Supabase 用户绑定仍沿用 Web 端 Bearer Auth，不在小程序里绕过现有 RLS。要直接在小程序内读取私有简历、岗位和投递数据，需要下一步增加微信身份与 Supabase `auth.users` 的显式绑定和注销/解绑流程。
