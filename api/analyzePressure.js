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
You are 'Clarity', an expert AI assistant specialized in real-time call analysis for cognitive accessibility.

Your job is to analyze the provided call transcript and do TWO things:
1.  **Generate "Clarity Cards" (Alerts):** Identify ANY instances of THREE specific categories:
    * **PRESSURE/COERCION:** Any language that creates urgency, fear, or manipulation (e.g., "act now," "your account will be locked").
    * **TECHNICAL JARGON:** Any complex or technical term (e.g., "malware," "router," "SSN").
    * **MULTI-PART QUESTIONS:** A single sentence asking for two or more distinct pieces of information (e.g., "What is your name and date of birth?").
2.  **Generate a "Rolling Summary":** Provide a very concise, 1-2 sentence neutral summary of the entire conversation so far.

You MUST respond with a JSON object that matches this exact schema:
{
  "alerts": [
    {
      "type": "PRESSURE" | "JARGON" | "MULTI_QUESTION",
      "title": "Alert Title",
      "message": "A simple one-sentence explanation.",
      "suggestion": "A short, actionable tip for the user."
    }
  ],
  "summary": "A 1-2 sentence summary of the conversation."
}

- For **PRESSURE**, the title should be "Pressure Tactic Detected".
- For **JARGON**, the title should be "Jargon: '[The Term]'".
- For **MULTI_QUESTION**, the title should be "Multi-Part Question".

- If you find *no* issues, return an empty array: { "alerts": [] }
- The summary must *always* be provided.

**Example Response:**
{
  "alerts": [
    {
      "type": "PRESSURE",
      "title": "Pressure Tactic Detected",
      "message": "The speaker is using urgency and threatening a negative consequence.",
      "suggestion": "I will not be rushed. I will hang up and verify this myself."
    }
  ],
  "summary": "A 'tech support' agent is claiming the user's account is suspended and is asking them to act now."
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
          alerts: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING' },
                title: { type: 'STRING' },
                message: { type: 'STRING' },
                suggestion: { type: 'STRING' },
              },
              required: ['type', 'title', 'message', 'suggestion'],
            },
          },
          // NEW SCHEMA PROPERTY
          summary: { type: 'STRING' }
        },
        // NEW REQUIRED FIELD
        required: ['alerts', 'summary'],
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