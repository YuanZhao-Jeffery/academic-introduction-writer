import { useState } from 'react';

export default function TopicInput({ onSearch }) {
  const [topic, setTopic] = useState('');
  const [limit, setLimit] = useState(80);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic.trim().length < 2) return;
    onSearch(topic.trim(), limit);
  };

  return (
    <div className="card">
      <h2>Academic Introduction Writer</h2>
      <p className="subtitle">
        Enter your research topic. The tool will retrieve peer-reviewed journal
        and conference papers, validate each one, then generate a detailed
        introduction section ready for export as a Word document.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="topic">Research Topic</label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g., machine learning for structural health monitoring"
            autoFocus
            required
          />
          <p className="form-hint">
            Be specific. Longer, descriptive topics yield more relevant results.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="limit">Maximum papers to search</label>
          <select id="limit" value={limit} onChange={e => setLimit(Number(e.target.value))}>
            <option value={40}>40 papers</option>
            <option value={60}>60 papers</option>
            <option value={80}>80 papers (recommended)</option>
            <option value={120}>120 papers</option>
            <option value={160}>160 papers (slower)</option>
          </select>
          <p className="form-hint">
            More papers produce a richer introduction but take longer to validate.
          </p>
        </div>

        <div className="btn-group">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={topic.trim().length < 2}
          >
            Search Papers →
          </button>
        </div>
      </form>
    </div>
  );
}
