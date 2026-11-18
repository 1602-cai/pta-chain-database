/* 期市金研 · 轻量折线图（原生 canvas，无第三方依赖）
 *
 * LineChart.create(canvas, opts) 返回实例
 * opts: { labels, years, series, unit, freq, heights, onHover }
 *   labels 期标签数组 ["1月1日", ...]
 *   years  年份数组 ["2022", ...]
 *   series { "2022": [v|null, ...], ... }
 */
(function (global) {
  "use strict";

  var PALETTE = ["#a3aec2", "#7396c8", "#3f9e8c", "#c08a1e", "#c4482c", "#8b5cf6"];
  var AXIS = "#d8dee8";
  var GRID = "rgba(20,35,60,0.07)";
  var TICK = "#6b7688";
  var FONT = '-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

  function getColor(i, n) {
    if (n <= PALETTE.length) {
      // 最新年份用最亮的颜色：PALETTE 由旧到新
      var start = PALETTE.length - n;
      return PALETTE[start + i];
    }
    var hue = 210 + (i / Math.max(1, n - 1)) * 120;
    return "hsl(" + Math.round(hue) + ",45%," + Math.round(45 + (i / Math.max(1, n - 1)) * 25) + "%)";
  }

  function niceCeil(v) {
    if (v <= 0) return 1;
    var exp = Math.floor(Math.log10(v));
    var base = Math.pow(10, exp);
    var f = v / base;
    var m = f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 3 ? 3 : f <= 5 ? 5 : f <= 7.5 ? 7.5 : 10;
    return m * base;
  }

  function fmtNum(v, unit) {
    if (v === null || v === undefined || isNaN(v)) return "—";
    var abs = Math.abs(v);
    var s;
    if (abs >= 10000) s = (v / 10000).toFixed(2) + "万";
    else if (abs >= 100) s = v.toFixed(0);
    else if (abs >= 1) s = v.toFixed(2);
    else if (abs > 0) s = v.toFixed(4);
    else s = "0";
    return s;
  }

  function LineChart(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.setOpts(opts);
    this.hidden = {};
    this.hoverIdx = -1;
    this.dpr = global.devicePixelRatio || 1;
    this._bind();
    this.draw();
  }

  LineChart.prototype.setOpts = function (opts) {
    this.labels = opts.labels || [];
    this.years = opts.years || [];
    this.series = opts.series || {};
    this.unit = opts.unit || "";
    this.freq = opts.freq || "day";
    this.height = opts.height || 260;
    if (opts.hidden) this.hidden = opts.hidden;
  };

  LineChart.prototype._bind = function () {
    var self = this;
    this.canvas.addEventListener("mousemove", function (e) { self._onMove(e); });
    this.canvas.addEventListener("mouseleave", function () {
      self.hoverIdx = -1;
      self.draw();
      if (self.tooltip) self.tooltip.style.display = "none";
    });
  };

  LineChart.prototype._pos = function (e) {
    var rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
  };

  LineChart.prototype._plot = function (w, h) {
    return { left: 52, right: 22, top: 14, bottom: 24, w: w, h: h };
  };

  LineChart.prototype._bounds = function () {
    var min = Infinity, max = -Infinity, any = false;
    for (var i = 0; i < this.years.length; i++) {
      if (this.hidden[this.years[i]]) continue;
      var arr = this.series[this.years[i]] || [];
      for (var j = 0; j < arr.length; j++) {
        var v = arr[j];
        if (v === null || v === undefined || isNaN(v)) continue;
        if (v < min) min = v;
        if (v > max) max = v;
        any = true;
      }
    }
    if (!any) return { min: 0, max: 1 };
    if (min === max) { min = min - Math.abs(min) * 0.1 - 1; max = max + Math.abs(max) * 0.1 + 1; }
    if (min > 0 && min < (max - min) * 0.35) min = 0;
    var pad = (max - min) * 0.08;
    return { min: min - pad, max: max + pad };
  };

  LineChart.prototype.draw = function () {
    var ctx = this.ctx, cvs = this.canvas, dpr = this.dpr;
    var cssW = cvs.clientWidth || 600;
    var cssH = this.height;
    if (cvs.width !== Math.round(cssW * dpr) || cvs.height !== Math.round(cssH * dpr)) {
      cvs.width = Math.round(cssW * dpr);
      cvs.height = Math.round(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.font = "11px " + FONT;

    var p = this._plot(cssW, cssH);
    var pw = cssW - p.left - p.right, ph = cssH - p.top - p.bottom;
    if (pw <= 10 || ph <= 10) return;

    var b = this._bounds();
    var n = this.labels.length;
    if (!n) return;

    var xAt = function (i) { return p.left + (n === 1 ? pw / 2 : (i / (n - 1)) * pw); };
    var yAt = function (v) { return p.top + ph - ((v - b.min) / (b.max - b.min)) * ph; };

    // 网格 + Y 轴刻度
    var step = (b.max - b.min) / 4;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (var k = 0; k <= 4; k++) {
      var vv = b.min + step * k;
      var y = yAt(vv);
      ctx.strokeStyle = GRID;
      ctx.beginPath();
      ctx.moveTo(p.left, Math.round(y) + 0.5);
      ctx.lineTo(p.left + pw, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillStyle = TICK;
      ctx.fillText(fmtNum(vv, this.unit), p.left - 6, y);
    }

    // X 轴刻度
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var tickCount = this.freq === "month" ? Math.min(12, n) : this.freq === "week" ? 8 : 7;
    var stride = Math.max(1, Math.floor(n / tickCount));
    for (var i2 = 0; i2 < n; i2 += stride) {
      var x = xAt(i2);
      ctx.fillStyle = TICK;
      ctx.fillText(this.labels[i2], x, p.top + ph + 6);
    }

    // 数据线
    for (var yi = 0; yi < this.years.length; yi++) {
      var yr = this.years[yi];
      if (this.hidden[yr]) continue;
      var arr = this.series[yr] || [];
      var color = getColor(yi, this.years.length);
      var isLast = yi === this.years.length - 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = isLast ? 2 : 1.2;
      ctx.globalAlpha = isLast ? 1 : 0.9;
      ctx.beginPath();
      var started = false;
      // 空值不画点，但线条跨过空值连到下一个有效点
      for (var j2 = 0; j2 < arr.length; j2++) {
        var v2 = arr[j2];
        if (v2 === null || v2 === undefined || isNaN(v2)) continue;
        var xx = xAt(j2), yy = yAt(v2);
        if (!started) { ctx.moveTo(xx, yy); started = true; }
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 十字准星
    if (this.hoverIdx >= 0 && this.hoverIdx < n) {
      var hx = xAt(this.hoverIdx);
      ctx.strokeStyle = "rgba(30,45,70,0.28)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, p.top);
      ctx.lineTo(hx, p.top + ph);
      ctx.stroke();
      ctx.setLineDash([]);
      for (var yj = 0; yj < this.years.length; yj++) {
        var yr2 = this.years[yj];
        if (this.hidden[yr2]) continue;
        var v3 = (this.series[yr2] || [])[this.hoverIdx];
        if (v3 === null || v3 === undefined || isNaN(v3)) continue;
        ctx.fillStyle = getColor(yj, this.years.length);
        ctx.beginPath();
        ctx.arc(hx, yAt(v3), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this._geom = { xAt: xAt, yAt: yAt, p: p, pw: pw, ph: ph };
  };

  LineChart.prototype._onMove = function (e) {
    if (!this._geom) return;
    var pos = this._pos(e);
    var g = this._geom;
    if (pos.x < g.p.left || pos.x > g.p.left + g.pw) return;
    var n = this.labels.length;
    var idx = Math.round(((pos.x - g.p.left) / g.pw) * (n - 1));
    idx = Math.max(0, Math.min(n - 1, idx));
    if (idx !== this.hoverIdx) {
      this.hoverIdx = idx;
      this.draw();
    }
    this._showTip(pos);
  };

  LineChart.prototype._showTip = function (pos) {
    if (this.hoverIdx < 0) return;
    var tip = this.tooltip;
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "chart-tip";
      this.canvas.parentNode.appendChild(tip);
      this.tooltip = tip;
    }
    var rows = [];
    for (var i = this.years.length - 1; i >= 0; i--) {
      var yr = this.years[i];
      if (this.hidden[yr]) continue;
      var v = (this.series[yr] || [])[this.hoverIdx];
      rows.push(
        '<div class="tip-row"><span class="dot" style="background:' +
          getColor(i, this.years.length) + '"></span><span class="ty">' + yr +
          '</span><span class="tv">' + (v === null || v === undefined ? "—" : fmtNum(v, this.unit)) +
          "</span></div>"
      );
    }
    tip.innerHTML =
      '<div class="tip-h">' + this.labels[this.hoverIdx] +
      (this.unit ? ' <span class="tip-u">' + this.unit + "</span>" : "") + "</div>" + rows.join("");
    tip.style.display = "block";
    var box = this.canvas.parentNode.getBoundingClientRect();
    var left = pos.x + 14;
    if (left + 150 > pos.w) left = pos.x - 154;
    tip.style.left = left + "px";
    tip.style.top = Math.max(2, pos.y - 10) + "px";
  };

  LineChart.prototype.toggle = function (year) {
    this.hidden[year] = !this.hidden[year];
    this.draw();
    return !this.hidden[year];
  };

  LineChart.prototype.only = function (list) {
    this.hidden = {};
    var self = this;
    this.years.forEach(function (y) { if (list.indexOf(y) < 0) self.hidden[y] = true; });
    this.draw();
  };

  LineChart.prototype.resize = function () { this.draw(); };

  LineChart.create = function (canvas, opts) { return new LineChart(canvas, opts); };
  LineChart.fmtNum = fmtNum;
  LineChart.color = getColor;

  global.LineChart = LineChart;
})(window);
