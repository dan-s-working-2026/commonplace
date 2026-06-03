const ALLOWED_ORIGIN = "https://dan-s-working-2026.github.io";
const MAX_BODY_BYTES = 20_000;

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, request);
    }

    if (url.pathname === "/oracle") {
      return handleOracle(request, env);
    }

    if (url.pathname === "/relay") {
      return handleRelay(request);
    }

    return jsonResponse({ error: "Not found." }, 404, request);
  },
};

function handleOptions(request) {
  const origin = request.headers.get("Origin");
  if (origin !== ALLOWED_ORIGIN) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

async function handleOracle(request, env) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonResponse({ error: error.message }, 400, request);
  }

  const voiceSystem = cleanString(body.voiceSystem);
  const voiceName = cleanString(body.voiceName) || "this voice";
  const context = cleanString(body.context);

  if (!voiceSystem) {
    return jsonResponse({ error: "Missing voiceSystem." }, 400, request);
  }

  if (!context) {
    return jsonResponse({ error: "Missing context." }, 400, request);
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse({ error: "OpenAI is not configured for this Worker." }, 500, request);
  }

  const systemPrompt = `${voiceSystem}

You are speaking for Commonplace, a wisdom interpretation engine by MGMS.

Be genuinely insightful and fully in character.
Speak as if beside this person, not above them.
Give 4 to 5 rich sentences of interpretation, then one closing thought or question that is authentically yours.
No preamble.
Do not start with "As ${voiceName}" or any similar opener.
Do not mention that you are an AI model.
Do not break character.`;

  const userPrompt = `${context}

What do you make of what is really happening here?`;

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-4o-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_output_tokens: 700,
      temperature: 0.85,
    }),
  });

  if (!openAiResponse.ok) {
    const message = openAiResponse.status === 401
      ? "OpenAI authentication failed. Check the Worker secret."
      : `OpenAI request failed with status ${openAiResponse.status}.`;
    return jsonResponse({ error: message }, 502, request);
  }

  let data;
  try {
    data = await openAiResponse.json();
  } catch (_) {
    return jsonResponse({ error: "OpenAI returned an unreadable response." }, 502, request);
  }

  const text = extractOutputText(data);
  if (!text) {
    return jsonResponse({ error: "OpenAI returned no text." }, 502, request);
  }

  return jsonResponse({ text }, 200, request);
}

async function handleRelay(request) {
  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonResponse({ error: error.message }, 400, request);
  }

  if (!cleanString(body.content)) {
    return jsonResponse({ error: "Missing content." }, 400, request);
  }

  // TODO: Add Resend, SendGrid, Formspree, Netlify Forms, or another email service for real delivery.
  return jsonResponse({ ok: true }, 200, request);
}

async function readJsonBody(request) {
  const length = Number(request.headers.get("Content-Length") || "0");
  if (length > MAX_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new Error("Request body is too large.");
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch (_) {
    throw new Error("Request body must be valid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object.");
  }

  return body;
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  return data.output
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .filter(content => content.type === "output_text" && typeof content.text === "string")
    .map(content => content.text)
    .join("")
    .trim();
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function jsonResponse(payload, status, request) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...jsonHeaders,
      ...corsHeaders(request),
    },
  });
}

function corsHeaders(request) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };

  if (!request || request.headers.get("Origin") === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
  }

  return headers;
}
