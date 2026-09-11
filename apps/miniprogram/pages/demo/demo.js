const { request } = require("../../utils/api");

Page({
  data: { runtime: null },
  onLoad() { request("/api/runtime").then((runtime) => this.setData({ runtime })).catch(() => this.setData({ runtime: { version: "1.0.1" } })); },
  openWeb() { wx.setClipboardData({ data: "https://career-copilot-v2.photomagic.workers.dev/playground", success: () => wx.showToast({ title: "体验网址已复制", icon: "none" }) }); },
});
