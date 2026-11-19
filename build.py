# -*- coding: utf-8 -*-
"""组装静态站点：CSS 水印替换 + 补充样式 + 单文件版 + zip"""
import os, re, shutil, urllib.parse, zipfile

BASE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(BASE, "ref")

# 1) CSS：有参考素材时重新生成（替换水印）；否则直接用已入库的样式
css_path = os.path.join(BASE, "assets/css/site.css")
ref_css = os.path.join(REF, "site.css")
if os.path.exists(ref_css):
    css = open(ref_css, encoding="utf-8").read()
    old_wm = urllib.parse.quote("期市金研")
    new_wm = urllib.parse.quote("产业链数据库")
    assert old_wm in css, "watermark text not found"
    css = css.replace(old_wm, new_wm)
    css = css.replace("/* ---------- 图表水印：每张图/每张表铺「期市金研」 ---------- */",
                      "/* ---------- 图表水印：每张图铺「产业链数据库」 ---------- */")
# 数据说明页补充样式
EXTRA_CSS = """
/* ---------- 数据说明页 ---------- */
.about-block { margin-bottom: 20px; }
.about-body { padding: 16px 18px; font-size: 14px; color: var(--text-2); line-height: 1.9; }
.about-body p { margin: 0 0 10px; }
.about-body p:last-child { margin-bottom: 0; }
.about-body b { color: var(--text); }
.about-body.legal { font-size: 12.5px; color: var(--muted); }
.about-table { width: 100%; }
.about-table th { width: 76px; text-align: left !important; vertical-align: top; padding-top: 7px !important; }
.about-table td { text-align: left !important; white-space: normal !important; font-family: inherit !important; }
.about-list { margin: 0; padding-left: 22px; columns: 2; column-gap: 40px; }
.about-list li { margin-bottom: 4px; break-inside: avoid; }
.about-list a { color: var(--text-2); }
.about-list a:hover { color: var(--gold); }
@media (max-width: 700px) { .about-list { columns: 1; } }
/* ---------- 多品种：面包屑与品种切换器 ---------- */
.crumb { color: var(--muted); font-weight: 600; }
.crumb:hover { color: var(--gold); }
.side-switch { padding: 0 16px 10px; }
.side-switch select { width: 100%; padding: 7px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); color: var(--text); font-size: 13px; cursor: pointer; }
.side-switch select:focus { outline: none; border-color: var(--gold); }
"""

if os.path.exists(ref_css):
    css += EXTRA_CSS
    os.makedirs(os.path.join(BASE, "assets/css"), exist_ok=True)
    open(css_path, "w", encoding="utf-8").write(css)
else:
    # 无参考素材（例如别人克隆下来的仓库）：直接用已入库样式
    css = open(css_path, encoding="utf-8").read()

# 2) chart.js：有参考渲染器则覆盖，否则沿用车内版本
if os.path.exists(os.path.join(REF, "chart.js")):
    shutil.copy(os.path.join(REF, "chart.js"), os.path.join(BASE, "assets/js/chart.js"))

# 3) 单文件版（内联全部资源，双击即可打开）
html = open(os.path.join(BASE, "index.html"), encoding="utf-8").read()
data_js = open(os.path.join(BASE, "assets/js/data.js"), encoding="utf-8").read()
chart_js = open(os.path.join(BASE, "assets/js/chart.js"), encoding="utf-8").read()
app_js = open(os.path.join(BASE, "assets/js/app.js"), encoding="utf-8").read()
single = re.sub(r'<link rel="stylesheet" href="assets/css/site\.css(?:\?[^"]*)?">',
                lambda m: "<style>\n" + css + "\n</style>", html)
single = re.sub(r'<script src="assets/js/data\.js(?:\?[^"]*)?"></script>',
                lambda m: "<script>\n" + data_js + "\n</script>", single)
single = re.sub(r'<script src="assets/js/chart\.js(?:\?[^"]*)?"></script>',
                lambda m: "<script>\n" + chart_js + "\n</script>", single)
single = re.sub(r'<script src="assets/js/app\.js(?:\?[^"]*)?"></script>',
                lambda m: "<script>\n" + app_js + "\n</script>", single)
single_path = os.path.join(BASE, "产业链数据库-单文件版.html")
open(single_path, "w", encoding="utf-8").write(single)

# 4) README
readme = """# 产业链数据库 · 多品种静态站点

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
"""
open(os.path.join(BASE, "README.md"), "w", encoding="utf-8").write(readme)

# 清理历史命名文件，避免 zip 内重复打包
for old in ["PTA产业链数据库-单文件版.html", "PTA产业链数据库-静态站点.zip"]:
    p = os.path.join(BASE, old)
    if os.path.exists(p):
        os.remove(p)

# 5) zip（不含 ref 参考素材）
zip_path = os.path.join(BASE, "产业链数据库-静态站点.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(BASE):
        if os.path.abspath(root).startswith(os.path.abspath(REF)):
            continue
        for fn in files:
            fp = os.path.join(root, fn)
            if fp == zip_path:
                continue
            z.write(fp, os.path.relpath(fp, BASE))
print("single:", os.path.getsize(single_path), "bytes")
print("zip:", os.path.getsize(zip_path), "bytes")
print("OK")