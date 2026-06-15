exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let url;
  try {
    ({ url } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  if (!url) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing url' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server is missing ANTHROPIC_API_KEY' }) };
  }

  const prompt = `Visit this URL and extract the recipe: ${url}

Use web search / fetch to read the actual page content, then return ONLY valid JSON (no other text, no markdown fences) in this exact structure:
{"name":"","cat":"Dinner","tags":[],"ingredients":[{"name":"","qty":1,"unit":""}],"prepTags":[],"url":"${url}"}

Rules:
- cat must be exactly one of: Dinner, Breakfast, Lunch, Snack
- tags: short descriptors like gluten-free, quick, kid-friendly, whole30, paleo
- qty must be a number (convert fractions like 1/2 to 0.5, 3/4 to 0.75)
- unit should be a short string like cups, tbsp, tsp, lbs, oz, each, cloves, can
- prepTags only from: chop produce, make sauce/dressing, marinate, cook ahead, portion protein, double batch
- Include every ingredient listed in the recipe, including optional garnishes
- Return ONLY the JSON object as your final output, no markdown formatting, no explanation, no code fences`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }]
      })
    });

    const data = await resp.json();
    return {
      statusCode: resp.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Failed to reach Anthropic API: ' + e.message }) };
  }
};
