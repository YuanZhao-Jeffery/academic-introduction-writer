const axios = require('axios');

const CROSSREF_BASE = 'https://api.crossref.org';

// Document types that count as journal or conference papers
const VALID_CR_TYPES = new Set([
  'journal-article',
  'proceedings-article',
  'conference-paper'
]);

async function validatePaper(paper) {
  // Strategy 1: Validate via DOI (most reliable)
  if (paper.doi) {
    const result = await validateByDOI(paper.doi);
    if (result) return result;
  }

  // Strategy 2: Title + author search fallback
  const result = await validateByTitle(paper);
  return result;
}

async function validateByDOI(doi) {
  try {
    const response = await axios.get(
      `${CROSSREF_BASE}/works/${encodeURIComponent(doi)}`,
      {
        timeout: 10000,
        headers: { 'User-Agent': 'ResearchTool/1.0 (academic-use)' }
      }
    );

    const work = response.data && response.data.message;
    if (!work) return null;

    const type = work.type || '';
    const isValidType = VALID_CR_TYPES.has(type);

    return {
      valid: isValidType,
      reason: isValidType
        ? `Verified via DOI — type: ${type}`
        : `DOI found but type "${type}" is not a journal or conference paper`,
      doi: work.DOI,
      publisher: work.publisher || '',
      crossrefType: type
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { valid: false, reason: 'DOI not found in CrossRef' };
    }
    return null; // network error — try title search
  }
}

async function validateByTitle(paper) {
  if (!paper.title) return { valid: false, reason: 'No title or DOI available for validation' };

  try {
    const firstAuthorLastName = extractLastName(paper.authors && paper.authors[0]);
    const params = {
      'query.title': paper.title,
      rows: 1,
      select: 'DOI,title,type,author,publisher,published-print'
    };
    if (firstAuthorLastName) {
      params['query.author'] = firstAuthorLastName;
    }

    const response = await axios.get(`${CROSSREF_BASE}/works`, {
      params,
      timeout: 10000,
      headers: { 'User-Agent': 'ResearchTool/1.0 (academic-use)' }
    });

    const items = response.data &&
      response.data.message &&
      response.data.message.items;

    if (!items || items.length === 0) {
      return { valid: false, reason: 'Not found in CrossRef by title search' };
    }

    const match = items[0];
    const matchTitle = extractCRTitle(match.title);
    const similarity = titleSimilarity(paper.title, matchTitle);

    if (similarity < 0.75) {
      return { valid: false, reason: 'Title match too weak in CrossRef' };
    }

    const type = match.type || '';
    const isValidType = VALID_CR_TYPES.has(type);

    return {
      valid: isValidType,
      reason: isValidType
        ? `Verified via title search — type: ${type}`
        : `Found in CrossRef but type "${type}" is not journal/conference`,
      doi: match.DOI,
      publisher: match.publisher || '',
      crossrefType: type
    };
  } catch {
    return { valid: false, reason: 'CrossRef lookup failed (network error)' };
  }
}

function extractLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function extractCRTitle(titleField) {
  if (!titleField) return '';
  if (Array.isArray(titleField)) return titleField[0] || '';
  return titleField;
}

function titleSimilarity(a, b) {
  if (!a || !b) return 0;
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const setA = new Set(normalize(a));
  const setB = new Set(normalize(b));
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

async function validatePapers(papers, batchSize = 10) {
  const results = new Array(papers.length);

  for (let i = 0; i < papers.length; i += batchSize) {
    const batch = papers.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(paper => validatePaper(paper))
    );

    for (let j = 0; j < batch.length; j++) {
      const validation = batchResults[j];
      results[i + j] = {
        ...batch[j],
        validationStatus: validation && validation.valid ? 'valid' : 'invalid',
        validationReason: validation ? validation.reason : 'Validation failed',
        crossrefDoi: validation && validation.doi ? validation.doi : batch[j].doi,
        publisher: validation && validation.publisher ? validation.publisher : ''
      };
    }

    // Brief pause between batches to stay within CrossRef polite rate limit
    if (i + batchSize < papers.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return results;
}

module.exports = { validatePapers };
