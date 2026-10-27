---
title: '接入成熟开源网站统计'
status: 'in-progress'
execution_state: 'paused-by-user'
created: '2026-10-27'
authorization: '用户明确要求：这个浏览量应该有开源方案，调研然后接入，阿里云肯定有现成的'
context: ['AGENTS.md', '_bmad-output/growth-2026-10-27/analytics-selection/opensource.md', '_bmad-output/growth-2026-10-27/analytics-selection/aliyun.md']
---

## 意图与取舍

用户要求用成熟统计产品提供后台，而非只看自制离线PV。现有搜索、工资计算与广告延期目标保持。官方调研比较SLS/RUM、Umami/Matomo/Plausible后，选**Umami v3.4.1**自托管到现有阿里云ECS，不新购统计云服务；SLS/RUM现成但商业按量，尚无付费开通授权。

Umami为主统计，原匿名PV保留作切换期间核对与既有历史，不倒灌21次测试信号。服务仅loopback暴露后台，公网仅同源两个精确采集/脚本路由；后台用阿里云官方端口转发。账号尚未开启Session Manager，部署并验证服务后再请用户开启，不擅自变更该安全能力。不开新公网端口，不创建云密钥，不影响既有容器。

## 分工与边界

主agent负责：Docker官方镜像、PostgreSQL、Nginx部署、私有凭证、云端采集与后台、官方隧道、数据备份及资源实测。实现agent本轮**只负责前端接入、测试和对应文档**；不改服务器或release/内的部署脚本，不改其他既有工作。

静态导出与本地工资计算不变。Umami官方GHCR镜像tag是3.4.1（无v），不采用latest或不明镜像。资源约2核2GiB且可用1.33GiB，应用/DB设置上限并实测。PRIVATE_MODE=1、关闭遥测和外部更新/MCP。

## 前端任务

- 新增成熟统计组件和配置模块，RootLayout加载一次。`NEXT_PUBLIC_ANALYTICS_PROVIDER=umami`与公开website UUID启用；未配置默认不加载。脚本固定同源 `/analytics/script.js`，接收 `/analytics/api/send`，不允许环境变量塞任意脚本URL。
- 按v3.4.1官方tracker接口核对实现，**禁用自动pageview**，使用官方 `umami.track` 的受支持方法与Next `usePathname`处理首屏、SPA导航、后退/前进、刷新，避免自动+手动双计。不得猜测SDK接口。脚本延迟加载时不重复或错归路径；失败不阻塞计算。
- 白名单仅现有7个公开页面。URL仅规范路径，title为静态映射；不含query/hash、工资或表单/结果。referrer只保留安全来源域名，不上传来源路径或查询；不用自定义个人ID、自动事件属性、表单回放。SDK请求不得带本网站cookie或工资值；如同源脚本fetch默认带cookie，需通过Nginx转发剥离并据实披露，不伪称浏览器完全无cookie。
- 旧PageViews继续由NEXT_PUBLIC_PV_ENABLED控制，验收切换后默认正式预览构建用PV=false与Umami启用；不删除旧历史，防止两个数据源混淆。
- 更新 `.env.example`、隐私、README、DEPLOY及测试报告。隐私写明自托管Umami、无cookie跟踪/自定义用户ID，浏览器/系统/语言/屏幕和来源域名等实际字段；服务端为匿名会话可能短暂处理IP，不承诺“完全不处理IP”，不发送工资。字段以锁版本源码和真实请求验收为准。

## 验收

Given 未配置，When 浏览，Then 无Umami脚本/请求。
Given 已配置，When 首屏、站内往返、刷新，Then Umami各有一次pageview，输入/计算/CSV不增加，URL/title/referrer不泄露金额、query、hash或任意文本。
Given 脚本延迟或失败，When 继续计算，Then 工具可用、导航归属正确且无重复。
Given 部署成功，When 受控真实访问，Then 后台API/界面可见真实PV和页面明细；未开启隧道时不宣称用户已能访问后台。

本地lint/typecheck/Vitest/build/Chrome测试按改动验证；真实后台、资源、备份和安全访问由主agent完成。域名/备案/广告实际接入仍是后续事项，不因本次统计替换标为全部完成。
