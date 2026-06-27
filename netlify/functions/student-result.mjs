import { getStore } from '@netlify/blobs';
import questionsData from '../../questions.json';

export default async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(req.url);
  const name = url.searchParams.get('name')?.trim().toLowerCase();
  const pin = url.searchParams.get('pin');

  if (!name) {
    return new Response(JSON.stringify({ error: 'Missing name' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const store = getStore('submissions');
  const { blobs } = await store.list();

  const matches = [];
  for (const { key } of blobs) {
    const data = await store.get(key, { type: 'json' });
    if (data?.studentName?.toLowerCase() === name) matches.push(data);
  }

  if (matches.length === 0) {
    return new Response(JSON.stringify({ found: false }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!pin) {
    return new Response(JSON.stringify({ found: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const pinMatches = String(pin) === String(matches[0].pin);
  if (!pinMatches) {
    return new Response(JSON.stringify({ found: true, wrongPin: true }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  matches.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const totalAttempts = matches.length;
  const graded = matches.filter(s => s.gradedAt);
  const latest = graded.length ? graded[graded.length - 1] : matches[matches.length - 1];
  const attemptNumber = matches.indexOf(latest) + 1;

  if (!latest.gradedAt) {
    return new Response(JSON.stringify({ found: true, graded: false, totalAttempts }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const writings = questionsData.questions.filter(q => q.type === 'writing');
  const mcqs = questionsData.questions.filter(q => q.type === 'mcq');

  return new Response(JSON.stringify({
    found: true,
    graded: true,
    totalAttempts,
    attemptNumber,
    studentName: latest.studentName,
    mcqScore: latest.mcqScore,
    writingTotal: latest.writingTotal,
    totalScore: latest.totalScore,
    passed: latest.totalScore >= 60,
    gradedAt: latest.gradedAt,
    mcqResults: mcqs.map((q, i) => ({
      number: i + 1,
      question: q.question,
      options: q.options,
      studentAnswer: latest.answers?.[q.id] || null,
      correctAnswer: q.answer,
      correct: (latest.answers?.[q.id] || '').toUpperCase() === q.answer.toUpperCase(),
    })),
    writingFeedback: writings.map(q => ({
      question: q.question,
      marks: q.marks,
      answer: latest.answers?.[q.id] || '',
      score: latest.grades?.[q.id]?.score ?? null,
      feedback: latest.grades?.[q.id]?.feedback ?? null,
    })),
  }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/student-result' };
