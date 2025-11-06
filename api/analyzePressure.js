export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { transcript } = req.body;

  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY not set' });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

  const systemPrompt = `
You are an expert AI assistant specialized in detecting verbal manipulation and high-pressure sales/scam tactics in real-time. You are a 'Pressure Shield' for a vulnerable user.

The user's app has already detected a "yellow flag" (a suspicious phrase) in the call. Your job is to analyze the provided transcript chunk and determine the *intent* behind the language.

You MUST respond with a JSON object that matches this exact schema:
{
  "is_manipulative": boolean,
  "explanation": string,
  "suggested_response": string
}

- If the speaker's intent is to create FEAR, URGENCY, or to MANIPULATE, set "is_manipulative" to true and fill in the "explanation" and "suggested_response" fields.
- If the language is harmless (e.g., standard marketing) or you are unsure, set "is_manipulative" to false and the other fields to empty strings "".

Example of a manipulative response:
{
  "is_manipulative": true,
  "explanation": "This is a classic tactic to rush you. They are trying to stop you from thinking clearly.",
  "suggested_response": "I need to think about this and call you back."
}

Example of a harmless response:
{
  "is_manipulative": false,
  "explanation": "",
  "suggested_response": ""
}
  `;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: transcript }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          is_manipulative: { type: 'BOOLEAN' },
          explanation: { type: 'STRING' },
          suggested_response: { type: 'STRING' },
        },
        required: ['is_manipulative', 'explanation', 'suggested_response'],
      },
      temperature: 0.1,
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Gemini API Error:', errorBody);
      return res.status(500).json({ error: 'Failed to get response from AI' });
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0].content) {
      console.error('Invalid Gemini Response:', data);
      return res.status(500).json({ error: 'Invalid AI response structure' });
    }

    const aiResponse = JSON.parse(data.candidates[0].content.parts[0].text);

    return res.status(200).json(aiResponse);

  } catch (error) {
    console.error('Error in analyzePressure function:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}