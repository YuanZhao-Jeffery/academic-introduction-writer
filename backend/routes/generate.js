const express = require('express');
const router = express.Router();
const { Packer } = require('docx');
const { generateIntroduction } = require('../services/writer');
const { buildWordDocument } = require('../services/exporter');

// POST /api/generate/introduction
// Body: { topic: string, papers: Paper[], selectedFields: string[] }
router.post('/introduction', async (req, res) => {
  const { topic, papers, selectedFields = [] } = req.body;

  if (!topic || topic.trim().length < 2) {
    return res.status(400).json({ error: 'Topic is required.' });
  }
  if (!papers || papers.length === 0) {
    return res.status(400).json({ error: 'At least one paper is required.' });
  }

  try {
    const result = generateIntroduction(topic.trim(), papers, selectedFields);
    res.json({
      text: result.text,
      paragraphs: result.paragraphs,
      references: result.references,
      wordCount: result.wordCount,
      estimatedPages: Math.ceil(result.wordCount / 500)
    });
  } catch (err) {
    console.error('Generation error:', err.message);
    res.status(500).json({ error: 'Introduction generation failed. Please try again.' });
  }
});

// POST /api/generate/export
// Body: { topic: string, introData: { paragraphs, references, wordCount } }
router.post('/export', async (req, res) => {
  const { topic, introData } = req.body;

  if (!topic || !introData) {
    return res.status(400).json({ error: 'Topic and introduction data are required.' });
  }

  try {
    const doc = buildWordDocument(topic, introData);
    const buffer = await Packer.toBuffer(doc);

    const safeTitle = topic.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
    const filename = `Introduction_${safeTitle}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ error: 'Export failed. Please try again.' });
  }
});

module.exports = router;
