# Design System

## 视觉方向
深色 AI 工作台，参考专业开发者工具的高信息密度，但避免过度卡片化。核心是“证据、评分、审批和行动”。

## Tokens
- Background: `#07090d`
- Surface: `#0d1118`
- Accent: `#7c5cff`
- Secondary: `#39d0c8`
- Text: `#f4f7fb`
- Muted: `#8f9baa`
- Border: `rgba(255,255,255,.08)`

## 组件
- Sidebar navigation
- Metric rail
- Segment filters
- Job rows with grade and score
- Evidence detail panel
- Approval actions
- Application pipeline table
- Interview and Offer timeline

## 交互原则
- 每个 AI 结论必须可展开查看证据
- 每个不可逆动作前显示审批状态
- 缺失信息用“待核验”而不是模型猜测
- 推荐顺序固定可解释，支持用户手动覆盖
