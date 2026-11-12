/* eslint-disable max-len */
/**
 * Self-contained HTML for the task card view (MCP Apps, protocol 2026-01-26).
 *
 * The host renders it in a sandboxed iframe and talks to it over postMessage
 * JSON-RPC. The client side of that protocol is written inline rather than
 * bundled from @modelcontextprotocol/ext-apps: the view needs only initialize,
 * a few notifications, size reporting, open-link and tools/call, and inlining
 * keeps the page small and free of external script origins (which hosts block by CSP).
 *
 * All ClickUp data is inserted with textContent, never innerHTML.
 */
export const TASK_VIEW_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ClickUp tasks</title>
<style>
:root {
  color-scheme: light dark;
  --bg: var(--color-background-primary, #ffffff);
  --bg-2: var(--color-background-secondary, #f6f5f3);
  --bg-3: var(--color-background-tertiary, #efede9);
  --fg: var(--color-text-primary, #1c1917);
  --fg-2: var(--color-text-secondary, #5c5752);
  --fg-3: var(--color-text-tertiary, #8a847e);
  --line: var(--color-border-primary, rgba(0, 0, 0, 0.09));
  --line-2: var(--color-border-secondary, rgba(0, 0, 0, 0.16));
  --danger: var(--color-text-danger, #c2271d);
  --warn: var(--color-text-warning, #b45309);
  --ok: var(--color-text-success, #15803d);
  --accent: #7b68ee;
  --radius: var(--border-radius-lg, 12px);
  --radius-sm: var(--border-radius-sm, 6px);
  --font: var(--font-sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif);
  --mono: var(--font-mono, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
}
:root[data-theme="dark"] {
  --bg: var(--color-background-primary, #1f1e1d);
  --bg-2: var(--color-background-secondary, #2a2927);
  --bg-3: var(--color-background-tertiary, #34322f);
  --fg: var(--color-text-primary, #f5f4f2);
  --fg-2: var(--color-text-secondary, #b5afa8);
  --fg-3: var(--color-text-tertiary, #8a847e);
  --line: var(--color-border-primary, rgba(255, 255, 255, 0.09));
  --line-2: var(--color-border-secondary, rgba(255, 255, 255, 0.16));
  --danger: var(--color-text-danger, #f87171);
  --warn: var(--color-text-warning, #fbbf24);
  --ok: var(--color-text-success, #4ade80);
  --accent: #9b8cff;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 14px; line-height: 1.45; -webkit-font-smoothing: antialiased; }
#root { padding: 14px 16px 16px; }
body.full #root { max-width: 880px; margin: 0 auto; padding: 24px 24px 32px; }
button { font: inherit; color: inherit; }
.muted { color: var(--fg-2); }
.faint { color: var(--fg-3); }
.row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.wrap { flex-wrap: wrap; }
.grow { flex: 1; min-width: 0; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.icon { width: 14px; height: 14px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.fade-in { animation: fade 0.18s ease-out; }
@keyframes fade { from { opacity: 0; transform: translateY(2px); } }

.top { display: flex; align-items: center; gap: 6px; min-width: 0; margin-bottom: 6px; font-size: 12px; color: var(--fg-2); }
.crumb { display: flex; align-items: center; gap: 4px; min-width: 0; flex: 1; overflow: hidden; white-space: nowrap; }
.crumb span { overflow: hidden; text-overflow: ellipsis; }
.crumb .sep { color: var(--fg-3); flex: none; }
.id-chip { font-family: var(--mono); font-size: 11px; color: var(--fg-3); padding: 1px 6px; border: 1px solid var(--line); border-radius: var(--radius-sm); white-space: nowrap; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: var(--radius-sm); border: 0; background: transparent; color: var(--fg-2); cursor: pointer; flex: none; }
.icon-btn:hover { background: var(--bg-2); color: var(--fg); }
.icon-btn:disabled { cursor: default; opacity: 0.6; }
.icon-btn.spin .icon { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.title { font-size: 17px; font-weight: 650; letter-spacing: -0.01em; margin: 0 0 10px; overflow-wrap: anywhere; line-height: 1.3; }
.title.closed { color: var(--fg-2); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.chip { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px; border-radius: 999px; background: var(--bg-2); border: 1px solid transparent; font-size: 12px; font-weight: 500; white-space: nowrap; color: var(--fg); }
.chip .icon { width: 13px; height: 13px; }
.chip.status { text-transform: uppercase; font-size: 11px; letter-spacing: 0.03em; font-weight: 600; }
.chip.overdue { color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, transparent); }
.chip.soon { color: var(--warn); background: color-mix(in srgb, var(--warn) 12%, transparent); }
.chip.done { color: var(--ok); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--fg-3); }

.people { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 12px; }
.person { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 500; }
.avatar { position: relative; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 650; color: #fff; flex: none; overflow: hidden; background: #8a847e; }
.avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.avatar.sm { width: 20px; height: 20px; font-size: 9px; }
.stack { display: inline-flex; }
.stack .avatar { margin-left: -4px; box-shadow: 0 0 0 2px var(--bg); }
.stack .avatar:first-child { margin-left: 0; }
.stack .more { background: var(--bg-3); color: var(--fg-2); }

.progress { margin-bottom: 12px; }
.progress-label { display: flex; justify-content: space-between; font-size: 12px; color: var(--fg-2); margin-bottom: 5px; }
.bar { height: 6px; border-radius: 999px; background: var(--bg-3); overflow: hidden; }
.bar > span { display: block; height: 100%; border-radius: inherit; background: var(--ok); transition: width 0.4s ease; }

.desc { position: relative; margin-bottom: 4px; color: var(--fg); font-size: 13.5px; overflow-wrap: anywhere; }
.desc.clamped { max-height: 9.2em; overflow: hidden; -webkit-mask-image: linear-gradient(#000 60%, transparent); mask-image: linear-gradient(#000 60%, transparent); }
.desc p { margin: 0 0 6px; }
.desc ul, .desc ol { margin: 0 0 6px; padding-left: 20px; }
.desc li { margin: 1px 0; }
.desc .md-h { font-weight: 650; margin: 8px 0 4px; }
.desc .md-h:first-child { margin-top: 0; }
.desc code { font-family: var(--mono); font-size: 12px; background: var(--bg-2); padding: 1px 4px; border-radius: 4px; }
.desc pre { font-family: var(--mono); font-size: 12px; background: var(--bg-2); padding: 8px 10px; border-radius: var(--radius-sm); overflow-x: auto; margin: 0 0 6px; white-space: pre; }
.desc blockquote { margin: 0 0 6px; padding-left: 10px; border-left: 3px solid var(--line-2); color: var(--fg-2); }
.desc .todo { list-style: none; margin-left: -18px; display: flex; gap: 6px; align-items: flex-start; }
.desc .todo .box { margin-top: 3px; width: 13px; height: 13px; border-radius: 3px; border: 1.5px solid var(--line-2); flex: none; display: inline-flex; align-items: center; justify-content: center; }
.desc .todo.checked .box { background: var(--ok); border-color: var(--ok); color: #fff; }
.desc .todo.checked > span:last-child { color: var(--fg-2); text-decoration: line-through; }
.a { color: var(--accent); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
.text-btn { border: 0; background: none; padding: 2px 0; color: var(--accent); font-size: 12.5px; font-weight: 600; cursor: pointer; }
.text-btn:hover { text-decoration: underline; }

.tags { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0 2px; }
.tag { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 5px; font-size: 11.5px; font-weight: 500; background: var(--bg-2); color: var(--fg-2); }

.sections { margin-top: 12px; border-top: 1px solid var(--line); }
details.section { border-bottom: 1px solid var(--line); }
details.section > summary { list-style: none; display: flex; align-items: center; gap: 8px; padding: 9px 2px; cursor: pointer; font-size: 13px; font-weight: 600; user-select: none; }
details.section > summary::-webkit-details-marker { display: none; }
details.section > summary:hover { color: var(--accent); }
details.section > summary .chev { transition: transform 0.15s ease; color: var(--fg-3); }
details.section[open] > summary .chev { transform: rotate(90deg); }
.count { font-size: 11px; font-weight: 600; color: var(--fg-2); background: var(--bg-2); border-radius: 999px; padding: 0 7px; line-height: 18px; }
.section-body { padding: 0 2px 10px 22px; }
.kv { display: grid; grid-template-columns: minmax(90px, 38%) 1fr; gap: 6px 12px; font-size: 13px; }
.kv .k { color: var(--fg-2); overflow-wrap: anywhere; }
.kv .v { overflow-wrap: anywhere; }
.mini { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; min-width: 0; }
.mini.clickable { cursor: pointer; border-radius: var(--radius-sm); }
.mini.clickable:hover { color: var(--accent); }
.mini .check { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--line-2); display: inline-flex; align-items: center; justify-content: center; flex: none; }
.mini .check.on { background: var(--ok); border-color: var(--ok); color: #fff; }
.mini.resolved > .grow { color: var(--fg-2); text-decoration: line-through; }

.footer { display: flex; align-items: center; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.footer .meta { flex: 1; min-width: 160px; font-size: 12px; color: var(--fg-3); }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--bg); font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn:hover { background: var(--bg-2); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn.primary:hover { filter: brightness(1.08); }
.btn.sm { height: 26px; padding: 0 10px; font-size: 12px; }

.banner { display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 12px; border-radius: 8px; font-size: 12.5px; font-weight: 500; color: var(--ok); background: color-mix(in srgb, var(--ok) 11%, transparent); }
.banner .icon { width: 15px; height: 15px; stroke-width: 2.2; }
.notice { font-size: 12px; color: var(--danger); margin-top: 8px; }

.list-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.list-title { font-size: 15px; font-weight: 650; }
.summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.summary .chip { height: 22px; font-size: 11.5px; }
.search { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line-2); background: var(--bg); color: var(--fg-3); margin-bottom: 10px; }
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent); }
.search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--fg); font: inherit; font-size: 13px; }
.group { margin-bottom: 8px; }
.group > summary { list-style: none; display: flex; align-items: center; gap: 8px; padding: 4px 2px 6px; cursor: pointer; user-select: none; }
.group > summary::-webkit-details-marker { display: none; }
.group > summary .chev { color: var(--fg-3); transition: transform 0.15s ease; }
.group[open] > summary .chev { transform: rotate(90deg); }
.rows { border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; background: var(--bg); }
.item { border-top: 1px solid var(--line); }
.item:first-child { border-top: 0; }
.item-main { display: flex; align-items: center; gap: 10px; padding: 9px 12px; cursor: pointer; min-width: 0; outline: none; }
.item-main:hover, .item-main:focus-visible { background: var(--bg-2); }
.item.open > .item-main { background: var(--bg-2); }
.ring { width: 15px; height: 15px; border-radius: 50%; border: 2px solid var(--fg-3); flex: none; display: inline-flex; align-items: center; justify-content: center; color: #fff; }
.ring .icon { width: 10px; height: 10px; stroke-width: 3; }
.item-text { flex: 1; min-width: 0; }
.item-name { font-weight: 550; font-size: 13.5px; }
.item.closed .item-name { color: var(--fg-2); text-decoration: line-through; text-decoration-color: var(--fg-3); }
.item-sub { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--fg-3); margin-top: 1px; min-width: 0; }
.item-sub .tag { height: 17px; font-size: 10.5px; padding: 0 5px; }
.item-side { display: flex; align-items: center; gap: 8px; flex: none; font-size: 12px; color: var(--fg-2); }
.due { white-space: nowrap; font-size: 12px; }
.due.overdue { color: var(--danger); font-weight: 600; }
.due.soon { color: var(--warn); font-weight: 600; }
.preview { padding: 2px 12px 12px 37px; background: var(--bg-2); font-size: 13px; }
.preview .desc { font-size: 13px; }
.preview .desc.clamped { max-height: 5.6em; }
.preview-facts { display: flex; flex-wrap: wrap; gap: 4px 14px; color: var(--fg-2); font-size: 12px; margin: 4px 0 8px; }
.preview-actions { display: flex; gap: 6px; margin-top: 8px; }
.list-more { margin-top: 10px; }
.empty { padding: 18px; text-align: center; color: var(--fg-2); border: 1px dashed var(--line-2); border-radius: var(--radius); }

.loading-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--fg-2); margin-bottom: 12px; }
.loading-label .icon { animation: spin 0.9s linear infinite; color: var(--accent); }
.sk { border-radius: 6px; background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%); background-size: 200% 100%; animation: shimmer 1.3s ease-in-out infinite; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.error-box { display: flex; gap: 10px; padding: 12px; border-radius: var(--radius); background: color-mix(in srgb, var(--danger) 9%, transparent); color: var(--danger); }
.error-box .icon { width: 18px; height: 18px; margin-top: 1px; }
.error-box .msg { color: var(--fg); font-size: 13px; overflow-wrap: anywhere; margin-top: 2px; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
@media (max-width: 420px) { .item-side .stack, .item-side .flag-only { display: none; } .kv { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div id="root"><div class="loading-label">Waiting for ClickUp…</div></div>
<script>
(function () {
  'use strict';
  var PROTOCOL_VERSION = '2026-01-26';
  var MAX_ROWS = 8;
  var READ_TOOLS = { clickup_get_tasks: 1, clickup_get_task_details: 1, clickup_get_filtered_team_tasks: 1 };
  var root = document.getElementById('root');
  var nextId = 1;
  var pending = {};
  var toolName = '';
  var toolArgs = {};
  var hostLocale;
  var hostTimeZone;
  var hostOrigin = '*';
  var canCallTools = false;
  var displayMode = 'inline';
  var listState = null;

  function send(message) {
    window.parent.postMessage(Object.assign({ jsonrpc: '2.0' }, message), hostOrigin);
  }
  function request(method, params) {
    var id = nextId++;
    send({ id: id, method: method, params: params || {} });
    return new Promise(function (resolve, reject) { pending[id] = { resolve: resolve, reject: reject }; });
  }
  function notify(method, params) { send({ method: method, params: params || {} }); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function append(parent) {
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]);
    return parent;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  var ICONS = {
    flag: ['M5 21V4h11.5l-2.25 4.5L16.5 13H5', 1],
    calendar: ['M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z'],
    clock: ['M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'],
    chevron: ['M9 6l6 6-6 6'],
    back: ['M15 18l-6-6 6-6'],
    external: ['M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    refresh: ['M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4'],
    search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4'],
    alert: ['M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'],
    subtask: ['M6 4v9a3 3 0 0 0 3 3h10M16 13l3 3-3 3'],
    spinner: ['M12 3a9 9 0 1 0 9 9'],
    folder: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z'],
    bolt: ['M13 3L5 13h6l-1 8 8-10h-6l1-8z']
  };
  function icon(name, color) {
    var spec = ICONS[name];
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    if (spec[1] && color) svg.style.color = color;
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', spec[0]);
    if (spec[1]) path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
    return svg;
  }

  function applyHostContext(ctx) {
    if (!ctx) return;
    if (ctx.theme === 'light' || ctx.theme === 'dark') document.documentElement.setAttribute('data-theme', ctx.theme);
    var vars = ctx.styles && ctx.styles.variables;
    if (vars) {
      Object.keys(vars).forEach(function (key) {
        var value = vars[key];
        // Theme tokens are colors, sizes and font stacks; nothing here needs to fetch a URL.
        if (/^--[A-Za-z0-9-]+$/.test(key) && typeof value === 'string' && value.length < 200 && !/url\\(|expression\\(/i.test(value)) {
          document.documentElement.style.setProperty(key, value);
        }
      });
    }
    var fonts = ctx.styles && ctx.styles.css && ctx.styles.css.fonts;
    if (typeof fonts === 'string' && !document.getElementById('host-fonts')) {
      var style = el('style');
      style.id = 'host-fonts';
      style.textContent = fonts;
      document.head.appendChild(style);
    }
    if (ctx.toolInfo && ctx.toolInfo.tool && ctx.toolInfo.tool.name) toolName = ctx.toolInfo.tool.name;
    if (typeof ctx.locale === 'string') hostLocale = ctx.locale;
    if (typeof ctx.timeZone === 'string') hostTimeZone = ctx.timeZone;
    if (ctx.displayMode === 'inline' || ctx.displayMode === 'fullscreen' || ctx.displayMode === 'pip') {
      var changed = ctx.displayMode !== displayMode;
      displayMode = ctx.displayMode;
      document.body.classList.toggle('full', displayMode === 'fullscreen');
      if (changed && listState) drawList();
    }
  }

  function openLink(url) {
    if (typeof url !== 'string' || url.indexOf('https://') !== 0) return;
    request('ui/open-link', { url: url }).catch(function () { window.open(url, '_blank', 'noopener'); });
  }
  function taskUrl(task) {
    if (task && typeof task.url === 'string') return task.url;
    return task && task.id ? 'https://app.clickup.com/t/' + encodeURIComponent(task.id) : '';
  }

  function safeColor(color, fallback) {
    return typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : fallback;
  }
  function tint(color, alpha) {
    var hex = safeColor(color, '');
    if (!hex) return '';
    hex = hex.slice(1);
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(hex.slice(0, 6), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }
  function clip(value, max) {
    var text = String(value === undefined || value === null ? '' : value);
    max = max || 80;
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function cap(text) { text = String(text || ''); return text.charAt(0).toUpperCase() + text.slice(1); }

  function dayNumber(ms) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: hostTimeZone, year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(ms));
      var get = function (type) { return Number(parts.filter(function (p) { return p.type === type; })[0].value); };
      return Date.UTC(get('year'), get('month') - 1, get('day')) / 86400000;
    } catch (e) {
      var d = new Date(ms);
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
    }
  }
  function formatDate(ms, withYear) {
    var n = Number(ms);
    if (!ms || !isFinite(n)) return '';
    var options = { month: 'short', day: 'numeric' };
    if (withYear || new Date(n).getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
    try {
      if (hostTimeZone) options.timeZone = hostTimeZone;
      return new Date(n).toLocaleDateString(hostLocale, options);
    } catch (e) {
      // An unknown locale or time zone from the host throws a RangeError.
      delete options.timeZone;
      return new Date(n).toLocaleDateString(undefined, options);
    }
  }
  function relativeTime(ms) {
    var n = Number(ms);
    if (!ms || !isFinite(n)) return '';
    var seconds = (n - Date.now()) / 1000;
    var units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) {
      if (Math.abs(seconds) >= units[i][1]) {
        var value = Math.round(seconds / units[i][1]);
        try { return new Intl.RelativeTimeFormat(hostLocale, { numeric: 'auto' }).format(value, units[i][0]); } catch (e) { return plural(Math.abs(value), units[i][0]) + (value < 0 ? ' ago' : ''); }
      }
    }
    return 'just now';
  }
  function duration(ms) {
    var minutes = Math.round(Number(ms) / 60000);
    if (!isFinite(minutes) || minutes <= 0) return '';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return (h ? h + 'h' : '') + (h && m ? ' ' : '') + (m ? m + 'm' : '');
  }

  function isClosed(task) {
    var type = task && task.status && task.status.type;
    return type === 'closed' || type === 'done';
  }
  function dueInfo(task) {
    var n = Number(task && task.due_date);
    if (!task || !task.due_date || !isFinite(n)) return null;
    var days = dayNumber(n) - dayNumber(Date.now());
    var date = formatDate(n);
    var info = { date: date, tone: '', label: date, short: date };
    if (isClosed(task)) return info;
    if (days < 0) {
      info.tone = 'overdue';
      info.label = date + ' · ' + plural(-days, 'day') + ' late';
    } else if (days === 0) {
      info.tone = 'soon';
      info.label = info.short = 'Today';
    } else if (days === 1) {
      info.tone = 'soon';
      info.label = info.short = 'Tomorrow';
    } else if (days < 7) {
      info.label = date + ' · in ' + plural(days, 'day');
    }
    return info;
  }

  function userName(user) { return (user && (user.username || user.email)) || 'Unknown'; }
  function initials(user) {
    if (user && user.initials) return String(user.initials).slice(0, 2).toUpperCase();
    var parts = String(userName(user)).split(/[\\s@._-]+/).filter(Boolean);
    return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function avatar(user, small) {
    var a = el('span', 'avatar' + (small ? ' sm' : ''), initials(user));
    a.style.background = safeColor(user && user.color, '#8a847e');
    a.title = userName(user);
    var pic = user && user.profilePicture;
    if (typeof pic === 'string' && pic.indexOf('https://') === 0) {
      var img = el('img');
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', function () { if (img.parentNode) img.parentNode.removeChild(img); });
      img.src = pic;
      a.appendChild(img);
    }
    return a;
  }
  function avatarStack(users, max, small) {
    var wrap = el('span', 'stack');
    users = users || [];
    users.slice(0, max).forEach(function (u) { wrap.appendChild(avatar(u, small)); });
    if (users.length > max) {
      var more = el('span', 'avatar more' + (small ? ' sm' : ''), '+' + (users.length - max));
      wrap.appendChild(more);
    }
    return wrap;
  }

  function statusChip(status) {
    var chip = el('span', 'chip status');
    var color = safeColor(status && status.color, '');
    var dot = el('span', 'dot');
    if (color) {
      dot.style.background = color;
      chip.style.background = tint(color, 0.14);
      chip.style.borderColor = tint(color, 0.35);
    }
    return append(chip, dot, el('span', '', (status && status.status) || 'No status'));
  }
  function priorityChip(priority) {
    if (!priority || !priority.priority) return null;
    var chip = el('span', 'chip');
    return append(chip, icon('flag', safeColor(priority.color, '#8a847e')), el('span', '', cap(priority.priority)));
  }
  function statusRing(task) {
    var ring = el('span', 'ring');
    var color = safeColor(task.status && task.status.color, '');
    if (color) ring.style.borderColor = color;
    if (isClosed(task)) {
      ring.style.background = color || 'var(--ok)';
      ring.style.borderColor = color || 'var(--ok)';
      ring.appendChild(icon('check'));
    }
    ring.title = (task.status && task.status.status) || '';
    return ring;
  }
  function tagPill(tag) {
    var pill = el('span', 'tag', tag && tag.name);
    var color = safeColor(tag && tag.tag_bg, '');
    if (color) {
      pill.style.background = tint(color, 0.16);
      pill.style.color = 'color-mix(in srgb, ' + color + ' 70%, var(--fg))';
    }
    return pill;
  }

  function addInline(parent, text) {
    var pattern = /(\\*\\*[^*]+\\*\\*|__[^_]+__|\`[^\`]+\`|\\[[^\\]]+\\]\\([^)\\s]+\\)|\\*[^*\\s][^*]*\\*|https:\\/\\/[^\\s)<>]+)/g;
    var last = 0;
    var match;
    while ((match = pattern.exec(text))) {
      if (match.index > last) parent.appendChild(document.createTextNode(text.slice(last, match.index)));
      var token = match[0];
      if (token.slice(0, 2) === '**' || token.slice(0, 2) === '__') parent.appendChild(el('strong', '', token.slice(2, -2)));
      else if (token[0] === '\`') parent.appendChild(el('code', '', token.slice(1, -1)));
      else if (token[0] === '[') {
        var split = token.indexOf('](');
        parent.appendChild(linkText(token.slice(1, split), token.slice(split + 2, -1)));
      } else if (token[0] === '*') parent.appendChild(el('em', '', token.slice(1, -1)));
      else parent.appendChild(linkText(clip(token, 48), token));
      last = pattern.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function linkText(label, url) {
    if (url.indexOf('https://') !== 0) return document.createTextNode(label);
    var link = el('span', 'a', label);
    link.setAttribute('role', 'link');
    link.tabIndex = 0;
    link.title = url;
    link.addEventListener('click', function (e) { e.stopPropagation(); openLink(url); });
    return link;
  }
  function renderMarkdown(source) {
    var box = el('div');
    var lines = String(source).replace(/\\r/g, '').slice(0, 6000).split('\\n');
    var para = null;
    var listNode = null;
    var code = null;
    function flush() { para = null; listNode = null; }
    lines.forEach(function (line) {
      if (/^\\s*\`\`\`/.test(line)) {
        if (code) { code = null; } else { flush(); code = box.appendChild(el('pre')); }
        return;
      }
      if (code) { code.textContent += (code.textContent ? '\\n' : '') + line; return; }
      if (!line.trim()) { flush(); return; }
      var m;
      if ((m = /^\\s*#{1,6}\\s+(.*)$/.exec(line))) { flush(); addInline(box.appendChild(el('div', 'md-h')), m[1]); return; }
      if ((m = /^\\s*>\\s?(.*)$/.exec(line))) { flush(); addInline(box.appendChild(el('blockquote')), m[1]); return; }
      if ((m = /^\\s*[-*+]\\s+\\[( |x|X)\\]\\s+(.*)$/.exec(line))) {
        if (!listNode || listNode.tagName !== 'UL') { para = null; listNode = box.appendChild(el('ul')); }
        var done = m[1] !== ' ';
        var item = listNode.appendChild(el('li', 'todo' + (done ? ' checked' : '')));
        var boxIcon = item.appendChild(el('span', 'box'));
        if (done) boxIcon.appendChild(icon('check'));
        addInline(item.appendChild(el('span')), m[2]);
        return;
      }
      if ((m = /^\\s*[-*+]\\s+(.*)$/.exec(line))) {
        if (!listNode || listNode.tagName !== 'UL') { para = null; listNode = box.appendChild(el('ul')); }
        addInline(listNode.appendChild(el('li')), m[1]);
        return;
      }
      if ((m = /^\\s*\\d+[.)]\\s+(.*)$/.exec(line))) {
        if (!listNode || listNode.tagName !== 'OL') { para = null; listNode = box.appendChild(el('ol')); }
        addInline(listNode.appendChild(el('li')), m[1]);
        return;
      }
      listNode = null;
      if (para) para.appendChild(document.createTextNode(' ')); else para = box.appendChild(el('p'));
      addInline(para, line.trim());
    });
    return box;
  }
  function description(task, compact) {
    var text = task.markdown_description || task.text_content || task.description;
    if (typeof text !== 'string' || !text.trim()) return null;
    var wrap = el('div');
    var body = renderMarkdown(text.trim());
    body.className = 'desc clamped';
    wrap.appendChild(body);
    requestAnimationFrame(function () {
      if (body.scrollHeight <= body.clientHeight + 4) { body.classList.remove('clamped'); return; }
      var toggle = el('button', 'text-btn', compact ? 'More' : 'Show full description');
      toggle.type = 'button';
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = body.classList.toggle('clamped');
        toggle.textContent = open ? (compact ? 'More' : 'Show full description') : 'Show less';
      });
      wrap.appendChild(toggle);
    });
    return wrap;
  }

  function section(title, count, build, openByDefault) {
    var details = el('details', 'section');
    if (openByDefault) details.open = true;
    var summary = append(el('summary'), icon('chevron'), el('span', '', title));
    summary.firstChild.setAttribute('class', 'icon chev');
    if (count !== undefined && count !== null) summary.appendChild(el('span', 'count', count));
    details.appendChild(summary);
    var body = el('div', 'section-body');
    var built = false;
    function fill() { if (!built) { built = true; build(body); } }
    if (openByDefault) fill();
    details.addEventListener('toggle', function () { if (details.open) fill(); });
    details.appendChild(body);
    return details;
  }

  function fieldValue(field) {
    var value = field.value;
    if (value === undefined || value === null || value === '') return null;
    var options = (field.type_config && field.type_config.options) || [];
    function option(key) {
      for (var i = 0; i < options.length; i++) {
        var o = options[i];
        if (o.id === key || o.orderindex === key || String(o.orderindex) === String(key)) return o;
      }
      return null;
    }
    function optionPill(o) {
      var pill = tagPill({ name: o.name || o.label, tag_bg: o.color });
      return pill;
    }
    switch (field.type) {
      case 'drop_down': {
        var o = option(value);
        return o ? optionPill(o) : String(value);
      }
      case 'labels': {
        if (!Array.isArray(value) || !value.length) return null;
        var wrap = el('span', 'row wrap');
        value.forEach(function (key) { var o = option(key); if (o) wrap.appendChild(optionPill(o)); });
        return wrap;
      }
      case 'date': return formatDate(value, true);
      case 'checkbox': return value === true || value === 'true' ? 'Yes' : 'No';
      case 'currency': {
        var code = field.type_config && field.type_config.currency_type;
        try { return new Intl.NumberFormat(hostLocale, { style: 'currency', currency: code || 'USD' }).format(Number(value)); } catch (e) { return String(value); }
      }
      case 'users': return Array.isArray(value) && value.length ? append(el('span', 'row'), avatarStack(value, 5, true), el('span', 'ellipsis', value.map(userName).join(', '))) : null;
      case 'progress': {
        var pct = value && value.percent_completed;
        return pct === undefined ? null : Math.round(Number(pct)) + '%';
      }
      case 'emoji': return Number(value) ? Array(Math.min(Number(value), 10) + 1).join('★') : null;
      case 'url': return linkText(clip(value, 48), String(value));
      case 'location': return value && value.formatted_address ? clip(value.formatted_address) : null;
      case 'tasks': return Array.isArray(value) && value.length ? plural(value.length, 'task') : null;
      default:
        if (typeof value === 'object') return Array.isArray(value) ? (value.length ? plural(value.length, 'item') : null) : null;
        return clip(value, 160);
    }
  }

  function canRefresh() { return canCallTools; }
  function refreshButton(onClick) {
    if (!canRefresh()) return null;
    var button = el('button', 'icon-btn');
    button.type = 'button';
    button.title = 'Refresh from ClickUp';
    button.setAttribute('aria-label', 'Refresh from ClickUp');
    button.appendChild(icon('refresh'));
    button.addEventListener('click', function () {
      button.disabled = true;
      button.classList.add('spin');
      onClick().catch(function (error) {
        button.disabled = false;
        button.classList.remove('spin');
        showNotice((error && error.message) || 'Could not refresh.');
      });
    });
    return button;
  }
  function showNotice(text) {
    var old = document.getElementById('notice');
    if (old) old.parentNode.removeChild(old);
    var notice = el('div', 'notice', text);
    notice.id = 'notice';
    root.appendChild(notice);
  }
  function callTool(name, args) {
    return request('tools/call', { name: name, arguments: args }).then(function (result) {
      if (result && result.isError) throw new Error(textOf(result) || 'ClickUp returned an error.');
      return parseResult(result);
    });
  }

  var FIELD_LABELS = { markdown_content: 'description', description: 'description', due_date: 'due date', start_date: 'start date', time_estimate: 'time estimate', assignees_add: 'assignees', assignees_remove: 'assignees', assignees: 'assignees', name: 'name', status: 'status', priority: 'priority', parent: 'parent', points: 'points' };
  function bannerFor(task) {
    if (toolName === 'clickup_create_task') return 'Created' + (task.list && task.list.name ? ' in ' + task.list.name : '');
    if (toolName !== 'clickup_update_task') return '';
    var seen = {};
    var changed = Object.keys(toolArgs || {}).filter(function (k) { return !/^(task_id|custom_task_ids|team_id)$/.test(k); })
      .map(function (k) { return FIELD_LABELS[k] || k.replace(/_/g, ' '); })
      .filter(function (label) { if (seen[label]) return false; seen[label] = true; return true; });
    return 'Updated' + (changed.length ? ' ' + changed.join(', ') : '');
  }

  function renderTask(task, options) {
    options = options || {};
    clear(root);
    var card = el('div', 'fade-in');
    var banner = options.banner === undefined ? bannerFor(task) : options.banner;
    if (banner) card.appendChild(append(el('div', 'banner'), icon('check'), el('span', '', banner)));

    var top = el('div', 'top');
    if (options.back) {
      var back = el('button', 'icon-btn');
      back.type = 'button';
      back.title = 'Back to list';
      back.setAttribute('aria-label', 'Back to list');
      back.appendChild(icon('back'));
      back.addEventListener('click', options.back);
      top.appendChild(back);
    }
    var crumb = el('div', 'crumb');
    var parts = [task.space && task.space.name, task.folder && !task.folder.hidden && task.folder.name, task.list && task.list.name]
      .filter(function (p) { return typeof p === 'string' && p; });
    if (parts.length) crumb.appendChild(icon('folder'));
    parts.forEach(function (part, i) {
      if (i) crumb.appendChild(el('span', 'sep', '›'));
      crumb.appendChild(el('span', '', part));
    });
    top.appendChild(crumb);
    if (task.parent) top.appendChild(append(el('span', 'id-chip'), document.createTextNode('Subtask')));
    top.appendChild(el('span', 'id-chip', task.custom_id || task.id));
    append(top, refreshButton(function () {
      return callTool('clickup_get_task_details', { task_id: task.id, include_subtasks: true }).then(function (data) {
        if (isTask(data)) renderTask(data, { banner: '', back: options.back });
      });
    }));
    card.appendChild(top);

    card.appendChild(el('h1', 'title' + (isClosed(task) ? ' closed' : ''), task.name));

    var chips = el('div', 'chips');
    chips.appendChild(statusChip(task.status));
    append(chips, priorityChip(task.priority));
    var due = dueInfo(task);
    if (due) chips.appendChild(append(el('span', 'chip' + (due.tone ? ' ' + due.tone : '')), icon('calendar'), el('span', '', due.label)));
    else if (task.start_date) chips.appendChild(append(el('span', 'chip'), icon('calendar'), el('span', '', 'Starts ' + formatDate(task.start_date))));
    var spent = duration(task.time_spent);
    var estimate = duration(task.time_estimate);
    if (spent || estimate) chips.appendChild(append(el('span', 'chip'), icon('clock'), el('span', '', spent && estimate ? spent + ' of ' + estimate : spent || estimate + ' est.')));
    if (task.points !== undefined && task.points !== null && task.points !== '') chips.appendChild(append(el('span', 'chip'), icon('bolt'), el('span', '', task.points + ' pts')));
    card.appendChild(chips);

    var assignees = task.assignees || [];
    var people = el('div', 'people');
    if (assignees.length) {
      assignees.slice(0, 4).forEach(function (u) { people.appendChild(append(el('span', 'person'), avatar(u), el('span', '', userName(u)))); });
      if (assignees.length > 4) people.appendChild(append(el('span', 'person faint'), avatarStack(assignees.slice(4), 3), el('span', '', '+' + (assignees.length - 4) + ' more')));
    } else {
      people.appendChild(el('span', 'person faint', 'Unassigned'));
    }
    card.appendChild(people);

    var subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    var checklists = Array.isArray(task.checklists) ? task.checklists : [];
    var items = [];
    checklists.forEach(function (c) { (c.items || []).forEach(function (i) { items.push(i); }); });
    var total = subtasks.length + items.length;
    if (total) {
      var finished = subtasks.filter(isClosed).length + items.filter(function (i) { return i.resolved; }).length;
      var label = [subtasks.length ? plural(subtasks.length, 'subtask') : '', items.length ? plural(items.length, 'checklist item') : ''].filter(Boolean).join(' · ');
      var progress = el('div', 'progress');
      progress.appendChild(append(el('div', 'progress-label'), el('span', '', label), el('span', '', finished + ' / ' + total + ' done')));
      var bar = el('div', 'bar');
      var fill = bar.appendChild(el('span'));
      fill.style.width = '0%';
      progress.appendChild(bar);
      card.appendChild(progress);
      requestAnimationFrame(function () { fill.style.width = Math.round(finished / total * 100) + '%'; });
    }

    append(card, description(task));

    if (task.tags && task.tags.length) {
      var tags = el('div', 'tags');
      task.tags.slice(0, 12).forEach(function (t) { tags.appendChild(tagPill(t)); });
      card.appendChild(tags);
    }

    var sections = el('div', 'sections');
    if (subtasks.length) {
      sections.appendChild(section('Subtasks', subtasks.length, function (body) {
        subtasks.forEach(function (s) {
          var row = append(el('div', 'mini clickable'), statusRing(s), el('span', 'grow ellipsis', s.name));
          var d = dueInfo(s);
          if (d) row.appendChild(el('span', 'due ' + d.tone, d.short));
          if (s.assignees && s.assignees.length) row.appendChild(avatarStack(s.assignees, 3, true));
          row.addEventListener('click', function () { openLink(taskUrl(s)); });
          body.appendChild(row);
        });
      }, subtasks.length <= 5));
    }
    checklists.forEach(function (list) {
      var listItems = list.items || [];
      var done = listItems.filter(function (i) { return i.resolved; }).length;
      sections.appendChild(section(list.name || 'Checklist', done + '/' + listItems.length, function (body) {
        listItems.forEach(function (i) {
          var check = el('span', 'check' + (i.resolved ? ' on' : ''));
          if (i.resolved) check.appendChild(icon('check'));
          var row = append(el('div', 'mini' + (i.resolved ? ' resolved' : '')), check, el('span', 'grow', i.name));
          if (i.assignee) row.appendChild(avatar(i.assignee, true));
          body.appendChild(row);
        });
      }));
    });
    var fields = (task.custom_fields || []).map(function (f) { return { name: f.name, value: fieldValue(f) }; })
      .filter(function (f) { return f.value !== null && f.value !== undefined && f.value !== ''; });
    if (fields.length) {
      sections.appendChild(section('Custom fields', fields.length, function (body) {
        var kv = el('div', 'kv');
        fields.forEach(function (f) {
          kv.appendChild(el('div', 'k', f.name));
          var v = el('div', 'v');
          if (f.value.nodeType) v.appendChild(f.value); else v.textContent = f.value;
          kv.appendChild(v);
        });
        body.appendChild(kv);
      }));
    }
    var deps = (task.dependencies || []).filter(function (d) { return d && (d.task_id || d.depends_on); });
    var links = (task.linked_tasks || []).filter(function (l) { return l && (l.task_id || l.link_id); });
    if (deps.length || links.length) {
      sections.appendChild(section('Relationships', deps.length + links.length, function (body) {
        function relRow(label, id) {
          var row = append(el('div', 'mini clickable'), el('span', 'faint', label), el('span', 'grow ellipsis', id), icon('external'));
          row.addEventListener('click', function () { openLink('https://app.clickup.com/t/' + encodeURIComponent(id)); });
          body.appendChild(row);
        }
        deps.forEach(function (d) {
          if (d.task_id === task.id) relRow('Waiting on', d.depends_on);
          else relRow('Blocking', d.task_id);
        });
        links.forEach(function (l) { relRow('Linked', l.task_id === task.id ? l.link_id : l.task_id); });
      }));
    }
    var watchers = task.watchers || [];
    if (watchers.length) {
      sections.appendChild(section('Watchers', watchers.length, function (body) {
        var wrap = el('div', 'people');
        watchers.forEach(function (u) { wrap.appendChild(append(el('span', 'person'), avatar(u, true), el('span', '', userName(u)))); });
        body.appendChild(wrap);
      }));
    }
    var attachments = task.attachments || [];
    if (attachments.length) {
      sections.appendChild(section('Attachments', attachments.length, function (body) {
        attachments.forEach(function (a) {
          var row = append(el('div', 'mini' + (a.url ? ' clickable' : '')), el('span', 'grow ellipsis', a.title || a.name || 'Attachment'), el('span', 'faint', a.extension ? String(a.extension).toUpperCase() : ''));
          if (a.url) row.addEventListener('click', function () { openLink(a.url); });
          body.appendChild(row);
        });
      }));
    }
    if (sections.childNodes.length) card.appendChild(sections);

    var footer = el('div', 'footer');
    var meta = [];
    if (task.date_created) meta.push('Created ' + relativeTime(task.date_created) + (task.creator && task.creator.username ? ' by ' + task.creator.username : ''));
    if (task.date_updated && task.date_updated !== task.date_created) meta.push('updated ' + relativeTime(task.date_updated));
    if (task.date_closed) meta.push('closed ' + relativeTime(task.date_closed));
    footer.appendChild(el('div', 'meta', meta.join(' · ')));
    var url = taskUrl(task);
    if (url) {
      var open = append(el('button', 'btn primary'), el('span', '', 'Open in ClickUp'), icon('external'));
      open.type = 'button';
      open.addEventListener('click', function () { openLink(url); });
      footer.appendChild(open);
    }
    card.appendChild(footer);
    root.appendChild(card);
  }

  function statusKey(task) { return ((task.status && task.status.status) || 'No status').toLowerCase(); }
  function groupTasks(tasks) {
    var groups = [];
    var byKey = {};
    tasks.forEach(function (task, index) {
      var key = statusKey(task);
      if (!byKey[key]) {
        byKey[key] = { key: key, status: task.status, tasks: [], closed: isClosed(task), order: Number(task.status && task.status.orderindex), first: index };
        groups.push(byKey[key]);
      }
      byKey[key].tasks.push(task);
    });
    groups.sort(function (a, b) {
      if (a.closed !== b.closed) return a.closed ? 1 : -1;
      var ao = isFinite(a.order) ? a.order : 1e9 + a.first;
      var bo = isFinite(b.order) ? b.order : 1e9 + b.first;
      return ao - bo;
    });
    return groups;
  }

  function renderList(tasks, options) {
    options = options || {};
    listState = { tasks: tasks, query: '', expanded: false, open: {}, multiList: false };
    var lists = {};
    tasks.forEach(function (t) { if (t.list && t.list.id) lists[t.list.id] = 1; });
    listState.multiList = Object.keys(lists).length > 1;
    clear(root);
    var wrap = el('div', 'fade-in');
    var head = el('div', 'list-head');
    head.appendChild(el('div', 'list-title grow', plural(tasks.length, 'task')));
    if (READ_TOOLS[toolName]) {
      append(head, refreshButton(function () {
        return callTool(toolName, toolArgs).then(renderParsed);
      }));
    }
    wrap.appendChild(head);

    var overdue = 0, today = 0, urgent = 0, unassigned = 0, done = 0;
    tasks.forEach(function (t) {
      var d = dueInfo(t);
      if (d && d.tone === 'overdue') overdue++;
      if (d && d.short === 'Today') today++;
      var p = t.priority && t.priority.priority;
      if (!isClosed(t) && (p === 'urgent' || p === 'high')) urgent++;
      if (!t.assignees || !t.assignees.length) unassigned++;
      if (isClosed(t)) done++;
    });
    var summary = el('div', 'summary');
    if (overdue) summary.appendChild(append(el('span', 'chip overdue'), icon('alert'), el('span', '', overdue + ' overdue')));
    if (today) summary.appendChild(append(el('span', 'chip soon'), icon('calendar'), el('span', '', today + ' due today')));
    if (urgent) summary.appendChild(append(el('span', 'chip'), icon('flag', '#f50000'), el('span', '', urgent + ' high priority')));
    if (done) summary.appendChild(append(el('span', 'chip done'), icon('check'), el('span', '', done + ' done')));
    if (unassigned && unassigned < tasks.length) summary.appendChild(el('span', 'chip', unassigned + ' unassigned'));
    if (summary.childNodes.length) wrap.appendChild(summary);

    if (tasks.length > MAX_ROWS) {
      var search = append(el('label', 'search'), icon('search'));
      var input = el('input');
      input.type = 'search';
      input.placeholder = 'Filter ' + plural(tasks.length, 'task');
      input.setAttribute('aria-label', 'Filter tasks');
      input.addEventListener('input', function () { listState.query = input.value.trim().toLowerCase(); drawList(); });
      search.appendChild(input);
      wrap.appendChild(search);
    }
    var body = el('div');
    body.id = 'list-body';
    wrap.appendChild(body);
    root.appendChild(wrap);
    drawList();
  }

  function matches(task, query) {
    if (!query) return true;
    var hay = [task.name, task.custom_id, task.id, task.status && task.status.status, task.list && task.list.name]
      .concat((task.assignees || []).map(userName)).concat((task.tags || []).map(function (t) { return t && t.name; }))
      .join(' ').toLowerCase();
    return hay.indexOf(query) !== -1;
  }

  function drawList() {
    var body = document.getElementById('list-body');
    if (!body || !listState) return;
    clear(body);
    var visible = listState.tasks.filter(function (t) { return matches(t, listState.query); });
    if (!visible.length) {
      body.appendChild(el('div', 'empty', listState.tasks.length ? 'No tasks match “' + clip(listState.query, 40) + '”.' : 'No tasks found.'));
      return;
    }
    var limit = listState.expanded || listState.query || displayMode === 'fullscreen' ? Infinity : MAX_ROWS;
    var groups = groupTasks(visible);
    var shown = 0;
    var grouped = groups.length > 1;
    groups.forEach(function (group) {
      if (shown >= limit) return;
      var rows = el('div', 'rows');
      group.tasks.forEach(function (task) {
        if (shown >= limit) return;
        shown++;
        rows.appendChild(listRow(task));
      });
      if (grouped) {
        var details = el('details', 'group');
        details.open = true;
        var summary = append(el('summary'), icon('chevron'), statusChip(group.status), el('span', 'count', group.tasks.length));
        summary.firstChild.setAttribute('class', 'icon chev');
        details.appendChild(summary);
        details.appendChild(rows);
        body.appendChild(details);
      } else {
        body.appendChild(rows);
      }
    });
    if (shown < visible.length) {
      var more = append(el('button', 'btn sm list-more'), el('span', '', 'Show all ' + visible.length + ' tasks'));
      more.type = 'button';
      more.addEventListener('click', function () { listState.expanded = true; drawList(); });
      body.appendChild(more);
    }
  }

  function listRow(task) {
    var item = el('div', 'item' + (isClosed(task) ? ' closed' : ''));
    var main = el('div', 'item-main');
    main.tabIndex = 0;
    main.setAttribute('role', 'button');
    main.appendChild(statusRing(task));
    var text = el('div', 'item-text');
    text.appendChild(el('div', 'item-name ellipsis', task.name));
    var sub = el('div', 'item-sub');
    var bits = [];
    if (listState.multiList && task.list && task.list.name) bits.push(el('span', 'ellipsis', task.list.name));
    var subCount = Array.isArray(task.subtasks) ? task.subtasks.length : 0;
    if (subCount) bits.push(append(el('span', 'row'), icon('subtask'), el('span', '', subCount)));
    (task.tags || []).slice(0, 2).forEach(function (t) { bits.push(tagPill(t)); });
    bits.forEach(function (b) { sub.appendChild(b); });
    if (bits.length) text.appendChild(sub);
    main.appendChild(text);
    var side = el('div', 'item-side');
    var p = task.priority && task.priority.priority;
    if (p) {
      var flag = append(el('span', 'flag-only'), icon('flag', safeColor(task.priority.color, '#8a847e')));
      flag.title = cap(p) + ' priority';
      side.appendChild(flag);
    }
    var d = dueInfo(task);
    if (d) side.appendChild(el('span', 'due ' + d.tone, d.short));
    if (task.assignees && task.assignees.length) side.appendChild(avatarStack(task.assignees, 3, true));
    main.appendChild(side);
    item.appendChild(main);

    var key = task.id;
    function toggle() {
      var open = !listState.open[key];
      listState.open[key] = open;
      item.classList.toggle('open', open);
      main.setAttribute('aria-expanded', String(open));
      var existing = item.querySelector('.preview');
      if (existing) item.removeChild(existing);
      if (open) item.appendChild(preview(task));
    }
    main.setAttribute('aria-expanded', 'false');
    main.addEventListener('click', toggle);
    main.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
    if (listState.open[key]) { listState.open[key] = false; toggle(); }
    return item;
  }

  function preview(task) {
    var box = el('div', 'preview fade-in');
    var facts = el('div', 'preview-facts');
    var assignees = (task.assignees || []).map(userName);
    facts.appendChild(el('span', '', assignees.length ? assignees.join(', ') : 'Unassigned'));
    var d = dueInfo(task);
    if (d) facts.appendChild(el('span', '', 'Due ' + d.label));
    if (task.priority && task.priority.priority) facts.appendChild(el('span', '', cap(task.priority.priority) + ' priority'));
    if (task.date_updated) facts.appendChild(el('span', '', 'Updated ' + relativeTime(task.date_updated)));
    box.appendChild(facts);
    append(box, description(task, true));
    var actions = el('div', 'preview-actions');
    if (canCallTools) {
      var details = append(el('button', 'btn sm'), el('span', '', 'Details'));
      details.type = 'button';
      details.addEventListener('click', function (e) {
        e.stopPropagation();
        details.disabled = true;
        var saved = listState;
        callTool('clickup_get_task_details', { task_id: task.id, include_subtasks: true }).then(function (data) {
          if (!isTask(data)) throw new Error('ClickUp did not return the task.');
          renderTask(data, { banner: '', back: function () { restoreList(saved); } });
        }).catch(function (error) {
          details.disabled = false;
          showNotice((error && error.message) || 'Could not load the task.');
        });
      });
      actions.appendChild(details);
    }
    var url = taskUrl(task);
    if (url) {
      var open = append(el('button', 'btn sm primary'), el('span', '', 'Open in ClickUp'), icon('external'));
      open.type = 'button';
      open.addEventListener('click', function (e) { e.stopPropagation(); openLink(url); });
      actions.appendChild(open);
    }
    box.appendChild(actions);
    return box;
  }
  function restoreList(saved) {
    renderList(saved.tasks);
    listState.open = saved.open;
    listState.expanded = saved.expanded;
    drawList();
  }

  function renderMessage(text) {
    clear(root);
    listState = null;
    root.appendChild(el('div', 'muted fade-in', text));
  }
  function renderError(text) {
    clear(root);
    listState = null;
    var box = append(el('div', 'error-box fade-in'), icon('alert'));
    var body = append(el('div'), el('strong', '', 'ClickUp returned an error'), el('div', 'msg', clip(text || 'Something went wrong.', 600)));
    box.appendChild(body);
    root.appendChild(box);
  }

  function describeInput(args) {
    var a = {};
    Object.keys(args || {}).forEach(function (key) { a[key] = clip(args[key]); });
    if (toolName === 'clickup_create_task') return 'Creating ' + (a.name ? '“' + a.name + '”' : 'task') + ' in ClickUp…';
    if (toolName === 'clickup_update_task') return 'Updating task ' + (a.task_id || '') + '…';
    if (a.task_id) return 'Loading task ' + a.task_id + '…';
    if (a.list_id) return 'Loading tasks from list ' + a.list_id + '…';
    return 'Searching ClickUp…';
  }
  function renderLoading(args) {
    listState = null;
    var label = describeInput(args);
    var existing = document.getElementById('loading-text');
    if (existing) { existing.textContent = label; return; }
    clear(root);
    var line = append(el('div', 'loading-label'), icon('spinner'));
    var text = line.appendChild(el('span', '', label));
    text.id = 'loading-text';
    root.appendChild(line);
    var widths = [['55%', 18, 12], ['30%', 22, 14], ['100%', 11, 8], ['92%', 11, 8], ['70%', 11, 0]];
    widths.forEach(function (w) {
      var bar = el('div', 'sk');
      bar.style.width = w[0];
      bar.style.height = w[1] + 'px';
      bar.style.marginBottom = w[2] + 'px';
      root.appendChild(bar);
    });
  }

  function isTask(value) {
    return value && typeof value === 'object' && typeof value.id === 'string' && typeof value.name === 'string';
  }
  function textOf(result) {
    var text = '';
    (result && result.content || []).forEach(function (block) {
      if (block && block.type === 'text' && typeof block.text === 'string') text += block.text;
    });
    return text;
  }
  function parseResult(result) {
    var data = result && result.structuredContent;
    if (data) return data;
    var text = textOf(result);
    try { return JSON.parse(text); } catch (e) { return { text: text }; }
  }
  function renderParsed(data) {
    if (Array.isArray(data) && data.every(isTask)) return renderList(data);
    if (data && Array.isArray(data.tasks)) return renderList(data.tasks.filter(isTask));
    if (isTask(data)) return renderTask(data);
    renderMessage((data && data.text) || 'Done.');
  }
  function renderResult(result) {
    if (result && result.isError) return renderError(textOf(result));
    renderParsed(parseResult(result));
  }

  function reportSize() {
    var height = Math.ceil(document.documentElement.getBoundingClientRect().height);
    notify('ui/notifications/size-changed', { width: Math.ceil(document.documentElement.scrollWidth), height: height });
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    var msg = event.data;
    if (!msg || msg.jsonrpc !== '2.0') return;
    // The host's origin is unknown until it first replies; an opaque (sandboxed) origin stays '*'.
    if (hostOrigin === '*' && event.origin && event.origin !== 'null') hostOrigin = event.origin;
    if (msg.id !== undefined && !msg.method) {
      var waiter = pending[msg.id];
      if (!waiter) return;
      delete pending[msg.id];
      if (msg.error) waiter.reject(msg.error); else waiter.resolve(msg.result);
      return;
    }
    var params = msg.params || {};
    switch (msg.method) {
      case 'ui/notifications/tool-input':
      case 'ui/notifications/tool-input-partial':
        toolArgs = params.arguments || {};
        renderLoading(toolArgs);
        break;
      case 'ui/notifications/tool-result':
        renderResult(params);
        break;
      case 'ui/notifications/tool-cancelled':
        renderMessage('Cancelled.');
        break;
      case 'ui/notifications/host-context-changed':
        applyHostContext(params);
        break;
      default:
        if (msg.id !== undefined) {
          if (msg.method === 'ui/resource-teardown' || msg.method === 'ping') send({ id: msg.id, result: {} });
          else send({ id: msg.id, error: { code: -32601, message: 'Method not found' } });
        }
    }
  });

  if (typeof ResizeObserver === 'function') new ResizeObserver(reportSize).observe(document.documentElement);

  request('ui/initialize', {
    appInfo: { name: 'clickup-task-view', version: '2.0.0' },
    appCapabilities: { availableDisplayModes: ['inline', 'fullscreen'] },
    protocolVersion: PROTOCOL_VERSION,
  }).then(function (result) {
    canCallTools = !!(result && result.hostCapabilities && result.hostCapabilities.serverTools);
    applyHostContext(result && result.hostContext);
    notify('ui/notifications/initialized');
    reportSize();
  }).catch(function () {
    renderMessage('This view needs a host that supports MCP Apps.');
  });
})();
</script>
</body>
</html>
`;
