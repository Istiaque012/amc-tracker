// Vercel serverless function — proxy to OpenAI API for AI Study Advisor
// POST /api/ai-advisor  { studyData: {...} }

export default async function handler(req, res) {
  // CORS headers for Vercel preview/production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });

  const { studyData } = req.body || {};
  if (!studyData) return res.status(400).json({ error: 'Missing studyData' });

  const systemPrompt = `You are a concise, encouraging medical study advisor for an AMC MCQ exam candidate. You receive a JSON snapshot of their study progress and must return a structured JSON response.

RULES:
- Be specific, actionable, and encouraging.
- Reference actual numbers from the data.
- Never invent data the snapshot doesn't contain.
- Keep each string under 120 characters.
- Return ONLY valid JSON, no markdown fences.

Return this exact JSON structure:
{
  "assessment": "1-2 sentence overall assessment of where the student stands",
  "achievable": true/false — whether the exam goal looks achievable at current pace,
  "priorities": [
    { "title": "short title", "detail": "1 sentence explanation", "urgency": "high"|"medium"|"low" }
  ],
  "weeklyPlan": [
    { "day": "Monday", "focus": "what to focus on" },
    { "day": "Tuesday", "focus": "..." },
    { "day": "Wednesday", "focus": "..." },
    { "day": "Thursday", "focus": "..." },
    { "day": "Friday", "focus": "..." },
    { "day": "Saturday", "focus": "..." },
    { "day": "Sunday", "focus": "..." }
  ],
  "reschedule": "If behind pace, a specific suggestion on how to catch up. If on track, null."
}

Priorities: return 3-5 items sorted by urgency.`;

  const userMessage = `Here is the student's current study snapshot:\n${JSON.stringify(studyData, null, 2)}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[ai-advisor] OpenAI error:', response.status, errBody);
      return res.status(502).json({ error: 'OpenAI API error', status: response.status });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let advice;
    try {
      advice = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        advice = JSON.parse(match[0]);
      } else {
        return res.status(502).json({ error: 'Failed to parse AI response', raw: text.slice(0, 500) });
      }
    }

    return res.status(200).json({ advice });
  } catch (err) {
    console.error('[ai-advisor] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
