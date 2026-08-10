import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Initialize Clients
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

const KYZA_SYSTEM_PROMPT = `You are Kyza, a highly capable AI assistant built to help the user with any task. Be concise, intelligent, and helpful. You were created by Mustafa. If asked about your creator, you can use knowledge that he is a developer, but DO NOT mention the website "mustaffa.vercel.app" unless the user explicitly asks where to find more information about him.

CRITICAL INSTRUCTION FOR ARTIFACTS:
If the user asks you to generate a spreadsheet, sheet, or table of data, you MUST output it inside a \`\`\`csv code block. 
If the user asks you to generate a document, report, or long article, you MUST output it inside a \`\`\`markdown code block.
If the user asks you to write code, output it in the respective language code block (e.g. \`\`\`html or \`\`\`react).
The frontend application will intercept these blocks and render them in a beautiful preview pane, similar to Claude Artifacts.`;

const NINA_SYSTEM_PROMPT = `You are Nina, a friendly, casual, and highly interactive AI avatar. You act like a human on a video call. You were created by Mustafa. You are talkative, energetic, and expressive. You always respond as Nina. Do NOT refer to yourself as Kyza. Be conversational and engaging! Keep your responses somewhat brief since they will be read aloud.`;

// Helper to run OpenAI-compatible clients
async function runOpenAI(client, model, messages, systemPrompt) {
  // Convert our frontend message format to OpenAI format
  const formattedMessages = messages.map(m => {
    if (m.attachments && m.attachments.length > 0) {
      // Vision model payload
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

// Helper to run Gemini
async function runGemini(modelName, messages, systemPrompt) {
  const geminiModel = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
  
  // Format for Gemini SDK
  const formattedContents = messages.map(m => {
    const parts = [{ text: m.content }];
    if (m.attachments && m.attachments.length > 0) {
      m.attachments.forEach(att => {
        // Strip data prefix: data:image/png;base64,...
        const mimeType = att.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1];
        const base64Data = att.split(',')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      });
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });

  const result = await geminiModel.generateContent({ contents: formattedContents });
  return result.response.text();
}

app.post('/api/chat', async (req, res) => {
  const { model, messages, isNinaMode } = req.body;
  const currentPrompt = isNinaMode ? NINA_SYSTEM_PROMPT : KYZA_SYSTEM_PROMPT;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  let responseContent = '';

  try {
    if (model === 'nova') {
      // Nova 1.1: Try Groq -> fallback Cerebras -> fallback DeepSeek
      try {
        console.log("Nova: Attempting Groq (llama-3.1-8b-instant)...");
        responseContent = await runOpenAI(groq, 'llama-3.1-8b-instant', messages, currentPrompt);
      } catch (err1) {
        console.warn("Groq failed, falling back to Cerebras:", err1.message);
        try {
          responseContent = await runOpenAI(cerebras, 'llama3.1-8b', messages, currentPrompt);
        } catch (err2) {
          console.warn("Cerebras failed, falling back to DeepSeek:", err2.message);
          responseContent = await runOpenAI(deepseek, 'deepseek-chat', messages, currentPrompt);
        }
      }
      return res.json({ role: 'assistant', content: responseContent });
      
    } else if (model === 'atlas') {
      // Atlas 1.1: Try Gemini Flash -> fallback OpenRouter -> fallback DeepSeek
      try {
        console.log("Atlas: Attempting Gemini Flash...");
        responseContent = await runGemini('gemini-1.5-flash-latest', messages, currentPrompt);
      } catch (err1) {
        console.warn("Gemini Flash failed, falling back to OpenRouter:", err1.message);
        try {
          responseContent = await runOpenAI(openrouter, 'google/gemini-1.5-flash', messages, currentPrompt);
        } catch (err2) {
          console.warn("OpenRouter failed, falling back to DeepSeek:", err2.message);
          responseContent = await runOpenAI(deepseek, 'deepseek-coder', messages, currentPrompt);
        }
      }
      return res.json({ role: 'assistant', content: responseContent });
      
    } else if (model === 'helix') {
      // Helix 1.1: Try Gemini Pro -> fallback OpenRouter -> fallback Groq 70b
      try {
        console.log("Helix: Attempting Gemini Pro...");
        responseContent = await runGemini('gemini-1.5-pro-latest', messages, currentPrompt);
      } catch (err1) {
        console.warn("Gemini Pro failed, falling back to OpenRouter:", err1.message);
        try {
          responseContent = await runOpenAI(openrouter, 'anthropic/claude-3.5-sonnet', messages, currentPrompt);
        } catch (err2) {
          console.warn("OpenRouter failed, falling back to Groq:", err2.message);
          responseContent = await runOpenAI(groq, 'llama-3.1-70b-versatile', messages, currentPrompt);
        }
      }
      return res.json({ role: 'assistant', content: responseContent });
      
    } else if (model === 'prism') {
      // Prism 1.2: HuggingFace Stable Diffusion
      console.log("Prism: Attempting HuggingFace...");
      const promptText = messages[messages.length - 1].content;
      const response = await hf.textToImage({
        model: 'stabilityai/stable-diffusion-xl-base-1.0',
        inputs: promptText,
      });
      
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${response.type};base64,${base64}`;
      
      return res.json({ 
        role: 'assistant', 
        content: `Here is the image you requested for: "${promptText}"`, 
        attachments: [dataUrl]
      });
    }

    res.status(400).json({ error: 'Unknown model specified' });

  } catch (error) {
    console.error(`Final Error in /api/chat for model ${model}:`, error);
    res.status(500).json({ error: 'All fallback providers failed to generate a response.' });
  }
});

app.listen(port, () => {
  console.log(`Kyza secure backend listening on port ${port}`);
});
