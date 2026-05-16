/**
 * Swiss IKB HTML Template Builder
 * Generates 720pt × 405pt single-page HTML compatible with html2pptx.
 *
 * All colors HARDCODED (no CSS variables) for html2pptx compatibility.
 * All text in <p> / <h1>-<h6> (4 html2pptx hard constraints).
 */

// ─── Design Tokens (hardcoded) ─────────────────────────────────────
const TOKENS = {
  paper: '#FAFAF8',
  ink: '#0A0A0A',
  accent: '#002FA7',
  grey1: '#F0F0EE',
  grey2: '#D4D4D2',
  grey3: '#737373',
  grey4: '#A3A3A3',
  amber: '#F59E0B',
  amberBg: '#FFF5F0',
  amberTrack: '#FFF0E8',
  trackBg: '#E8E8E6',
  fontBody: '"Inter","Helvetica Neue","PingFang SC","Noto Sans SC","Microsoft YaHei UI",sans-serif',
  fontMono: '"JetBrains Mono","SF Mono","Consolas",monospace',
};

// ─── Helpers ────────────────────────────────────────────────────────

/** Format a number with commas and optional unit */
function fmtNum(n, unit = '') {
  if (n >= 10000) {
    return (n / 10000).toFixed(n % 10000 === 0 ? 1 : 1) + ' 万' + unit;
  }
  return n.toLocaleString('zh-CN') + unit;
}

/** Escape HTML entities */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Build inline style string from object */
function style(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
    .join(';');
}

// ─── Component Builders ─────────────────────────────────────────────

/** Tag badge at top */
function buildTag(tagText) {
  if (!tagText) return '';
  return `<div style="display:inline-block;border:1.5pt solid ${TOKENS.accent};padding:2pt 7pt;">
    <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${TOKENS.accent};font-weight:500;letter-spacing:0.05em;">${esc(tagText)}</p>
  </div>`;
}

/** Summary KPI in header */
function buildSummaryKPI(kpi) {
  const color = kpi.accent ? TOKENS.accent : kpi.warn ? TOKENS.amber : TOKENS.ink;
  const weight = kpi.accent || kpi.warn ? '300' : '200';
  return `<div>
    <p style="font-size:13pt;color:${color};font-weight:${weight};line-height:1;">${esc(kpi.value)}<span style="font-size:6pt;color:${TOKENS.grey4};">${esc(kpi.unit)}</span></p>
    <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${TOKENS.grey3};font-weight:500;">${esc(kpi.note || '')}</p>
  </div>`;
}

/** Horizontal bar chart item */
function buildBarItem(item, maxVal) {
  const pct = maxVal > 0 ? Math.abs(item.value) / maxVal * 100 : 0;
  const isNeg = item.value < 0;
  const rankColor = item.accent ? TOKENS.accent : item.warn ? TOKENS.amber : item.muted ? TOKENS.grey4 : TOKENS.grey3;
  const barColor = item.accent ? TOKENS.accent : isNeg || item.warn ? TOKENS.amber : TOKENS.grey2;
  const valColor = item.accent ? TOKENS.accent : isNeg || item.warn ? TOKENS.amber : TOKENS.ink;
  const trackBg = isNeg ? TOKENS.amberTrack : TOKENS.trackBg;
  const rowBg = item.warn && !isNeg ? TOKENS.amberBg : 'transparent';
  const nameWeight = item.accent ? '500' : '400';
  const numWeight = item.accent || item.warn ? '500' : '400';

  const barFillStyle = isNeg
    ? `width:${pct}%;height:100%;background:${barColor};margin-left:auto;`
    : `width:${Math.max(pct, 0.03)}%;height:100%;background:${barColor};`;

  return `<div style="display:flex;align-items:center;height:10.4pt;gap:0;background:${rowBg};">
    <p style="font-size:5pt;color:${rankColor};font-weight:600;width:16pt;">${item.rank}</p>
    <p style="font-size:5pt;color:${TOKENS.ink};font-weight:${nameWeight};width:68pt;white-space:nowrap;">${esc(item.label)}</p>
    <div style="flex:1;height:6.5pt;background:${trackBg};">
      <div style="${barFillStyle}"></div>
    </div>
    <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${valColor};font-weight:${numWeight};width:50pt;text-align:right;">${isNeg ? '–' : ''}${fmtNum(Math.abs(item.value))}</p>
  </div>`;
}

/** Finding item with dot marker */
function buildFinding(f, idx) {
  const dotColor = f.accent ? TOKENS.accent : f.warn ? TOKENS.amber : TOKENS.accent;
  return `<div style="display:flex;gap:3pt;">
    <div style="width:4pt;min-width:4pt;height:4pt;background:${dotColor};margin-top:2.5pt;"></div>
    <p style="font-size:5.5pt;color:${TOKENS.ink};line-height:1.5;"><span style="font-weight:600;">${esc(f.bold || '')}</span>${esc(f.text)}</p>
  </div>`;
}

/** Diagnosis item */
function buildDiagnosis(d) {
  return `<div style="display:flex;gap:3pt;">
    <p style="font-size:5.5pt;color:${TOKENS.accent};font-weight:600;min-width:6pt;">${esc(d.num)}</p>
    <p style="font-size:5.5pt;color:${TOKENS.grey3};line-height:1.5;">${esc(d.text)}</p>
  </div>`;
}

/** Action item */
function buildAction(a) {
  const borderColor = a.warn ? TOKENS.amber : TOKENS.accent;
  return `<div style="display:flex;gap:4pt;align-items:flex-start;">
    <div style="width:6pt;min-width:6pt;height:6pt;border:1.5pt solid ${borderColor};margin-top:1.5pt;"></div>
    <div>
      <p style="font-size:6pt;color:${TOKENS.ink};font-weight:600;">${esc(a.title)}</p>
      <p style="font-size:5.5pt;color:${TOKENS.grey3};line-height:1.45;">${esc(a.desc)}</p>
    </div>
  </div>`;
}

/** Mini vertical comparison bars */
function buildComparison(comp) {
  const maxH = 32;
  const items = comp.items.map(c => ({
    ...c,
    height: (c.value / comp.max) * maxH
  }));
  return `<div style="background:${TOKENS.grey1};padding:5pt 8pt;">
    <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${TOKENS.ink};font-weight:500;letter-spacing:0.04em;margin-bottom:3pt;">${esc(comp.title || '')}</p>
    <div style="display:flex;align-items:flex-end;gap:10pt;height:40pt;">
      ${items.map(c => `<div style="display:flex;flex-direction:column;align-items:center;gap:2pt;">
        <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${c.warn ? TOKENS.amber : TOKENS.accent};font-weight:500;">${esc(c.label_val || '')}</p>
        <div style="width:28pt;height:${c.height}pt;background:${c.warn ? TOKENS.amber : TOKENS.accent};"></div>
        <p style="font-family:'JetBrains Mono',monospace;font-size:5pt;color:${c.warn ? TOKENS.amber : TOKENS.grey3};">${esc(c.label)}</p>
      </div>`).join('')}
    </div>
  </div>`;
}

/** Hairline divider */
function divider(opacity = 0.1) {
  return `<div style="height:1pt;background:${TOKENS.ink};opacity:${opacity};"></div>`;
}

// ─── Main HTML Builder ───────────────────────────────────────────────

function buildSwissHTML(data) {
  const { title, tag, summary_kpis, bar_chart, findings, diagnoses, actions, comparison, footer } = data;
  const fontStack = data.lang === 'ja'
    ? '"Inter","Helvetica Neue","Hiragino Kaku Gothic ProN","Noto Sans JP","PingFang SC","Microsoft YaHei UI",sans-serif'
    : TOKENS.fontBody;

  // Calculate total bar chart height for layout
  const barCount = bar_chart ? bar_chart.items.length : 0;
  const hasNegSep = bar_chart ? bar_chart.items.some(i => i.value < 0) : false;

  // Sections to show in right column
  const rightSections = [];
  if (findings && findings.length) rightSections.push('findings');
  if (diagnoses && diagnoses.length) rightSections.push('diagnoses');
  if (actions && actions.length) rightSections.push('actions');
  if (comparison) rightSections.push('comparison');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 720pt; height: 405pt;
    font-family: ${fontStack};
    background: ${TOKENS.paper};
    overflow: hidden;
    padding: 16pt 22pt 8pt 22pt;
    display: flex; flex-direction: column;
  }
  h1 { font-weight: 700; }
</style>
</head>
<body>

  <!-- Header: Tag + Summary KPIs -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4pt;">
    ${buildTag(tag)}
    ${summary_kpis ? `<div style="display:flex;gap:16pt;text-align:right;">${summary_kpis.map(k => buildSummaryKPI(k)).join('')}</div>` : ''}
  </div>

  <!-- Title -->
  <div style="margin-bottom:1pt;">
    <h1 style="font-size:18pt;color:${TOKENS.ink};font-weight:200;line-height:1.12;letter-spacing:-0.01em;">
      ${esc(title.text)}
    </h1>
  </div>

  ${divider()}

  <!-- Main: Left (chart) + Right (analysis) -->
  <div style="display:flex;gap:14pt;flex:1;min-height:0;margin-top:6pt;">

    <!-- Left Column: Bar Chart -->
    ${bar_chart ? `
    <div style="width:436pt;display:flex;flex-direction:column;gap:0;">
      <div style="display:flex;margin-bottom:2pt;border-bottom:1pt solid ${TOKENS.grey2};padding-bottom:2pt;">
        <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${TOKENS.grey4};font-weight:500;width:16pt;">#</p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${TOKENS.grey4};font-weight:500;width:68pt;">${esc(bar_chart.col_label || '项目')}</p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${TOKENS.grey4};font-weight:500;flex:1;"></p>
        <p style="font-family:'JetBrains Mono',monospace;font-size:5.5pt;color:${TOKENS.grey4};font-weight:500;width:50pt;text-align:right;">${esc(bar_chart.val_label || '数值')}</p>
      </div>
      ${bar_chart.items.map((item, i) => {
        const html = buildBarItem(item, bar_chart.max_value || 1);
        // Insert divider before first negative
        if (hasNegSep && item.value < 0 && (i === 0 || bar_chart.items[i - 1].value >= 0)) {
          return `<div style="height:1pt;background:${TOKENS.ink};opacity:0.08;margin:1pt 0;"></div>${html}`;
        }
        return html;
      }).join('')}
    </div>` : ''}

    <!-- Right Column: Analysis -->
    <div style="flex:1;display:flex;flex-direction:column;gap:7pt;">

      ${findings ? `
      <div>
        <p style="font-size:7.5pt;color:${TOKENS.accent};font-weight:600;margin-bottom:3pt;">${esc(findings.title || '核心発見')}</p>
        <div style="display:flex;flex-direction:column;gap:3pt;">
          ${findings.items.map((f, i) => buildFinding(f, i)).join('')}
        </div>
      </div>` : ''}

      ${findings && (diagnoses || actions || comparison) ? divider(0.08) : ''}

      ${diagnoses ? `
      <div>
        <p style="font-size:7pt;color:${TOKENS.ink};font-weight:600;margin-bottom:3pt;">${esc(diagnoses.title || '問題診断')} <span style="font-weight:300;font-size:5pt;color:${TOKENS.grey4};">【推論】</span></p>
        <div style="display:flex;flex-direction:column;gap:3pt;">
          ${diagnoses.items.map(d => buildDiagnosis(d)).join('')}
        </div>
      </div>` : ''}

      ${diagnoses && (actions || comparison) ? divider(0.08) : ''}

      ${actions ? `
      <div>
        <p style="font-size:7pt;color:${TOKENS.accent};font-weight:600;margin-bottom:3pt;">${esc(actions.title || '行動建議')}</p>
        <div style="display:flex;flex-direction:column;gap:3pt;">
          ${actions.items.map(a => buildAction(a)).join('')}
        </div>
      </div>` : ''}

      ${actions && comparison ? divider(0.08) : ''}

      ${comparison ? buildComparison(comparison) : ''}

    </div>
  </div>

  <!-- Footer -->
  ${footer ? `<div style="position:absolute;bottom:6pt;right:22pt;">
    <p style="font-family:'JetBrains Mono',monospace;font-size:4.5pt;color:${TOKENS.grey4};">${esc(footer)}</p>
  </div>` : ''}

</body>
</html>`;
}

module.exports = { buildSwissHTML, TOKENS };
