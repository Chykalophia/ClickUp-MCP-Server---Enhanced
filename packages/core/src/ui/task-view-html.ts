/* eslint-disable max-len */
/**
 * Self-contained HTML for the task card view (MCP Apps, protocol 2026-01-26).
 *
 * The host renders it in a sandboxed iframe and talks to it over postMessage
 * JSON-RPC. The client side of that protocol is written inline rather than
 * bundled from @modelcontextprotocol/ext-apps: the view needs only initialize,
 * a few notifications, size reporting and open-link, and inlining keeps the
 * page small and free of external script origins (which hosts block by CSP).
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
  --bg-2: var(--color-background-secondary, #f5f5f4);
  --fg: var(--color-text-primary, #1c1917);
  --fg-2: var(--color-text-secondary, #57534e);
  --line: var(--color-border-primary, rgba(0, 0, 0, 0.1));
  --danger: var(--color-text-danger, #b91c1c);
  --radius: var(--border-radius-md, 10px);
  --font: var(--font-sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif);
}
:root[data-theme="dark"] {
  --bg: var(--color-background-primary, #1c1b1a);
  --bg-2: var(--color-background-secondary, #262523);
  --fg: var(--color-text-primary, #f5f5f4);
  --fg-2: var(--color-text-secondary, #a8a29e);
  --line: var(--color-border-primary, rgba(255, 255, 255, 0.12));
  --danger: var(--color-text-danger, #f87171);
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 14px; line-height: 1.45; }
#root { padding: 14px 16px; }
.muted { color: var(--fg-2); }
.row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.wrap { flex-wrap: wrap; }
.grow { flex: 1; min-width: 0; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.title { font-size: 16px; font-weight: 600; margin: 0; overflow-wrap: anywhere; }
.crumb { font-size: 12px; margin-bottom: 4px; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 999px; background: var(--bg-2); font-size: 12px; font-weight: 500; white-space: nowrap; text-transform: capitalize; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--fg-2); }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 12px 0; }
.fact-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--fg-2); }
.desc { margin: 0 0 12px; color: var(--fg-2); overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.avatars { display: inline-flex; }
.avatar { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; color: #fff; margin-left: -4px; border: 2px solid var(--bg); }
.avatar:first-child { margin-left: 0; }
.tag { font-size: 11px; padding: 1px 7px; border-radius: 4px; background: var(--bg-2); color: var(--fg-2); }
.list { border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.item { padding: 9px 12px; border-top: 1px solid var(--line); cursor: pointer; }
.item:first-child { border-top: 0; }
.item:hover { background: var(--bg-2); }
.item-name { font-weight: 500; }
.head { margin-bottom: 10px; }
button.link { font: inherit; font-size: 13px; font-weight: 500; color: var(--fg); background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px; padding: 6px 12px; cursor: pointer; }
button.link:hover { border-color: var(--fg-2); }
.error { color: var(--danger); overflow-wrap: anywhere; }
.skeleton { height: 12px; border-radius: 6px; background: var(--bg-2); margin-top: 10px; animation: pulse 1.2s ease-in-out infinite; }
@keyframes pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
</style>
</head>
<body>
<div id="root"><div class="muted">Waiting for ClickUp…</div></div>
<script>
(function () {
  'use strict';
  var PROTOCOL_VERSION = '2026-01-26';
  var MAX_ROWS = 8;
  var root = document.getElementById('root');
  var nextId = 1;
  var pending = {};
  var toolName = '';

  function send(message) {
    window.parent.postMessage(Object.assign({ jsonrpc: '2.0' }, message), '*');
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
  function clear() { while (root.firstChild) root.removeChild(root.firstChild); }

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
  }

  function openLink(url) {
    if (typeof url !== 'string' || url.indexOf('https://') !== 0) return;
    request('ui/open-link', { url: url }).catch(function () { window.open(url, '_blank', 'noopener'); });
  }

  function initials(user) {
    if (user && user.initials) return String(user.initials).slice(0, 2).toUpperCase();
    var name = (user && (user.username || user.email)) || '?';
    var parts = String(name).split(/[\\s@._-]+/).filter(Boolean);
    return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function safeColor(color, fallback) {
    return typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : fallback;
  }
  function formatDate(ms) {
    var n = Number(ms);
    if (!ms || !isFinite(n)) return '';
    return new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function statusPill(status) {
    var pill = el('span', 'pill');
    var dot = el('span', 'dot');
    dot.style.background = safeColor(status && status.color, '');
    pill.appendChild(dot);
    pill.appendChild(el('span', '', (status && status.status) || 'No status'));
    return pill;
  }
  function avatars(users) {
    var wrap = el('span', 'avatars');
    (users || []).slice(0, 4).forEach(function (user) {
      var a = el('span', 'avatar', initials(user));
      a.style.background = safeColor(user && user.color, '#78716c');
      a.title = (user && (user.username || user.email)) || '';
      wrap.appendChild(a);
    });
    return wrap;
  }
  function fact(label, value) {
    var box = el('div');
    box.appendChild(el('div', 'fact-label', label));
    if (value && value.nodeType) box.appendChild(value); else box.appendChild(el('div', '', value || '—'));
    return box;
  }
  function crumb(task) {
    var parts = [task.space && task.space.name, task.folder && !task.folder.hidden && task.folder.name, task.list && task.list.name]
      .filter(function (p) { return typeof p === 'string' && p; });
    return parts.join(' / ');
  }

  function isTask(value) {
    return value && typeof value === 'object' && typeof value.id === 'string' && typeof value.name === 'string';
  }

  function renderTask(task) {
    clear();
    var path = crumb(task);
    if (path) root.appendChild(el('div', 'crumb muted ellipsis', path));
    var header = el('div', 'row');
    var title = el('h1', 'title grow', task.name);
    header.appendChild(title);
    header.appendChild(statusPill(task.status));
    root.appendChild(header);

    var facts = el('div', 'facts');
    var people = el('div', 'row');
    if (task.assignees && task.assignees.length) {
      people.appendChild(avatars(task.assignees));
      if (task.assignees.length === 1) people.appendChild(el('span', 'ellipsis', task.assignees[0].username || task.assignees[0].email || ''));
    } else {
      people.appendChild(el('span', 'muted', 'Unassigned'));
    }
    facts.appendChild(fact('Assignees', people));
    facts.appendChild(fact('Due', formatDate(task.due_date)));
    var priority = task.priority && task.priority.priority;
    if (priority) {
      var p = el('span', 'pill');
      var pd = el('span', 'dot');
      pd.style.background = safeColor(task.priority.color, '');
      p.appendChild(pd);
      p.appendChild(el('span', '', priority));
      facts.appendChild(fact('Priority', p));
    } else {
      facts.appendChild(fact('Priority', ''));
    }
    root.appendChild(facts);

    var text = task.markdown_description || task.text_content || task.description;
    if (typeof text === 'string' && text.trim()) root.appendChild(el('p', 'desc', text.trim().slice(0, 400)));

    var footer = el('div', 'row wrap');
    (task.tags || []).slice(0, 5).forEach(function (tag) { footer.appendChild(el('span', 'tag', tag && tag.name)); });
    var spacer = el('span', 'grow');
    footer.appendChild(spacer);
    if (task.url) {
      var button = el('button', 'link', 'Open in ClickUp');
      button.type = 'button';
      button.addEventListener('click', function () { openLink(task.url); });
      footer.appendChild(button);
    }
    root.appendChild(footer);
  }

  function renderList(tasks, total) {
    clear();
    var head = el('div', 'row head');
    var count = tasks.length === 1 ? '1 task' : tasks.length + ' tasks';
    head.appendChild(el('strong', 'grow', count));
    root.appendChild(head);
    if (!tasks.length) {
      root.appendChild(el('div', 'muted', 'No tasks match.'));
      return;
    }
    var list = el('div', 'list');
    tasks.slice(0, MAX_ROWS).forEach(function (task) {
      var item = el('div', 'item');
      var top = el('div', 'row');
      var dot = el('span', 'dot');
      dot.style.background = safeColor(task.status && task.status.color, '');
      dot.title = (task.status && task.status.status) || '';
      top.appendChild(dot);
      top.appendChild(el('span', 'item-name grow ellipsis', task.name));
      if (task.assignees && task.assignees.length) top.appendChild(avatars(task.assignees));
      item.appendChild(top);
      var meta = [task.status && task.status.status, task.due_date ? 'Due ' + formatDate(task.due_date) : '', task.list && task.list.name]
        .filter(Boolean).join(' · ');
      if (meta) item.appendChild(el('div', 'muted ellipsis', meta));
      if (task.url) {
        item.tabIndex = 0;
        item.setAttribute('role', 'link');
        item.addEventListener('click', function () { openLink(task.url); });
        item.addEventListener('keydown', function (e) { if (e.key === 'Enter') openLink(task.url); });
      }
      list.appendChild(item);
    });
    root.appendChild(list);
    var hidden = total - Math.min(tasks.length, MAX_ROWS);
    if (hidden > 0) {
      var more = el('div', 'muted', '+' + hidden + ' more');
      more.style.marginTop = '8px';
      root.appendChild(more);
    }
  }

  function renderMessage(text, isError) {
    clear();
    root.appendChild(el('div', isError ? 'error' : 'muted', text));
  }

  function clip(value) {
    var text = String(value === undefined || value === null ? '' : value);
    return text.length > 80 ? text.slice(0, 79) + '…' : text;
  }

  function describeInput(args) {
    var a = {};
    Object.keys(args || {}).forEach(function (key) { a[key] = clip(args[key]); });
    if (toolName === 'clickup_create_task') return 'Creating ' + (a.name ? '“' + a.name + '”' : 'task') + '…';
    if (toolName === 'clickup_update_task') return 'Updating task ' + (a.task_id || '') + '…';
    if (a.task_id) return 'Loading task ' + a.task_id + '…';
    if (a.list_id) return 'Loading tasks from list ' + a.list_id + '…';
    return 'Working in ClickUp…';
  }

  function renderLoading(args) {
    clear();
    root.appendChild(el('div', 'muted', describeInput(args)));
    root.appendChild(el('div', 'skeleton'));
    var short = el('div', 'skeleton');
    short.style.width = '60%';
    root.appendChild(short);
  }

  function renderResult(result) {
    var text = '';
    (result && result.content || []).forEach(function (block) {
      if (block && block.type === 'text' && typeof block.text === 'string') text += block.text;
    });
    if (result && result.isError) {
      renderMessage(text || 'ClickUp returned an error.', true);
      return;
    }
    var data = result && result.structuredContent;
    if (!data) {
      try { data = JSON.parse(text); } catch (e) { data = undefined; }
    }
    if (Array.isArray(data) && data.every(isTask)) return renderList(data, data.length);
    if (data && Array.isArray(data.tasks)) return renderList(data.tasks.filter(isTask), data.tasks.length);
    if (isTask(data)) return renderTask(data);
    renderMessage(text || 'Done.', false);
  }

  function reportSize() {
    var height = Math.ceil(document.documentElement.getBoundingClientRect().height);
    notify('ui/notifications/size-changed', { width: Math.ceil(document.documentElement.scrollWidth), height: height });
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    var msg = event.data;
    if (!msg || msg.jsonrpc !== '2.0') return;
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
        renderLoading(params.arguments);
        break;
      case 'ui/notifications/tool-result':
        renderResult(params);
        break;
      case 'ui/notifications/tool-cancelled':
        renderMessage('Cancelled.', false);
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
    appInfo: { name: 'clickup-task-view', version: '1.0.0' },
    appCapabilities: { availableDisplayModes: ['inline'] },
    protocolVersion: PROTOCOL_VERSION,
  }).then(function (result) {
    applyHostContext(result && result.hostContext);
    notify('ui/notifications/initialized');
    reportSize();
  }).catch(function () {
    renderMessage('This view needs a host that supports MCP Apps.', false);
  });
})();
</script>
</body>
</html>
`;
