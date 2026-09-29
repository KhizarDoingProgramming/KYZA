import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const hasKey = (v) => typeof v === 'string' && v.trim().length > 0;
const K = (v) => (hasKey(v) ? v.trim() : 'missing-key');

const groq = new Groq({ apiKey: K(process.env.GROQ_API_KEY) });
const genAI = new GoogleGenerativeAI(K(process.env.GEMINI_API_KEY));

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: K(process.env.OPENROUTER_API_KEY),
});

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: K(process.env.DEEPSEEK_API_KEY),
});

const cerebras = new OpenAI({
  baseURL: "https://api.cerebras.ai/v1",
  apiKey: K(process.env.CEREBRAS_API_KEY),
});

const cohere = new OpenAI({
  baseURL: "https://api.cohere.ai/compatibility/v1",
  apiKey: K(process.env.COHERE_API_KEY),
});

const KYZA_SYSTEM_PROMPT = `You are Kyza, a highly capable AI assistant built to help the user with any task. Be concise, intelligent, and helpful. You were created by Mustafa. If asked about your creator, you can use knowledge that he is a developer, but DO NOT mention the website "mustaffa.vercel.app" unless the user explicitly asks where to find more information about him.

CRITICAL INSTRUCTION FOR ARTIFACTS:
If the user asks you to generate a spreadsheet, sheet, or table of data, you MUST output it inside a \`\`\`csv code block. 
If the user asks you to generate a document, report, or long article, you MUST output it inside a \`\`\`markdown code block.
If the user asks you to write code, output it in the respective language code block (e.g. \`\`\`html or \`\`\`react).
The frontend application will intercept these blocks and render them in a beautiful preview pane, similar to Claude Artifacts.`;

const NINA_SYSTEM_PROMPT = `You are Nina, a friendly, casual, and highly interactive AI avatar. You act like a human on a video call. You were created by Mustafa. You are talkative, energetic, and expressive. You always respond as Nina. Do NOT refer to yourself as Kyza. Be conversational and engaging! Keep your responses somewhat brief since they will be read aloud. If the user speaks to you in Urdu or Roman Urdu, you MUST reply in fluent Urdu using the Urdu script (اردو).`;

const NOVA_MAINTENANCE = "Nova is under maintenance right now, it'll be back soon. Pick Atlas or Helix and I'm good to go.";

async function runOpenAI(client, model, messages, systemPrompt) {
  const formattedMessages = messages.map(m => {
    if (m.attachments && m.attachments.length > 0) {
      return {
        role: m.role,
        content: [
          { type: "text", text: m.content },
          ...m.attachments.map(att => ({
            type: "image_url",
            image_url: { url: att }
          }))
        ]
      };
    }
    return { role: m.role, content: m.content };
  });

  const completion = await client.chat.completions.create({
    model: model,
    messages: [{ role: 'system', content: systemPrompt }, ...formattedMessages],
  });
  const text = completion?.choices?.[0]?.message?.content;
  if (!text || !String(text).trim()) {
    throw new Error(`empty reply from ${model}`);
  }
  return String(text);
}

async function runGemini(modelName, messages, systemPrompt) {
  const geminiModel = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });

  const formattedContents = messages.map(m => {
    const parts = [{ text: m.content }];
    if (m.attachments && m.attachments.length > 0) {
      m.attachments.forEach(att => {
        const match = att.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        if (match) {
          const mimeType = match[1];
          const base64Data = att.split(',')[1];
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        }
      });
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const result = await geminiModel.generateContent({ contents: formattedContents });
  const text = result?.response?.text?.();
  if (!text || !String(text).trim()) {
    throw new Error(`empty reply from ${modelName}`);
  }
  return String(text);
}

// Last resort: keyless public endpoints so chat never dies with "backend is down"
async function keylessPost(messages, systemPrompt) {
  const payload = {
    model: 'openai',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content || '' }))
    ]
  };
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`keyless POST returned ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || !String(text).trim()) throw new Error('empty reply from keyless POST');
  return String(text);
}

async function keylessGet(messages, systemPrompt) {
  const prompt = messages[messages.length - 1]?.content || 'hello';
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&system=${encodeURIComponent(systemPrompt)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`keyless GET returned ${res.status}`);
  const text = await res.text();
  if (!text || !text.trim() || text.trim().startsWith('The API key')) {
    throw new Error('empty/unavailable reply from keyless GET');
  }
  return text;
}

async function runKeyless(messages, systemPrompt) {
  const attempts = [
    () => keylessPost(messages, systemPrompt),
    () => keylessGet(messages, systemPrompt),
    () => keylessPost(messages, systemPrompt),
    () => keylessGet(messages, systemPrompt)
  ];
  const waits = [1500, 3000, 6000];
  const errors = [];
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await attempts[i]();
    } catch (err) {
      errors.push(err?.message || String(err));
      if (i < waits.length) await new Promise(r => setTimeout(r, waits[i]));
    }
  }
  throw new Error(`keyless endpoint unavailable (${errors.join(' | ')})`);
}

// Runs every attempt in order and returns the first non-empty reply.
async function runChain(label, attempts) {
  const failures = [];
  for (const attempt of attempts) {
    if (!attempt.enabled) {
      failures.push(`${attempt.name}: no API key`);
      continue;
    }
    try {
      const text = await attempt.run();
      if (failures.length) {
        console.log(`[${label}] recovered via ${attempt.name} (earlier: ${failures.join(' | ')})`);
      }
      return text;
    } catch (err) {
      const reason = `${attempt.name}: ${err?.message || err}`;
      failures.push(reason);
      console.warn(`[${label}] ${reason} -> trying next provider`);
    }
  }
  throw new Error(`${label} has no working provider -> ${failures.join(' | ')}`);
}

app.post('/api/chat', async (req, res) => {
  const { model, messages, isNinaMode } = req.body;
  const currentPrompt = isNinaMode ? NINA_SYSTEM_PROMPT : KYZA_SYSTEM_PROMPT;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  const hasAttachments = messages.some(m => m.attachments && m.attachments.length > 0);

  if (model === 'nova') {
    return res.json({ role: 'assistant', content: NOVA_MAINTENANCE });
  }

  let effectiveModel = model;
  if (isNinaMode && effectiveModel === 'prism') {
    effectiveModel = 'atlas';
  }
  if (hasAttachments) {
    effectiveModel = 'atlas';
  }

  const oa = (provider, client, key, modelName) => ({
    name: `${provider}:${modelName}`,
    enabled: hasKey(key),
    run: () => runOpenAI(client, modelName, messages, currentPrompt)
  });
  const gm = (provider, key, modelName) => ({
    name: `${provider}:${modelName}`,
    enabled: hasKey(key),
    run: () => runGemini(modelName, messages, currentPrompt)
  });
  const keyless = {
    name: 'keyless',
    enabled: true,
    run: () => runKeyless(messages, currentPrompt)
  };

  try {
    if (effectiveModel === 'atlas') {
      const content = await runChain('atlas', [
        gm('gemini', process.env.GEMINI_API_KEY, 'gemini-3.5-flash'),
        gm('gemini', process.env.GEMINI_API_KEY, 'gemini-2.5-flash'),
        oa('openrouter', openrouter, process.env.OPENROUTER_API_KEY, 'google/gemini-3.5-flash'),
        oa('groq', groq, process.env.GROQ_API_KEY, 'llama-3.1-8b-instant'),
        oa('deepseek', deepseek, process.env.DEEPSEEK_API_KEY, 'deepseek-chat'),
        keyless
      ]);
      return res.json({ role: 'assistant', content });
    }

    if (effectiveModel === 'helix') {
      const content = await runChain('helix', [
        oa('cohere', cohere, process.env.COHERE_API_KEY, 'command-a-plus-05-2026'),
        oa('cohere', cohere, process.env.COHERE_API_KEY, 'command-r-plus'),
        oa('groq', groq, process.env.GROQ_API_KEY, 'llama-3.3-70b-versatile'),
        oa('cerebras', cerebras, process.env.CEREBRAS_API_KEY, 'gpt-oss-120b'),
        oa('openrouter', openrouter, process.env.OPENROUTER_API_KEY, 'openai/gpt-4o'),
        gm('gemini', process.env.GEMINI_API_KEY, 'gemini-3.5-flash'),
        keyless
      ]);
      return res.json({ role: 'assistant', content });
    }

    if (effectiveModel === 'prism') {
      if (!messages.length) {
        return res.status(400).json({ error: 'Messages array is empty.' });
      }
      const promptText = messages[messages.length - 1].content || 'random image';
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 10000)}&nologo=true`;

      try {
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
          throw new Error(`Pollinations returned ${imageRes.status}`);
        }
        const arrayBuffer = await imageRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64}`;

        return res.json({
          role: 'assistant',
          content: `Here is the image you requested for: "${promptText}"`,
          attachments: [dataUrl]
        });
      } catch (err) {
        return res.json({
          role: 'assistant',
          content: `Here is the image you requested for: "${promptText}"`,
          attachments: [imageUrl]
        });
      }
    }

    return res.status(400).json({ error: 'Unknown model specified' });

  } catch (error) {
    console.error(`Final Error in /api/chat for model ${effectiveModel}:`, error);
    res.status(502).json({ error: 'All providers are unreachable right now. Check your API keys and try again.' });
  }
});

app.listen(port, () => {
  console.log(`Kyza secure backend listening on port ${port}`);
});
