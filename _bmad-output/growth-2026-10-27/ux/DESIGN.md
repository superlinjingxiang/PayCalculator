---
name: PayTools growth extension
description: 继承工资计算器现有灰白蓝视觉的搜索、广告与统计体验增量契约。
status: draft
revision: 2
awaiting: 用户确认调整后的实施方案
updated: 2026-10-27
sources:
  - ../design.md
  - ../../../src/app/globals.css
colors:
  canvas: '#F5F5F7'
  paper: '#FFFFFF'
  ink: '#1D1D1F'
  muted: '#6E6E73'
  line: '#D2D2D7'
  blue: '#0071E3'
  blue-deep: '#0066CC'
  soft-blue: '#EAF3FF'
typography:
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif'
    fontSize: 16px
    lineHeight: '1.65'
  section:
    fontWeight: '700'
    lineHeight: '1.3'
rounded:
  card: 20px
  ad: 14px
  control: 12px
spacing:
  desktop-gutter: 24px
  mobile-gutter: 15px
  card-gap: 16px
  content-max: 1160px
components:
  search-intro:
    foreground: '{colors.ink}'
    accent: '{colors.blue}'
  calculator:
    background: '{colors.paper}'
  policy-card:
    background: '{colors.paper}'
    radius: '{rounded.card}'
  ad-slot:
    background: '{colors.paper}'
    radius: '{rounded.ad}'
  privacy-choices:
    background: '{colors.ink}'
    foreground: '{colors.paper}'
  report-entry:
    foreground: '{colors.blue-deep}'
---

## Brand & Style

继承现有 PayTools 白卡、灰色画布与蓝色操作提示。不启动品牌重设计。本文件与行为契约 EXPERIENCE.md 配合使用；文档与未来视觉稿冲突时，以两份契约为准。修订2优先上海场景与真实PV，尚待用户批准实施。

## Colors

正文使用 {colors.ink}，辅助说明使用 {colors.muted}。链接使用 {colors.blue-deep} 并保持可辨认的下划线或上下文。广告不得借主操作蓝色伪装成「计算工资」。文本对比目标为普通文本4.5:1、大文本3:1；仅用于装饰的细边框不承担交互边界识别。当前颜色是代码提取，不代表整页无障碍已验收。

## Typography

沿用系统中文无衬线字体。新增上海页H1描述真实功能，FAQ与政策说明使用常规正文字号，不以极小字隐藏重要限制。主要金额和操作继承现有组件；PV放在本地HTML/JSON站长报告，不复制到前台装饰。

## Layout & Spacing

内容最大宽度 {spacing.content-max}。桌面边距 {spacing.desktop-gutter}、550px以下边距 {spacing.mobile-gutter}。工具置于简介之后，广告置于结果和正文之后。上海页不复制首页大幅英雄区域；简短H1、适用范围、计算器即可。

## Elevation & Depth

沿用现有轻阴影和1px细边框。广告层级低于工具，不新增弹出、闪烁或固定遮挡广告。隐私选择面板可沿用现有底部深色卡片，但小屏应保证页面操作仍可通过滚动到达。

## Shapes

政策说明卡使用 {rounded.card}，广告卡使用 {rounded.ad}。新组件沿用现有圆角，不引入新形状语言。

## Components

| 组件 | 视觉规则 |
|---|---|
| SearchIntro | 唯一H1、紧凑说明、可选政策状态；上海词优先，全国累计预扣词次级，不堆关键词 |
| Calculator | 复用现有 SalaryCalculator 及 SalaryResults 的白卡和金额层级 |
| PolicyCard | 白卡、明确生效期、来源链接、核实状态文字；状态不只靠颜色 |
| AdSlot | 白卡与「广告」标识；宽度不超过父容器，已许可后按平台规格预留高度 |
| PrivacyChoices | 沿用深色广告选择面板；拒绝与接受按钮都可见；第一方无标识PV在隐私页独立披露 |
| ReportEntry | 本地HTML/JSON报告入口；清楚显示预览环境、上海时区、生成时间、采集起点、覆盖及部分日，无公开管理员页 |

## Do's and Don'ts

| 使用 | 避免 |
|---|---|
| 具体问题和有来源的规则 | 批量仅换地名的城市页 |
| 独立「广告」文字标识 | 与实发金额、计算按钮混排广告 |
| 报告真实PV、覆盖区间与部分日 | 本地刷新次数冒充全站计数；UV或真人数承诺 |
| 待接入、受阻、失败的真实状态 | 假流量、假获批、假排名 |
