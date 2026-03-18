// breadEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Levain — Brød-algoritme motor
// Importer i React Native: import { generateRecipe } from './breadEngine';
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hovedfunktion — tager slider-værdier og returnerer en komplet opskrift.
 *
 * @param {Object} params
 * @param {number} params.sourness    - Surhed       0–100
 * @param {number} params.crustiness  - Sprødhed     0–100
 * @param {number} params.openness    - Luftighed    0–100
 * @param {string} params.timeMode    - 'quick' | 'evening' | 'weekend'
 * @param {number} params.flourGrams  - Mel i gram (default 450)
 *
 * @returns {RecipeOutput}
 */
export function generateRecipe({
  sourness   = 50,
  crustiness = 50,
  openness   = 50,
  timeMode   = 'weekend',
  flourGrams = 450,
} = {}) {

  // ── 1. BEREGN BASEPARAMETRE ───────────────────────────────────────────────

  const params = computeParams({ sourness, crustiness, openness, timeMode });

  // ── 2. BEREGN INGREDIENSER ────────────────────────────────────────────────

  const ingredients = computeIngredients(flourGrams, params);

  // ── 3. GENERER TIDSPLAN ───────────────────────────────────────────────────

  const schedule = computeSchedule(params, timeMode);

  // ── 4. KONFLIKT-ADVARSLER ─────────────────────────────────────────────────

  const warnings = computeWarnings({ sourness, crustiness, openness });

  return {
    params,
    ingredients,
    schedule,
    warnings,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// INTERN LOGIK
// ─────────────────────────────────────────────────────────────────────────────

function computeParams({ sourness, crustiness, openness, timeMode }) {
  // Hydrering: luftighed driver vandmængden (65–88%)
  let hydration = 65 + Math.round(openness * 0.23);

  // Konflikt: høj luftighed + høj sprødhed → loft på hydrering
  if (openness > 75 && crustiness > 75) {
    hydration = Math.min(hydration, 78);
  }
  hydration = clamp(hydration, 65, 88);

  // Surdejsmængde: surhed driver inokulationsprocenten (10–28%)
  let starterPct = 10 + Math.round(sourness * 0.18);

  // Konflikt: høj surhed + høj luftighed → nedbryder gluten → loft på starter
  if (sourness > 75 && openness > 75) {
    starterPct = Math.min(starterPct, 22);
  }
  starterPct = clamp(starterPct, 10, 28);

  // Ovntemperatur: sprødhed driver temperaturen (230–260°C)
  const ovenTemp = clamp(230 + Math.round(crustiness * 0.3), 230, 260);

  // Bagetid: opdelt i med-låg og uden-låg
  const lidMinutes   = crustiness > 60 ? 15 : 20;
  const totalMinutes = clamp(35 + Math.round(crustiness * 0.12), 35, 50);
  const noLidMinutes = totalMinutes - lidMinutes;

  // Hævetid ved stuetemperatur
  const roomHours = timeMode === 'quick' ? 4 : timeMode === 'evening' ? 3 : 2;

  // Koldhævning (kun weekend og evening)
  const coldHours = timeMode === 'quick'
    ? 0
    : clamp(Math.round(sourness * 0.14 + 6), 8, 24);

  // Antal stretch & fold: luftighed bestemmer glutenudvikling
  const folds = openness > 65 ? 4 : openness > 35 ? 3 : 2;

  // Autolyse: altid 30 min
  const autolyseMinutes = 30;

  return {
    hydration,
    starterPct,
    ovenTemp,
    lidMinutes,
    noLidMinutes,
    totalBakeMinutes: totalMinutes,
    roomHours,
    coldHours,
    folds,
    autolyseMinutes,
  };
}


function computeIngredients(flour, params) {
  const water   = Math.round(flour * params.hydration / 100);
  const starter = Math.round(flour * params.starterPct / 100);
  const salt    = Math.round(flour * 0.02);

  return [
    { name: 'Hvedemel (høj protein, min. 12% gluten)', amount: flour,   unit: 'g' },
    { name: 'Vand (ca. 28°C)',                          amount: water,   unit: 'g' },
    { name: 'Aktiv surdej (100% hydrering)',            amount: starter, unit: 'g' },
    { name: 'Fint havsalt',                             amount: salt,    unit: 'g' },
  ];
}


function computeSchedule(params, timeMode) {
  const steps = [];
  const now   = new Date();
  now.setMinutes(0, 0, 0);
  let cursor  = new Date(now);

  const addStep = (id, title, description, durationMinutes = 0) => {
    steps.push({
      id,
      title,
      description,
      time: formatTime(cursor),
      durationMinutes,
    });
    cursor = addMinutes(cursor, durationMinutes);
  };

  // Trin 1: Bland
  addStep(
    'mix',
    'Bland mel og vand',
    `Bland mel og ${Math.round((params.hydration - 5))}% af vandet (gem lidt til saltet). Lad hvile — autolyse.`,
    params.autolyseMinutes
  );

  // Trin 2: Tilsæt surdej og salt
  addStep(
    'add_starter',
    'Tilsæt surdej og salt',
    'Fold surdejen ind i dejen, tilsæt salt opløst i det resterende vand. Klem og fold til det er inkorporeret.',
    15
  );

  // Trin 3–N: Stretch & fold
  for (let i = 1; i <= params.folds; i++) {
    addStep(
      `fold_${i}`,
      `Stretch & fold nr. ${i} af ${params.folds}`,
      'Tag fat i dejens ene side, stræk den op og fold den ind over midten. Gentag alle 4 sider. Dæk til og hvil.',
      30
    );
  }

  // Bulk fermentering
  const bulkRemaining = Math.max(0, params.roomHours * 60 - (params.folds * 30 + 45));
  if (bulkRemaining > 0) {
    addStep(
      'bulk',
      'Bulk fermentering',
      'Lad dejen hvile ved stuetemperatur (24–26°C). Dejen skal hæve ca. 50–75% og have bobler på overfladen.',
      bulkRemaining
    );
  }

  // Formning
  addStep(
    'shape',
    'Form brødet',
    'Vend dejen ud på en ren, utorret overflade. Fold hjørnerne ind mod midten og spænd overfladen med en skrabe. Lad hvile 20 min (bench rest), form endeligt og læg i meldrysset hævekurv.',
    30
  );

  // Koldhævning eller direkte bagning
  if (timeMode !== 'quick' && params.coldHours > 0) {
    addStep(
      'cold_proof',
      `Koldhævning i køleskab (${params.coldHours} timer)`,
      'Dæk hævekurven med plastfolie og stil i køleskabet. Koldhævning udvikler syre og gør dejen nemmere at score.',
      params.coldHours * 60
    );
  } else {
    addStep(
      'final_proof',
      'Efterhævning ved stuetemperatur',
      'Dæk hævekurven med et viskestykke. Dejen er klar, når den springer langsomt tilbage når du trykker en finger i den.',
      60
    );
  }

  // Forvarm ovn
  addStep(
    'preheat',
    `Forvarm ovn + gryde til ${params.ovenTemp}°C`,
    'Sæt støbejernsgryde (med låg) i ovnen og forvarm i 45–60 min. Ovnen SKAL være brændende varm.',
    50
  );

  // Bag med låg
  addStep(
    'bake_lid_on',
    `Bag med låg — ${params.lidMinutes} min`,
    'Vend brødet ud af kurven direkte i den varme gryde. Score overfladen med en skarp kniv eller razor (ca. 1 cm dybt, 45° vinkel). Sæt låget på og bag.',
    params.lidMinutes
  );

  // Bag uden låg
  addStep(
    'bake_lid_off',
    `Bag uden låg — ${params.noLidMinutes} min`,
    `Tag låget af. Bag videre ved ${params.ovenTemp}°C til skorpen er dybt gyldenbrun. Kernetemp skal være 96–98°C.`,
    params.noLidMinutes
  );

  // Afkøling
  addStep(
    'cool',
    'Afkøl på rist — mindst 1 time',
    'VIGTIGT: Skær ikke i brødet endnu! Krummen sætter sig stadig. Vent mindst 1 time — gerne 2. Du vil høre det "synge" mens det afkøler.',
    60
  );

  return steps;
}


function computeWarnings({ sourness, crustiness, openness }) {
  const warnings = [];

  if (sourness > 75 && openness > 75) {
    warnings.push({
      type: 'conflict',
      message: 'Høj surhed kræver lang fermentering, som nedbryder gluten. Det giver en tættere krumme end forventet — luftigheden er justeret ned i opskriften.',
    });
  }

  if (openness > 75 && crustiness > 75) {
    warnings.push({
      type: 'conflict',
      message: 'Open crumb kræver høj hydrering, som giver en tyndere og blødere skorpe. Du kan ikke få glasagtig sprødhed og store huller på én gang.',
    });
  }

  if (crustiness > 75 && sourness > 75) {
    warnings.push({
      type: 'conflict',
      message: 'Kraftig skorpe kræver kort, varm bagning. Syreudvikling kræver tid. Disse to modarbejder hinanden — opskriften balancerer begge som kompromis.',
    });
  }

  if (sourness > 85 && crustiness > 85 && openness > 85) {
    warnings.push({
      type: 'warning',
      message: 'Alle tre på max! Brødet kan kun optimere én ting ad gangen. Opskriften prioriterer balance fremfor ekstreme resultater på alle akser.',
    });
  }

  return warnings;
}


// ─────────────────────────────────────────────────────────────────────────────
// HJÆLPEFUNKTIONER
// ─────────────────────────────────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function formatTime(date) {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}


// ─────────────────────────────────────────────────────────────────────────────
// TYPESCRIPT TYPER (kopier til breadEngine.d.ts hvis I bruger TypeScript)
// ─────────────────────────────────────────────────────────────────────────────
//
// interface RecipeParams {
//   sourness: number;       // 0-100
//   crustiness: number;     // 0-100
//   openness: number;       // 0-100
//   timeMode: 'quick' | 'evening' | 'weekend';
//   flourGrams?: number;
// }
//
// interface Ingredient {
//   name: string;
//   amount: number;
//   unit: string;
// }
//
// interface Step {
//   id: string;
//   title: string;
//   description: string;
//   time: string;
//   durationMinutes: number;
// }
//
// interface Warning {
//   type: 'conflict' | 'warning';
//   message: string;
// }
//
// interface RecipeOutput {
//   params: object;
//   ingredients: Ingredient[];
//   schedule: Step[];
//   warnings: Warning[];
// }
