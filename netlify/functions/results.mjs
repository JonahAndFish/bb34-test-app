import { getStore } from '@netlify/blobs';
import questionsData from '../../questions.json';

export default async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-teacher-password',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const password = req.headers.get('x-teacher-password');
  if (!password || password !== process.env.TEACHER_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const store = getStore('submissions');
  const { blobs } = await store.list();

  const rawSubmissions = await Promise.all(
    blobs.map(async ({ key }) => {
      const data = await store.get(key, { type: 'json' });
      if (!data?.studentName) return null;
      return { ...data, _key: key };
    })
  );
  const submissions = rawSubmissions.filter(Boolean);
  submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  return new Response(JSON.stringify({ submissions, questions: questionsData.questions, title: questionsData.title }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/results' };
