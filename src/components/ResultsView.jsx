export default function ResultsView({ submissions, questions }) {
  if (!submissions?.length) {
    return <div className="empty-state"><p style={{ fontSize: '1.1rem' }}>No submissions yet.</p><p style={{ marginTop: '.5rem', fontSize: '.9rem' }}>Students haven't submitted their answers.</p></div>;
  }

  const mcqQuestions = questions.filter((q) => q.type === 'mcq');

  const getMcqScore = (answers) => {
    const correct = mcqQuestions.filter((q) => answers[q.id] === q.answer).length;
    return { correct, total: mcqQuestions.length };
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="results-header">
        <h2>{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</h2>
      </div>

      {submissions.map((sub, si) => {
        const { correct, total } = getMcqScore(sub.answers);
        return (
          <div key={si} className="card submission-card">
            <div className="student-name">{sub.studentName}</div>
            <div className="submitted-at">
              Submitted {new Date(sub.submittedAt).toLocaleString()}
            </div>

            {total > 0 && (
              <div className="score-badge">
                MCQ Score: {correct}/{total}
              </div>
            )}

            {questions.map((q, qi) => {
              const studentAnswer = sub.answers[q.id];
              const isCorrect = q.type === 'mcq' && studentAnswer === q.answer;
              const isWrong = q.type === 'mcq' && studentAnswer && studentAnswer !== q.answer;

              return (
                <div key={q.id} className="answer-block">
                  <div className="q-text">
                    <strong>Q{qi + 1}:</strong> {q.question}
                  </div>

                  {q.type === 'mcq' ? (
                    <div className="answer-row">
                      <span className={`answer-pill ${isCorrect ? 'correct' : isWrong ? 'wrong' : 'student'}`}>
                        Student: {studentAnswer ?? '—'} {isCorrect ? '✓' : isWrong ? '✗' : ''}
                      </span>
                      <span className="answer-pill correct">
                        Correct: {q.answer}
                      </span>
                    </div>
                  ) : (
                    <div className="writing-answer">
                      {studentAnswer || <em style={{ color: 'var(--gray-400)' }}>No answer provided</em>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
