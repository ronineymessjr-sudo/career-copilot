const { request } = require("../../utils/api");

Page({
  data: { runtime: null },
  onShow() {
    if (!wx.getStorageSync("career_copilot_wechat_session")) {
      return wx.reLaunch({ url: "/pages/login/login" });
    }
    request("/api/runtime").then((runtime) => this.setData({ runtime })).catch(() => this.setData({ runtime: { version: "1.0.1" } }));
  },
  openWeb() { wx.setClipboardData({ data: "https://career-copilot-v2.photomagic.workers.dev/dashboard", success: () => wx.showToast({ title: "内部工作台网址已复制", icon: "none" }) }); },
});
