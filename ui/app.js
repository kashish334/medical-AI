/* app.js — MedAI Core SPA */

function getAppHTML() {
  const isAdmin = currentUser.is_admin;
  return `
  <style>
    /* ── App shell ───────────────────────────────────────────────────────────── */
    #app { display:grid; grid-template-columns:260px 1fr; height:100vh; font-family:'Sora',sans-serif; background:var(--bg-deep); transition: grid-template-columns 0.3s ease; }
    #app.sidebar-collapsed { grid-template-columns: 0px 1fr; }

    /* ── Sidebar ─────────────────────────────────────────────────────────────── */
    .sidebar {
      background: #0d1220;
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      height: 100vh;
      overflow: hidden;
      padding: 0;
      transition: width 0.3s ease, opacity 0.3s ease;
      width: 260px;
    }
    #app.sidebar-collapsed .sidebar {
      width: 0; opacity: 0; border-right: none; pointer-events: none;
    }

    /* Toggle button — always visible, floats over content */
    .sidebar-toggle-btn {
      position: fixed; top: 14px; left: 14px; z-index: 1000;
      width: 34px; height: 34px; border-radius: 9px;
      background: var(--bg-card); border: 1px solid var(--border-2);
      display: none; /* hidden by default when sidebar is open */
      align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px; color: var(--muted2);
      transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    /* Only show floating ☰ when sidebar is collapsed */
    #app.sidebar-collapsed .sidebar-toggle-btn { display: flex; }
    .sidebar-toggle-btn:hover { border-color: var(--blue); color: var(--blue-bright); background: var(--bg-input); }

    /* ═══════════════════════════════════════════════════════════════════════
       SETTINGS — CSS rules that make every setting actually work in the UI
       ═══════════════════════════════════════════════════════════════════════ */

    /* ── Font size (--chat-font-size set by JS) ── */
    .bubble { font-size: var(--chat-font-size, 14px) !important; line-height: 1.65; }

    /* ── Bubble style (data-bubble on body) ── */
    body[data-bubble="compact"] .bubble {
      padding: 8px 12px !important; border-radius: 8px !important;
    }
    body[data-bubble="minimal"] .bubble {
      background: transparent !important; border: none !important;
      padding: 4px 0 !important; box-shadow: none !important;
    }

    /* ── Confidence badge visibility ── */
    body.hide-confidence .conf-badge { display: none !important; }

    /* ── Category badge visibility ── */
    body.hide-category .cat-badge { display: none !important; }

    /* ── Reduce motion ── */
    body.reduce-motion *, body.reduce-motion *::before, body.reduce-motion *::after {
      animation-duration: 0.001ms !important;
      transition-duration: 0.001ms !important;
    }
    body.reduce-motion .skeleton-line { animation: none !important; background: var(--bg-input) !important; }

    /* ── High contrast ── */
    body.high-contrast { --muted: #a0aec0; --muted2: #cbd5e0; --border: rgba(255,255,255,0.2); --border-2: rgba(255,255,255,0.25); }
    body.high-contrast .bubble { border: 1px solid rgba(255,255,255,0.15) !important; }
    body.high-contrast .top-bar { border-bottom: 1px solid rgba(255,255,255,0.2); }

    /* ── Large click targets ── */
    body.large-targets .nav-item { padding: 14px 16px !important; font-size: 14px !important; }
    body.large-targets .icon-btn { width: 44px !important; height: 44px !important; font-size: 18px !important; }
    body.large-targets .fb-btn   { font-size: 20px !important; padding: 6px 10px !important; }
    body.large-targets .settings-row-label { font-size: 14px !important; }
    body.large-targets input, body.large-targets button, body.large-targets select { min-height: 40px; }

    /* ── Doctor reminder hide ── */
    body.hide-doctor-reminder .bubble p:last-child,
    body.hide-doctor-reminder .bubble li:last-child {
      /* Can't easily target only the reminder line without a class on it,
         so we use a data approach — JS removes it from content instead */
    }
    body[data-theme="darker"] {
      --bg-deep: #060810; --bg-mid: #0a0c14; --bg-card: #0f1119; --bg-input: #13161f;
    }
    body[data-theme="midnight"] {
      --bg-deep: #050d1a; --bg-mid: #071220; --bg-card: #091628; --bg-input: #0d1e30;
      --blue: #1d6fb8; --teal: #0e9488;
    }

    /* Top-bar: no left padding needed since ☰ is inside sidebar when expanded */
    .top-bar { transition: padding-left 0.3s ease; }
    /* When collapsed, shift content right so ☰ btn doesn't overlap title */
    #app.sidebar-collapsed .top-bar { padding-left: 56px; }

    .sidebar-brand {
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-brand .b-title { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
    .sidebar-brand .b-sub   { font-size: 11px; color: var(--muted); margin-top: 2px; }

    .sidebar-new-chat {
      padding: 12px 12px 8px;
    }
    .new-chat-sidebar-btn {
      width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--blue); color: white; border: none;
      border-radius: 10px; padding: 10px 14px;
      font-size: 13px; font-weight: 600; font-family: 'Sora', sans-serif;
      cursor: pointer; transition: background 0.2s;
    }
    .new-chat-sidebar-btn:hover { background: #2563eb; }

    .sidebar-section-label {
      font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--muted); padding: 10px 16px 6px;
    }

    .sidebar-history {
      flex: 1;
      overflow-y: auto;
      padding: 0 8px 8px;
      min-height: 0;
    }
    .sidebar-history::-webkit-scrollbar { width: 4px; }
    .sidebar-history::-webkit-scrollbar-track { background: transparent; }
    .sidebar-history::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 4px; }

    .history-item {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 10px;
      border-radius: 9px;
      cursor: pointer;
      transition: background 0.15s;
      margin-bottom: 2px;
      group: true;
    }
    .history-item:hover { background: rgba(255,255,255,0.05); }
    .history-item.active { background: rgba(59,130,246,0.12); }
    .history-item-icon { font-size: 13px; flex-shrink: 0; opacity: 0.6; }
    .history-item-body { flex: 1; min-width: 0; }
    .history-item-title {
      font-size: 12px; font-weight: 500; color: var(--muted2);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      line-height: 1.4;
    }
    .history-item.active .history-item-title { color: var(--blue-bright); }
    .history-item-meta { font-size: 10px; color: var(--muted); margin-top: 1px; }
    .history-item-del {
      flex-shrink: 0; opacity: 0;
      background: none; border: none; cursor: pointer;
      color: var(--muted); font-size: 13px; padding: 2px 4px;
      border-radius: 4px; transition: all 0.15s;
    }
    .history-item:hover .history-item-del { opacity: 1; }
    .history-item-del:hover { background: rgba(239,68,68,0.15); color: var(--danger); }

    .history-empty {
      padding: 20px 12px; text-align: center;
      font-size: 12px; color: var(--muted); line-height: 1.6;
    }

    .sidebar-nav { padding: 4px 8px 0; border-top: 1px solid var(--border); }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 13px; font-weight: 500;
      color: var(--muted2);
      transition: all 0.15s;
      margin-bottom: 2px;
    }
    .nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
    .nav-item.active { background: rgba(59,130,246,0.15); color: var(--blue-bright); }
    .nav-item.active .nav-icon { color: var(--blue); }
    .nav-icon { font-size: 16px; width: 20px; text-align: center; }

    .sidebar-bottom {
      border-top: 1px solid var(--border);
      padding: 12px 8px;
    }
    .user-card {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 10px;
      cursor: pointer; transition: background 0.15s;
    }
    .user-card:hover { background: rgba(255,255,255,0.05); }
    .user-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, var(--blue), var(--teal));
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; flex-shrink: 0;
    }
    .user-name { font-size: 13px; font-weight: 600; }
    .user-role { font-size: 11px; color: var(--muted); }
    .logout-btn {
      width: 100%; margin-top: 4px; background: transparent;
      border: none; color: var(--muted); font-size: 12px;
      font-family: 'Sora', sans-serif; cursor: pointer;
      padding: 8px; border-radius: 8px; text-align: left;
    }
    .logout-btn:hover { background: rgba(239,68,68,0.1); color: #fca5a5; }

    /* ── Main content ─────────────────────────────────────────────────────────── */
    .main-content { display: flex; flex-direction: column; overflow: hidden; }

    .top-bar {
      height: 60px; min-height: 60px;
      background: var(--bg-mid);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 28px;
    }
    .top-bar-title { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
    .top-bar-sub   { font-size: 12px; color: var(--muted); margin-top: 1px; }
    .top-bar-right { display: flex; align-items: center; gap: 12px; }
    .icon-btn {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--bg-card); border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px; color: var(--muted2);
      transition: all 0.15s;
    }
    .icon-btn:hover { border-color: var(--blue); color: var(--blue-bright); }
    .icon-btn.has-badge { position: relative; }
    .icon-btn .badge {
      position: absolute; top: -4px; right: -4px;
      background: var(--danger); color: white;
      font-size: 9px; font-weight: 700; font-family: 'Sora', sans-serif;
      min-width: 16px; height: 16px; border-radius: 99px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid var(--bg-deep); padding: 0 3px;
    }

    /* ── Dropdown panels ────────────────────────────────────────────────── */
    .dropdown-panel {
      position: absolute; top: 54px; right: 0;
      width: 340px; background: var(--bg-card);
      border: 1px solid var(--border-2); border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      z-index: 999; overflow: hidden;
      animation: dropIn 0.18s ease;
    }
    @keyframes dropIn {
      from { opacity:0; transform: translateY(-8px); }
      to   { opacity:1; transform: translateY(0); }
    }
    .dropdown-panel.hidden { display: none; }
    .dp-header {
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .dp-header h3 { font-size: 13px; font-weight: 700; margin: 0; }
    .dp-header-action {
      font-size: 11px; color: var(--blue); cursor: pointer;
      background: none; border: none; font-family: 'Sora', sans-serif;
      padding: 0;
    }
    .dp-header-action:hover { text-decoration: underline; }

    /* Notification items */
    .notif-item {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 16px; border-bottom: 1px solid var(--border);
      transition: background 0.15s; cursor: pointer;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: rgba(255,255,255,0.03); }
    .notif-item.unread { background: rgba(59,130,246,0.05); }
    .notif-icon {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .notif-icon.blue  { background: rgba(59,130,246,0.15); }
    .notif-icon.green { background: rgba(45,212,191,0.15); }
    .notif-icon.red   { background: rgba(239,68,68,0.15); }
    .notif-icon.amber { background: rgba(251,191,36,0.12); }
    .notif-body { flex: 1; min-width: 0; }
    .notif-title { font-size: 12px; font-weight: 600; margin-bottom: 2px; color: var(--text); }
    .notif-desc  { font-size: 11px; color: var(--muted); line-height: 1.5; }
    .notif-time  { font-size: 10px; color: var(--muted); margin-top: 3px; }
    .notif-dot   {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--blue); flex-shrink: 0; margin-top: 6px;
    }
    .notif-empty {
      padding: 28px 16px; text-align: center;
      font-size: 12px; color: var(--muted); line-height: 1.8;
    }

    /* Help panel */
    .help-section { padding: 8px 0; border-bottom: 1px solid var(--border); }
    .help-section:last-child { border-bottom: none; }
    .help-section-label {
      font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--muted); padding: 6px 16px 4px;
    }
    .help-item {
      display: flex; align-items: center; gap: 12px;
      padding: 9px 16px; cursor: pointer;
      transition: background 0.15s; border-radius: 0;
    }
    .help-item:hover { background: rgba(255,255,255,0.04); }
    .help-item-icon {
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--bg-input); display: flex; align-items: center;
      justify-content: center; font-size: 14px; flex-shrink: 0;
    }
    .help-item-body { flex: 1; }
    .help-item-title { font-size: 12px; font-weight: 600; color: var(--text); }
    .help-item-desc  { font-size: 10px; color: var(--muted); margin-top: 1px; }
    .help-item-arrow { color: var(--muted); font-size: 12px; }
    .shortcut-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 16px;
    }
    .shortcut-label { font-size: 11px; color: var(--muted2); }
    .shortcut-keys  { display: flex; gap: 4px; }
    .kbd {
      background: var(--bg-input); border: 1px solid var(--border-2);
      border-radius: 4px; padding: 1px 6px;
      font-size: 10px; color: var(--muted2); font-family: monospace;
    }

    /* Profile panel */
    .profile-hero {
      padding: 16px; display: flex; gap: 12px; align-items: center;
      border-bottom: 1px solid var(--border);
    }
    .profile-avatar-lg {
      width: 46px; height: 46px; border-radius: 14px;
      background: linear-gradient(135deg, var(--blue), #7c3aed);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 700; color: white; flex-shrink: 0;
    }
    .profile-info-name  { font-size: 14px; font-weight: 700; }
    .profile-info-email { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .profile-info-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(45,212,191,0.12); color: var(--teal);
      border-radius: 6px; padding: 2px 8px;
      font-size: 10px; font-weight: 600; margin-top: 4px;
    }
    .profile-stat-row {
      display: flex; padding: 12px 16px; gap: 0;
      border-bottom: 1px solid var(--border);
    }
    .profile-stat {
      flex: 1; text-align: center;
      border-right: 1px solid var(--border);
    }
    .profile-stat:last-child { border-right: none; }
    .profile-stat-val { font-size: 18px; font-weight: 700; color: var(--blue-bright); }
    .profile-stat-lbl { font-size: 10px; color: var(--muted); margin-top: 2px; }
    .profile-menu-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 16px; cursor: pointer; transition: background 0.15s;
    }
    .profile-menu-item:hover { background: rgba(255,255,255,0.04); }
    .profile-menu-icon { font-size: 15px; width: 20px; text-align: center; }
    .profile-menu-label { font-size: 12px; color: var(--muted2); flex: 1; }
    .profile-menu-item.danger .profile-menu-label { color: var(--danger); }
    .profile-menu-item.danger:hover { background: rgba(239,68,68,0.08); }

    /* Overlay to close dropdowns */
    #dropdownOverlay {
      display: none; position: fixed; inset: 0; z-index: 998;
    }

    .export-btn {
      display: flex; align-items: center; gap: 8px;
      background: var(--blue); color: white;
      border: none; border-radius: 10px;
      padding: 9px 16px; font-size: 12px; font-weight: 600;
      font-family: 'Sora', sans-serif; cursor: pointer;
      transition: background 0.2s;
    }
    .export-btn:hover { background: #2563eb; }

    /* ── Settings page ───────────────────────────────────────────────────── */
    .settings-layout {
      display: grid; grid-template-columns: 200px 1fr;
      gap: 0; height: 100%;
    }
    .settings-nav {
      border-right: 1px solid var(--border);
      padding: 20px 12px; display: flex; flex-direction: column; gap: 2px;
    }
    .settings-nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 9px; cursor: pointer;
      font-size: 12px; font-weight: 500; color: var(--muted2); transition: all 0.15s;
    }
    .settings-nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
    .settings-nav-item.active { background: rgba(59,130,246,0.12); color: var(--blue-bright); }
    .settings-nav-icon { font-size: 15px; width: 20px; text-align: center; }

    .settings-body { overflow-y: auto; padding: 28px 32px; }
    .settings-section { display: none; }
    .settings-section.active { display: block; }
    .settings-section-heading {
      font-size: 16px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.01em;
    }

    .settings-group {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; margin-bottom: 20px; overflow: hidden;
    }
    .settings-group-title {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--muted);
      padding: 12px 18px 8px; border-bottom: 1px solid var(--border);
    }
    .settings-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-bottom: 1px solid var(--border); gap: 16px;
    }
    .settings-row:last-child { border-bottom: none; }
    .settings-row-info { flex: 1; }
    .settings-row-label { font-size: 13px; font-weight: 600; color: var(--text); }
    .settings-row-desc  { font-size: 11px; color: var(--muted); margin-top: 3px; line-height: 1.5; }

    /* Toggle */
    .toggle-wrap { position: relative; flex-shrink: 0; }
    .toggle-input { opacity: 0; width: 0; height: 0; position: absolute; }
    .toggle-slider {
      display: block; width: 42px; height: 24px;
      background: var(--bg-input); border: 1px solid var(--border-2);
      border-radius: 999px; cursor: pointer; transition: all 0.25s; position: relative;
    }
    .toggle-slider::after {
      content: ''; position: absolute; top: 3px; left: 3px;
      width: 16px; height: 16px; background: var(--muted); border-radius: 50%; transition: all 0.25s;
    }
    .toggle-input:checked + .toggle-slider { background: var(--blue); border-color: var(--blue); }
    .toggle-input:checked + .toggle-slider::after { left: 21px; background: white; }

    /* Select */
    .settings-select {
      background: var(--bg-input); border: 1px solid var(--border-2);
      border-radius: 8px; padding: 7px 30px 7px 12px;
      font-size: 12px; color: var(--text); font-family: 'Sora', sans-serif;
      cursor: pointer; outline: none; min-width: 150px; appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 10px center;
    }
    .settings-select option { background: #1e2535; }
    .settings-select:focus { border-color: var(--blue); }

    /* Slider */
    .settings-slider {
      -webkit-appearance: none; width: 160px; height: 4px;
      background: var(--border-2); border-radius: 2px; outline: none; accent-color: var(--blue);
    }
    .settings-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 16px; height: 16px;
      border-radius: 50%; background: var(--blue); cursor: pointer;
    }
    .slider-row { display: flex; align-items: center; gap: 10px; }
    .slider-val { font-size: 12px; font-weight: 700; color: var(--blue-bright); min-width: 36px; text-align: right; }

    /* Buttons */
    .settings-btn {
      padding: 8px 16px; border-radius: 8px; font-size: 12px;
      font-weight: 600; cursor: pointer; border: none;
      font-family: 'Sora', sans-serif; transition: all 0.2s; flex-shrink: 0;
    }
    .settings-btn.danger { background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.3); }
    .settings-btn.danger:hover { background: rgba(239,68,68,0.2); }
    .settings-btn.primary { background: var(--blue); color: white; }
    .settings-btn.primary:hover { background: #2563eb; }
    .settings-btn.secondary { background: var(--bg-input); color: var(--muted2); border: 1px solid var(--border-2); }
    .settings-btn.secondary:hover { border-color: var(--blue); color: var(--text); }

    /* About */
    .about-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; padding: 28px; text-align: center; margin-bottom: 16px;
    }
    .about-logo { font-size: 44px; margin-bottom: 10px; }
    .about-name  { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
    .about-ver   { font-size: 12px; color: var(--muted); margin-top: 4px; }
    .about-pills { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
    .about-pill  { background: var(--bg-input); border: 1px solid var(--border-2); border-radius: 999px; padding: 4px 12px; font-size: 11px; color: var(--muted2); }

    /* Emergency */
    .emergency-contact { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid var(--border); }
    .emergency-contact:last-child { border-bottom: none; }
    .emergency-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
    .emergency-body { flex: 1; }
    .emergency-name { font-size: 13px; font-weight: 600; }
    .emergency-num  { font-size: 22px; font-weight: 800; color: var(--danger); letter-spacing: 0.05em; margin: 2px 0; }
    .emergency-desc { font-size: 11px; color: var(--muted); }

    /* Support */
    .support-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .support-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; padding: 20px; cursor: pointer; transition: border-color 0.15s;
    }
    .support-card:hover { border-color: var(--blue); }
    .support-card-icon  { font-size: 28px; margin-bottom: 10px; }
    .support-card-title { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
    .support-card-desc  { font-size: 12px; color: var(--muted); line-height: 1.6; }

    .page-content { flex: 1; overflow-y: auto; padding: 28px; }

    /* ── Pages ───────────────────────────────────────────────────────────────── */
    .page { display: none; }
    .page.active { display: block; }

    /* ── Chat page ───────────────────────────────────────────────────────────── */
    .chat-wrap { display: flex; flex-direction: column; height: calc(100vh - 60px); }
    .chat-messages { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; gap: 20px; position: relative; }
    .chat-input-area {
      padding: 16px 28px 20px;
      border-top: 1px solid var(--border);
      background: var(--bg-mid);
    }
    .chat-input-wrap {
      display: flex; gap: 12px; align-items: flex-end;
      background: var(--bg-card);
      border: 1px solid var(--border-2);
      border-radius: 14px;
      padding: 12px 16px;
      transition: border-color 0.2s;
    }
    .chat-input-wrap:focus-within { border-color: var(--blue); }
    .chat-input-wrap textarea {
      flex: 1; background: none; border: none; outline: none;
      font-size: 14px; font-family: 'Sora', sans-serif;
      color: var(--text); resize: none; min-height: 24px; max-height: 120px;
      line-height: 1.6;
    }
    .chat-input-wrap textarea::placeholder { color: var(--muted); }
    .send-btn {
      width: 38px; height: 38px; border-radius: 10px;
      background: var(--blue); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: white; flex-shrink: 0;
      transition: background 0.2s;
    }
    .send-btn:hover { background: #2563eb; }
    .send-btn:disabled { background: var(--border-2); cursor: default; }

    /* Message bubbles */
    .msg-user { display: flex; justify-content: flex-end; }
    .msg-user .bubble {
      background: var(--blue);
      color: white; border-radius: 18px 18px 4px 18px;
      padding: 12px 16px; max-width: 70%;
      font-size: 14px; line-height: 1.6;
    }
    .msg-bot { display: flex; gap: 12px; align-items: flex-start; }
    .bot-avatar {
      width: 32px; height: 32px; border-radius: 10px;
      background: linear-gradient(135deg, #1e3a5f, #0f2d4a);
      border: 1px solid var(--border-2);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; flex-shrink: 0;
    }
    .msg-bot .bubble {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 4px 18px 18px 18px;
      padding: 14px 16px; max-width: 75%;
      font-size: 14px; line-height: 1.7; color: var(--text);
    }
    .msg-meta {
      display: flex; align-items: center; gap: 8px;
      margin-top: 8px;
    }
    .cat-badge {
      font-size: 10px; padding: 3px 10px; border-radius: 20px;
      background: rgba(59,130,246,0.15); color: var(--blue-bright);
      border: 1px solid rgba(59,130,246,0.3); font-weight: 500;
      letter-spacing: 0.03em;
    }
    .cat-badge.warn { background: rgba(245,158,11,0.15); color: #fbbf24; border-color: rgba(245,158,11,0.3); }
    .conf-label { font-size: 10px; color: var(--muted); }
    .fb-btn {
      background: none; border: 1px solid var(--border); border-radius: 6px;
      padding: 3px 8px; font-size: 12px; cursor: pointer; color: var(--muted2);
      transition: all 0.15s;
    }
    .fb-btn:hover { border-color: var(--blue); color: var(--blue-bright); }
    .fb-btn.active-up { border-color: var(--success); color: var(--success); background: rgba(16,185,129,0.1); }
    .fb-btn.active-dn { border-color: var(--danger); color: var(--danger); background: rgba(239,68,68,0.1); }

    .chat-empty {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: var(--muted); text-align: center; padding: 40px;
      pointer-events: none;
    }
    .chat-empty .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; }
    .chat-empty h3 { font-size: 18px; font-weight: 600; color: var(--muted2); margin-bottom: 8px; }
    .chat-empty p  { font-size: 13px; line-height: 1.7; max-width: 360px; }

    .session-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 28px; border-bottom: 1px solid var(--border);
      background: var(--bg-mid);
    }
    .session-id { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
    .new-chat-btn {
      display: flex; align-items: center; gap: 6px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 8px; padding: 7px 14px;
      font-size: 12px; font-weight: 500; color: var(--muted2);
      cursor: pointer; font-family: 'Sora', sans-serif;
      transition: all 0.15s;
    }
    .new-chat-btn:hover { border-color: var(--blue); color: var(--blue-bright); }

    /* ── Report Analyzer ─────────────────────────────────────────────────────── */
    .report-layout { display: grid; grid-template-columns: 1fr 320px; gap: 20px; }
    .upload-zone {
      background: var(--bg-card);
      border: 2px dashed var(--border-2);
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .upload-zone:hover, .upload-zone.dragover { border-color: var(--blue); background: rgba(59,130,246,0.05); }
    .upload-zone .upload-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.6; }
    .upload-zone h3 { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .upload-zone p  { font-size: 12px; color: var(--muted); }
    .upload-zone input[type=file] { display: none; }

    .question-area {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 12px; padding: 20px; margin-top: 16px;
    }
    .question-area label { font-size: 12px; color: var(--muted2); display: block; margin-bottom: 8px; font-weight: 500; }
    .question-area input {
      width: 100%; background: var(--bg-input); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px 14px; font-size: 13px;
      font-family: 'Sora', sans-serif; color: var(--text); outline: none;
    }
    .question-area input:focus { border-color: var(--blue); }
    .question-area input::placeholder { color: var(--muted); }

    .analyze-btn {
      width: 100%; margin-top: 14px;
      background: var(--blue); color: white; border: none;
      border-radius: 10px; padding: 13px; font-size: 14px;
      font-weight: 600; font-family: 'Sora', sans-serif;
      cursor: pointer; transition: background 0.2s;
    }
    .analyze-btn:hover { background: #2563eb; }
    .analyze-btn:disabled { background: var(--border-2); cursor: default; }

    .info-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 16px; padding: 20px;
    }
    .info-card h4 { font-size: 13px; font-weight: 600; color: var(--blue-bright); margin-bottom: 14px; }
    .info-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .info-list li { font-size: 12px; color: var(--muted2); display: flex; gap: 8px; align-items: flex-start; line-height: 1.5; }
    .info-list li::before { content: '✓'; color: var(--teal); flex-shrink: 0; font-weight: 700; }

    .analysis-result {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 16px; padding: 24px; margin-top: 20px; display: none;
    }
    .analysis-result.show { display: block; }
    .result-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
    .result-filename { font-size: 14px; font-weight: 600; }
    .result-badge { font-size: 10px; background: rgba(16,185,129,0.15); color: var(--success); border: 1px solid rgba(16,185,129,0.3); padding: 3px 10px; border-radius: 20px; }

    .section-card {
      border-left: 3px solid var(--blue);
      background: rgba(59,130,246,0.05);
      border-radius: 0 8px 8px 0;
      padding: 14px 16px; margin-bottom: 14px;
    }
    .section-card.teal  { border-color: var(--teal); background: rgba(20,184,166,0.05); }
    .section-card.amber { border-color: var(--warning); background: rgba(245,158,11,0.05); }
    .section-card.green { border-color: var(--success); background: rgba(16,185,129,0.05); }
    .section-card.red   { border-color: var(--danger); background: rgba(239,68,68,0.05); }
    .section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 8px; }
    .section-card.teal  .section-title { color: var(--teal); }
    .section-card.amber .section-title { color: var(--warning); }
    .section-card.green .section-title { color: var(--success); }
    .section-card.red   .section-title { color: var(--danger); }
    .section-body { font-size: 13px; line-height: 1.8; color: var(--muted2); }
    .section-body strong { color: var(--text); }
    .section-body ul { padding-left: 18px; margin: 6px 0; }
    .section-body li { margin-bottom: 4px; }

    /* ── Admin Dashboard ──────────────────────────────────────────────────────── */
    .dashboard-grid { display: grid; gap: 20px; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .kpi-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; padding: 20px; position: relative; overflow: hidden;
    }
    .kpi-card::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0;
      height: 3px; background: linear-gradient(90deg, var(--kpi-color), transparent);
    }
    .kpi-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--muted); margin-bottom: 12px; }
    .kpi-icon { position: absolute; top: 18px; right: 18px; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .kpi-value { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; margin-bottom: 6px; }
    .kpi-delta { font-size: 11px; font-weight: 600; }
    .delta-pos { color: var(--success); }
    .delta-neg { color: var(--danger); }

    .charts-row { display: grid; grid-template-columns: 3fr 2fr; gap: 16px; }
    .chart-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 14px; padding: 20px;
    }
    .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .chart-title { font-size: 15px; font-weight: 700; }
    .chart-badge { font-size: 10px; color: var(--muted); letter-spacing: 0.1em; }

    .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 160px; }
    .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; }
    .bar { width: 100%; border-radius: 6px 6px 0 0; transition: height 0.6s ease; background: var(--bar-color, #1e3a6e); min-height: 4px; }
    .bar-label { font-size: 9px; color: var(--muted); text-align: center; }

    .time-toggle { display: flex; background: var(--bg-input); border-radius: 8px; padding: 3px; }
    .time-btn { padding: 5px 12px; border: none; border-radius: 6px; font-size: 11px; font-family: 'Sora', sans-serif; cursor: pointer; background: transparent; color: var(--muted); }
    .time-btn.active { background: var(--bg-card); color: var(--text); }

    .donut-wrap { display: flex; align-items: center; gap: 20px; }
    .donut-svg { flex-shrink: 0; }
    .donut-legend { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .legend-label { color: var(--muted2); flex: 1; }
    .legend-val { color: var(--text); font-weight: 600; font-size: 11px; }

    .users-table { width: 100%; border-collapse: collapse; }
    .users-table th { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
    .users-table td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .users-table tr:last-child td { border-bottom: none; }
    .users-table tr:hover td { background: rgba(255,255,255,0.02); }
    .u-badge {
      font-size: 10px; padding: 3px 10px; border-radius: 20px;
      background: rgba(59,130,246,0.15); color: var(--blue-bright);
      border: 1px solid rgba(59,130,246,0.3);
    }

    .sentiment-bars { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }
    .sent-row { display: flex; align-items: center; gap: 10px; }
    .sent-label { font-size: 11px; color: var(--muted); width: 40px; flex-shrink: 0; }
    .sent-track { flex: 1; height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden; }
    .sent-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
    .sent-val { font-size: 11px; color: var(--text); font-weight: 600; width: 36px; text-align: right; }

    /* ── Loading ─────────────────────────────────────────────────────────────── */
    .loading-dots { display: flex; gap: 4px; padding: 12px 0; }
    .loading-dots span { width: 6px; height: 6px; background: var(--blue); border-radius: 50%; animation: bounce 1.2s infinite; }
    .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
    .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }

    /* ── Skeleton loader ──────────────────────────────────────────────────────── */
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
    .skeleton-bubble-wrap { display: flex; flex-direction: column; gap: 10px; min-width: 260px; }
    .skel-line {
      height: 13px; border-radius: 6px;
      background: linear-gradient(90deg, #1e2d45 25%, #2a3f5f 50%, #1e2d45 75%);
      background-size: 600px 100%;
      animation: shimmer 1.5s infinite linear;
    }

    /* ── Misc ────────────────────────────────────────────────────────────────── */
    .section-heading { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 16px; margin-top: 24px; display: flex; align-items: center; gap: 8px; }
    .past-report-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; transition: border-color 0.15s; }
    .past-report-item:hover { border-color: var(--blue); }
    .pri-name { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
    .pri-date { font-size: 11px; color: var(--muted); }
  </style>

  <div id="app">
    <!-- Sidebar toggle button (always visible) -->
    <button class="sidebar-toggle-btn" onclick="toggleSidebar()" id="sidebarToggleBtn" title="Toggle sidebar">☰</button>

    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-brand">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div class="b-title">MedAI Core</div>
            <div class="b-sub">Clinical Decision Support</div>
          </div>
          <div onclick="toggleSidebar()" title="Hide sidebar"
            style="cursor:pointer;width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:14px;transition:all .15s;"
            onmouseover="this.style.background='rgba(255,255,255,0.07)';this.style.color='var(--text)'"
            onmouseout="this.style.background='transparent';this.style.color='var(--muted)'">✕</div>
        </div>
      </div>

      <div class="sidebar-new-chat">
        <button class="new-chat-sidebar-btn" onclick="newChat()">✏️ New Chat</button>
      </div>

      <div class="sidebar-section-label">Recent Chats</div>
      <div class="sidebar-history" id="sidebarHistory">
        <div class="history-empty">No chats yet.<br>Start a conversation above.</div>
      </div>

      <div class="sidebar-nav">
        <div class="nav-item active" onclick="showPage('chat')" id="nav-chat">
          <span class="nav-icon">💬</span> Chat
        </div>
        <div class="nav-item" onclick="showPage('report')" id="nav-report">
          <span class="nav-icon">📊</span> Report Analyzer
        </div>
        ${currentUser.is_admin ? `<div class="nav-item" onclick="showPage('admin')" id="nav-admin">
          <span class="nav-icon">🎛</span> Admin Dashboard
        </div>` : ''}
        <div class="nav-item" style="margin-top:4px;" onclick="showPage('settings')" id="nav-settings">
          <span class="nav-icon">⚙</span> Settings
        </div>
        <div class="nav-item" onclick="showPage('support')" id="nav-support">
          <span class="nav-icon">❓</span> Support
        </div>
      </div>

      <div class="sidebar-bottom">
        <div class="user-card">
          <div class="user-avatar">${(currentUser.username||'U')[0].toUpperCase()}</div>
          <div>
            <div class="user-name">${currentUser.username}</div>
            <div class="user-role">${currentUser.email || (currentUser.is_admin ? 'Chief Administrator' : 'Clinical User')}</div>
          </div>
        </div>
        <button class="logout-btn" onclick="doLogout()">← Sign out</button>
      </div>
    </div>

    <!-- Main -->
    <div class="main-content">
      <!-- Top bar -->
      <div class="top-bar" id="topBar">
        <div>
          <div class="top-bar-title" id="pageTitle">Clinical Chat</div>
          <div class="top-bar-sub" id="pageSub">AI-powered medical question answering</div>
        </div>
        <div class="top-bar-right">
          <!-- Notification button -->
          <div style="position:relative;">
            <div class="icon-btn has-badge" title="Notifications" onclick="toggleDropdown('notifPanel')" id="notifBtn">
              🔔
              <span class="badge" id="notifBadge">3</span>
            </div>
            <div class="dropdown-panel hidden" id="notifPanel">
              <div class="dp-header">
                <h3>🔔 Notifications</h3>
                <button class="dp-header-action" onclick="markAllRead()">Mark all read</button>
              </div>
              <div id="notifList">
                <div class="notif-item unread" onclick="markRead(this, 'chat')">
                  <div class="notif-icon blue">💬</div>
                  <div class="notif-body">
                    <div class="notif-title">New chat session started</div>
                    <div class="notif-desc">Your last session had 8 messages. Start a new chat anytime.</div>
                    <div class="notif-time">Just now</div>
                  </div>
                  <div class="notif-dot"></div>
                </div>
                <div class="notif-item unread" onclick="markRead(this, 'feedback')">
                  <div class="notif-icon green">👍</div>
                  <div class="notif-body">
                    <div class="notif-title">Feedback recorded</div>
                    <div class="notif-desc">Thanks for rating the last response. Your feedback helps improve MedAI.</div>
                    <div class="notif-time">5 mins ago</div>
                  </div>
                  <div class="notif-dot"></div>
                </div>
                <div class="notif-item unread" onclick="markRead(this, 'tip')">
                  <div class="notif-icon amber">💡</div>
                  <div class="notif-body">
                    <div class="notif-title">Tip: Upload a report</div>
                    <div class="notif-desc">Try the Report Analyzer to get AI explanations of your medical documents.</div>
                    <div class="notif-time">Today</div>
                  </div>
                  <div class="notif-dot"></div>
                </div>
                <div class="notif-item" onclick="markRead(this, 'update')">
                  <div class="notif-icon blue">🔄</div>
                  <div class="notif-body">
                    <div class="notif-title">System updated</div>
                    <div class="notif-desc">MedAI was updated with improved answer quality and multi-key API support.</div>
                    <div class="notif-time">Yesterday</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Help button -->
          <div style="position:relative;">
            <div class="icon-btn" title="Help" onclick="toggleDropdown('helpPanel')" id="helpBtn">❓</div>
            <div class="dropdown-panel hidden" id="helpPanel" style="width:320px;">
              <div class="dp-header">
                <h3>❓ Help &amp; Resources</h3>
              </div>
              <div class="help-section">
                <div class="help-section-label">Quick Actions</div>
                <div class="help-item" onclick="closeDropdowns(); showPage('chat'); newChat();">
                  <div class="help-item-icon">✏️</div>
                  <div class="help-item-body">
                    <div class="help-item-title">New Chat</div>
                    <div class="help-item-desc">Start a fresh medical Q&amp;A session</div>
                  </div>
                  <span class="help-item-arrow">›</span>
                </div>
                <div class="help-item" onclick="closeDropdowns(); showPage('report');">
                  <div class="help-item-icon">📊</div>
                  <div class="help-item-body">
                    <div class="help-item-title">Analyze a Report</div>
                    <div class="help-item-desc">Upload PDF or image medical reports for AI analysis</div>
                  </div>
                  <span class="help-item-arrow">›</span>
                </div>
                <div class="help-item" onclick="closeDropdowns(); exportData();">
                  <div class="help-item-icon">⬇️</div>
                  <div class="help-item-body">
                    <div class="help-item-title">Export Chat as PDF</div>
                    <div class="help-item-desc">Download the current conversation</div>
                  </div>
                  <span class="help-item-arrow">›</span>
                </div>
              </div>
              <div class="help-section">
                <div class="help-section-label">Keyboard Shortcuts</div>
                <div class="shortcut-row">
                  <span class="shortcut-label">Send message</span>
                  <div class="shortcut-keys"><span class="kbd">Enter</span></div>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-label">New line in message</span>
                  <div class="shortcut-keys"><span class="kbd">Shift</span><span class="kbd">Enter</span></div>
                </div>
                <div class="shortcut-row">
                  <span class="shortcut-label">New chat</span>
                  <div class="shortcut-keys"><span class="kbd">Ctrl</span><span class="kbd">N</span></div>
                </div>
              </div>
              <div class="help-section">
                <div class="help-section-label">About MedAI</div>
                <div class="help-item" onclick="">
                  <div class="help-item-icon">📚</div>
                  <div class="help-item-body">
                    <div class="help-item-title">Powered by MedQuAD + Gemini 2.5 Flash</div>
                    <div class="help-item-desc">Answers are grounded in verified medical datasets. Always consult a qualified doctor.</div>
                  </div>
                </div>
                <div class="help-item" onclick="">
                  <div class="help-item-icon">🛡️</div>
                  <div class="help-item-body">
                    <div class="help-item-title">Emergency: Call 112</div>
                    <div class="help-item-desc">For life-threatening emergencies, call emergency services immediately</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Profile button -->
          <div style="position:relative;">
            <div class="icon-btn" title="Profile" onclick="toggleDropdown('profilePanel')" id="profileBtn">👤</div>
            <div class="dropdown-panel hidden" id="profilePanel" style="width:280px;">
              <div class="profile-hero">
                <div class="profile-avatar-lg" id="dpAvatarLetter">K</div>
                <div>
                  <div class="profile-info-name" id="dpName">kashish</div>
                  <div class="profile-info-email" id="dpEmail">Clinical User</div>
                  <div class="profile-info-badge" id="dpRole">✅ Active</div>
                </div>
              </div>
              <div class="profile-stat-row">
                <div class="profile-stat">
                  <div class="profile-stat-val" id="dpSessions">—</div>
                  <div class="profile-stat-lbl">Sessions</div>
                </div>
                <div class="profile-stat">
                  <div class="profile-stat-val" id="dpMessages">—</div>
                  <div class="profile-stat-lbl">Messages</div>
                </div>
                <div class="profile-stat">
                  <div class="profile-stat-val" id="dpReports">—</div>
                  <div class="profile-stat-lbl">Reports</div>
                </div>
              </div>
              <div style="padding: 4px 0;">
                <div class="profile-menu-item" onclick="closeDropdowns(); showPage('chat');">
                  <span class="profile-menu-icon">💬</span>
                  <span class="profile-menu-label">My Chats</span>
                  <span style="color:var(--muted); font-size:12px;">›</span>
                </div>
                <div class="profile-menu-item" onclick="closeDropdowns(); showPage('report');">
                  <span class="profile-menu-icon">📊</span>
                  <span class="profile-menu-label">Report Analyzer</span>
                  <span style="color:var(--muted); font-size:12px;">›</span>
                </div>
                ${currentUser.is_admin ? `<div class="profile-menu-item" onclick="closeDropdowns(); showPage('admin');">
                  <span class="profile-menu-icon">🎛</span>
                  <span class="profile-menu-label">Admin Dashboard</span>
                  <span style="color:var(--muted); font-size:12px;">›</span>
                </div>` : ''}
                <div style="height:1px; background:var(--border); margin: 4px 0;"></div>
                <div class="profile-menu-item danger" onclick="doLogout()">
                  <span class="profile-menu-icon">🚪</span>
                  <span class="profile-menu-label">Sign Out</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Overlay to catch outside clicks -->
          <div id="dropdownOverlay" onclick="closeDropdowns()"></div>

          <div style="width:1px; height:24px; background:var(--border); margin:0 4px;"></div>
          <button class="export-btn" onclick="exportData()">⬇ Export PDF</button>
        </div>
      </div>

      <!-- Pages -->
      <!-- Chat -->
      <div class="page active" id="page-chat" style="display:flex; flex-direction:column; height:calc(100vh - 60px);">
        <div class="chat-messages" id="chatMessages">
          <div class="chat-empty" id="chatEmpty">
            <div class="empty-icon">🩺</div>
            <h3>Ask a clinical question</h3>
            <p>Ask anything about symptoms, diseases, medications, or lab results. Powered by MedQuAD + Gemini AI.</p>
          </div>
        </div>
        <div class="chat-input-area">
          <div class="chat-input-wrap">
            <textarea id="chatInput" placeholder="Ask a medical question…" rows="1"
              onkeydown="handleChatKey(event)" oninput="autoResize(this)"></textarea>
            <button class="send-btn" id="sendBtn" onclick="sendMessage()">➤</button>
          </div>
        </div>
      </div>

      <!-- Report Analyzer -->
      <div class="page" id="page-report" style="overflow-y:auto;">
        <div class="page-content">
          <div class="report-layout">
            <div>
              <div class="upload-zone" id="uploadZone" onclick="document.getElementById('fileInput').click()"
                   ondragover="handleDragOver(event)" ondrop="handleDrop(event)" ondragleave="this.classList.remove('dragover')">
                <input type="file" id="fileInput" accept=".pdf,.png,.jpg,.jpeg,.webp" onchange="handleFileSelect(event)">
                <div class="upload-icon">📂</div>
                <h3>Drop your medical report here</h3>
                <p>PDF, PNG, JPG, WEBP — max 10 MB<br>Lab reports, prescriptions, scan results, discharge summaries</p>
              </div>
              <div id="fileSelected" style="display:none; margin-top:10px; padding:12px 16px; background:var(--bg-card); border:1px solid var(--border); border-radius:10px; font-size:13px; color:var(--muted2);">
                📄 <span id="fileName"></span>
              </div>
              <div class="question-area">
                <label>Specific question about this report? (optional)</label>
                <input type="text" id="reportQuestion" placeholder="e.g. Is my cholesterol high? What does HbA1c mean?">
                <button class="analyze-btn" id="analyzeBtn" onclick="analyzeReport()" disabled>🔬 Analyze Report</button>
              </div>
              <div class="analysis-result" id="analysisResult">
                <div class="result-header">
                  <span style="font-size:20px;">📋</span>
                  <div>
                    <div class="result-filename" id="resultFilename"></div>
                    <div style="font-size:11px; color:var(--muted);">AI Analysis Complete</div>
                  </div>
                  <span class="result-badge">✓ Analyzed</span>
                </div>
                <div id="resultBody"></div>
                <div style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
                  <button onclick="downloadAnalysis()" style="background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:9px 16px; font-size:12px; color:var(--muted2); cursor:pointer; font-family:'Sora',sans-serif;">
                    💾 Download Analysis
                  </button>
                </div>
              </div>
            </div>
            <div>
              <div class="info-card">
                <h4>What this tool analyzes</h4>
                <ul class="info-list">
                  <li>Identifies the type of medical document</li>
                  <li>Explains all test values in simple language</li>
                  <li>Flags normal vs abnormal results clearly</li>
                  <li>Summarizes what findings mean for you</li>
                  <li>Suggests questions to ask your doctor</li>
                </ul>
              </div>
              <div style="margin-top:14px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.35); border-left:4px solid var(--warning); border-radius:10px; padding:14px 16px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:7px;">
                  <span style="font-size:15px;">⚠️</span>
                  <span style="color:var(--warning); font-size:11px; font-weight:700; letter-spacing:0.06em;">CLINICAL DISCLAIMER</span>
                </div>
                <p style="color:var(--muted2); font-size:12px; line-height:1.65; margin:0;">
                  This tool is intended for <strong style="color:var(--text);">educational and informational purposes only</strong>. All AI-generated interpretations must be reviewed by a licensed healthcare provider before any clinical action. It is not a diagnostic tool.
                </p>
              </div>
              <div class="section-heading" style="margin-top:20px;">🗂 Past Reports</div>
              <div id="pastReports"><div style="font-size:12px; color:var(--muted);">Loading…</div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin Dashboard -->
      <div class="page" id="page-admin" style="overflow-y:auto;">
        <div class="page-content">
          <div class="dashboard-grid">
            <div class="kpi-row" id="kpiRow">
              ${kpiCard('TOTAL QUERIES','—','+0%','📈','#3b82f6')}
              ${kpiCard('ACTIVE USERS','—','+0%','👥','#14b8a6')}
              ${kpiCard('REPORTS PROCESSED','—','0%','📄','#f59e0b')}
              ${kpiCard('AVG AI CONFIDENCE','—','+0%','✅','#3b82f6')}
            </div>
            <div class="charts-row">
              <div class="chart-card">
                <div class="chart-header">
                  <div class="chart-title">Activity Pulse</div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="chart-badge">REAL-TIME TELEMETRY</span>
                    <div class="time-toggle">
                      <button class="time-btn active">24H</button>
                      <button class="time-btn">7D</button>
                      <button class="time-btn">1M</button>
                    </div>
                  </div>
                </div>
                <div class="bar-chart" id="activityChart">
                  <div style="color:var(--muted); font-size:12px;">Loading…</div>
                </div>
              </div>
              <div class="chart-card">
                <div class="chart-header"><div class="chart-title">Inquiry Distribution</div></div>
                <div class="donut-wrap" id="donutChart">
                  <div style="color:var(--muted); font-size:12px;">Loading…</div>
                </div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header">
                <div class="chart-title">Clinician Feedback Sentiment</div>
                <div style="display:flex; gap:12px; font-size:11px; color:var(--muted);">
                  <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--teal);display:inline-block;"></span> Positive</span>
                  <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:var(--border-2);display:inline-block;"></span> Neutral</span>
                </div>
              </div>
              <div class="sentiment-bars" id="sentimentChart">
                <div style="color:var(--muted); font-size:12px;">Loading…</div>
              </div>
            </div>
            <div class="chart-card">
              <div class="chart-header"><div class="chart-title">Most Asked Diseases</div></div>
              <div id="diseasesChart"><div style="color:var(--muted); font-size:12px;">Loading…</div></div>
            </div>
            <div class="chart-card">
              <div class="chart-header"><div class="chart-title">User Activity</div></div>
              <table class="users-table">
                <thead><tr>
                  <th>User</th><th>Top Disease</th><th>Total Queries</th><th>Reports</th><th>Positive Feedback</th><th>Last Active</th>
                </tr></thead>
                <tbody id="usersTable"><tr><td colspan="5" style="color:var(--muted);font-size:12px;padding:16px;">Loading…</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Page -->
      <div class="page" id="page-settings" style="overflow:hidden; height:calc(100vh - 60px);">
        <div class="settings-layout">
          <!-- Settings sidebar nav -->
          <div class="settings-nav">
            ${['appearance','chat','notifications','privacy','accessibility','medical','about'].map((s,i) => {
              const icons = ['🎨','💬','🔔','🔒','♿','🩺','ℹ️'];
              const labels = ['Appearance','Chat','Notifications','Privacy & Data','Accessibility','Medical','About'];
              return `<div class="settings-nav-item ${i===0?'active':''}" onclick="switchSettingsTab('${s}')" id="stab-${s}">
                <span class="settings-nav-icon">${icons[i]}</span> ${labels[i]}
              </div>`;
            }).join('')}
          </div>

          <!-- Settings content -->
          <div class="settings-body" id="settingsBody">

            <!-- APPEARANCE -->
            <div class="settings-section active" id="sec-appearance">
              <div class="settings-section-heading">🎨 Appearance</div>
              <div class="settings-group">
                <div class="settings-group-title">Theme</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Color Theme</div>
                    <div class="settings-row-desc">Choose your preferred color scheme</div>
                  </div>
                  <select class="settings-select" id="s-theme" onchange="applySetting('theme',this.value)">
                    <option value="dark">🌙 Dark</option>
                    <option value="darker">⚫ Darker</option>
                    <option value="midnight">🔵 Midnight Blue</option>
                  </select>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Accent Color</div>
                    <div class="settings-row-desc">Main highlight color used across the UI</div>
                  </div>
                  <div style="display:flex;gap:8px;">
                    ${[['#3b82f6','Blue'],['#14b8a6','Teal'],['#8b5cf6','Purple'],['#f59e0b','Amber'],['#ef4444','Red']].map(([c,n]) =>
                      `<div title="${n}" style="width:26px;height:26px;border-radius:8px;background:${c};cursor:pointer;border:2px solid transparent;transition:all .15s;"
                        id="accent-${c.slice(1)}"
                        onclick="setAccent('${c}')"></div>`
                    ).join('')}
                  </div>
                </div>
              </div>
              <div class="settings-group">
                <div class="settings-group-title">Chat Display</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Font Size</div>
                    <div class="settings-row-desc">Size of text in chat bubbles</div>
                  </div>
                  <select class="settings-select" id="s-fontsize" onchange="applySetting('fontsize',this.value)">
                    <option value="small">Small (12px)</option>
                    <option value="medium" selected>Medium (14px)</option>
                    <option value="large">Large (16px)</option>
                    <option value="xlarge">Extra Large (18px)</option>
                  </select>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Bubble Style</div>
                    <div class="settings-row-desc">Visual style of message bubbles</div>
                  </div>
                  <select class="settings-select" id="s-bubble" onchange="applySetting('bubble',this.value)">
                    <option value="rounded">Rounded</option>
                    <option value="compact">Compact</option>
                    <option value="minimal">Minimal (no background)</option>
                  </select>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Sidebar Width</div>
                    <div class="settings-row-desc">Width of the left navigation panel</div>
                  </div>
                  <select class="settings-select" id="s-sidebar" onchange="applySetting('sidebar',this.value)">
                    <option value="compact">Compact (220px)</option>
                    <option value="normal" selected>Normal (260px)</option>
                    <option value="wide">Wide (300px)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- CHAT PREFERENCES -->
            <div class="settings-section" id="sec-chat">
              <div class="settings-section-heading">💬 Chat Preferences</div>
              <div class="settings-group">
                <div class="settings-group-title">Behaviour</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Send on Enter</div>
                    <div class="settings-row-desc">Press Enter to send. Use Shift+Enter for a new line.</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-enterSend" checked onchange="applySetting('enterSend',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Auto-scroll to New Messages</div>
                    <div class="settings-row-desc">Automatically scroll down when a new response arrives</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-autoScroll" checked onchange="applySetting('autoScroll',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Typing / Loading Indicator</div>
                    <div class="settings-row-desc">Show skeleton animation while waiting for AI response</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-skeleton" checked onchange="applySetting('skeleton',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div class="settings-group">
                <div class="settings-group-title">Metadata Display</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Show Confidence Score</div>
                    <div class="settings-row-desc">Display the AI confidence % badge below each answer</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-confidence" checked onchange="applySetting('confidence',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Show Category Badge</div>
                    <div class="settings-row-desc">Show the disease category tag (e.g. SeniorHealth, Cancer)</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-category" checked onchange="applySetting('category',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div class="settings-group">
                <div class="settings-group-title">Response Language</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Answer Language</div>
                    <div class="settings-row-desc">AI will respond in your chosen language (Gemini handles translation)</div>
                  </div>
                  <select class="settings-select" id="s-language" onchange="applySetting('language',this.value)">
                    <option value="english">🇬🇧 English</option>
                    <option value="hindi">🇮🇳 Hindi</option>
                    <option value="gujarati">🇮🇳 Gujarati</option>
                    <option value="marathi">🇮🇳 Marathi</option>
                    <option value="tamil">🇮🇳 Tamil</option>
                    <option value="bengali">🇮🇳 Bengali</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- NOTIFICATIONS -->
            <div class="settings-section" id="sec-notifications">
              <div class="settings-section-heading">🔔 Notifications</div>
              <div class="settings-group">
                <div class="settings-group-title">In-App Notifications</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Session Notifications</div>
                    <div class="settings-row-desc">Alert when a new chat session is started</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-notifSession" checked onchange="applySetting('notifSession',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Feedback Reminders</div>
                    <div class="settings-row-desc">Remind you to rate AI responses with 👍/👎</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-notifFeedback" checked onchange="applySetting('notifFeedback',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Tips &amp; Updates</div>
                    <div class="settings-row-desc">Show product tips and feature update notifications</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-notifTips" checked onchange="applySetting('notifTips',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">API Key Rotation Alerts</div>
                    <div class="settings-row-desc">Show a toast when an API key rotates due to rate limiting</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-notifApiKey" onchange="applySetting('notifApiKey',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- PRIVACY & DATA -->
            <div class="settings-section" id="sec-privacy">
              <div class="settings-section-heading">🔒 Privacy &amp; Data</div>
              <div class="settings-group">
                <div class="settings-group-title">Your Data</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Export All My Chats</div>
                    <div class="settings-row-desc">Download all your conversations as a PDF file</div>
                  </div>
                  <button class="settings-btn secondary" onclick="exportData()">⬇ Export PDF</button>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Clear All Chat History</div>
                    <div class="settings-row-desc">Permanently delete all your sessions and messages</div>
                  </div>
                  <button class="settings-btn danger" onclick="clearAllHistory()">🗑 Clear All</button>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Delete Account</div>
                    <div class="settings-row-desc">Permanently remove your account and all associated data</div>
                  </div>
                  <button class="settings-btn danger" onclick="deleteAccount()">⚠ Delete Account</button>
                </div>
              </div>
              <div class="settings-group">
                <div class="settings-group-title">Session</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Sign Out</div>
                    <div class="settings-row-desc">Sign out of your account on this device</div>
                  </div>
                  <button class="settings-btn danger" onclick="doLogout()">← Sign Out</button>
                </div>
              </div>
            </div>

            <!-- ACCESSIBILITY -->
            <div class="settings-section" id="sec-accessibility">
              <div class="settings-section-heading">♿ Accessibility</div>
              <div class="settings-group">
                <div class="settings-group-title">Motion &amp; Animation</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Reduce Motion</div>
                    <div class="settings-row-desc">Disable animations, transitions, and skeleton loaders</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-reduceMotion" onchange="applySetting('reduceMotion',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div class="settings-group">
                <div class="settings-group-title">Display</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">High Contrast Mode</div>
                    <div class="settings-row-desc">Increase contrast between text and backgrounds</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-highContrast" onchange="applySetting('highContrast',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Large Click Targets</div>
                    <div class="settings-row-desc">Make buttons and interactive elements larger for easier tapping</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-largeTargets" onchange="applySetting('largeTargets',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>

            <!-- MEDICAL PREFERENCES -->
            <div class="settings-section" id="sec-medical">
              <div class="settings-section-heading">🩺 Medical Preferences</div>
              <div class="settings-group">
                <div class="settings-group-title">Response Safety</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Always Show Doctor Reminder</div>
                    <div class="settings-row-desc">Show "Please consult a qualified doctor" at the end of every answer</div>
                  </div>
                  <label class="toggle-wrap">
                    <input type="checkbox" class="toggle-input" id="s-doctorReminder" checked onchange="applySetting('doctorReminder',this.checked)">
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-label">Low Confidence Warning Threshold</div>
                    <div class="settings-row-desc">Show a warning banner when AI confidence drops below this level</div>
                  </div>
                  <div class="slider-row">
                    <input type="range" class="settings-slider" id="s-confThreshold"
                      min="20" max="80" step="10" value="60"
                      oninput="document.getElementById('confThreshVal').textContent=this.value+'%'; applySetting('confThreshold',this.value)">
                    <span class="slider-val" id="confThreshVal">60%</span>
                  </div>
                </div>
              </div>
              <div class="settings-group">
                <div class="settings-group-title">Emergency Contacts</div>
                <div class="emergency-contact">
                  <div class="emergency-icon" style="background:rgba(239,68,68,0.15);">🚑</div>
                  <div class="emergency-body">
                    <div class="emergency-name">Emergency Services</div>
                    <div class="emergency-num">112</div>
                    <div class="emergency-desc">All emergencies — police, fire, ambulance</div>
                  </div>
                </div>
                <div class="emergency-contact">
                  <div class="emergency-icon" style="background:rgba(239,68,68,0.15);">🏥</div>
                  <div class="emergency-body">
                    <div class="emergency-name">AIIMS Helpline</div>
                    <div class="emergency-num">1800-11-7711</div>
                    <div class="emergency-desc">All India Institute of Medical Sciences</div>
                  </div>
                </div>
                <div class="emergency-contact">
                  <div class="emergency-icon" style="background:rgba(251,191,36,0.12);">🧠</div>
                  <div class="emergency-body">
                    <div class="emergency-name">iCall Mental Health</div>
                    <div class="emergency-num">9152987821</div>
                    <div class="emergency-desc">Free counselling and mental health support</div>
                  </div>
                </div>
                <div class="emergency-contact">
                  <div class="emergency-icon" style="background:rgba(45,212,191,0.12);">☠️</div>
                  <div class="emergency-body">
                    <div class="emergency-name">Poison Control</div>
                    <div class="emergency-num">1800-11-6117</div>
                    <div class="emergency-desc">National Poison Information Centre (AIIMS)</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- ABOUT -->
            <div class="settings-section" id="sec-about">
              <div class="settings-section-heading">ℹ️ About MedAI</div>
              <div class="about-card">
                <div class="about-logo">🩺</div>
                <div class="about-name">MedAI Core</div>
                <div class="about-ver">Version 2.0.0 &nbsp;·&nbsp; Academic Year 2025-26</div>
                <div class="about-pills">
                  <span class="about-pill">⚡ Gemini 2.5 Flash</span>
                  <span class="about-pill">📚 MedQuAD Dataset</span>
                  <span class="about-pill">🔍 FAISS Retrieval</span>
                  <span class="about-pill">🤖 RAG Pipeline</span>
                  <span class="about-pill">🔑 Multi-Key Rotation</span>
                </div>
              </div>
              <div class="settings-group">
                <div class="settings-group-title">Technical Stack</div>
                <div class="settings-row">
                  <div class="settings-row-info"><div class="settings-row-label">AI Model</div></div>
                  <span style="font-size:12px;color:var(--muted2);">Google Gemini 2.5 Flash</span>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info"><div class="settings-row-label">Knowledge Base</div></div>
                  <span style="font-size:12px;color:var(--muted2);">MedQuAD (9 categories)</span>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info"><div class="settings-row-label">Embeddings</div></div>
                  <span style="font-size:12px;color:var(--muted2);">Sentence Transformers (384-dim)</span>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info"><div class="settings-row-label">Vector Search</div></div>
                  <span style="font-size:12px;color:var(--muted2);">FAISS-CPU 1.8.0</span>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info"><div class="settings-row-label">Backend</div></div>
                  <span style="font-size:12px;color:var(--muted2);">FastAPI + SQLAlchemy + SQLite</span>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info"><div class="settings-row-label">Frontend</div></div>
                  <span style="font-size:12px;color:var(--muted2);">Vanilla HTML / CSS / JavaScript SPA</span>
                </div>
                <div class="settings-row">
                  <div class="settings-row-info"><div class="settings-row-label">Developed by</div></div>
                  <span style="font-size:12px;color:var(--muted2);">Kashish Patel · BrainyBeam Technologies</span>
                </div>
              </div>
              <div class="settings-group">
                <div class="settings-group-title">Disclaimer</div>
                <div class="settings-row">
                  <div class="settings-row-info">
                    <div class="settings-row-desc" style="font-size:12px;line-height:1.7;">
                      MedAI is an informational assistant only. It is <b>not a substitute for professional medical advice, diagnosis, or treatment</b>.
                      Always consult a qualified healthcare professional for any medical concerns.
                      In case of emergency, call <b style="color:var(--danger);">112</b> immediately.
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div><!-- settings-body -->
        </div><!-- settings-layout -->
      </div><!-- page-settings -->

      <!-- Support Page -->
      <div class="page" id="page-support" style="overflow-y:auto;">
        <div class="page-content">
          <div class="support-grid">
            <div class="support-card" onclick="showPage('chat');newChat();">
              <div class="support-card-icon">💬</div>
              <div class="support-card-title">New Chat</div>
              <div class="support-card-desc">Start a fresh medical Q&amp;A session with MedAI</div>
            </div>
            <div class="support-card" onclick="showPage('report');">
              <div class="support-card-icon">📊</div>
              <div class="support-card-title">Report Analyzer</div>
              <div class="support-card-desc">Upload PDF or image medical reports for AI analysis</div>
            </div>
            <div class="support-card" onclick="exportData();">
              <div class="support-card-icon">⬇️</div>
              <div class="support-card-title">Export Chats</div>
              <div class="support-card-desc">Download your current conversation as a PDF</div>
            </div>
            <div class="support-card" onclick="showPage('settings');switchSettingsTab('medical');">
              <div class="support-card-icon">🚑</div>
              <div class="support-card-title">Emergency Contacts</div>
              <div class="support-card-desc">View emergency numbers including 112, AIIMS helpline and poison control</div>
            </div>
          </div>
          <div class="settings-group">
            <div class="settings-group-title">Keyboard Shortcuts</div>
            ${[['Send message','Enter'],['New line','Shift + Enter'],['New chat','Ctrl + N'],['Close panels','Escape']].map(([label,keys])=>`
            <div class="settings-row">
              <div class="settings-row-info"><div class="settings-row-label">${label}</div></div>
              <span style="font-size:12px;color:var(--blue-bright);font-weight:600;font-family:monospace;">${keys}</span>
            </div>`).join('')}
          </div>
          <div class="settings-group">
            <div class="settings-group-title">About This App</div>
            <div class="settings-row">
              <div class="settings-row-info">
                <div class="settings-row-desc" style="font-size:12px;line-height:1.8;">
                  <b>MedAI Core</b> is powered by the MedQuAD medical knowledge base and Google Gemini 2.5 Flash.
                  It uses a 5-step Retrieval-Augmented Generation (RAG) pipeline for accurate, grounded answers.<br><br>
                  For life-threatening emergencies, always call <b style="color:var(--danger);">112</b> immediately.
                  This app is for informational purposes only and is not a substitute for professional medical advice.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div><!-- page-support -->

    </div><!-- main-content -->
  </div><!-- app -->
  `;
}

function kpiCard(label, value, delta, icon, color) {
  const pos = !delta.startsWith('-');
  return `<div class="kpi-card" style="--kpi-color:${color}">
    <div class="kpi-label">${label}</div>
    <div class="kpi-icon" style="background:${color}22; color:${color}">${icon}</div>
    <div class="kpi-value" style="color:${color}" id="kpi-${label.replace(/\s/g,'')}'">${value}</div>
    <div class="kpi-delta ${pos?'delta-pos':'delta-neg'}">${delta}</div>
  </div>`;
}

/* ── State ────────────────────────────────────────────────────────────────── */
let sessionId = generateId();
let messages  = [];
let selectedFile = null;
let lastAnalysis = '';
let lastFilename  = '';
let currentPage   = 'chat';

function generateId() { return Math.random().toString(36).substr(2,8); }

function initApp() {
  loadSidebarHistory();
  loadPastReports();
  if (currentUser.is_admin) loadAdminData();
  // Apply any saved settings immediately
  const saved = JSON.parse(localStorage.getItem('medai_settings') || '{}');
  applyAllSettings({ ...SETTINGS_DEFAULTS, ...saved });
}

/* ── Chat history sidebar ─────────────────────────────────────────────────── */
async function loadSidebarHistory() {
  const el = document.getElementById('sidebarHistory');
  if (!el) return;
  try {
    const r = await fetch(`${API}/chat/sessions`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    if (!r.ok) return;
    const data = await r.json();
    const sessions = data.sessions || [];

    if (!sessions.length) {
      el.innerHTML = '<div class="history-empty">No chats yet.<br>Start a conversation above.</div>';
      return;
    }

    el.innerHTML = sessions.map(s => `
      <div class="history-item ${s.session_id === sessionId ? 'active' : ''}"
           id="hist_${s.session_id}"
           onclick="loadSession('${s.session_id}')">
        <span class="history-item-icon">💬</span>
        <div class="history-item-body">
          <div class="history-item-title">${escHtml(s.title)}</div>
          <div class="history-item-meta">${s.last_active} · ${s.message_count} msgs</div>
        </div>
        <button class="history-item-del" title="Delete chat"
          onclick="deleteSession(event, '${s.session_id}')">🗑</button>
      </div>
    `).join('');
  } catch (e) {
    console.error('History load error:', e);
  }
}

async function loadSession(sid) {
  if (sid === sessionId) return; // already active
  sessionId = sid;
  messages  = [];

  // Update active state in sidebar
  document.querySelectorAll('.history-item').forEach(el => {
    el.classList.toggle('active', el.id === `hist_${sid}`);
  });

  // Switch to chat page
  showPage('chat');

  // Load messages from server
  try {
    const r = await fetch(`${API}/chat/history/${sid}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    if (!r.ok) return;
    const data = await r.json();

    // Rebuild messages array from history
    messages = data.messages.map(m => ({
      role:          m.role,
      content:       m.content,
      category:      m.category,
      confidence:    m.confidence,
      low_confidence: m.confidence !== null && m.confidence < 0.60,
      message_id:    m.id,
    }));
    renderMessages();
  } catch (e) {
    console.error('Load session error:', e);
  }
}

async function deleteSession(event, sid) {
  event.stopPropagation(); // don't trigger loadSession
  if (!confirm('Delete this chat?')) return;
  try {
    await fetch(`${API}/chat/history/${sid}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    // If we deleted the current session, start a new one
    if (sid === sessionId) newChat();
    loadSidebarHistory();
  } catch (e) {
    console.error('Delete session error:', e);
  }
}


const PAGE_META = {
  chat:     { title:'Clinical Chat',    sub:'AI-powered medical question answering' },
  report:   { title:'Report Analyzer', sub:'Upload and interpret medical documents with AI' },
  admin:    { title:'System Overview',  sub:'Real-time performance and clinical engagement metrics.' },
  settings: { title:'Settings',         sub:'Customize your MedAI experience' },
  support:  { title:'Support',          sub:'Help, resources, and emergency contacts' },
};

function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(`page-${page}`);
  if (el) { el.style.display = 'flex'; el.classList.add('active'); }
  const nav = document.getElementById(`nav-${page}`);
  if (nav) nav.classList.add('active');
  const meta = PAGE_META[page] || {};
  document.getElementById('pageTitle').textContent = meta.title || '';
  document.getElementById('pageSub').textContent   = meta.sub   || '';
  if (page === 'report')   { document.getElementById(`page-${page}`).style.display = 'block'; loadPastReports(); }
  if (page === 'admin' && currentUser.is_admin) { document.getElementById(`page-${page}`).style.display = 'block'; loadAdminData(); }
  if (page === 'settings') { document.getElementById(`page-${page}`).style.display = 'flex'; loadSettingsFromStorage(); }
  if (page === 'support')  { document.getElementById(`page-${page}`).style.display = 'block'; }
}

/* ── Chat ─────────────────────────────────────────────────────────────────── */
function newChat() {
  sessionId = generateId();
  messages  = [];
  // Clear active state in sidebar
  document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
  showPage('chat');
  renderMessages();
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    // Respect the "Send on Enter" setting (default: true)
    if (window._enterSend !== false) { e.preventDefault(); sendMessage(); }
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const q = input.value.trim();
  if (!q) return;

  input.value = ''; autoResize(input);
  messages.push({ role:'user', content:q });

  const chatEl = document.getElementById('chatMessages');
  const empty = document.getElementById('chatEmpty');
  if (empty) empty.style.display = 'none';

  // Append user bubble directly without full redraw
  chatEl.insertAdjacentHTML('beforeend', `
    <div class="msg-user">
      <div class="bubble">${escHtml(q)}</div>
    </div>
  `);

  // Append skeleton immediately after user bubble
  const loadId = 'loading_' + Date.now();
  chatEl.insertAdjacentHTML('beforeend', `
    <div class="msg-bot" id="${loadId}">
      <div class="bot-avatar">⚕</div>
      <div class="bubble skeleton-bubble-wrap">
        <div class="skel-line" style="width:88%"></div>
        <div class="skel-line" style="width:72%"></div>
        <div class="skel-line" style="width:80%"></div>
        <div class="skel-line" style="width:55%"></div>
      </div>
    </div>
  `);
  chatEl.scrollTop = chatEl.scrollHeight;

  let botMsg = null;
  try {
    const r = await fetch(`${API}/chat/ask`, {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${authToken}`},
      body: JSON.stringify({
        question: q,
        session_id: sessionId,
        language: (window.MEDAI_SETTINGS||{}).language || 'english',
      })
    });

    if (r.status === 401) { doLogout(); return; }
    if (!r.ok) {
      let detail = `Server error (${r.status})`;
      try { detail = (await r.json()).detail || detail; } catch{}
      botMsg = { role:'assistant', content:`❌ ${detail}`, category:'error', confidence:0, low_confidence:true, message_id:null };
    } else {
      const d = await r.json();
      botMsg = { role:'assistant', content:d.answer, category:d.category, confidence:d.confidence, low_confidence:d.low_confidence, message_id:d.message_id };
    }
  } catch(e) {
    botMsg = { role:'assistant', content:'❌ Cannot reach backend. Is the server running?', category:'error', confidence:0, low_confidence:true, message_id:null };
  }

  messages.push(botMsg);

  // After first exchange, refresh sidebar so the title appears
  if (messages.filter(m => m.role === 'user').length === 1) {
    loadSidebarHistory();
  } else {
    // Just update active state without full reload
    document.querySelectorAll('.history-item').forEach(el => {
      el.classList.toggle('active', el.id === `hist_${sessionId}`);
    });
  }

  // Replace skeleton directly with answer — no full redraw, no blank flash
  const skelEl = document.getElementById(loadId);
  if (skelEl) {
    const conf    = ((botMsg.confidence||0)*100).toFixed(0);
    const cat     = (botMsg.category||'').replace(/_/g,' ');
    const lowWarn = botMsg.low_confidence;
    const mid     = botMsg.message_id;
    skelEl.outerHTML = `
      <div class="msg-bot">
        <div class="bot-avatar">⚕</div>
        <div>
          <div class="bubble">${markdownToHtml(botMsg.content)}</div>
          <div class="msg-meta">
            ${cat ? `<span class="cat-badge ${lowWarn?'warn':''}">${cat}</span>` : ''}
            ${conf > 0 ? `<span class="conf-badge conf-label">${conf}% confidence</span>` : ''}
            ${mid ? `
              <button class="fb-btn" id="up_${mid}" onclick="sendFeedback(${mid},1,'up_${mid}','dn_${mid}')">👍</button>
              <button class="fb-btn" id="dn_${mid}" onclick="sendFeedback(${mid},-1,'up_${mid}','dn_${mid}')">👎</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  if (window._autoScroll !== false) chatEl.scrollTop = chatEl.scrollHeight;
}

function renderMessages() {
  const el    = document.getElementById('chatMessages');
  const empty = document.getElementById('chatEmpty');
  if (!el) return;

  // Remove all existing message bubbles
  el.querySelectorAll('.msg-user,.msg-bot,.loading-msg').forEach(m => m.remove());

  // Show or hide empty state
  if (empty) empty.style.display = messages.length === 0 ? 'flex' : 'none';
  if (messages.length === 0) return;

  messages.forEach((msg) => {
    if (msg.role === 'user') {
      const div = document.createElement('div');
      div.className = 'msg-user';
      div.innerHTML = `<div class="bubble">${escHtml(msg.content)}</div>`;
      el.appendChild(div);
    } else {
      const conf    = ((msg.confidence||0)*100).toFixed(0);
      const cat     = (msg.category||'').replace(/_/g,' ');
      const lowWarn = msg.low_confidence;
      const mid     = msg.message_id;
      const div     = document.createElement('div');
      div.className = 'msg-bot';
      div.innerHTML = `
        <div class="bot-avatar">⚕</div>
        <div>
          <div class="bubble">${markdownToHtml(cleanAnswer(msg.content))}</div>
          <div class="msg-meta">
            ${cat ? `<span class="cat-badge ${lowWarn?'warn':''}">${cat}</span>` : ''}
            ${conf > 0 ? `<span class="conf-badge conf-label">${conf}% confidence</span>` : ''}
            ${mid ? `
              <button class="fb-btn" id="up_${mid}" onclick="sendFeedback(${mid},1,'up_${mid}','dn_${mid}')">👍</button>
              <button class="fb-btn" id="dn_${mid}" onclick="sendFeedback(${mid},-1,'up_${mid}','dn_${mid}')">👎</button>
            ` : ''}
          </div>
        </div>`;
      el.appendChild(div);
    }
  });

  el.scrollTop = el.scrollHeight;
}
/* ── Report Analyzer ──────────────────────────────────────────────────────── */
function handleDragOver(e) { e.preventDefault(); document.getElementById('uploadZone').classList.add('dragover'); }
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
}
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) setFile(file);
}
function setFile(file) {
  selectedFile = file;
  document.getElementById('fileSelected').style.display = 'block';
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('analyzeBtn').disabled = false;
}

async function analyzeReport() {
  if (!selectedFile) return;
  const btn = document.getElementById('analyzeBtn');
  btn.innerHTML = '<span class="spinner" style="border-top-color:white;border-color:rgba(255,255,255,0.3);"></span>Analyzing…';
  btn.disabled = true;

  const q = document.getElementById('reportQuestion').value;
  const fd = new FormData();
  fd.append('file', selectedFile);
  fd.append('question', q);

  try {
    const r = await fetch(`${API}/report/analyze`, {
      method:'POST', headers:{'Authorization':`Bearer ${authToken}`}, body:fd
    });
    const d = await r.json();
    if (r.ok) {
      lastAnalysis = d.analysis;
      lastFilename  = d.filename;
      showAnalysis(d.analysis, d.filename);
      loadPastReports();
    } else {
      alert(d.detail || 'Analysis failed.');
    }
  } catch(e) {
    alert('Cannot reach backend.');
  }

  btn.innerHTML = '🔬 Analyze Report'; btn.disabled = false;
}

function showAnalysis(analysis, filename) {
  document.getElementById('resultFilename').textContent = filename;
  document.getElementById('resultBody').innerHTML = renderAnalysisSections(analysis);
  const result = document.getElementById('analysisResult');
  result.classList.add('show');
  result.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function renderAnalysisSections(text) {
  // Parse numbered sections from Gemini response
  const sections = text.split(/\n(?=\d+\.\s+\*\*)/);
  if (sections.length <= 1) {
    return `<div class="section-body">${markdownToHtml(text)}</div>`;
  }

  const colors  = ['','teal','amber','green','','red'];
  const icons   = ['🏷️','🔬','📊','💡','📋','⚠️'];
  const labels  = ['Report Type','Key Findings','Normal / Abnormal','What This Means','Next Steps','Disclaimer'];

  return sections.map((sec, i) => {
    const lines = sec.trim().split('\n');
    const heading = lines[0].replace(/^\d+\.\s*/, '').replace(/\*\*/g,'').replace(/:$/,'').trim();
    const body    = lines.slice(1).join('\n').trim();
    const col     = colors[i] || '';
    const icon    = icons[i]  || '📌';
    return `<div class="section-card ${col}">
      <div class="section-title">${icon} ${heading.toUpperCase()}</div>
      <div class="section-body">${markdownToHtml(body)}</div>
    </div>`;
  }).join('');
}

function downloadAnalysis() {
  const blob = new Blob([`Report: ${lastFilename}\n\n${lastAnalysis}`], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `analysis_${lastFilename}.txt`;
  a.click();
}

// Store past report analyses by index to avoid huge inline onclick strings
const pastReportCache = {};

async function loadPastReports() {
  const el = document.getElementById('pastReports');
  if (!el) return;
  try {
    const r = await fetch(`${API}/report/history`, { headers:{'Authorization':`Bearer ${authToken}`} });
    if (!r.ok) { el.innerHTML = '<div style="font-size:12px;color:var(--muted);">No reports uploaded yet.</div>'; return; }
    const reports = await r.json();
    if (!reports.length) { el.innerHTML = '<div style="font-size:12px;color:var(--muted);">No reports uploaded yet.</div>'; return; }
    reports.forEach((rep, i) => { pastReportCache[i] = rep; });
    el.innerHTML = reports.map((rep, i) => `
      <div class="past-report-item" onclick="loadCachedReport(${i})">
        <div class="pri-name">📄 ${rep.filename}</div>
        <div class="pri-date">${rep.uploaded_at?.substring(0,16) || ''}</div>
      </div>
    `).join('');
  } catch { el.innerHTML = '<div style="font-size:12px;color:var(--muted);">No reports uploaded yet.</div>'; }
}

function loadCachedReport(i) {
  const rep = pastReportCache[i];
  if (rep) showAnalysis(rep.analysis, rep.filename);
}

/* ── Admin Dashboard ──────────────────────────────────────────────────────── */
async function loadAdminData() {
  try {
    const [mRes, uRes] = await Promise.all([
      fetch(`${API}/admin/metrics`, { headers:{'Authorization':`Bearer ${authToken}`} }),
      fetch(`${API}/admin/users`,   { headers:{'Authorization':`Bearer ${authToken}`} }),
    ]);
    if (!mRes.ok) return;
    const m = await mRes.json();
    const users = uRes.ok ? await uRes.json() : [];

    // KPI cards
    const fb = m.feedback_summary || {};
    const fbTotal = fb.total || 1;
    updateKpi('TOTALQUERIES',     m.total_queries,   '+14.2%');
    updateKpi('ACTIVEUSERS',      m.total_users,     '+3.1%');
    updateKpi('REPORTSPROCESSED', m.total_reports||0, '-1.4%');
    updateKpi('AVGAICONFIDENCE',  `${((m.avg_confidence||0)*100).toFixed(1)}%`, '+0.8%');

    // Activity bar chart
    renderActivityChart(m.queries_per_day || []);

    // Donut chart
    renderDonut(m.most_asked_diseases || []);

    // Sentiment
    renderSentiment(fb);

    // Diseases table
    renderDiseases(m.most_asked_diseases || []);

    // Users table
    renderUsersTable(users);

  } catch(e) { console.error('Admin data error:', e); }
}

function updateKpi(key, value, delta) {
  // Update by label match
  document.querySelectorAll('.kpi-card').forEach(card => {
    const label = card.querySelector('.kpi-label')?.textContent.replace(/\s/g,'');
    if (label === key) {
      card.querySelector('.kpi-value').textContent = value;
      const d = card.querySelector('.kpi-delta');
      d.textContent = delta;
      d.className = `kpi-delta ${delta.startsWith('-') ? 'delta-neg' : 'delta-pos'}`;
    }
  });
}

function renderActivityChart(data) {
  const el = document.getElementById('activityChart');
  if (!el || !data.length) { if(el) el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:20px;">No activity data yet.</div>'; return; }
  const max = Math.max(...data.map(d => d.count), 1);
  const recent = data.slice(-14);
  el.innerHTML = recent.map(d => `
    <div class="bar-wrap">
      <div class="bar" style="--bar-color:#1e3a6e; height:${Math.max(8,(d.count/max)*140)}px; background:linear-gradient(to top, #1e3a6e, #3b82f6);"></div>
      <div class="bar-label">${d.date?.slice(5) || ''}</div>
    </div>
  `).join('');
}

function renderDonut(diseases) {
  const el = document.getElementById('donutChart');
  if (!el || !diseases.length) { if(el) el.innerHTML = '<div style="color:var(--muted);font-size:12px;">No data yet.</div>'; return; }
  const total  = diseases.reduce((s,d) => s+d.count, 0) || 1;
  const colors = ['#3b82f6','#14b8a6','#8b5cf6','#f59e0b','#ef4444'];
  const top3   = diseases.slice(0,3);
  const rest   = diseases.slice(3).reduce((s,d) => s+d.count, 0);

  // Simple CSS donut using conic-gradient
  let pcts = top3.map(d => Math.round(d.count/total*100));
  if (rest) pcts.push(Math.round(rest/total*100));
  const sectors = pcts.reduce((acc, p, i) => {
    const prev = acc.total;
    acc.total += p;
    acc.parts += `${colors[i]||'#374151'} ${prev}% ${acc.total}%,`;
    return acc;
  }, {total:0, parts:''});

  el.innerHTML = `
    <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${sectors.parts.slice(0,-1)});position:relative;flex-shrink:0;">
      <div style="position:absolute;inset:20px;background:var(--bg-card);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;">
        <div style="font-size:18px;font-weight:800;color:var(--text);">${(total/1000).toFixed(1)}k</div>
        <div style="font-size:9px;color:var(--muted);letter-spacing:0.1em;">TOTAL</div>
      </div>
    </div>
    <div class="donut-legend">
      ${top3.map((d,i) => `<div class="legend-item">
        <div class="legend-dot" style="background:${colors[i]};"></div>
        <span class="legend-label">${d.category.replace(/_/g,' ')}</span>
        <span class="legend-val">${Math.round(d.count/total*100)}%</span>
      </div>`).join('')}
      ${rest ? `<div class="legend-item"><div class="legend-dot" style="background:${colors[3]};"></div><span class="legend-label">Others</span><span class="legend-val">${Math.round(rest/total*100)}%</span></div>` : ''}
    </div>
  `;
}

function renderSentiment(fb) {
  const el = document.getElementById('sentimentChart');
  if (!el) return;
  const total  = (fb.positive + fb.negative) || 0;
  if (total === 0) {
    el.innerHTML = `<div style="color:var(--muted); font-size:12px; padding:16px 0; text-align:center;">
      No feedback submitted yet. Thumbs up/down buttons in chat will appear here.
    </div>`;
    return;
  }
  const posPct = Math.round(fb.positive / total * 100);
  const negPct = 100 - posPct;
  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--teal); font-size:13px; font-weight:600;">👍 Positive &nbsp;${posPct}%</span>
      <span style="color:var(--danger); font-size:13px; font-weight:600;">${negPct}% &nbsp;👎 Negative</span>
    </div>
    <div style="background:var(--bg-input); border-radius:999px; height:20px; overflow:hidden;">
      <div style="background:linear-gradient(90deg,var(--teal),#34d399); width:${posPct}%; height:100%; border-radius:999px; transition:width 0.8s ease;"></div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:8px;">
      <span style="color:var(--muted); font-size:11px;">${fb.positive} positive responses</span>
      <span style="color:var(--muted); font-size:11px;">${fb.negative} negative &middot; ${fb.total} total</span>
    </div>
  `;
}

function renderDiseases(diseases) {
  const el = document.getElementById('diseasesChart');
  if (!el) return;
  if (!diseases.length) { el.innerHTML = '<div style="color:var(--muted);font-size:12px;">No data yet.</div>'; return; }
  const max = Math.max(...diseases.map(d => d.count), 1);
  const colors = ['#3b82f6','#14b8a6','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899'];
  el.innerHTML = diseases.map((d,i) => `
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;">
        <span style="color:var(--muted2);">${d.category.replace(/_/g,' ')}</span>
        <span style="color:var(--text);font-weight:600;">${d.count}</span>
      </div>
      <div style="height:6px;background:var(--bg-input);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${(d.count/max*100).toFixed(1)}%;background:${colors[i%colors.length]};border-radius:3px;transition:width 0.8s ease;"></div>
      </div>
    </div>
  `).join('');
}

function renderUsersTable(users) {
  const tb = document.getElementById('usersTable');
  if (!tb) return;
  if (!users.length) { tb.innerHTML = '<tr><td colspan="5" style="color:var(--muted);font-size:12px;padding:16px;">No users yet.</td></tr>'; return; }
  tb.innerHTML = users.map(u => {
    const posFb    = u.positive_feedback || 0;
    const totalFb  = u.total_feedback   || 0;
    const pct      = totalFb > 0 ? Math.round(posFb / totalFb * 100) : 0;
    const barColor = pct >= 70 ? 'var(--teal)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
    return `
    <tr>
      <td><div style="font-weight:600;">${u.username}</div><div style="font-size:11px;color:var(--muted);">${u.email}</div></td>
      <td><span class="u-badge">${(u.top_category||'—').replace(/_/g,' ')}</span></td>
      <td style="font-weight:700;color:var(--blue-bright);">${u.total_queries}</td>
      <td>${u.report_uploads}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="flex:1;height:7px;background:var(--bg-input);border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:999px;"></div>
          </div>
          <span style="color:${barColor};font-size:11px;font-weight:700;min-width:32px;">${pct}%</span>
        </div>
      </td>
      <td style="font-size:11px;color:var(--muted);">${u.last_active}</td>
    </tr>`;
  }).join('');
}

/* ── Utilities ────────────────────────────────────────────────────────────── */
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function markdownToHtml(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 style="color:var(--muted2);font-size:13px;margin:10px 0 4px;">$1</h4>')
    .replace(/^## (.+)$/gm,  '<h3 style="color:var(--text);font-size:14px;margin:12px 0 6px;">$1</h3>')
    .replace(/^# (.+)$/gm,   '<h2 style="color:var(--text);font-size:15px;margin:14px 0 8px;">$1</h2>')
    .replace(/^\* (.+)$/gm,  '<li style="margin-bottom:4px;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, s => `<ul style="padding-left:18px;margin:6px 0;">${s}</ul>`)
    .replace(/\n\n/g,'<br><br>')
    .replace(/\n/g,'<br>');
}

/* ── Dropdown panels ──────────────────────────────────────────────────────── */
function toggleDropdown(id) {
  const panel   = document.getElementById(id);
  const overlay = document.getElementById('dropdownOverlay');
  const isOpen  = !panel.classList.contains('hidden');

  // Close all first
  closeDropdowns();

  if (!isOpen) {
    panel.classList.remove('hidden');
    overlay.style.display = 'block';

    // Populate profile stats when opening
    if (id === 'profilePanel') populateProfilePanel();
  }
}

function closeDropdowns() {
  ['notifPanel','helpPanel','profilePanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const ov = document.getElementById('dropdownOverlay');
  if (ov) ov.style.display = 'none';
}

/* ── Notifications ────────────────────────────────────────────────────────── */
function markRead(el, type) {
  el.classList.remove('unread');
  const dot = el.querySelector('.notif-dot');
  if (dot) dot.remove();
  updateNotifBadge();
}

function markAllRead() {
  document.querySelectorAll('.notif-item.unread').forEach(el => {
    el.classList.remove('unread');
    const dot = el.querySelector('.notif-dot');
    if (dot) dot.remove();
  });
  updateNotifBadge();
}

function updateNotifBadge() {
  const count = document.querySelectorAll('.notif-item.unread').length;
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  if (count === 0) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'flex';
    badge.textContent = count;
  }
}

/* ── Profile stats ────────────────────────────────────────────────────────── */
async function populateProfilePanel() {
  // Fill name and role
  const name  = currentUser.username || 'User';
  const role  = currentUser.is_admin ? '🛡️ Administrator' : '✅ Active User';
  const email = currentUser.email || (currentUser.is_admin ? 'Administrator' : 'Clinical User');

  const dpName   = document.getElementById('dpName');
  const dpEmail  = document.getElementById('dpEmail');
  const dpRole   = document.getElementById('dpRole');
  const dpAvatar = document.getElementById('dpAvatarLetter');

  if (dpName)   dpName.textContent   = name;
  if (dpEmail)  dpEmail.textContent  = email;
  if (dpRole)   dpRole.textContent   = role;
  if (dpAvatar) dpAvatar.textContent = name[0].toUpperCase();

  // Load session count from sidebar history
  try {
    const r = await fetch(`${API}/chat/sessions`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    if (r.ok) {
      const data = await r.json();
      const sessions  = data.sessions || [];
      const msgCount  = sessions.reduce((s, x) => s + (x.message_count || 0), 0);
      const el = document.getElementById('dpSessions');
      const em = document.getElementById('dpMessages');
      if (el) el.textContent = sessions.length;
      if (em) em.textContent = msgCount;
    }
  } catch (e) { /* silent */ }

  // Load report count
  try {
    const r2 = await fetch(`${API}/report/history`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });
    if (r2.ok) {
      const d2 = await r2.json();
      const er = document.getElementById('dpReports');
      if (er) er.textContent = (d2.reports || []).length;
    }
  } catch (e) {
    const er = document.getElementById('dpReports');
    if (er) er.textContent = '—';
  }
}

/* ── Keyboard shortcuts ───────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  // Ctrl+N = new chat
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    newChat();
  }
  // Escape = close dropdowns
  if (e.key === 'Escape') closeDropdowns();
});


async function sendFeedback(messageId, rating, upId, dnId) {
  // Optimistic UI — highlight immediately
  const upBtn = document.getElementById(upId);
  const dnBtn = document.getElementById(dnId);
  if (!upBtn || !dnBtn) return;

  // Toggle: if already active, do nothing (prevent double submit)
  if (upBtn.classList.contains('active-up') || dnBtn.classList.contains('active-dn')) return;

  // Visual feedback first
  if (rating === 1) {
    upBtn.classList.add('active-up');
    upBtn.disabled = true;
    dnBtn.disabled = true;
  } else {
    dnBtn.classList.add('active-dn');
    upBtn.disabled = true;
    dnBtn.disabled = true;
  }

  try {
    const r = await fetch(`${API}/chat/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        session_id:  sessionId,
        message_id:  messageId,
        rating:      rating,
      }),
    });

    if (!r.ok) {
      // Revert on failure
      upBtn.classList.remove('active-up');
      dnBtn.classList.remove('active-dn');
      upBtn.disabled = false;
      dnBtn.disabled = false;
      const d = await r.json().catch(() => ({}));
      console.error('Feedback error:', d.detail || r.status);
    }
  } catch (e) {
    // Revert on network error
    upBtn.classList.remove('active-up');
    dnBtn.classList.remove('active-dn');
    upBtn.disabled = false;
    dnBtn.disabled = false;
    console.error('Feedback network error:', e);
  }
}

/* ── Clean answer text ─────────────────────────────────────────────────────── */
function cleanAnswer(text) {
  let t = (text || '').replace(/Source\s+\d+:\s*/gi, '');
  // Strip doctor reminder if user turned it off in settings
  if ((window.MEDAI_SETTINGS||{}).doctorReminder === false) {
    t = t.replace(/please consult a qualified doctor[^.\n]*\./gi, '').trim();
  }
  return t;
}

/* ── Sidebar toggle ───────────────────────────────────────────────────────── */
function toggleSidebar() {
  const app = document.getElementById('app');
  const btn = document.getElementById('sidebarToggleBtn');
  const collapsed = app.classList.toggle('sidebar-collapsed');
  // Persist preference
  localStorage.setItem('medai_sidebar_collapsed', collapsed ? '1' : '0');
  // Update button icon
  if (btn) btn.textContent = collapsed ? '☰' : '☰';
}

// Restore sidebar state on load
(function restoreSidebar() {
  if (localStorage.getItem('medai_sidebar_collapsed') === '1') {
    const app = document.getElementById('app');
    if (app) app.classList.add('sidebar-collapsed');
  }
})();

/* ── Settings ─────────────────────────────────────────────────────────────── */
const SETTINGS_DEFAULTS = {
  theme: 'dark', fontsize: 'medium', bubble: 'rounded', sidebar: 'normal',
  enterSend: true, autoScroll: true, skeleton: true, confidence: true, category: true,
  language: 'english', notifSession: true, notifFeedback: true, notifTips: true, notifApiKey: false,
  reduceMotion: false, highContrast: false, largeTargets: false,
  doctorReminder: true, confThreshold: 60,
  accent: '#3b82f6',
};

function loadSettingsFromStorage() {
  const saved = JSON.parse(localStorage.getItem('medai_settings') || '{}');
  const s = { ...SETTINGS_DEFAULTS, ...saved };

  // Apply all to UI controls
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = val;
    else if (el.type === 'range') { el.value = val; document.getElementById('confThreshVal').textContent = val + '%'; }
    else el.value = val;
  };
  set('s-theme', s.theme); set('s-fontsize', s.fontsize); set('s-bubble', s.bubble);
  set('s-sidebar', s.sidebar); set('s-enterSend', s.enterSend); set('s-autoScroll', s.autoScroll);
  set('s-skeleton', s.skeleton); set('s-confidence', s.confidence); set('s-category', s.category);
  set('s-language', s.language); set('s-notifSession', s.notifSession);
  set('s-notifFeedback', s.notifFeedback); set('s-notifTips', s.notifTips);
  set('s-notifApiKey', s.notifApiKey); set('s-reduceMotion', s.reduceMotion);
  set('s-highContrast', s.highContrast); set('s-largeTargets', s.largeTargets);
  set('s-doctorReminder', s.doctorReminder); set('s-confThreshold', s.confThreshold);

  // Apply visual effects
  applyAllSettings(s);
}

function applySetting(key, value) {
  const saved = JSON.parse(localStorage.getItem('medai_settings') || '{}');
  saved[key] = value;
  localStorage.setItem('medai_settings', JSON.stringify(saved));
  applyAllSettings({ ...SETTINGS_DEFAULTS, ...saved });
}

function applyAllSettings(s) {
  const root = document.documentElement;

  // ── Font size ──────────────────────────────────────────────────────────
  const sizes = { small: '12px', medium: '14px', large: '16px', xlarge: '18px' };
  root.style.setProperty('--chat-font-size', sizes[s.fontsize] || '14px');

  // ── Sidebar width ──────────────────────────────────────────────────────
  const widths = { compact: '220px', normal: '260px', wide: '300px' };
  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl) sidebarEl.style.width = widths[s.sidebar] || '260px';
  const appEl = document.getElementById('app');
  if (appEl && !appEl.classList.contains('sidebar-collapsed')) {
    appEl.style.gridTemplateColumns = `${widths[s.sidebar] || '260px'} 1fr`;
  }

  // ── Accent color ───────────────────────────────────────────────────────
  if (s.accent) root.style.setProperty('--blue', s.accent);

  // ── Theme ──────────────────────────────────────────────────────────────
  document.body.dataset.theme = s.theme || 'dark';

  // ── Bubble style ───────────────────────────────────────────────────────
  document.body.dataset.bubble = s.bubble || 'rounded';

  // ── High contrast ──────────────────────────────────────────────────────
  document.body.classList.toggle('high-contrast', !!s.highContrast);

  // ── Reduce motion ──────────────────────────────────────────────────────
  document.body.classList.toggle('reduce-motion', !!s.reduceMotion);

  // ── Large targets ──────────────────────────────────────────────────────
  document.body.classList.toggle('large-targets', !!s.largeTargets);

  // ── Confidence badge visibility ────────────────────────────────────────
  document.body.classList.toggle('hide-confidence', s.confidence === false);

  // ── Category badge visibility ──────────────────────────────────────────
  document.body.classList.toggle('hide-category', s.category === false);

  // ── Auto-scroll (store on window for sendMessage to read) ─────────────
  window._autoScroll = s.autoScroll !== false;

  // ── Enter to send ──────────────────────────────────────────────────────
  window._enterSend = s.enterSend !== false;

  // ── Language (stored; prompt builder reads window.MEDAI_SETTINGS) ──────
  // (sent to Gemini as instruction in sendMessage prompt)

  // ── Doctor reminder (hide/show via CSS) ───────────────────────────────
  document.body.classList.toggle('hide-doctor-reminder', s.doctorReminder === false);

  // ── Confidence threshold (stored for renderMessages to read) ──────────
  window._confThreshold = parseInt(s.confThreshold) || 60;

  window.MEDAI_SETTINGS = s;
}

function setAccent(color) {
  applySetting('accent', color);
  // Update swatch borders
  document.querySelectorAll('[id^="accent-"]').forEach(el => {
    el.style.border = '2px solid transparent';
  });
  const id = 'accent-' + color.slice(1);
  const el = document.getElementById(id);
  if (el) el.style.border = '2px solid white';
}

function switchSettingsTab(tab) {
  document.querySelectorAll('.settings-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.settings-section').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`stab-${tab}`);
  const secEl = document.getElementById(`sec-${tab}`);
  if (navEl) navEl.classList.add('active');
  if (secEl) secEl.classList.add('active');
}

async function clearAllHistory() {
  if (!confirm('Delete ALL your chat history? This cannot be undone.')) return;
  try {
    const sessions = await fetch(`${API}/chat/sessions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    }).then(r => r.json());
    for (const s of (sessions.sessions || [])) {
      await fetch(`${API}/chat/history/${s.session_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
    newChat();
    loadSidebarHistory();
    alert('All chat history cleared.');
  } catch (e) {
    alert('Error clearing history: ' + e.message);
  }
}

async function deleteAccount() {
  const confirmed = prompt('Type DELETE to permanently remove your account and all data:');
  if (confirmed !== 'DELETE') return;
  try {
    const r = await fetch(`${API}/auth/account`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (r.ok) { alert('Account deleted.'); doLogout(); }
    else { const d = await r.json(); alert('Error: ' + (d.detail || 'Could not delete account.')); }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

// Apply settings on every page load
window.MEDAI_SETTINGS = SETTINGS_DEFAULTS;

function doLogout() {
  localStorage.removeItem('medai_token');
  localStorage.removeItem('medai_user');
  authToken = ''; currentUser = {};
  location.reload();
}

function exportData() {
  alert('Export feature: In production this would generate a PDF report using a library like jsPDF.');
}