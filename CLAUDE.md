# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指导。

## 项目概述

WeFIRE 是一款极简风格的 FIRE（财务独立、提前退休）进度追踪微信小程序。用户设定目标金额与预计退休年份，每月录入资产与负债快照，系统自动计算净资产与综合进度，并通过进度条、趋势图直观展示距离 FIRE 还有多远。

所有数据仅存储在用户手机本地，无需注册账号，支持一键备份与恢复。

## 技术栈

- 微信小程序原生框架
- 纯本地存储（无后端/无服务器）

## 项目架构

标准微信小程序目录结构：

- `app.js` / `app.json` / `app.wxss` — 应用入口、全局配置、全局样式
- `pages/` — 页面级组件（每个页面包含 `.js` + `.json` + `.wxml` + `.wxss`）
- `utils/` — 公共工具函数（如存储助手、FIRE 计算逻辑）
- `components/` — 可复用自定义组件

## 关键约束

- 微信小程序包大小限制：主包 2MB，单个分包 2MB，总计 20MB
- 所有本地存储 API 通过 `wx.setStorage` / `wx.getStorage` 异步调用
- 无 DOM 操作 — 通过 WXML 数据绑定和 `setData()` 更新 UI
- 备份/恢复可通过 `wx.getFileSystemManager()` 实现文件导出/导入
