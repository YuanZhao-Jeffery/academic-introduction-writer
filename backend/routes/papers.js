const express = require('express');
const router = express.Router();
const { searchPapers } = require('../services/semanticScholar');
const { validatePapers } = require('../services/crossref');

// POST /api/papers/search
// Body: { query: string, limit: number }
router.post('/search', async (req, res) => {
  const { query, limit = 40 } = req.body;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters.' });
  }

  // Hard 25-second timeout — safely under Railway's 30s request limit
  const timeoutHandle = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Search timed out. Try a more specific topic or fewer papers.' });
    }
  }, 25000);

  try {
    const papers = await searchPapers(query.trim(), Math.min(limit, 100));

    if (res.headersSent) return; // timeout already fired
    clearTimeout(timeoutHandle);

    if (papers.length === 0) {
      return res.status(404).json({ error: 'No journal or conference papers found. Try a different topic.' });
    }

    const fieldCounts = {};
    for (const paper of papers) {
      for (const field of (paper.fieldsOfStudy || [])) {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      }
    }

    const fieldDistribution = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / papers.length) * 100) }));

    res.json({ papers, fieldDistribution, total: papers.length });
  } catch (err) {
    clearTimeout(timeoutHandle);
    if (!res.headersSent) {
      console.error('Search error:', err.message);
      res.status(500).json({ error: 'Search failed. Please try again.' });
    }
  }
});

// POST /api/papers/validate
// Body: { papers: Paper[] }
router.post('/validate', async (req, res) => {
  const { papers } = req.body;

  if (!papers || !Array.isArray(papers) || papers.length === 0) {
    return res.status(400).json({ error: 'No papers provided for validation.' });
  }

  try {
    const validated = await validatePapers(papers);
    const validCount = validated.filter(p => p.validationStatus === 'valid').length;

    res.json({
      papers: validated,
      validCount,
      invalidCount: validated.length - validCount
    });
  } catch (err) {
    console.error('Validation error:', err.message);
    res.status(500).json({ error: 'Validation failed. Please try again.' });
  }
});

module.exports = router;
