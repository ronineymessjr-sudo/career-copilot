# Career Copilot 微信小程序

这是面向微信开发者工具的审核版入口，和 `apps/web` 共用线上公开 Demo。小程序端只负责微信登录、审核展示和公开体验，不把 Supabase 密钥、Cloudflare 密钥或第三方平台凭证放入客户端。

## 本地导入

1. 安装微信开发者工具。
2. 导入本目录 `apps/miniprogram`。
3. 在 `project.config.json` 中把 `appid` 替换为你自己的小程序 AppID；`touristappid` 只用于查看静态页面。
4. 在微信公众平台把 `career-copilot-v2.photomagic.workers.dev` 加入 request 合法域名。
5. 使用真机或开发者工具预览 `pages/index/index`，公开 Demo 不依赖登录即可体验。

## 登录链路

小程序调用 `wx.login()` 获取短期 code，然后 POST 到 `/api/wechat/session`。服务端用 `WECHAT_MINIPROGRAM_APP_ID` 和 `WECHAT_MINIPROGRAM_SECRET` 调用微信 `code2Session`，只返回审核版会话状态，不把 openid 或 session_key 返回客户端。

正式启用前，在 Cloudflare Worker secrets 中配置：

```text
WECHAT_MINIPROGRAM_APP_ID
WECHAT_MINIPROGRAM_SECRET
```

密钥只放 Worker secret，不提交仓库，不写进 `config.js`。

## 腾讯审核路径

- 首页 → 微信登录 → 审核版登录状态 → 公开 Demo。
- 首页 → 直接体验公开 Demo，不需要登录。
- Demo 只读、不自动发送邮件、不自动投递、不读取微信好友、通讯录或精准位置。
- 审核时需要同时提供隐私保护指引、用户协议、客服联系方式和测试说明。

## 当前边界

这一版先解决“小程序入口 + 微信 code 校验 + 腾讯审核展示”。个人工作台的 Supabase 用户绑定仍沿用 Web 端 Bearer Auth，不在审核版里绕过现有 RLS。要开放小程序的私有简历、岗位和投递数据，需要下一步增加微信身份与 Supabase `auth.users` 的显式绑定和注销/解绑流程。
