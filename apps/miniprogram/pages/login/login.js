const { login } = require("../../utils/auth");

Page({
  data: { busy: false, agreed: false, error: "" },
  toggleConsent(event) { this.setData({ agreed: event.detail.value.includes("agreed"), error: "" }); },
  handleLogin() {
    if (this.data.busy) return;
    if (!this.data.agreed) return this.setData({ error: "请先阅读并同意隐私保护指引。" });
    this.setData({ busy: true, error: "" });
    login()
      .then(() => wx.showModal({ title: "登录完成", content: "已进入内部使用模式，可以打开工作台。", showCancel: false, success: () => wx.navigateBack() }))
      .catch((error) => this.setData({ error: error.message || "登录暂不可用，请稍后再试。" }))
      .finally(() => this.setData({ busy: false }));
  },
});
