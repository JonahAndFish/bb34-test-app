import { useState } from 'react';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function TestForm({ questions, studentName, pin, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!questions) return null;

  const mcqs = questions.questions?.filter(q => q.type === 'mcq') ?? [];
  const writings = questions.questions?.filter(q => q.type === 'writing') ?? [];
  const allQs = questions.questions ?? [];
  const answered = allQs.filter(q => (answers[q.id] || '').trim()).length;
  const total = allQs.length;

  const handleSubmit = async () => {
    const unanswered = writings.filter(q => !(answers[q.id] || '').trim());
    if (mcqs.some(q => !answers[q.id])) {
      setError('Please answer all MCQ questions before submitting.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, answers, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="test-form">
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, fontSize: '1rem' }}>Target Test — {studentName}</div>
        <div style={{ fontSize: '.85rem', color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '.3rem .75rem', borderRadius: 20 }}>
          {answered}/{total} answered
        </div>
      </div>

      {/* Section A — MCQ */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '2px solid var(--blue)' }}>
          Section A — Multiple Choice <span style={{ fontWeight: 400, color: 'var(--gray-500)', fontSize: '.85rem' }}>({mcqs.length} questions · 2 marks each)</span>
        </div>
        {mcqs.map((q, i) => (
          <div key={q.id} className="question-block">
            <h3><span className="question-number">{i + 1}</span>{q.question}</h3>
            <div className="mcq-options">
              {q.options.map((opt, oi) => {
                const letter = LETTERS[oi];
                const selected = answers[q.id] === letter;
                return (
                  <label key={letter} className={`mcq-option ${selected ? 'selected' : ''}`}>
                    <input type="radio" name={q.id} value={letter} checked={selected}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: letter }))} />
                    <span style={{ fontWeight: 600, minWidth: 20 }}>{letter}.</span>
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Section B — Writing */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', paddingBottom: '.5rem', borderBottom: '2px solid var(--blue)' }}>
          Section B — Written Answers
        </div>
        {writings.map((q, i) => (
          <div key={q.id} className="question-block">
            <h3>
              <span className="question-number">{mcqs.length + i + 1}</span>
              {q.question}
            </h3>
            <textarea
              value={answers[q.id] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Write your answer here..."
              rows={q.marks >= 10 ? 6 : q.marks >= 5 ? 4 : 2}
            />
          </div>
        ))}
      </div>

      {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

      <button className="btn btn-primary btn-lg w-full" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Submitting...' : '📤 Submit Answers'}
      </button>
      <p style={{ textAlign: 'center', fontSize: '.8rem', color: 'var(--gray-400)', marginTop: '.75rem' }}>
        You can leave writing questions blank if unsure — your teacher will grade them.
      </p>
    </div>
  );
}
