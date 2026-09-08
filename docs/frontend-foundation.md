# Career Copilot 前端底板

## 设计原则

先完成任务，再解释系统。一个页面只突出一个主要动作；结论先展示，依据和技术说明按需展开。公开示例不冒充个人经历、完整简历或真实投递。

## 文件与复用方式

- `apps/web/app/workspace-design.css`：颜色、字号、间距、控件、响应式布局。
- `apps/web/components/workspace-ui.tsx`：品牌、页面标题、折叠详情、加载/空白/错误状态。
- `apps/web/components/app-shell.tsx`：桌面导航和可展开的完整移动导航。
- `apps/web/lib/workspace-presentation.mjs`：展示用中文标签，不改变底层技能标识。

新页面保留原有鉴权与取数逻辑，使用这些展示组件，不复制登录流程。

```tsx
<AppShell>
  <AuthGate>
    <section className="platform-workspace">
      <WorkspaceHeading
        title="页面任务"
        description="一句话说明用户接下来要做什么。"
        action={<button className="cc-button cc-button-primary">主要操作</button>}
      />
      <section className="platform-panel">主要内容</section>
      <WorkspaceDisclosure title="查看依据">次要信息</WorkspaceDisclosure>
    </section>
  </AuthGate>
</AppShell>
```

按钮示例必须接入页面自己的真实处理函数。没有处理函数时不要展示可点击的假操作。

## 视觉规范

| 项目 | 约定 |
| --- | --- |
| 强调色 | `--cc-accent: #4f46e5`，仅强调当前入口、主要结果和活动状态；主要按钮使用石墨色 |
| 页面底色 | `--cc-canvas: #f7f7f5` |
| 正文与辅助色 | `--cc-ink: #1f2328` / `--cc-muted: #68717d` |
| 字体 | 系统字体栈：Segoe UI、苹方、微软雅黑；不依赖第三方字体网络 |
| 字号 | 正文 14–16px，辅助文字 13px，页面标题 26–36px |
| 控件 | 主要按钮和输入框至少 44px 高；可见键盘焦点 |
| 间距 | 8px 基础单位；区域内 20–28px，区域间 24px |
| 圆角 | 7px 控件 / 10px 区域，避免每条信息再套一层卡片 |
| 动效 | 分数圆环和流程圆标使用短暂入场/呼吸反馈；遵守减少动态效果设置 |

`workspace-design.css` 在旧全局样式之后加载。新公开页和登录页使用 `cc-*` 命名空间；既有受保护模块通过兼容层逐步接入，避免本轮重写业务组件。旧模块的细粒度样式仍需随各自页面验收，不应宣称所有私有页面都已完成视觉验证。

## 页面层级

1. 标题与主要动作。
2. 当前输入和对应结果。
3. 下一步：使用个人资料、补充证据或处理缺口。
4. 折叠的计算依据、批量示例与技术说明。

公开页用原生下拉框保留全部 18 个示例，不再铺开 18 张场景卡片。结果标签支持左右键、Home、End；输入变化立即清除旧结果。今日简报移除重复的流程统计，首次引导默认折叠。移动端菜单保留资料、来源、统计、设置入口。

## 验收边界

## 本轮参考研究

- [Vercel Geist Typography](https://vercel.com/geist/typography)：用有限的字号/字重和较紧的标题字距形成清晰的生产工具层级；本项目采用 Geist/Inter 优先的系统栈，中文仍由本机 CJK 字体回退。
- [IBM Carbon Form](https://carbondesignsystem.com/components/form/style/)：表单正文维持 14px，标题、字段、辅助文本分层，并在窄屏切换为单列。
- [Linear UI refresh](https://linear.app/changelog/2026-03-12-ui-refresh)：让主任务保持视觉焦点，导航和辅助动作后退；本项目将“今日推荐”作为主列表，P0/P1/P2 作为一条优先级轨道，次要数据放进折叠区。
- [Lucide](https://lucide.dev/)：使用一致、可缩放且可按语义挑选的 SVG 图标；本项目用岗位筛选、目标、投递检查等现成图标替代手绘符号。

这些是可迁移的设计原则，不复制任何站点的品牌、图标或页面代码。

- 公开演示：验证输入、重算、结果切换、复制、错误恢复和折叠。
- 登录页：表单切换不等于认证成功；不要通过隐藏登录墙测试私有数据。
- 私有工作台：须使用有效测试账户独立验证，不能用公开示例代替。
- 生产发布：本地构建与浏览器测试不等于 Cloudflare 已部署。

运行 `npm run check --workspace apps/web`、`npm run test:complete` 与 `npm run web:build`，再检查桌面和手机真实渲染。发布前另外核验登录后业务流程与实际公网版本。
