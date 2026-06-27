import questionsData from '../../questions.json';

export default async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const safe = {
    title: questionsData.title,
    topic: questionsData.topic,
    sections: questionsData.sections,
    questions: questionsData.questions.map(({ answer: _a, ...q }) => q),
  };

  return new Response(JSON.stringify(safe), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/questions' };
