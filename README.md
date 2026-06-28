# 行動辦公室

Apple-like 內部工作資料入口網站，使用 React、Vite 與 Tailwind CSS 製作。

## 啟動

```bash
pnpm install
pnpm dev
```

## 資料維護

主要入口與各分類資源集中在 `src/data/config.js`：

- `categoryCards`：首頁入口卡片
- `pageResources`：各分類頁面的資源模組
- `filters`：首頁分類篩選
- `siteConfig.protectedPassword`：主管專區密碼

主管專區目前密碼為 `2026TP767`。
