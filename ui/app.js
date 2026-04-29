/* app.js — MedAI Core SPA */

function getAppHTML() {
  const isAdmin = currentUser.is_admin;
  return `
  <style>
    /* ── App shell ───────────────────────────────────────────────────────────── */
    #app { display:grid; grid-template-columns:260px 1fr; height:100vh; font-family:'Sora',sans-serif; background:var(--bg-deep); }

    /* ── Sidebar ─────────────────────────────────────────────────────────────── */
    .sidebar {
      background: #0d1220;
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      padding: 0;
    }

    .sidebar-brand {
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-brand .b-title { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
    .sidebar-brand .b-sub   { font-size: 11px; color: var(--muted); margin-top: 2px; }

    .sidebar-search {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
    }
    .search-input-wrap { position: relative; }
    .search-input-wrap input {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 12px 8px 34px;
      font-size: 12px;
      font-family: 'Sora', sans-serif;
      color: var(--text);
      outline: none;
    }
    .search-input-wrap input::placeholder { color: var(--muted); }
    .search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:13px; color:var(--muted); pointer-events:none; }

    .sidebar-nav { flex:1; padding: 12px 8px; overflow-y: auto; }
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
    .export-btn {
      display: flex; align-items: center; gap: 8px;
      background: var(--blue); color: white;
      border: none; border-radius: 10px;
      padding: 9px 16px; font-size: 12px; font-weight: 600;
      font-family: 'Sora', sans-serif; cursor: pointer;
      transition: background 0.2s;
    }
    .export-btn:hover { background: #2563eb; }

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
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="sidebar-brand">
        <div class="b-title">MedAI Core</div>
        <div class="b-sub">Clinical Decision Support</div>
      </div>
      <div class="sidebar-search">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search analytics, logs, or users…">
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-item active" onclick="showPage('chat')" id="nav-chat">
          <span class="nav-icon">💬</span> Chat
        </div>
        <div class="nav-item" onclick="showPage('report')" id="nav-report">
          <span class="nav-icon">📊</span> Report Analyzer
        </div>
        ${currentUser.is_admin ? `<div class="nav-item" onclick="showPage('admin')" id="nav-admin">
          <span class="nav-icon">🎛</span> Admin Dashboard
        </div>` : ''}
        <div class="nav-item" style="margin-top:8px;">
          <span class="nav-icon">⚙</span> Settings
        </div>
        <div class="nav-item" onclick="">
          <span class="nav-icon">❓</span> Support
        </div>
      </nav>
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
          <div class="icon-btn" title="Notifications">🔔</div>
          <div class="icon-btn" title="Help">❓</div>
          <div class="icon-btn" title="Profile">👤</div>
          <div style="width:1px; height:24px; background:var(--border); margin:0 4px;"></div>
          <button class="export-btn" onclick="exportData()">⬇ Export PDF</button>
        </div>
      </div>

      <!-- Pages -->
      <!-- Chat -->
      <div class="page active" id="page-chat" style="display:flex; flex-direction:column; height:calc(100vh - 60px);">
        <div class="session-header">
          <span class="session-id" id="sessionIdLabel">Session: loading…</span>
          <button class="new-chat-btn" onclick="newChat()">+ New Chat</button>
        </div>
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
  updateSessionLabel();
  loadPastSessions();
  loadPastReports();
  if (currentUser.is_admin) loadAdminData();
}

/* ── Navigation ───────────────────────────────────────────────────────────── */
const PAGE_META = {
  chat:   { title:'Clinical Chat', sub:'AI-powered medical question answering' },
  report: { title:'Report Analyzer', sub:'Upload and interpret medical documents with AI' },
  admin:  { title:'System Overview', sub:'Real-time performance and clinical engagement metrics.' },
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
  if (page === 'report') { document.getElementById(`page-${page}`).style.display = 'block'; loadPastReports(); }
  if (page === 'admin' && currentUser.is_admin) { document.getElementById(`page-${page}`).style.display = 'block'; loadAdminData(); }
}

/* ── Chat ─────────────────────────────────────────────────────────────────── */
function updateSessionLabel() {
  const el = document.getElementById('sessionIdLabel');
  if (el) el.textContent = `Session: ${sessionId}`;
}

function newChat() {
  sessionId = generateId();
  messages  = [];
  updateSessionLabel();
  renderMessages();
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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
      body: JSON.stringify({ question:q, session_id:sessionId })
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
            ${cat ? `<span class="cat-badge ${lowWarn?'warn':''}}">${cat}</span>` : ''}
            ${conf > 0 ? `<span class="conf-label">${conf}% confidence</span>` : ''}
            ${mid ? `
              <button class="fb-btn" id="up_${mid}" onclick="sendFeedback(${mid},1,'up_${mid}','dn_${mid}')">👍</button>
              <button class="fb-btn" id="dn_${mid}" onclick="sendFeedback(${mid},-1,'up_${mid}','dn_${mid}')">👎</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
  chatEl.scrollTop = chatEl.scrollHeight;
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
            ${conf > 0 ? `<span class="conf-label">${conf}% confidence</span>` : ''}
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
async function loadPastSessions() {
  // Sessions displayed in sidebar search area - kept minimal for the design
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
  const total  = (fb.positive + fb.negative) || 1;
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
      <span style="color:var(--muted); font-size:11px;">${fb.negative} negative · ${fb.total} total</span>
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

function doLogout() {
  localStorage.removeItem('medai_token');
  localStorage.removeItem('medai_user');
  authToken = ''; currentUser = {};
  location.reload();
}

function exportData() {
  alert('Export feature: In production this would generate a PDF report using a library like jsPDF.');
}
