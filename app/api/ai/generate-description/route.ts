import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { query } from '@/lib/db';

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';
const API_TIMEOUT = 15000; // 15 seconds
const MAX_DESCRIPTION_LENGTH = 400; // Leave room for user edits

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

function buildPrompt(url: string, currentDescription?: string, modificationInstructions?: string): string {
  // Case 1: User wants to modify existing description
  if (currentDescription && modificationInstructions) {
    return `You are a helpful assistant that improves bookmark descriptions based on user feedback.

Current description: "${currentDescription}"

User's modification request: "${modificationInstructions}"

Requirements:
- Apply the user's requested changes to the description
- Keep length at 2-3 sentences (maximum ${MAX_DESCRIPTION_LENGTH} characters)
- Maintain professional, informative tone
- If user asks to make it shorter/longer, adjust accordingly
- If user asks to focus on specific aspects, emphasize those

Generate the modified description:`;
  }

  // Case 2: User wants completely new description (regenerate)
  if (currentDescription && !modificationInstructions) {
    return `You are a helpful assistant that generates concise, informative descriptions for bookmarked web pages.

URL: ${url}

Previous description: "${currentDescription}"

Requirements:
- Generate a DIFFERENT description with fresh perspective
- Length: 2-3 sentences (maximum ${MAX_DESCRIPTION_LENGTH} characters)
- Tone: Professional and informative
- Focus on what the page offers, not generic statements
- No marketing language or superlatives
- Don't start with "This is..." or "This page..."
- Do NOT repeat the previous description

Generate new description:`;
  }

  // Case 3: Initial generation (no description exists)
  return `You are a helpful assistant that generates concise, informative descriptions for bookmarked web pages.

URL: ${url}

Requirements:
- Generate a description that captures the main purpose/content of the page
- Length: 2-3 sentences (maximum ${MAX_DESCRIPTION_LENGTH} characters)
- Tone: Professional and informative
- Focus on what the page offers, not generic statements
- No marketing language or superlatives
- Don't start with "This is..." or "This page..."

Generate description:`;
}

export async function POST(request: Request) {
  const authResult = await auth();
  const userId = authResult.userId;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Get user's Gemini API token from database
    type SettingsRow = { gemini_api_token: string | null };
    const settings = await query<SettingsRow>(
      'SELECT gemini_api_token FROM sync_settings WHERE user_id = $1',
      [userId]
    );

    if (!settings.length || !settings[0].gemini_api_token) {
      return NextResponse.json(
        { error: 'Gemini API token not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    const apiToken = settings[0].gemini_api_token;

    // 2. Parse and validate request body
    const body = await request.json();
    const { url, currentDescription, modificationInstructions } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Validate modification instructions if provided
    if (modificationInstructions && typeof modificationInstructions !== 'string') {
      return NextResponse.json({ error: 'Invalid modification instructions' }, { status: 400 });
    }

    // 3. Build prompt (handles 3 cases: initial, regenerate, modify)
    const prompt = buildPrompt(url, currentDescription, modificationInstructions);

    // 4. Call Gemini API
    const geminiUrl = `${GEMINI_API_ENDPOINT}?key=${apiToken}`;
    const geminiResponse = await fetchWithTimeout(
      geminiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
            topP: 0.9,
            topK: 40,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        }),
      },
      API_TIMEOUT
    );

    // 5. Handle Gemini API errors
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      console.error('Gemini API error:', geminiResponse.status, errorData);

      if (geminiResponse.status === 401 || geminiResponse.status === 403) {
        return NextResponse.json(
          { error: 'Invalid API token. Please check your Gemini API key in Settings.' },
          { status: 401 }
        );
      }

      if (geminiResponse.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to generate description. Please try again.' },
        { status: 500 }
      );
    }

    // 6. Parse Gemini response
    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini response structure:', geminiData);
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 500 }
      );
    }

    const generatedText = geminiData.candidates[0].content.parts[0].text.trim();

    // 7. Validate and truncate if needed
    const description = generatedText.length > MAX_DESCRIPTION_LENGTH
      ? generatedText.substring(0, MAX_DESCRIPTION_LENGTH) + '...'
      : generatedText;

    // 8. Return success
    return NextResponse.json({
      success: true,
      description,
    });

  } catch (error) {
    console.error('Generate description error:', error);

    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 408 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    );
  }
}
