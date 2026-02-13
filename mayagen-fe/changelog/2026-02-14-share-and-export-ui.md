---
title: Bulk Edit Sharing & Export UI
date: 2026-02-14
author: MayaGen Team
tags: [feature, ui, bulk-edit]
---

## 🚀 New Features

### Bulk Edit Sharing
- **Public Share Links**: Added "Share" button to the Bulk Edit View page.
- **Share Dialog**: New modal to generate and copy unique share links.
- **Public View Page**: Created `/share-edit/[token]` route to display shared batches to unauthenticated users.

### ZIP Export
- **Download All**: Added "Export ZIP" button to download all generated variations + original image in a single archive.

## 🛠 Improvements

- **UI Components**: Implementation of `Dialog` component (Shadcn UI) to support modal interactions.
- **Error Handling**: Improved build stability by resolving missing component imports.
