import Anthropic from '@anthropic-ai/sdk';
import questionsData from '../../questions.json';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a Socratic AI tutor helping Boys' Brigade students prepare for the 34th Singapore Company Target Test.

Your role is to GUIDE students to discover answers themselves using questions, hints, and encouragement. Do NOT simply give them the answers directly. Instead:
- Ask guiding questions to help them think it through
- Give hints if they are stuck
- Affirm correct thinking warmly
- Correct gently with more guiding questions if they are wrong

Here is all the study material for this test:

${questionsData.chatContext}

Keep your responses clear, warm, and concise. Use simple language suitable for secondary school students. Format responses with markdown when helpful (bold key terms, use lists for multiple points).`;

export default async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server.' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { messages } = await req.json();

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
};

export const config = { path: '/api/chat' };
