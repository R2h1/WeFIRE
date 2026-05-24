# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeFIRE is a minimal FIRE (Financial Independence, Retire Early) progress tracking WeChat Mini Program. Users set a target amount and expected retirement year, record monthly asset/liability snapshots, and the app automatically calculates net worth and progress via progress bars and trend charts.

All data is stored locally on the device — no registration, no backend. Supports one-click backup and restore.

## Tech Stack

- WeChat Mini Program native framework (WXML + WXSS + JS)
- Vant Weapp (v1.11.7) — dialogs, fields, popups, pickers, cells, buttons, icons, toasts, loading
- Pure local storage (`wx.setStorage`/`wx.getStorage` async + sync)

## Project Structure

```
app.js / app.json / app.wxss    — Entry, global config, design system & Vant theme vars
pages/
  index/                         — Home dashboard: progress bar, net worth summary, trend chart, stats
  add/                           — Monthly data entry: asset/liability inputs, category picker, history list
  history/                       — Settings (FIRE target), backup/restore, reminder subscribe, clear data
utils/
  storage.js                     — CRUD wrapper for all 4 storage keys
  fire.js                        — Core FIRE calculations (progress, projected years, missing month filling, money formatting)
  categories.js                  — Fixed preset asset/liability categories (Chinese financial products)
  chart.js                       — Canvas 2D line chart (bezier curves, gradient fill)
  backup.js                      — Export/import data as JSON files
  reminder.js                    — Monthly subscribe-message reminder
```

No `components/` directory — everything is page-level.

## Data Model (Local Storage)

Four storage keys:

1. `fire_settings` — `{ targetAmount: number, retirementYear: number }`
2. `fire_snapshots` — Array of `{ id: "YYYY-MM", year, month, assets, liabilities, netWorth, createdAt }`
3. `fire_tracked_items` — Array of `{ itemId, presetId, type: "assets"|"liabilities", label?: string }`
4. `fire_entries` — Object keyed by monthId, each value is array of `{ itemId, presetId, amount }`

## Key Architecture & Data Flow

- **Settings-first**: Home page shows empty state until `fire_settings` is configured in the 我的 tab
- **Data loading in `onShow()`** (not `onLoad()`), so tab switching refreshes data
- **Snapshots are derived**: When user submits monthly entries in `add/`, totals are computed and stored as a snapshot. Snapshots are the source of truth for charts and progress
- **Missing month filling** (`fire.fillMissingMonths`): For charting, gaps between snapshots are filled by carrying forward the last known values so the trend line is continuous
- **Chart rendering** (`chart.drawLineChart`): Canvas 2D via `wx.createSelectorQuery` + `getContext('2d')`, with bezier curves and gradient fill. Runs in `setTimeout(300ms)` after `setData` to wait for layout
- **Preset categories**: Fixed list of Chinese financial products (微信零钱, 支付宝, 银行卡, 公积金, 花呗, etc.). Users pick from presets and can add optional labels
- **Backup format**: JSON `{ version: 1, exportedAt, settings, snapshots }`. Import validates version and snapshots fields

## Design System

Global styles in `app.wxss`:
- Brand: `#2E7D32` green, mapped to `--van-primary-color`
- Cards: `16px` border-radius, white `#FFFFFF` background, `8px 16px` margin
- Typography: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif`
- Spacing scale: 4/8/12/16/20/24/28/32
- Page background: `#f2f2f5`

## Key Constraints

- Package size: main bundle 2MB, sub-package 2MB, total 20MB
- All storage via `wx.setStorage`/`wx.getStorage` — async with Promise wrappers in storage.js
- No DOM — UI via WXML data binding and `setData()`
- Backup/restore via `wx.getFileSystemManager()` + `wx.shareFileMessage`/`wx.chooseMessageFile`
- No test framework configured yet
