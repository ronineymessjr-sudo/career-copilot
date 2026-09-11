Page({
  data: { session: null },
  onShow() {
    const session = wx.getStorageSync("career_copilot_wechat_session") || null;
    this.setData({ session });
    if (!session) wx.reLaunch({ url: "/pages/login/login" });
  },
  openLogin() { wx.navigateTo({ url: "/pages/login/login" }); },
  openWorkspace() {
    if (!this.data.session) return this.openLogin();
    wx.navigateTo({ url: "/pages/demo/demo" });
  },
});
