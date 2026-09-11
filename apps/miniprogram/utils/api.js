const { API_BASE_URL } = require("./config");

function request(path, options = {}) {
  const token = wx.getStorageSync("career_copilot_wechat_session");
  const headers = Object.assign({ "content-type": "application/json" }, options.header || {});
  if (token && token.sessionToken) headers.Authorization = `Bearer ${token.sessionToken}`;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || "GET",
      data: options.data,
      header: headers,
      timeout: 12000,
      success: (response) => {
        const payload = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300) return resolve(payload);
        reject(new Error(payload.error || `请求失败（${response.statusCode}）`));
      },
      fail: reject,
    });
  });
}

module.exports = { request };
