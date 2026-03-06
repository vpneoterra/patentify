#!/usr/bin/env python3
"""Build the Patent Ideation Lab single-file HTML dashboard."""
import json

with open('/home/user/workspace/ipco-merged/patent-lab/patent_data_normalized.json', 'r') as f:
    data_json = f.read()

html = '''<!--
   ______                            __
  / ____/___  ____ ___  ____  __  __/ /____  _____
 / /   / __ \\/ __ `__ \\/ __ \\/ / / / __/ _ \\/ ___/
/ /___/ /_/ / / / / / / /_/ / /_/ / /_/  __/ /
\\____/\\____/_/ /_/ /_/ .___/\\__,_/\\__/\\___/_/
                    /_/
-->
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IPCo Patent Ideation Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<style>
/* ═══════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════ */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root {
  --font-display: 'DM Serif Display', serif;
  --font-body: 'DM Sans', sans-serif;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --dur: 300ms;
  --dur-slow: 500ms;
  --radius-sm: 6px;
  --radius: 10px;
  --radius-lg: 16px;
  --teal: #2E8B7A;
  --blue: #2563EB;
  --amber: #D4A017;
  --green: #22C55E;
  --yellow: #EAB308;
  --red: #EF4444;
}

[data-theme="dark"] {
  --bg: #000000;
  --bg-surface: #0A0A0A;
  --bg-card: #141414;
  --bg-hover: #1A1A1A;
  --bg-elevated: #1E1E1E;
  --border: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.15);
  --text: #F1F5F9;
  --text-secondary: #CBD5E1;
  --text-muted: #94A3B8;
  --text-faint: #64748B;
  --shadow: 0 1px 3px rgba(0,0,0,0.5);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.6);
  --glow-teal: rgba(46,139,122,0.12);
  --glow-blue: rgba(37,99,235,0.10);
  --sunburst-bg: #080808;
  --kpi-bg: linear-gradient(135deg, #0A0A0A 0%, #111111 100%);
  --drawer-bg: #0C0C0C;
  --tab-active: rgba(46,139,122,0.15);
  --scrollbar-thumb: #333;
  --scrollbar-track: transparent;
}

[data-theme="light"] {
  --bg: #FFFFFF;
  --bg-surface: #F8F8F8;
  --bg-card: #FFFFFF;
  --bg-hover: #F0F0F0;
  --bg-elevated: #FFFFFF;
  --border: rgba(0,0,0,0.08);
  --border-strong: rgba(0,0,0,0.15);
  --text: #0F172A;
  --text-secondary: #334155;
  --text-muted: #64748B;
  --text-faint: #94A3B8;
  --shadow: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  --glow-teal: rgba(46,139,122,0.08);
  --glow-blue: rgba(37,99,235,0.06);
  --sunburst-bg: #F4F4F4;
  --kpi-bg: linear-gradient(135deg, #FFFFFF 0%, #F8F8FA 100%);
  --drawer-bg: #FAFAFA;
  --tab-active: rgba(46,139,122,0.10);
  --scrollbar-thumb: #CCC;
  --scrollbar-track: transparent;
}

html, body {
  height: 100%;
  overflow: hidden;
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums lining-nums;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }

/* ═══════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════ */
.app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

/* ─── HEADER BAR ─── */
.header-bar {
  height: 48px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-mark {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-mark svg { width: 22px; height: 22px; }

.logo-label {
  font-family: var(--font-display);
  font-size: 15px;
  color: var(--text);
  letter-spacing: -0.02em;
}

.header-divider {
  width: 1px;
  height: 20px;
  background: var(--border-strong);
}

.page-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--dur) var(--ease);
}
.theme-toggle:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.theme-toggle svg { width: 16px; height: 16px; }

/* ─── MAIN CONTENT ─── */
.main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 0;
}

/* ─── KPI STRIP ─── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border-bottom: 1px solid var(--border);
}

.kpi-card {
  background: var(--kpi-bg);
  padding: 18px 24px;
  position: relative;
  overflow: hidden;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
}

.kpi-card:nth-child(1)::before { background: var(--teal); }
.kpi-card:nth-child(2)::before { background: var(--green); }
.kpi-card:nth-child(3)::before { background: var(--blue); }
.kpi-card:nth-child(4)::before { background: var(--amber); }

.kpi-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.1;
}

.kpi-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* ─── VIZ + FILTER ROW ─── */
.viz-row {
  display: grid;
  grid-template-columns: 340px 1fr;
  border-bottom: 1px solid var(--border);
  min-height: 300px;
  max-height: 340px;
}

.sunburst-panel {
  background: var(--sunburst-bg);
  border-right: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: relative;
}

.sunburst-panel .panel-label {
  position: absolute;
  top: 12px;
  left: 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.timeline-panel {
  background: var(--bg-surface);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
}

.timeline-panel .panel-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;
}

/* ─── FILTER BAR ─── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.filter-search {
  flex: 1;
  min-width: 200px;
  max-width: 360px;
  position: relative;
}

.filter-search input {
  width: 100%;
  height: 34px;
  padding: 0 12px 0 34px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text);
  font-family: var(--font-body);
  font-size: 13px;
  outline: none;
  transition: border-color var(--dur) var(--ease);
}

.filter-search input:focus {
  border-color: var(--teal);
}

.filter-search input::placeholder {
  color: var(--text-faint);
}

.filter-search svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-faint);
}

.filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.chip:hover {
  border-color: var(--text-faint);
  color: var(--text-secondary);
}

.chip.active {
  background: var(--teal);
  border-color: var(--teal);
  color: #fff;
}

.chip .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.chip .dot.g { background: var(--green); }
.chip .dot.y { background: var(--yellow); }
.chip .dot.r { background: var(--red); }

.filter-count {
  font-size: 12px;
  color: var(--text-faint);
  margin-left: auto;
  white-space: nowrap;
}

/* ─── WHITESPACE GRID ─── */
.ws-grid-section {
  padding: 20px 24px;
}

.ws-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.ws-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
  position: relative;
  overflow: hidden;
}

.ws-card:hover {
  border-color: var(--border-strong);
  background: var(--bg-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

.ws-card.expanded {
  grid-column: 1 / -1;
  background: var(--bg-surface);
  border-color: var(--teal);
  transform: none;
  cursor: default;
}

.ws-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.ws-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.35;
}

.ws-card .ws-score-badge {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--glow-teal);
  color: var(--teal);
  border: 1px solid rgba(46,139,122,0.25);
}

.ws-card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.ws-fto-dots {
  display: flex;
  gap: 3px;
  align-items: center;
}

.ws-fto-dots .d {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.ws-sparkline {
  height: 24px;
  width: 100%;
}

.ws-sparkline polyline {
  fill: none;
  stroke: var(--teal);
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ─── EXPANDED WHITESPACE IDEAS ─── */
.ws-ideas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.idea-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 14px;
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.idea-card:hover {
  border-color: var(--teal);
  background: var(--bg-hover);
}

.idea-card-top {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.idea-fto-badge {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}

.idea-fto-badge.GREEN { background: rgba(34,197,94,0.15); color: var(--green); }
.idea-fto-badge.YELLOW { background: rgba(234,179,8,0.15); color: var(--yellow); }
.idea-fto-badge.RED { background: rgba(239,68,68,0.15); color: var(--red); }

.idea-card-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.35;
  flex: 1;
}

.idea-card-stats {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
}

.idea-card-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.idea-stat-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--teal);
}

/* ─── DETAIL DRAWER ─── */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 900;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur) var(--ease);
}

.drawer-overlay.open {
  opacity: 1;
  pointer-events: all;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(680px, 90vw);
  background: var(--drawer-bg);
  z-index: 950;
  transform: translateX(100%);
  transition: transform var(--dur-slow) var(--ease);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border);
  box-shadow: -8px 0 32px rgba(0,0,0,0.3);
}

.drawer.open {
  transform: translateX(0);
}

.drawer-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-shrink: 0;
}

.drawer-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--dur) var(--ease);
}

.drawer-close:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.drawer-title-area { flex: 1; min-width: 0; }

.drawer-title {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--text);
  line-height: 1.3;
  margin-bottom: 6px;
}

.drawer-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.03em;
}

.badge-fto.GREEN { background: rgba(34,197,94,0.12); color: var(--green); }
.badge-fto.YELLOW { background: rgba(234,179,8,0.12); color: var(--yellow); }
.badge-fto.RED { background: rgba(239,68,68,0.12); color: var(--red); }
.badge-filing { background: var(--glow-blue); color: var(--blue); }
.badge-value { background: rgba(212,160,23,0.12); color: var(--amber); }
.badge-thicket { background: rgba(148,163,184,0.1); color: var(--text-muted); }

/* ─── DRAWER TABS ─── */
.drawer-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.drawer-tab {
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--dur) var(--ease);
  font-family: var(--font-body);
}

.drawer-tab:hover {
  color: var(--text-secondary);
  background: var(--bg-hover);
}

.drawer-tab.active {
  color: var(--teal);
  border-bottom-color: var(--teal);
  background: var(--tab-active);
}

/* ─── DRAWER BODY ─── */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px;
}

.drawer-section {
  margin-bottom: 24px;
}

.drawer-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.drawer-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.drawer-text {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
}

.drawer-text p { margin-bottom: 10px; }
.drawer-text p:last-child { margin-bottom: 0; }

/* Claim text */
.claim-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--teal);
}

.dep-claims-list {
  list-style: none;
  counter-reset: dep;
}

.dep-claims-list li {
  counter-increment: dep;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  padding: 10px 12px 10px 36px;
  position: relative;
  border-bottom: 1px solid var(--border);
}

.dep-claims-list li:last-child { border-bottom: none; }

.dep-claims-list li::before {
  content: counter(dep) ".";
  position: absolute;
  left: 12px;
  top: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-faint);
}

/* Prior art table */
.pa-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.pa-table th {
  text-align: left;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 10px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-strong);
  position: sticky;
  top: 0;
  background: var(--drawer-bg);
}

.pa-table td {
  padding: 10px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
  color: var(--text-secondary);
  line-height: 1.5;
}

.pa-table tr:last-child td { border-bottom: none; }

.pa-ref-name {
  font-weight: 500;
  color: var(--text);
  margin-bottom: 2px;
}

/* Radar chart */
.radar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}

.radar-container svg text {
  font-family: var(--font-body);
  fill: var(--text-muted);
}

/* Filing strategy */
.filing-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.filing-info-item {
  padding: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.filing-info-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 4px;
}

.filing-info-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.chokepoint-box {
  padding: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ─── TIMELINE VIZ ─── */
.timeline-viz {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.timeline-lanes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  flex: 1;
}

.timeline-lane {
  display: flex;
  flex-direction: column;
}

.lane-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.lane-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
}

.lane-count {
  font-size: 11px;
  color: var(--text-faint);
  background: var(--bg-card);
  padding: 1px 7px;
  border-radius: 10px;
}

.lane-bar {
  height: 6px;
  border-radius: 3px;
  margin-bottom: 8px;
  position: relative;
  overflow: hidden;
  background: var(--bg-card);
}

.lane-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 1s var(--ease);
}

.lane-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  overflow-y: auto;
  max-height: 180px;
  overscroll-behavior: contain;
}

.lane-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  cursor: pointer;
  transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}

.lane-dot:hover {
  transform: scale(1.8);
  z-index: 2;
}

.lane-dot.GREEN { background: var(--green); }
.lane-dot.YELLOW { background: var(--yellow); }
.lane-dot.RED { background: var(--red); }

/* ─── FOOTER ─── */
.footer {
  padding: 12px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
  text-align: center;
  flex-shrink: 0;
}

.footer a {
  font-size: 11px;
  color: var(--text-faint);
  text-decoration: none;
  transition: color var(--dur) var(--ease);
}

.footer a:hover {
  color: var(--text-muted);
}

/* ─── RESPONSIVE ─── */
@media (max-width: 1024px) {
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .viz-row { grid-template-columns: 1fr; max-height: none; }
  .sunburst-panel { min-height: 260px; }
}

@media (max-width: 768px) {
  .kpi-strip { grid-template-columns: 1fr 1fr; }
  .kpi-value { font-size: 22px; }
  .ws-grid { grid-template-columns: 1fr; }
  .drawer { width: 100vw; }
  .filter-bar { padding: 10px 16px; }
  .ws-grid-section { padding: 16px; }
  .filing-info { grid-template-columns: 1fr; }
}

/* ─── ANIMATIONS ─── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.ws-card {
  animation: fadeIn 0.4s var(--ease) both;
}

.ws-grid .ws-card:nth-child(1) { animation-delay: 0ms; }
.ws-grid .ws-card:nth-child(2) { animation-delay: 30ms; }
.ws-grid .ws-card:nth-child(3) { animation-delay: 60ms; }
.ws-grid .ws-card:nth-child(4) { animation-delay: 90ms; }
.ws-grid .ws-card:nth-child(5) { animation-delay: 120ms; }
.ws-grid .ws-card:nth-child(6) { animation-delay: 150ms; }
.ws-grid .ws-card:nth-child(7) { animation-delay: 180ms; }
.ws-grid .ws-card:nth-child(8) { animation-delay: 210ms; }
.ws-grid .ws-card:nth-child(9) { animation-delay: 240ms; }
.ws-grid .ws-card:nth-child(10) { animation-delay: 270ms; }
.ws-grid .ws-card:nth-child(11) { animation-delay: 300ms; }
.ws-grid .ws-card:nth-child(12) { animation-delay: 330ms; }
.ws-grid .ws-card:nth-child(13) { animation-delay: 360ms; }
.ws-grid .ws-card:nth-child(14) { animation-delay: 390ms; }
.ws-grid .ws-card:nth-child(15) { animation-delay: 420ms; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Tooltip */
.tooltip {
  position: fixed;
  pointer-events: none;
  z-index: 2000;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  transition: opacity 0.15s;
  max-width: 280px;
  line-height: 1.4;
}

.tooltip.show { opacity: 1; }

/* content-visibility for perf */
.ws-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 140px;
}
</style>
</head>
<body>
<div class="app">
  <!-- HEADER -->
  <div class="header-bar">
    <div class="header-left">
      <div class="logo-mark">
        <svg viewBox="0 0 24 24" fill="none" aria-label="IPCo Logo">
          <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" stroke-width="1.5"/>
          <path d="M7 7h2v10H7V7zm4 0h4a3 3 0 010 6h-4V7zm2 2v2h2a1 1 0 000-2h-2z" fill="currentColor"/>
        </svg>
        <span class="logo-label">IPCo</span>
      </div>
      <div class="header-divider"></div>
      <span class="page-title">Patent Ideation Lab</span>
    </div>
    <div class="header-right">
      <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>
      </button>
    </div>
  </div>

  <!-- MAIN SCROLLABLE -->
  <div class="main" id="mainContent">
    <!-- KPI STRIP -->
    <div class="kpi-strip">
      <div class="kpi-card">
        <div class="kpi-label">Patent Ideas</div>
        <div class="kpi-value" id="kpiTotal">0</div>
        <div class="kpi-sub">Across 15 whitespaces</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Green FTO</div>
        <div class="kpi-value" id="kpiGreen">0</div>
        <div class="kpi-sub">Freedom to operate</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Immediate Filings</div>
        <div class="kpi-value" id="kpiImmediate">0</div>
        <div class="kpi-sub">Priority applications</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Portfolio Value</div>
        <div class="kpi-value" id="kpiValue">$0</div>
        <div class="kpi-sub">Estimated midpoint</div>
      </div>
    </div>

    <!-- VIZ ROW: Sunburst + Timeline -->
    <div class="viz-row">
      <div class="sunburst-panel">
        <span class="panel-label">Portfolio Sunburst</span>
        <div id="sunburstChart"></div>
      </div>
      <div class="timeline-panel">
        <span class="panel-label">Filing Priority Timeline</span>
        <div class="timeline-viz" id="timelineViz"></div>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div class="filter-bar">
      <div class="filter-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" id="searchInput" placeholder="Search ideas, whitespaces, claims...">
      </div>
      <div class="filter-chips">
        <button class="chip active" data-filter="all">All</button>
        <button class="chip" data-filter="GREEN"><span class="dot g"></span>Green FTO</button>
        <button class="chip" data-filter="YELLOW"><span class="dot y"></span>Yellow FTO</button>
        <button class="chip" data-filter="IMMEDIATE">Immediate</button>
        <button class="chip" data-filter="Q2 2026">Q2 2026</button>
        <button class="chip" data-filter="Q3-Q4 2026">Q3-Q4</button>
        <button class="chip" data-filter="high-score">Score 8.5+</button>
      </div>
      <span class="filter-count" id="filterCount">15 whitespaces · 105 ideas</span>
    </div>

    <!-- WHITESPACE GRID -->
    <div class="ws-grid-section">
      <div class="ws-grid" id="wsGrid"></div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
  </div>
</div>

<!-- DRAWER OVERLAY -->
<div class="drawer-overlay" id="drawerOverlay"></div>

<!-- DETAIL DRAWER -->
<div class="drawer" id="drawer">
  <div class="drawer-header">
    <button class="drawer-close" id="drawerClose" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
    <div class="drawer-title-area">
      <div class="drawer-title" id="drawerTitle"></div>
      <div class="drawer-badges" id="drawerBadges"></div>
    </div>
  </div>
  <div class="drawer-tabs" id="drawerTabs">
    <button class="drawer-tab active" data-tab="overview">Overview</button>
    <button class="drawer-tab" data-tab="claims">Claims</button>
    <button class="drawer-tab" data-tab="prior-art">Prior Art</button>
    <button class="drawer-tab" data-tab="fto">FTO</button>
    <button class="drawer-tab" data-tab="scoring">Scoring</button>
    <button class="drawer-tab" data-tab="filing">Filing</button>
    <button class="drawer-tab" data-tab="notes">Notes</button>
  </div>
  <div class="drawer-body" id="drawerBody"></div>
</div>

<!-- TOOLTIP -->
<div class="tooltip" id="tooltip"></div>

<script>
// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════
const DATA = ''' + data_json + ''';

const WS = DATA.ws;
const IDEAS = DATA.ideas;
const META = DATA.meta;

// Build lookup maps
const ideaMap = new Map();
IDEAS.forEach(i => ideaMap.set(i.id, i));
const wsMap = new Map();
WS.forEach(w => wsMap.set(w.id, w));

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let state = {
  filter: 'all',
  search: '',
  expandedWs: null,
  openIdea: null,
  drawerTab: 'overview'
};

// ═══════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
  // Re-render sunburst with new colors
  renderSunburst();
}

// ═══════════════════════════════════════════
// KPI ANIMATION
// ═══════════════════════════════════════════
function animateValue(el, end, prefix, suffix) {
  prefix = prefix || '';
  suffix = suffix || '';
  const dur = 1200;
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const t = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = Math.round(from + (end - from) * ease);
    el.textContent = prefix + val.toLocaleString() + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initKPIs() {
  animateValue(document.getElementById('kpiTotal'), META.total, '', '');
  animateValue(document.getElementById('kpiGreen'), META.green, '', '');
  animateValue(document.getElementById('kpiImmediate'), META.immediate, '', '');
  
  const valB = (META.portfolio / 1000).toFixed(1);
  const el = document.getElementById('kpiValue');
  animateValue(el, Math.round(META.portfolio), '$', 'M');
  setTimeout(() => {
    el.textContent = '$' + valB + 'B';
  }, 1300);
}

// ═══════════════════════════════════════════
// SUNBURST
// ═══════════════════════════════════════════
function renderSunburst() {
  const container = document.getElementById('sunburstChart');
  container.innerHTML = '';
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const size = Math.min(container.parentElement.clientWidth - 32, container.parentElement.clientHeight - 48, 280);
  const radius = size / 2;
  
  // Build hierarchy
  const root = {
    name: 'Portfolio',
    children: WS.map(ws => ({
      name: ws.name,
      wsId: ws.id,
      children: ws.ideas.map(id => {
        const idea = ideaMap.get(id);
        return {
          name: idea ? idea.title : '',
          value: 1,
          fto: idea ? idea.fto : 'GREEN',
          ideaId: id
        };
      })
    }))
  };
  
  const hierarchy = d3.hierarchy(root)
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);
  
  const partition = d3.partition()
    .size([2 * Math.PI, radius]);
  
  partition(hierarchy);
  
  const ftoColor = d => {
    if (d.data.fto === 'GREEN') return '#22C55E';
    if (d.data.fto === 'YELLOW') return '#EAB308';
    if (d.data.fto === 'RED') return '#EF4444';
    // Whitespace ring
    const ws = wsMap.get(d.data.wsId);
    if (ws) {
      const ratio = ws.green / (ws.green + ws.yellow + 0.01);
      return d3.interpolateRgb('#EAB308', '#22C55E')(ratio);
    }
    return isDark ? '#2E8B7A' : '#2E8B7A';
  };
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', size)
    .attr('height', size)
    .append('g')
    .attr('transform', `translate(${radius},${radius})`);
  
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(0.005)
    .padRadius(radius / 2)
    .innerRadius(d => d.y0 * 0.6)
    .outerRadius(d => d.y1 * 0.6 - 1);
  
  svg.selectAll('path')
    .data(hierarchy.descendants().filter(d => d.depth > 0))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => ftoColor(d.data))
    .attr('fill-opacity', d => d.depth === 1 ? 0.7 : 0.9)
    .attr('stroke', isDark ? '#000' : '#fff')
    .attr('stroke-width', 0.5)
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this).attr('fill-opacity', 1);
      const name = d.data.name;
      const tt = document.getElementById('tooltip');
      tt.textContent = name.length > 60 ? name.substring(0, 57) + '...' : name;
      tt.classList.add('show');
      tt.style.left = event.clientX + 12 + 'px';
      tt.style.top = event.clientY - 10 + 'px';
    })
    .on('mousemove', function(event) {
      const tt = document.getElementById('tooltip');
      tt.style.left = event.clientX + 12 + 'px';
      tt.style.top = event.clientY - 10 + 'px';
    })
    .on('mouseout', function(event, d) {
      d3.select(this).attr('fill-opacity', d.depth === 1 ? 0.7 : 0.9);
      document.getElementById('tooltip').classList.remove('show');
    })
    .on('click', function(event, d) {
      if (d.depth === 2 && d.data.ideaId) {
        openDrawer(d.data.ideaId);
      } else if (d.depth === 1 && d.data.wsId) {
        expandWhitespace(d.data.wsId);
      }
    });
  
  // Center label
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.3em')
    .attr('fill', isDark ? '#94A3B8' : '#64748B')
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .text('105 IDEAS');
  
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '1em')
    .attr('fill', isDark ? '#64748B' : '#94A3B8')
    .attr('font-size', '10px')
    .text('15 Whitespaces');
}

// ═══════════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════════
function renderTimeline() {
  const container = document.getElementById('timelineViz');
  const lanes = [
    { key: 'IMMEDIATE', label: 'Immediate', color: 'var(--blue)' },
    { key: 'Q2 2026', label: 'Q2 2026', color: 'var(--teal)' },
    { key: 'Q3-Q4 2026', label: 'Q3-Q4 2026', color: 'var(--amber)' }
  ];
  
  const maxCount = Math.max(...lanes.map(l => IDEAS.filter(i => i.filing === l.key).length));
  
  let html = '<div class="timeline-lanes">';
  lanes.forEach(lane => {
    const ideas = IDEAS.filter(i => i.filing === lane.key);
    const pct = (ideas.length / maxCount * 100).toFixed(0);
    html += '<div class="timeline-lane">';
    html += `<div class="lane-header"><span class="lane-label">${lane.label}</span><span class="lane-count">${ideas.length}</span></div>`;
    html += `<div class="lane-bar"><div class="lane-bar-fill" style="width:${pct}%;background:${lane.color}"></div></div>`;
    html += '<div class="lane-dots">';
    ideas.forEach(idea => {
      html += `<div class="lane-dot ${idea.fto}" data-idea-id="${idea.id}" title="${idea.title.substring(0, 50)}"></div>`;
    });
    html += '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
  
  container.querySelectorAll('.lane-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      openDrawer(parseInt(dot.dataset.ideaId));
    });
    dot.addEventListener('mouseover', (e) => {
      const idea = ideaMap.get(parseInt(dot.dataset.ideaId));
      if (idea) {
        const tt = document.getElementById('tooltip');
        tt.textContent = idea.title.length > 60 ? idea.title.substring(0, 57) + '...' : idea.title;
        tt.classList.add('show');
        tt.style.left = e.clientX + 12 + 'px';
        tt.style.top = e.clientY - 10 + 'px';
      }
    });
    dot.addEventListener('mouseout', () => {
      document.getElementById('tooltip').classList.remove('show');
    });
  });
}

// ═══════════════════════════════════════════
// WHITESPACE GRID
// ═══════════════════════════════════════════
function getFilteredWS() {
  return WS.filter(ws => {
    const ideas = ws.ideas.map(id => ideaMap.get(id)).filter(Boolean);
    return getFilteredIdeasForWS(ws).length > 0;
  });
}

function getFilteredIdeasForWS(ws) {
  let ideas = ws.ideas.map(id => ideaMap.get(id)).filter(Boolean);
  
  if (state.filter === 'GREEN' || state.filter === 'YELLOW' || state.filter === 'RED') {
    ideas = ideas.filter(i => i.fto === state.filter);
  } else if (state.filter === 'IMMEDIATE' || state.filter === 'Q2 2026' || state.filter === 'Q3-Q4 2026') {
    ideas = ideas.filter(i => i.filing === state.filter);
  } else if (state.filter === 'high-score') {
    ideas = ideas.filter(i => i.ps.overall >= 8.5);
  }
  
  if (state.search) {
    const q = state.search.toLowerCase();
    ideas = ideas.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q) ||
      i.claim.toLowerCase().includes(q)
    );
  }
  
  return ideas;
}

function renderWSGrid() {
  const grid = document.getElementById('wsGrid');
  const filtered = getFilteredWS();
  
  // Count total filtered ideas
  let totalFilteredIdeas = 0;
  filtered.forEach(ws => {
    totalFilteredIdeas += getFilteredIdeasForWS(ws).length;
  });
  
  document.getElementById('filterCount').textContent =
    `${filtered.length} whitespace${filtered.length !== 1 ? 's' : ''} · ${totalFilteredIdeas} idea${totalFilteredIdeas !== 1 ? 's' : ''}`;
  
  let html = '';
  filtered.forEach(ws => {
    const isExpanded = state.expandedWs === ws.id;
    const ideas = getFilteredIdeasForWS(ws);
    
    // Sparkline data
    const scores = ws.scores;
    const minS = Math.min(...scores);
    const maxS = Math.max(...scores);
    const range = maxS - minS || 1;
    const points = scores.map((s, i) => {
      const x = (i / (scores.length - 1)) * 100;
      const y = 22 - ((s - minS) / range) * 18;
      return `${x},${y}`;
    }).join(' ');
    
    html += `<div class="ws-card${isExpanded ? ' expanded' : ''}" data-ws-id="${ws.id}">`;
    html += '<div class="ws-card-header">';
    html += `<div><div class="ws-card-name">${ws.name}</div></div>`;
    html += `<div class="ws-score-badge">${ws.score}</div>`;
    html += '</div>';
    
    html += '<div class="ws-card-meta">';
    html += `<span>${ideas.length} idea${ideas.length !== 1 ? 's' : ''}</span>`;
    html += `<span>${ws.value}</span>`;
    html += '<span class="ws-fto-dots">';
    for (let g = 0; g < ws.green; g++) html += '<span class="d" style="background:var(--green)"></span>';
    for (let y = 0; y < ws.yellow; y++) html += '<span class="d" style="background:var(--yellow)"></span>';
    html += '</span>';
    html += '</div>';
    
    html += `<svg class="ws-sparkline" viewBox="0 0 100 24" preserveAspectRatio="none"><polyline points="${points}"/></svg>`;
    
    if (isExpanded) {
      html += '<div class="ws-ideas-grid">';
      ideas.forEach(idea => {
        html += `<div class="idea-card" data-idea-id="${idea.id}">`;
        html += '<div class="idea-card-top">';
        html += `<span class="idea-fto-badge ${idea.fto}">${idea.fto}</span>`;
        html += `<span class="idea-card-title">${idea.title}</span>`;
        html += '</div>';
        html += '<div class="idea-card-stats">';
        html += `<span><span class="idea-stat-dot"></span>Score ${idea.ps.overall}</span>`;
        html += `<span>${idea.val}</span>`;
        html += `<span>${idea.filing}</span>`;
        html += '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    
    html += '</div>';
  });
  
  grid.innerHTML = html;
  
  // Bind events
  grid.querySelectorAll('.ws-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.idea-card')) return;
      const wsId = parseInt(card.dataset.wsId);
      expandWhitespace(wsId);
    });
  });
  
  grid.querySelectorAll('.idea-card').forEach(card => {
    card.addEventListener('click', () => {
      openDrawer(parseInt(card.dataset.ideaId));
    });
  });
}

function expandWhitespace(wsId) {
  if (state.expandedWs === wsId) {
    state.expandedWs = null;
  } else {
    state.expandedWs = wsId;
  }
  renderWSGrid();
  
  // Scroll to expanded card
  if (state.expandedWs) {
    setTimeout(() => {
      const el = document.querySelector(`.ws-card[data-ws-id="${wsId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

// ═══════════════════════════════════════════
// DRAWER
// ═══════════════════════════════════════════
function openDrawer(ideaId) {
  const idea = ideaMap.get(ideaId);
  if (!idea) return;
  
  state.openIdea = ideaId;
  state.drawerTab = 'overview';
  
  // Header
  document.getElementById('drawerTitle').textContent = idea.title;
  
  let badges = '';
  badges += `<span class="badge badge-fto ${idea.fto}">FTO: ${idea.fto}</span>`;
  badges += `<span class="badge badge-filing">${idea.filing}</span>`;
  badges += `<span class="badge badge-value">${idea.val}</span>`;
  if (idea.thicket) badges += '<span class="badge badge-thicket">Thicket Anchor</span>';
  document.getElementById('drawerBadges').innerHTML = badges;
  
  renderDrawerTab();
  
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  
  // Update active tab
  document.querySelectorAll('.drawer-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === 'overview');
  });
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  state.openIdea = null;
}

function renderDrawerTab() {
  const idea = ideaMap.get(state.openIdea);
  if (!idea) return;
  
  const body = document.getElementById('drawerBody');
  const tab = state.drawerTab;
  
  if (tab === 'overview') {
    body.innerHTML = renderOverviewTab(idea);
  } else if (tab === 'claims') {
    body.innerHTML = renderClaimsTab(idea);
  } else if (tab === 'prior-art') {
    body.innerHTML = renderPriorArtTab(idea);
  } else if (tab === 'fto') {
    body.innerHTML = renderFTOTab(idea);
  } else if (tab === 'scoring') {
    body.innerHTML = renderScoringTab(idea);
    setTimeout(() => renderRadarChart(idea), 50);
  } else if (tab === 'filing') {
    body.innerHTML = renderFilingTab(idea);
  } else if (tab === 'notes') {
    body.innerHTML = renderNotesTab(idea);
  }
}

function renderOverviewTab(idea) {
  const ws = wsMap.get(idea.wsId);
  let html = '';
  
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">Whitespace</div>';
  html += `<div class="drawer-text"><p style="color:var(--teal);font-weight:500">${ws ? ws.name : ''}</p></div>`;
  html += '</div>';
  
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">Technical Description</div>';
  html += `<div class="drawer-text"><p>${escapeHtml(idea.desc)}</p></div>`;
  html += '</div>';
  
  // Quick stats grid
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">Key Metrics</div>';
  html += '<div class="filing-info">';
  html += `<div class="filing-info-item"><div class="filing-info-label">Patentability</div><div class="filing-info-value">${idea.ps.overall}/10</div></div>`;
  html += `<div class="filing-info-item"><div class="filing-info-label">FTO Rating</div><div class="filing-info-value" style="color:${ftoColorCSS(idea.fto)}">${idea.fto}</div></div>`;
  html += `<div class="filing-info-item"><div class="filing-info-label">Est. Value</div><div class="filing-info-value">${idea.val}</div></div>`;
  html += `<div class="filing-info-item"><div class="filing-info-label">Filing Priority</div><div class="filing-info-value">${idea.filing}</div></div>`;
  html += '</div>';
  html += '</div>';
  
  if (idea.cpcP && idea.cpcP.length) {
    html += '<div class="drawer-section">';
    html += '<div class="drawer-section-title">CPC/IPC Codes</div>';
    html += '<div class="drawer-text"><p><strong>Primary:</strong> ' + idea.cpcP.join(', ') + '</p>';
    if (idea.cpcS && idea.cpcS.length) {
      html += '<p><strong>Secondary:</strong> ' + idea.cpcS.join(', ') + '</p>';
    }
    html += '</div></div>';
  }
  
  return html;
}

function renderClaimsTab(idea) {
  let html = '';
  
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">Independent Claim</div>';
  html += `<div class="claim-text">${escapeHtml(idea.claim)}</div>`;
  html += '</div>';
  
  if (idea.depClaims && idea.depClaims.length) {
    html += '<div class="drawer-section">';
    html += '<div class="drawer-section-title">Dependent Claim Themes</div>';
    html += '<ol class="dep-claims-list">';
    idea.depClaims.forEach(c => {
      html += `<li>${escapeHtml(c)}</li>`;
    });
    html += '</ol>';
    html += '</div>';
  }
  
  return html;
}

function renderPriorArtTab(idea) {
  let html = '';
  const pa = idea.pa;
  
  if (pa.refs && pa.refs.length) {
    html += '<div class="drawer-section">';
    html += '<div class="drawer-section-title">Prior Art References</div>';
    html += '<table class="pa-table"><thead><tr><th>Reference</th><th>Differentiation</th></tr></thead><tbody>';
    pa.refs.forEach(r => {
      html += '<tr>';
      html += `<td><div class="pa-ref-name">${escapeHtml(r.ref)}</div></td>`;
      html += `<td>${escapeHtml(r.diff)}</td>`;
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += '</div>';
  }
  
  if (pa.dist) {
    html += '<div class="drawer-section">';
    html += '<div class="drawer-section-title">Distinguishing Features</div>';
    html += `<div class="drawer-text"><p>${escapeHtml(pa.dist)}</p></div>`;
    html += '</div>';
  }
  
  return html;
}

function renderFTOTab(idea) {
  let html = '';
  
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">FTO Rating</div>';
  html += `<div style="display:inline-block;padding:8px 20px;border-radius:var(--radius-sm);font-size:18px;font-weight:700;background:${idea.fto === 'GREEN' ? 'rgba(34,197,94,0.12)' : idea.fto === 'YELLOW' ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)'};color:${ftoColorCSS(idea.fto)};margin-bottom:8px">${idea.fto}</div>`;
  html += '</div>';
  
  if (idea.ftoJ) {
    html += '<div class="drawer-section">';
    html += '<div class="drawer-section-title">Justification</div>';
    html += `<div class="drawer-text"><p>${escapeHtml(idea.ftoJ)}</p></div>`;
    html += '</div>';
  }
  
  return html;
}

function renderScoringTab(idea) {
  let html = '';
  
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">Patentability Radar</div>';
  html += `<div style="text-align:center;font-size:28px;font-weight:700;color:var(--teal);margin-bottom:8px">${idea.ps.overall}<span style="font-size:14px;color:var(--text-muted);font-weight:400">/10</span></div>`;
  html += '<div class="radar-container" id="radarChart"></div>';
  html += '</div>';
  
  const sections = [
    { key: 's101', label: '§101 Subject Matter', notes: 's101n' },
    { key: 's102', label: '§102 Novelty', notes: 's102n' },
    { key: 's103', label: '§103 Non-Obviousness', notes: 's103n' },
    { key: 's112', label: '§112 Enablement', notes: 's112n' }
  ];
  
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">Section Breakdown</div>';
  sections.forEach(s => {
    const score = idea.ps[s.key];
    const notes = idea.ps[s.notes] || '';
    const pct = (score / 10 * 100).toFixed(0);
    html += `<div style="margin-bottom:14px">`;
    html += `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:13px;font-weight:500;color:var(--text)">${s.label}</span><span style="font-size:13px;font-weight:700;color:var(--teal)">${score}/10</span></div>`;
    html += `<div style="height:4px;background:var(--bg-card);border-radius:2px;overflow:hidden;margin-bottom:6px"><div style="height:100%;width:${pct}%;background:var(--teal);border-radius:2px;transition:width 0.8s var(--ease)"></div></div>`;
    if (notes) html += `<div style="font-size:12px;color:var(--text-muted);line-height:1.5">${escapeHtml(notes)}</div>`;
    html += '</div>';
  });
  html += '</div>';
  
  return html;
}

function renderRadarChart(idea) {
  const container = document.getElementById('radarChart');
  if (!container) return;
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const labels = ['§101', '§102', '§103', '§112'];
  const values = [idea.ps.s101, idea.ps.s102, idea.ps.s103, idea.ps.s112];
  const n = labels.length;
  
  const svg = d3.select(container)
    .append('svg')
    .attr('width', size)
    .attr('height', size);
  
  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
  
  // Grid rings
  [0.25, 0.5, 0.75, 1].forEach(frac => {
    const r = maxR * frac;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
      pts.push([Math.cos(angle) * r, Math.sin(angle) * r]);
    }
    g.append('polygon')
      .attr('points', pts.map(p => p.join(',')).join(' '))
      .attr('fill', 'none')
      .attr('stroke', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
      .attr('stroke-width', 1);
  });
  
  // Axes
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const x = Math.cos(angle) * maxR;
    const y = Math.sin(angle) * maxR;
    g.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', x).attr('y2', y)
      .attr('stroke', isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
      .attr('stroke-width', 1);
    
    const labelR = maxR + 16;
    g.append('text')
      .attr('x', Math.cos(angle) * labelR)
      .attr('y', Math.sin(angle) * labelR)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text(labels[i]);
  }
  
  // Data polygon
  const dataPts = values.map((v, i) => {
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const r = (v / 10) * maxR;
    return [Math.cos(angle) * r, Math.sin(angle) * r];
  });
  
  g.append('polygon')
    .attr('points', dataPts.map(p => p.join(',')).join(' '))
    .attr('fill', 'rgba(46,139,122,0.2)')
    .attr('stroke', '#2E8B7A')
    .attr('stroke-width', 2);
  
  // Data points
  dataPts.forEach(p => {
    g.append('circle')
      .attr('cx', p[0]).attr('cy', p[1])
      .attr('r', 3.5)
      .attr('fill', '#2E8B7A')
      .attr('stroke', isDark ? '#000' : '#fff')
      .attr('stroke-width', 1.5);
  });
}

function renderFilingTab(idea) {
  let html = '';
  
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">Filing Strategy</div>';
  html += '<div class="filing-info">';
  html += `<div class="filing-info-item"><div class="filing-info-label">Priority</div><div class="filing-info-value" style="color:var(--blue)">${idea.filing}</div></div>`;
  html += `<div class="filing-info-item"><div class="filing-info-label">Est. Value</div><div class="filing-info-value">${idea.val}</div></div>`;
  html += `<div class="filing-info-item"><div class="filing-info-label">Trade Secret</div><div class="filing-info-value">${idea.ts ? 'Yes' : 'No'}</div></div>`;
  html += `<div class="filing-info-item"><div class="filing-info-label">Defensive Pub</div><div class="filing-info-value">${idea.dp ? 'Yes' : 'No'}</div></div>`;
  html += `<div class="filing-info-item"><div class="filing-info-label">Thicket Anchor</div><div class="filing-info-value">${idea.thicket ? 'Yes' : 'No'}</div></div>`;
  html += '</div>';
  html += '</div>';
  
  if (idea.cp) {
    html += '<div class="drawer-section">';
    html += '<div class="drawer-section-title">Chokepoint Assessment</div>';
    html += `<div class="chokepoint-box">${escapeHtml(idea.cp)}</div>`;
    html += '</div>';
  }
  
  if (idea.valM) {
    html += '<div class="drawer-section">';
    html += '<div class="drawer-section-title">Valuation Methodology</div>';
    html += `<div class="drawer-text"><p>${escapeHtml(idea.valM)}</p></div>`;
    html += '</div>';
  }
  
  return html;
}

function renderNotesTab(idea) {
  let html = '';
  
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">Attachments & Notes</div>';
  html += '<div class="drawer-text" style="color:var(--text-faint);font-style:italic">';
  html += '<p>This section is reserved for future data — attachments, inventor notes, prosecution history, and collaboration threads can be added here.</p>';
  html += '<p>The "infinite bucket" architecture ensures each patent idea can hold unlimited nested data without restructuring the interface.</p>';
  html += '</div>';
  html += '</div>';
  
  // Show all raw fields as proof of infinite expandability
  html += '<div class="drawer-section">';
  html += '<div class="drawer-section-title">All Data Fields</div>';
  html += '<div style="font-size:12px;color:var(--text-muted);line-height:1.6">';
  const fields = Object.keys(idea);
  fields.forEach(k => {
    const val = idea[k];
    let display = '';
    if (typeof val === 'string') display = val.substring(0, 120) + (val.length > 120 ? '...' : '');
    else if (typeof val === 'boolean') display = val ? 'true' : 'false';
    else if (typeof val === 'number') display = String(val);
    else if (Array.isArray(val)) display = `[${val.length} items]`;
    else if (typeof val === 'object' && val) display = `{${Object.keys(val).length} keys}`;
    html += `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)"><span style="font-weight:600;color:var(--text-faint);min-width:80px;flex-shrink:0">${k}</span><span>${escapeHtml(display)}</span></div>`;
  });
  html += '</div></div>';
  
  return html;
}

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ftoColorCSS(fto) {
  if (fto === 'GREEN') return 'var(--green)';
  if (fto === 'YELLOW') return 'var(--yellow)';
  return 'var(--red)';
}

// ═══════════════════════════════════════════
// EVENT BINDINGS
// ═══════════════════════════════════════════
document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);
document.getElementById('drawerClose').addEventListener('click', closeDrawer);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});

// Drawer tabs
document.getElementById('drawerTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.drawer-tab');
  if (!tab) return;
  state.drawerTab = tab.dataset.tab;
  document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  renderDrawerTab();
});

// Filter chips
document.querySelectorAll('.chip[data-filter]').forEach(chip => {
  chip.addEventListener('click', () => {
    state.filter = chip.dataset.filter;
    document.querySelectorAll('.chip[data-filter]').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.expandedWs = null;
    renderWSGrid();
  });
});

// Search
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.search = e.target.value.trim();
    state.expandedWs = null;
    renderWSGrid();
  }, 200);
});

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
function init() {
  initKPIs();
  renderSunburst();
  renderTimeline();
  renderWSGrid();
  
  // Resize handler for sunburst
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(renderSunburst, 300);
  });
}

// Run after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</script>
</body>
</html>'''

with open('/home/user/workspace/ipco-merged/patent-lab/index.html', 'w') as f:
    f.write(html)

import os
sz = os.path.getsize('/home/user/workspace/ipco-merged/patent-lab/index.html')
print(f'Written: {sz/1024:.0f} KB')
