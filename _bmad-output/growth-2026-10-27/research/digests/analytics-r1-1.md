# PV统计证据摘录

访问均为2026-10-27。

- [百度统计单页应用设置](https://tongji.baidu.com/web/help/article?id=324&type=0)，发布日未标注：SPA可用后台开关或JS插件二选一；开关开启后移除其他_trackPageview避免重复。中/未独立验证，集成。
- [百度trackEvent](https://tongji.baidu.com/web/help/article?id=236&type=0)，发布日未标注：事件不计入PV，可用来记录无需作为PV的操作。中/未独立验证，集成。
- [CNZZ术语](https://help.cnzz.com/support/mingcijieshi/)、[360术语](https://fenxi.360.cn/help/term)，发布日未标注：每次打开页面记PV，同用户重复访问累计，UV与PV不等。独立厂商一致，高/verified，定义。
- [阿里云离线日志](https://help.aliyun.com/zh/cdn/user-guide/offline-logs-quick-start)，更新2026-07-21：全网域名请求日志按小时，提供近30天下载，通常延迟24小时内也可能更久，字段含URL、方法、状态、UA、类型及HIT/MISS。中/未独立验证，供应商功能。
- [阿里云CDN日志分析](https://sls.aliyun.com/doc/en/sqldemo/CDN%E6%97%A5%E5%BF%97%E5%88%86%E6%9E%90.html)，发布日未标注：SLS可分析CDN日志；字段含URI、UA、缓存命中和响应码。中/未独立验证，供应商功能。
- [腾讯CDN实时日志](https://cloud.tencent.com/document/product/228/42137)，发布日未标注：支持实时采集推送至CLS，含URL、UA、状态、请求ID等。独立证明CDN边缘日志架构可实现，但不能用于认证阿里云具体留存条款。高/verified架构、供应商细则仍单源。
- [阿里云转存离线日志到OSS](https://help.aliyun.com/zh/cdn/user-guide/use-function-compute-to-deliver-logs/)，发布日未标注：CDN配合函数计算自动转存OSS，默认30天免费日志存储不等于所有相关资源免费。中/未独立验证，供应商功能。

推论：页面事件PV与HTTP请求不是同一个指标；日志要排除静态资源、爬虫、失败与预取；客户端路由页面可能没有HTML网络请求；JS被拦可能漏报，日志也不能保证识别真实人类。应并列核对，不要求两数相等。
