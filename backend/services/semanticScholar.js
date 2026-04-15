const axios = require('axios');

const BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const FIELDS = [
  'title', 'authors', 'year', 'abstract', 'venue',
  'externalIds', 'fieldsOfStudy', 'citationCount',
  'publicationTypes', 'journal'
].join(',');

// Publication types accepted as journal or conference papers
const VALID_TYPES = new Set([
  'JournalArticle', 'Conference', 'ConferencePaper'
]);

async function searchPapers(query, limit = 40) {
  const results = [];
  // Fetch more than needed from SS to account for filtered-out papers
  const fetchLimit = Math.min(limit * 3, 200);
  const batchSize = 100;
  let offset = 0;

  while (results.length < limit) {
    const fetchCount = Math.min(batchSize, fetchLimit - offset);
    if (fetchCount <= 0) break;

    try {
      const response = await axios.get(`${BASE_URL}/paper/search`, {
        params: { query, fields: FIELDS, limit: fetchCount, offset },
        timeout: 8000,   // reduced from 15s — fail fast if SS is slow
        headers: { 'User-Agent': 'ResearchTool/1.0' }
      });

      const data = response.data;
      if (!data.data || data.data.length === 0) break;

      for (const paper of data.data) {
        const types = paper.publicationTypes || [];
        const isValid = types.some(t => VALID_TYPES.has(t));
        if (!isValid || !paper.abstract || !paper.year) continue;
        results.push(normalizePaper(paper));
      }

      if (data.data.length < fetchCount) break; // no more pages
      offset += fetchCount;
      await sleep(150);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        await sleep(2000);
        continue;
      }
      // On timeout or network error, return whatever we have so far
      if (results.length > 0) break;
      throw err;
    }
  }

  return results.slice(0, limit);
}

function normalizePaper(paper) {
  const authors = (paper.authors || []).map(a => a.name);
  const doi = paper.externalIds && paper.externalIds.DOI
    ? paper.externalIds.DOI
    : null;

  return {
    paperId: paper.paperId,
    title: paper.title || '',
    authors,
    year: paper.year,
    abstract: paper.abstract || '',
    venue: paper.venue || (paper.journal && paper.journal.name) || '',
    doi,
    citationCount: paper.citationCount || 0,
    fieldsOfStudy: paper.fieldsOfStudy || [],
    publicationTypes: paper.publicationTypes || [],
    validationStatus: 'pending'
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { searchPapers };
