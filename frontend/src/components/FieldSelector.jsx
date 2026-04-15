import { useState, useEffect } from 'react';

export default function FieldSelector({ papers, fieldDistribution, onContinue, onBack }) {
  const [selected, setSelected] = useState(new Set(fieldDistribution.map(f => f.name)));

  useEffect(() => {
    setSelected(new Set(fieldDistribution.map(f => f.name)));
  }, [fieldDistribution]);

  const toggle = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const selectAll   = () => setSelected(new Set(fieldDistribution.map(f => f.name)));
  const deselectAll = () => setSelected(new Set());

  const maxCount = fieldDistribution[0]?.count || 1;

  const filteredPapers = papers.filter(p => {
    const fields = p.fieldsOfStudy || [];
    if (fields.length === 0) return true; // keep untagged papers
    return fields.some(f => selected.has(f));
  });

  const handleContinue = () => {
    onContinue(filteredPapers, [...selected]);
  };

  return (
    <div className="card">
      <h2>Select Research Fields</h2>
      <p className="subtitle">
        Found <strong>{papers.length}</strong> papers across{' '}
        <strong>{fieldDistribution.length}</strong> fields. Choose which fields
        to include — papers matching any selected field will proceed to validation.
      </p>

      <div className="select-actions">
        <button className="btn btn-secondary" onClick={selectAll}   style={{ padding: '6px 14px' }}>Select All</button>
        <button className="btn btn-secondary" onClick={deselectAll} style={{ padding: '6px 14px' }}>Deselect All</button>
        <span className="text-muted" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          {filteredPapers.length} papers will proceed
        </span>
      </div>

      <div className="field-grid">
        {fieldDistribution.map(f => (
          <div
            key={f.name}
            className={`field-card ${selected.has(f.name) ? 'selected' : ''}`}
            onClick={() => toggle(f.name)}
          >
            <input
              type="checkbox"
              checked={selected.has(f.name)}
              onChange={() => toggle(f.name)}
              onClick={e => e.stopPropagation()}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="field-name">{f.name}</div>
              <div className="field-bar" style={{ width: `${(f.count / maxCount) * 100}%` }} />
            </div>
            <div className="field-count">{f.count}</div>
          </div>
        ))}
      </div>

      {filteredPapers.length === 0 && (
        <div className="alert alert-error">
          No papers match the selected fields. Please select at least one field.
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={filteredPapers.length === 0}
        >
          Validate {filteredPapers.length} Papers →
        </button>
      </div>
    </div>
  );
}
