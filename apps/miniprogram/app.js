App({
  globalData: {
    session: wx.getStorageSync("career_copilot_wechat_session") || null,
  },
  onLaunch() {
    this.globalData.session = wx.getStorageSync("career_copilot_wechat_session") || null;
  },
});
