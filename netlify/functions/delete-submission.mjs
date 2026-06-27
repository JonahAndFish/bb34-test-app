import { getStore } from '@netlify/blobs';

export default async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-teacher-password',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'DELETE') return new Response('Method not allowed', { status: 405 });

  const password = req.headers.get('x-teacher-password');
  if (!password || password !== process.env.TEACHER_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { key } = await req.json();
  if (!key) {
    return new Response(JSON.stringify({ error: 'Missing key' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const store = getStore('submissions');
  await store.delete(key);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/delete-submission' };
