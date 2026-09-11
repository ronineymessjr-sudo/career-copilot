Page({
  data: { session: null },
  onShow() { this.setData({ session: wx.getStorageSync("career_copilot_wechat_session") || null }); },
  openLogin() { wx.navigateTo({ url: "/pages/login/login" }); },
  openDemo() { wx.navigateTo({ url: "/pages/demo/demo" }); },
});
