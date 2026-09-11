const { request } = require("./api");

function login() {
  return new Promise((resolve, reject) => {
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
  });
}

function clearSession() {
  wx.removeStorageSync("career_copilot_wechat_session");
  const app = getApp();
  app.globalData.session = null;
}

module.exports = { login, clearSession };
