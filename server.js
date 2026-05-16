const express = require('express');
const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const os = require('os');
const html2pptx = require('./html2pptx');
const { buildSwissHTML } = require('./templates/swiss-template');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ─── Health check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'swiss-pptx-api' });
});

// ─── PPTX Generation ─────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-'));
  const htmlPath = path.join(tmpDir, 'slide.html');

  try {
    const data = req.body;

    // Validate required fields
    if (!data.title || !data.title.text) {
      return res.status(400).json({ error: 'Missing required field: title.text' });
    }

    // Step 1: Build Swiss IKB HTML from JSON data
    const html = buildSwissHTML(data);
    fs.writeFileSync(htmlPath, html, 'utf-8');

    // Step 2: Convert HTML to PPTX
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';

    try {
      await html2pptx(htmlPath, pres, { tmpDir });
    } catch (convErr) {
      // Save HTML for debugging on conversion failure
      const debugPath = path.join(tmpDir, 'debug.html');
      fs.writeFileSync(debugPath, html, 'utf-8');
      console.error('html2pptx conversion failed. Debug HTML saved to:', debugPath);
      console.error(convErr.message);
      return res.status(422).json({
        error: 'PPTX conversion failed',
        detail: convErr.message,
        debug_html: debugPath
      });
    }

    // Step 3: Write PPTX to buffer
    const pptxPath = path.join(tmpDir, 'output.pptx');
    await pres.writeFile({ fileName: pptxPath });

    const pptxBuffer = fs.readFileSync(pptxPath);

    // Step 4: Return PPTX file
    const filename = (data.filename || 'slide') + '.pptx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pptxBuffer.length);
    res.send(pptxBuffer);

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  } finally {
    // Cleanup temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── PPTX Generation from HTML ────────────────────────────────
app.post('/api/generate-from-html', async (req, res) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-'));
  const htmlPath = path.join(tmpDir, 'slide.html');

  try {
    const { html, filename } = req.body;

    if (!html || typeof html !== 'string' || html.trim().length === 0) {
      return res.status(400).json({ error: 'Missing required field: html (non-empty string)' });
    }

    // Step 1: Write HTML to temp file
    fs.writeFileSync(htmlPath, html, 'utf-8');

    // Step 2: Convert HTML to PPTX
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';

    try {
      await html2pptx(htmlPath, pres, { tmpDir });
    } catch (convErr) {
      const debugPath = path.join(tmpDir, 'debug.html');
      fs.writeFileSync(debugPath, html, 'utf-8');
      console.error('html2pptx conversion failed. Debug HTML saved to:', debugPath);
      console.error(convErr.message);
      return res.status(422).json({
        error: 'PPTX conversion failed',
        detail: convErr.message,
        debug_html: debugPath
      });
    }

    // Step 3: Write PPTX to buffer
    const pptxPath = path.join(tmpDir, 'output.pptx');
    await pres.writeFile({ fileName: pptxPath });

    const pptxBuffer = fs.readFileSync(pptxPath);

    // Step 4: Return PPTX file
    const outputFilename = (filename || 'slide') + '.pptx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFilename)}"`);
    res.setHeader('Content-Length', pptxBuffer.length);
    res.send(pptxBuffer);

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Swiss PPTX API running on http://0.0.0.0:${PORT}`);
  console.log('Endpoint: POST /api/generate');
});
