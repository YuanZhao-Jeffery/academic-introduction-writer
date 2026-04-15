import { useState } from 'react';

export default function IntroductionView({ topic, introData, onExport, onBack, onReset }) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { paragraphs, references, wordCount, estimatedPages } = introData;

  const handleCopy = () => {
    const text = paragraphs.join('\n\n') + '\n\nREFERENCES\n\n' +
      references.map(r => `[${r.index}] ${r.text}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card">
      <h2>Generated Introduction</h2>
      <p className="subtitle">
        Review the introduction below. You can copy the text or export it directly as a
        Word document with academic formatting (Times New Roman 12pt, double-spaced, 1-inch margins).
      </p>

      {/* Meta pills */}
      <div className="intro-meta">
        <div className="meta-pill">Words: <span>{wordCount.toLocaleString()}</span></div>
        <div className="meta-pill">Est. pages: <span>~{estimatedPages}</span></div>
        <div className="meta-pill">References: <span>{references.length}</span></div>
        <div className="meta-pill">Paragraphs: <span>{paragraphs.length}</span></div>
      </div>

      {/* Introduction body */}
      <div className="intro-body">
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* References */}
      <div className="ref-section">
        <h3>References</h3>
        {references.map(ref => (
          <div key={ref.index} className="ref-entry">
            <strong>[{ref.index}]</strong> {ref.text}
          </div>
        ))}
      </div>

      <div className="btn-group">
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn btn-secondary" onClick={handleCopy}>
          {copied ? '✓ Copied!' : 'Copy Text'}
        </button>
        <button
          className="btn btn-success"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? 'Exporting…' : 'Export as Word (.docx)'}
        </button>
        <button className="btn btn-secondary" onClick={onReset} style={{ marginLeft: 'auto' }}>
          Start Over
        </button>
      </div>
    </div>
  );
}
