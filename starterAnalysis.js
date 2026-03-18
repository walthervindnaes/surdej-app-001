// ai/starterAnalysis.js
// ─────────────────────────────────────────────────────────────────────────────
// Levain — AI-analyse af surdej via Claude Vision API
//
// Kræver: npm install axios
// API nøgle: Opret en på console.anthropic.com → API Keys
// Sæt i .env: ANTHROPIC_API_KEY=sk-ant-...
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';

// ── Tag billede og analysér ───────────────────────────────────────────────────

/**
 * Åbner kamera, tager et billede og returnerer AI-analyse
 * @param {string} apiKey  - Anthropic API nøgle (hent fra din backend!)
 * @returns {StarterAnalysis}
 */
export async function captureAndAnalyzeStarter(apiKey) {
  // Bed om kamera-tilladelse
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Kamera-tilladelse afvist');
  }

  // Tag billede
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    base64: true,
  });

  if (result.canceled) return null;

  const base64Image = result.assets[0].base64;
  return analyzeStarterImage(base64Image, apiKey);
}

/**
 * Analysér et eksisterende billede (base64)
 * @param {string} base64Image  - Billedet som base64 string
 * @param {string} apiKey       - Anthropic API nøgle
 * @returns {StarterAnalysis}
 */
export async function analyzeStarterImage(base64Image, apiKey) {
  const prompt = `Du er en ekspert i surdejsbagning. Analysér dette billede af en surdej (levain/starter) og vurder om den er klar til at bage med.

Kig efter følgende tegn:

KLAR til bagning:
- Har hævet til mindst det dobbelte
- Mange bobler synlige (både på overfladen og i siderne)
- Kuppelformet top (peak) — ikke sunket ind
- Let og luftig konsistens
- Passer float-testen (en klat flyder i vand)

IKKE klar endnu:
- Har ikke hævet nok
- Få eller ingen bobler
- Flad eller sunket overflade
- Ser inaktiv ud

Svar KUN med et JSON-objekt i dette format (ingen anden tekst, ingen markdown):
{
  "ready": true eller false,
  "confidence": et tal mellem 0 og 100,
  "verdict": "én sætning der beskriver hvad du ser",
  "signs": ["positiv observation 1", "positiv observation 2"],
  "concerns": ["eventuel bekymring 1"],
  "advice": "konkret råd til bageren på dansk",
  "waitHours": 0
}

Hvis surdejen ikke er klar, sæt waitHours til det estimerede antal timer den skal vente.
Svar altid på dansk.`;

  try {
    const response = await axios.post(
      CLAUDE_API,
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type':    'application/json',
          'x-api-key':       apiKey,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    const raw  = response.data.content[0].text;
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);

  } catch (err) {
    console.error('AI analyse fejl:', err.message);
    throw new Error('Kunne ikke analysere billedet. Prøv igen.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIKKERHED — hent API nøglen fra din backend, ALDRIG hardcode den i appen!
// ─────────────────────────────────────────────────────────────────────────────
//
// Tilføj til server.js:
//
// app.get('/api/analysis-token', (req, res) => {
//   // Tilføj auth-tjek her når I har login
//   res.json({ key: process.env.ANTHROPIC_API_KEY });
// });
//
// Og hent den i appen:
//
// const { key } = await fetch('https://jeres-server.dk/api/analysis-token').then(r => r.json());
// const result  = await analyzeStarterImage(base64, key);
// ─────────────────────────────────────────────────────────────────────────────

// StarterAnalysis type:
// {
//   ready:      boolean       — er surdejen klar?
//   confidence: number        — 0-100, hvor sikker er AI'en
//   verdict:    string        — kort beskrivelse
//   signs:      string[]      — positive observationer
//   concerns:   string[]      — bekymringer
//   advice:     string        — konkret råd
//   waitHours:  number        — timer til den er klar (0 hvis klar nu)
// }
