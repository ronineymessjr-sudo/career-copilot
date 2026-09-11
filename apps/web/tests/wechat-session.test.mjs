import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(new URL("../app/api/wechat/session/route.ts", import.meta.url), "utf8");

test("微信小程序登录接口在未配置密钥时失败关闭", () => {
  assert.match(route, /WECHAT_MINIPROGRAM_APP_ID/);
  assert.match(route, /WECHAT_MINIPROGRAM_SECRET/);
  assert.match(route, /status: 503/);
  assert.match(route, /code2session/);
  assert.doesNotMatch(route, /session_key\s*:/);
});

test("审核模式只返回能力状态，不把微信身份返回客户端", () => {
  assert.match(route, /mode: "review"/);
  assert.match(route, /privateWorkspace: false/);
  assert.doesNotMatch(route, /openid:\s*payload\.openid/);
  assert.doesNotMatch(route, /unionid:\s*payload\.unionid/);
});
