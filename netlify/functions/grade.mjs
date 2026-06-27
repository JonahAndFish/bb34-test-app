import { getStore } from '@netlify/blobs';
import Anthropic from '@anthropic-ai/sdk';
import questionsData from '../../questions.json';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANSWER_KEY = `
Q8 — BB Vesper (10 marks, ~1.25m per line):
"Great God who knowest all our needs,
Bless Thou our watch and guard our sleep;
Forgive our sins of thoughts and deed,
And in Thy peace Thy servants keep.
We thank Thee for the day that's done,
We trust Thee for the days to be;
Thy love we learn in Christ Thy Son,
O may we all His glory see!"
Award marks for each correct line. Deduct for missing or wrong words.

Q9 — BB Table Grace (10 marks, 2.5m per line):
"Be present at our table Lord
Be here and everywhere adored
These mercies bless and grant that we
May feast in fellowship with Thee"
Award marks for each correct line.

Q10 — Motto and Emblem (4 marks: 2m each):
Motto: Sure and Steadfast
Emblem: Anchor and Red Cross

Q11 — Bible verse (2 marks):
Hebrews 6:19 (accept "Hebrew 6:19" or "Heb 6:19")

Q12 — BB Object (15 marks):
Full text: "The advancement of Christ's Kingdom among Boys and the promotion of habits of Obedience, Reverence, Discipline, Self-Respect and all that tends towards a true Christian Manliness."
Key words to check (1m each): Christ's, Kingdom, Boys, habits, Obedience, Reverence, Discipline, Self-Respect, Christian, Manliness. Also award for correct overall structure.

Q13 — 5 types of uniforms (5 marks, 1m each):
1. Day Dress (Full Uniform)
2. Ceremonial Dress
3. Musketry Kit (Half Uniform)
4. Fatigue Dress
5. PT Kit

Q14 — PT Kit for PTE (5 marks, 1m each):
1. Blue BB T-shirt
2. Name tag
3. Dark blue shorts
4. White socks
5. Running shoes

Q15 — 5 NCO ranks (20 marks, 4m each):
1. Lance Corporal (LCP)
2. Corporal (CPL)
3. Sergeant (SGT)
4. Staff Sergeant (SSG)
5. Warrant Officer (WO)
Award 4m per correct rank. Must be in order lowest to highest.

Q16 — Post-secondary program (2 marks):
Primers Program

Q17 — Primers Program ranks (4 marks, 2m each):
a. Cadet Lieutenant
b. Senior Cadet Lieutenant

Q18 — Officers ranks (6 marks, 2m each):
a. Officer Cadet
b. 2nd Lieutenant
c. Lieutenant

Q19 — NCO acronym (2 marks):
Non-Commissioned Officer

Q20 — CSM acronym (2 marks):
Company Sergeant Major
`;

export default async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-teacher-password',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const password = req.headers.get('x-teacher-password');
  if (!password || password !== process.env.TEACHER_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { key } = await req.json();
  const store = getStore('submissions');
  const submission = await store.get(key, { type: 'json' });

  if (!submission) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), {
      status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const writings = questionsData.questions.filter(q => q.type === 'writing');

  const answersText = writings.map(q => {
    const ans = submission.answers?.[q.id] || '(no answer)';
    return `${q.id.toUpperCase()} [${q.marks}m]: ${q.question}\nStudent answer: ${ans}`;
  }).join('\n\n');

  const prompt = `You are marking a Boys' Brigade Target Test for the 34th Singapore Company. Grade each writing answer strictly against the answer key. Return a JSON object with grades for each question.

ANSWER KEY:
${ANSWER_KEY}

STUDENT ANSWERS:
${answersText}

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "grades": {
    "q8":  { "score": <number 0-10>,  "feedback": "<brief comment>" },
    "q9":  { "score": <number 0-10>,  "feedback": "<brief comment>" },
    "q10": { "score": <number 0-4>,   "feedback": "<brief comment>" },
    "q11": { "score": <number 0-2>,   "feedback": "<brief comment>" },
    "q12": { "score": <number 0-15>,  "feedback": "<brief comment>" },
    "q13": { "score": <number 0-5>,   "feedback": "<brief comment>" },
    "q14": { "score": <number 0-5>,   "feedback": "<brief comment>" },
    "q15": { "score": <number 0-20>,  "feedback": "<brief comment>" },
    "q16": { "score": <number 0-2>,   "feedback": "<brief comment>" },
    "q17": { "score": <number 0-4>,   "feedback": "<brief comment>" },
    "q18": { "score": <number 0-6>,   "feedback": "<brief comment>" },
    "q19": { "score": <number 0-2>,   "feedback": "<brief comment>" },
    "q20": { "score": <number 0-2>,   "feedback": "<brief comment>" }
  }
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  const parsed = JSON.parse(raw);
  const { grades } = parsed;

  const writingTotal = Object.values(grades).reduce((sum, g) => sum + (g.score ?? 0), 0);
  const mcqScore = submission.mcqScore ?? 0;
  const totalScore = mcqScore + writingTotal;

  await store.setJSON(key, {
    ...submission,
    grades,
    writingTotal,
    mcqScore,
    totalScore,
    gradedAt: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ grades, writingTotal, mcqScore, totalScore }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/grade' };
