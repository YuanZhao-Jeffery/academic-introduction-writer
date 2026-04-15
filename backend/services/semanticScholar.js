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

async function searchPapers(query, limit = 100) {
  const results = [];
  const batchSize = 100;
  let offset = 0;

  // Fetch up to `limit` papers in batches
  while (results.length < limit) {
    const fetchCount = Math.min(batchSize, limit - results.length);
    try {
      const response = await axios.get(`${BASE_URL}/paper/search`, {
        params: { query, fields: FIELDS, limit: fetchCount, offset },
        timeout: 15000,
        headers: { 'User-Agent': 'ResearchTool/1.0' }
      });

      const data = response.data;
      if (!data.data || data.data.length === 0) break;

      for (const paper of data.data) {
        // Keep only journal/conference papers with abstracts
        const types = paper.publicationTypes || [];
        const isValid = types.some(t => VALID_TYPES.has(t));
        if (!isValid || !paper.abstract || !paper.year) continue;

        results.push(normalizePaper(paper));
      }

      if (data.data.length < fetchCount) break; // no more pages
      offset += fetchCount;
      // Respect rate limit: max 10 req/s on free tier
      await sleep(200);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        await sleep(2000);
        continue;
      }
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
