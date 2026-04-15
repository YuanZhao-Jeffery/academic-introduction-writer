import { useState } from 'react';
import StepIndicator  from './components/StepIndicator';
import TopicInput     from './components/TopicInput';
import FieldSelector  from './components/FieldSelector';
import ReferenceList  from './components/ReferenceList';
import IntroductionView from './components/IntroductionView';

const API = '/api';

function Loader({ message }) {
  return (
    <div className="loader-overlay">
      <div className="spinner" />
      <div className="loader-msg">{message}</div>
    </div>
  );
}

function Alert({ message, type = 'error', onDismiss }) {
  return (
    <div className={`alert alert-${type}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
      )}
    </div>
  );
}

export default function App() {
  const [step, setStep]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [loadMsg, setLoadMsg]     = useState('');
  const [error, setError]         = useState(null);

  // Data state
  const [topic, setTopic]                     = useState('');
  const [allPapers, setAllPapers]             = useState([]);
  const [fieldDistribution, setFieldDistribution] = useState([]);
  const [filteredPapers, setFilteredPapers]   = useState([]);
  const [selectedFields, setSelectedFields]   = useState([]);
  const [validatedPapers, setValidatedPapers] = useState([]);
  const [introData, setIntroData]             = useState(null);

  const clearError = () => setError(null);

  // ── Step 1: Search ────────────────────────────────────────────────────────
  const handleSearch = async (searchTopic, limit) => {
    setTopic(searchTopic);
    setError(null);
    setLoading(true);
    setLoadMsg(`Searching Semantic Scholar for "${searchTopic}"…`);

    try {
      const res = await fetch(`${API}/papers/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTopic, limit })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed.');

      if (data.papers.length === 0) {
        setError('No journal or conference papers found for this topic. Try a different or broader query.');
        return;
      }

      setAllPapers(data.papers);
      setFieldDistribution(data.fieldDistribution);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Field selection → Validate ───────────────────────────────────
  const handleFieldContinue = async (papers, fields) => {
    setFilteredPapers(papers);
    setSelectedFields(fields);
    setError(null);
    setLoading(true);
    setLoadMsg(`Validating ${papers.length} papers via CrossRef… This may take a moment.`);

    try {
      const res = await fetch(`${API}/papers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Validation failed.');

      setValidatedPapers(data.papers);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Generate Introduction ────────────────────────────────────────
  const handleGenerate = async (selectedPapers) => {
    setError(null);
    setLoading(true);
    setLoadMsg(`Generating introduction from ${selectedPapers.length} references…`);

    try {
      const res = await fetch(`${API}/generate/introduction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, papers: selectedPapers, selectedFields })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed.');

      setIntroData(data);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 4: Export ────────────────────────────────────────────────────────
  const handleExport = async () => {
    const res = await fetch(`${API}/generate/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, introData })
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Export failed.');
      return;
    }

    // Trigger file download
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Introduction_${topic.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep(1);
    setTopic('');
    setAllPapers([]);
    setFieldDistribution([]);
    setFilteredPapers([]);
    setSelectedFields([]);
    setValidatedPapers([]);
    setIntroData(null);
    setError(null);
  };

  return (
    <>
      {loading && <Loader message={loadMsg} />}

      <header className="app-header">
        <div>
          <h1>Academic Introduction Writer</h1>
        </div>
        <span style={{ marginLeft: 'auto' }}>No API key required · Powered by Semantic Scholar &amp; CrossRef</span>
      </header>

      <main className="app-container">
        <StepIndicator currentStep={step} />

        {error && <Alert message={error} onDismiss={clearError} />}

        {step === 1 && (
          <TopicInput onSearch={handleSearch} />
        )}

        {step === 2 && (
          <FieldSelector
            papers={allPapers}
            fieldDistribution={fieldDistribution}
            onContinue={handleFieldContinue}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <ReferenceList
            papers={validatedPapers}
            onGenerate={handleGenerate}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && introData && (
          <IntroductionView
            topic={topic}
            introData={introData}
            onExport={handleExport}
            onBack={() => setStep(3)}
            onReset={handleReset}
          />
        )}
      </main>
    </>
  );
}
