import { getStore } from '@netlify/blobs';
import questionsData from '../../questions.json';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function calcMcq(answers) {
  return questionsData.questions
    .filter(q => q.type === 'mcq')
    .reduce((score, q) => {
      const given = (answers?.[q.id] || '').toUpperCase();
      return score + (given === q.answer.toUpperCase() ? 2 : 0); // 2 marks each
    }, 0);
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { studentName, answers, pin } = await req.json();

  if (!studentName || !answers || !pin) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const store = getStore('submissions');
  const { blobs } = await store.list();

  for (const { key } of blobs) {
    const existing = await store.get(key, { type: 'json' });
    if (existing?.studentName?.toLowerCase() === studentName.trim().toLowerCase()) {
      if (String(pin) !== String(existing.pin)) {
        return new Response(JSON.stringify({ error: 'wrong_pin' }), {
          status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      break;
    }
  }

  const key = `${studentName.trim().toLowerCase().replace(/\s+/g, '-')}_${Date.now()}`;
  await store.setJSON(key, {
    studentName: studentName.trim(),
    answers,
    pin: String(pin),
    submittedAt: new Date().toISOString(),
    mcqScore: calcMcq(answers),
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/submit' };
