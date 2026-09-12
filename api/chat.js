import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

const KYZA_SYSTEM_PROMPT = `You are Kyza, a highly capable AI assistant built to help the user with any task. Be concise, intelligent, and helpful. You were created by Mustafa. If asked about your creator, you can use knowledge that he is a developer, but DO NOT mention the website "mustaffa.vercel.app" unless the user explicitly asks where to find more information about him.

CRITICAL INSTRUCTION FOR ARTIFACTS:
If the user asks you to generate a spreadsheet, sheet, or table of data, you MUST output it inside a \`\`\`csv code block. 
If the user asks you to generate a document, report, or long article, you MUST output it inside a \`\`\`markdown code block.
If the user asks you to write code, output it in the respective language code block (e.g. \`\`\`html or \`\`\`react).
The frontend application will intercept these blocks and render them in a beautiful preview pane, similar to Claude Artifacts.`;

const NINA_SYSTEM_PROMPT = `You are Nina, a friendly, casual, and highly interactive AI avatar. You act like a human on a video call. You were created by Mustafa. You are talkative, energetic, and expressive. You always respond as Nina. Do NOT refer to yourself as Kyza. Be conversational and engaging! Keep your responses somewhat brief since they will be read aloud. If the user speaks to you in Urdu or Roman Urdu, you MUST reply in fluent Urdu using the Urdu script (اردو).`;

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
  return completion.choices[0].message.content;
}

async function runGemini(modelName, messages, genAI, systemPrompt) {
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
  return result.response.text();
}

export default async function handler(req, res) {
  
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
  
  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  const deepseek = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
  const cerebras = new OpenAI({
    baseURL: "https://api.cerebras.ai/v1",
    apiKey: process.env.CEREBRAS_API_KEY,
  });
  const cohere = new OpenAI({
    baseURL: "https://api.cohere.com/v1",
    apiKey: process.env.COHERE_API_KEY,
  });

  const { model, messages, isNinaMode } = req.body;
  const currentPrompt = isNinaMode ? NINA_SYSTEM_PROMPT : KYZA_SYSTEM_PROMPT;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  let responseContent = '';

  try {
    if (model === 'nova') {
      try {
        responseContent = await runOpenAI(cohere, 'command-r', messages, currentPrompt);
      } catch (err1) {
        try {
          responseContent = await runOpenAI(groq, 'groq/compound-mini', messages, currentPrompt);
        } catch (err2) {
          try {
            responseContent = await runOpenAI(cerebras, 'gemma-4-31b', messages, currentPrompt);
          } catch (err3) {
            responseContent = await runOpenAI(deepseek, 'deepseek-chat', messages, currentPrompt);
          }
        }
      }
      return res.status(200).json({ role: 'assistant', content: responseContent });
      
    } else if (model === 'atlas') {
      try {
        responseContent = await runGemini('gemini-3.5-flash', messages, genAI, currentPrompt);
      } catch (err1) {
        try {
          responseContent = await runOpenAI(openrouter, 'google/gemini-3.5-flash', messages, currentPrompt);
        } catch (err2) {
          responseContent = await runOpenAI(deepseek, 'deepseek-chat', messages, currentPrompt);
        }
      }
      return res.status(200).json({ role: 'assistant', content: responseContent });
      
    } else if (model === 'helix') {
      try {
        responseContent = await runOpenAI(cohere, 'command-r-plus', messages, currentPrompt);
      } catch (err1) {
        try {
          responseContent = await runOpenAI(groq, 'groq/compound', messages, currentPrompt);
        } catch (err2) {
          try {
            responseContent = await runOpenAI(openrouter, 'openai/gpt-4o', messages, currentPrompt);
          } catch (err3) {
            responseContent = await runGemini('gemini-3.5-flash', messages, genAI, currentPrompt);
          }
        }
      }
      return res.status(200).json({ role: 'assistant', content: responseContent });
      
    } else if (model === 'prism') {
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
        
        return res.status(200).json({ 
          role: 'assistant', 
          content: `Here is the image you requested for: "${promptText}"`, 
          attachments: [dataUrl]
        });
      } catch (err) {
        return res.status(200).json({ 
          role: 'assistant', 
          content: `Here is the image you requested for: "${promptText}"`, 
          attachments: [imageUrl]
        });
      }
    }

    res.status(400).json({ error: 'Unknown model specified' });

  } catch (error) {
    console.error(`Error in /api/chat:`, error);
    res.status(500).json({ error: 'All fallback providers failed.' });
  }
}
