# Career Copilot V2 R4.0.2 — 即时画像聚合搜索

这是基于已适配 R4.0.1 / `2.0.1` 的增量兼容源码状态。

## 新功能

在“岗位发现”页面，用户填写可选补充关键词并点击一次“开始聚合搜索”。系统立即：

1. 读取当前账号画像；
2. 搜索已连接的 Greenhouse、Lever、Ashby 来源；
3. 使用公开网页索引检查 Workday、BOSS、LinkedIn、实习僧、牛客、智联、前程无忧和猎聘；
4. 过滤搜索页、首页和无法核验的链接；
5. 把真实岗位写入当前用户私有岗位池；
6. 统一去重、资格分析与画像排序；
7. 返回每个平台状态和本次结果；
8. 为高匹配岗位自动选择最佳简历并生成投递材料；
9. 用户确认后跳转真实投递页。

这不是每日任务，也不是只给平台搜索链接。

## 部署前阅读

1. `DEPLOY_WITH_DEEPSPEED.md`
2. `DATABASE_DEPLOYMENT_NOTE.md`
3. `SECRETS_REQUIRED.md`
4. `DEPLOY_CHECKLIST.md`

数据库必须先 dry-run，禁止生产 reset。Scheduler 本版无需重新部署。
