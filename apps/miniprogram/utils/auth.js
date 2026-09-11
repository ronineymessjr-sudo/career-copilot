const { request } = require("./api");

function requirePrivacy() {
  if (typeof wx.requirePrivacyAuthorize !== "function") return Promise.resolve();
  return new Promise((resolve, reject) => wx.requirePrivacyAuthorize({ success: resolve, fail: reject }));
}

function login() {
  return requirePrivacy().then(() => new Promise((resolve, reject) => {
    wx.login({
      success: ({ code }) => {
        if (!code) return reject(new Error("微信未返回登录凭证"));
        request("/api/wechat/session", { method: "POST", data: { code } })
          .then((payload) => {
            wx.setStorageSync("career_copilot_wechat_session", payload);
            const app = getApp();
            app.globalData.session = payload;
            resolve(payload);
          })
          .catch(reject);
      },
      fail: reject,
    });
  }));
}

function clearSession() {
  wx.removeStorageSync("career_copilot_wechat_session");
  const app = getApp();
  app.globalData.session = null;
}

module.exports = { login, clearSession };
