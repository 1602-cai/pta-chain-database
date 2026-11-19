# 产业链数据库 · 多品种静态站点

布局与交互参考「期市金研」期货基本面数据库页面，数据来自各品种 Excel 数据库。
当前覆盖 22 个品种 / 176 个板块 / 1580 张分年季节性叠图。

## 打开方式
- 双击 `index.html`（需保持 assets 文件夹在同级目录）；
- 或双击 `产业链数据库-单文件版.html`（资源已全部内联，单文件即可运行、便于发送）。

## 目录结构
- `index.html`、`assets/css/site.css`、`assets/js/{data,chart,app}.js`
- `extract.py`：PTA 精细板块（含基差/月差/价差/推算序列）→ `pta_curated.json`
- `extract_all.py`：各品种工作簿 → `assets/js/data.js`
- `build.py`：样式组装 + 单文件版 + zip
- `pta_curated.json`：PTA 板块快照（extract.py 的产物）

## 更新数据
1. 把各品种工作簿放进站点根目录的 `数据库/`（支持 .xls / .xlsx，文件名空格差异可容忍）；
2. 依次运行：
   ```
   python3 extract.py        # 生成 pta_curated.json
   python3 extract_all.py    # 生成 assets/js/data.js
   python3 build.py          # 重建单文件版与 zip
   ```
3. 提交并推送，Pages 会自动重新发布。

数据目录不在默认位置时，用环境变量指定：
`COMMODITY_DATA_DIR=/path/to/数据库 python3 extract_all.py`

## 复制成自己的仓库并发布
```bash
git clone https://github.com/1602-cai/pta-chain-database.git my-db
cd my-db
git remote set-url origin https://github.com/<你的账号>/<你的仓库>.git
git push -u origin main
```
然后在自己的仓库 Settings → Pages → Build and deployment 选择 `Deploy from a branch`、分支 `main`、目录 `/ (root)`，等 1–2 分钟即可访问
`https://<你的账号>.github.io/<你的仓库>/`。

## 注意
数据版权与免责声明见站内「数据说明」页；公开部署前请确认已获得相应分发授权。
