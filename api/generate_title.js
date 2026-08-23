import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are a title generator. Given the start of a conversation, generate a short, concise, and catchy title (3-5 words max) for the chat. 
Return ONLY the title string. Do not include quotes, prefixes, or any extra text.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  // Use only the text content from the messages for title generation
  const textMessages = messages.map(m => ({ role: m.role, content: m.content })).slice(0, 2);

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  try {
    // Try Groq (very fast)
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192', // Fast, small model is perfect for titles
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...textMessages],
      max_tokens: 15
    });
    
    let title = completion.choices[0].message.content.trim();
    title = title.replace(/^["'](.*)["']$/, '$1'); // Strip quotes if any
    
    return res.status(200).json({ title });
  } catch (err1) {
    console.error("Groq title generation failed, falling back to Gemini", err1);
    try {
      // Fallback to Gemini
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', systemInstruction: SYSTEM_PROMPT });
      const formattedContents = textMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user', 
        parts: [{ text: m.content }]
      }));
      const result = await geminiModel.generateContent({ contents: formattedContents });
      let title = result.response.text().trim();
      title = title.replace(/^["'](.*)["']$/, '$1'); // Strip quotes if any
      
      return res.status(200).json({ title });
    } catch (err2) {
      console.error("All title generation failed", err2);
      return res.status(500).json({ error: 'Failed to generate title' });
    }
  }
}
