import { useState, useMemo } from 'react';

export default function ReferenceList({ papers, onGenerate, onBack }) {
  const [excluded, setExcluded] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const validCount   = papers.filter(p => p.validationStatus === 'valid').length;
  const invalidCount = papers.filter(p => p.validationStatus === 'invalid').length;

  const toggleExclude = (id) => {
    setExcluded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const includeAll = () => setExcluded(new Set());
  const excludeInvalid = () => {
    const ids = papers.filter(p => p.validationStatus !== 'valid').map(p => p.paperId);
    setExcluded(new Set(ids));
  };

  const filtered = useMemo(() => {
    return papers.filter(p => {
      if (filter === 'valid'   && p.validationStatus !== 'valid')   return false;
      if (filter === 'invalid' && p.validationStatus === 'valid')    return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          (p.authors || []).join(' ').toLowerCase().includes(q) ||
          (p.venue || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [papers, filter, search]);

  const selectedPapers = papers.filter(p => !excluded.has(p.paperId));
  const selectedValid  = selectedPapers.filter(p => p.validationStatus === 'valid');

  const handleGenerate = () => {
    onGenerate(selectedValid);
  };

  return (
    <div className="card">
      <h2>Review References</h2>
      <p className="subtitle">
        Validation complete. Review the results, deselect papers you wish to exclude,
        then generate the introduction using the valid references.
      </p>

      {/* Summary badges */}
      <div className="ref-toolbar">
        <span className="count-badge valid">✓ {validCount} valid</span>
        <span className="count-badge invalid">✗ {invalidCount} invalid</span>
        <span className="count-badge">{papers.length} total</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={includeAll}     style={{ padding: '5px 12px', fontSize: '0.82rem' }}>Include All</button>
          <button className="btn btn-secondary" onClick={excludeInvalid} style={{ padding: '5px 12px', fontSize: '0.82rem' }}>Exclude Invalid</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'valid', 'invalid'].map(f => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', fontSize: '0.82rem' }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search title / author / venue…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '5px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.87rem' }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <table className="ref-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th>Paper</th>
              <th style={{ width: 60 }}>Year</th>
              <th style={{ width: 90 }}>Citations</th>
              <th style={{ width: 110 }}>Status</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.paperId} className={excluded.has(p.paperId) ? 'excluded' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={!excluded.has(p.paperId)}
                    onChange={() => toggleExclude(p.paperId)}
                    style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                </td>
                <td>
                  <div className="ref-title">{p.title}</div>
                  <div className="ref-authors">{(p.authors || []).slice(0, 3).join(', ')}{p.authors && p.authors.length > 3 ? ' et al.' : ''}</div>
                  {p.venue && <div className="ref-venue">{p.venue}</div>}
                </td>
                <td>{p.year}</td>
                <td>{p.citationCount ?? '—'}</td>
                <td>
                  <span className={`status-badge ${p.validationStatus}`}>
                    {p.validationStatus === 'valid' ? '✓ Valid' : p.validationStatus === 'invalid' ? '✗ Invalid' : '? Pending'}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--muted)', maxWidth: 200 }}>
                  {p.validationReason || '—'}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No papers match the current filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedValid.length === 0 && (
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          No valid papers are selected. Please include at least one valid paper to generate the introduction.
        </div>
      )}

      {selectedValid.length > 0 && (
        <div className="alert alert-info" style={{ marginTop: 16 }}>
          <strong>{selectedValid.length}</strong> valid paper{selectedValid.length !== 1 ? 's' : ''} selected for introduction generation.
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={selectedValid.length === 0}
        >
          Generate Introduction ({selectedValid.length} papers) →
        </button>
      </div>
    </div>
  );
}
