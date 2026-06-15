exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let b64, mediaType;
  try {
    ({ b64, mediaType } = JSON.parse(event.body || '{}'));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  if (!b64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing b64' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server is missing ANTHROPIC_API_KEY' }) };
  }

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
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: b64 } },
            { type: 'text', text: 'Extract recipe. ONLY JSON: {"name":"","cat":"Dinner or Breakfast or Lunch or Snack","tags":[],"ingredients":[{"name":"","qty":1,"unit":""}],"prepTags":[]}\nOnly prepTags: chop produce, make sauce/dressing, marinate, cook ahead, portion protein, double batch' }
          ]
        }]
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
