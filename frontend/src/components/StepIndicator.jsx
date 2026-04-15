const STEPS = [
  { label: 'Topic' },
  { label: 'Fields' },
  { label: 'References' },
  { label: 'Introduction' }
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="step-indicator">
      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isDone   = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div className="step-item" key={i}>
            <div className={`step-circle ${isDone ? 'done' : isActive ? 'active' : ''}`}>
              {isDone ? '✓' : stepNum}
            </div>
            <span className={`step-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`step-connector ${isDone ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
