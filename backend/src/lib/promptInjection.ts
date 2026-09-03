/**
 * Anti-Prompt Injection Detection Module
 *
 * Based on OWASP LLM Top 10 (LLM01: Prompt Injection) and NIST AI RMF.
 *
 * Stratégie : détection par patterns + scoring de sévérité.
 * Les patterns couvrent les attaques connues :
 * - Override d'instructions ("ignore previous instructions")
 * - Role-play attacks ("pretend you are", "act as")
 * - Delimiter attacks (tentative de sortie du contexte)
 * - Encoded injections (base64, unicode escapes)
 * - System prompt extraction
 * - Jailbreak attempts
 */

export type InjectionSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface InjectionDetectionResult {
  detected: boolean;
  severity: InjectionSeverity;
  score: number;
  matchedPatterns: string[];
  sanitizedText: string;
}

interface InjectionPattern {
  name: string;
  regex: RegExp;
  severity: InjectionSeverity;
  score: number;
}

// Patterns OWASP LLM01 — Prompt Injection
const INJECTION_PATTERNS: InjectionPattern[] = [
  // --- Override d'instructions ---
  { name: 'IGNORE_PREVIOUS', regex: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/i, severity: 'critical', score: 100 },
  { name: 'DISREGARD_INSTRUCTIONS', regex: /disregard\s+(all\s+)?(the\s+)?(above|previous|prior)\s+(instructions?|prompts?|rules?)/i, severity: 'critical', score: 100 },
  { name: 'FORGET_INSTRUCTIONS', regex: /forget\s+(your|all|the|previous)\s+(instructions?|prompts?|rules?|guidelines?)/i, severity: 'critical', score: 95 },
  { name: 'OVERRIDE_INSTRUCTIONS', regex: /override\s+(your|the|all)\s+(instructions?|prompts?|rules?|system)/i, severity: 'critical', score: 95 },
  { name: 'NEW_INSTRUCTIONS', regex: /(here\s+are|these\s+are)\s+(your\s+)?new\s+(instructions?|rules?|directives?)/i, severity: 'high', score: 80 },

  // --- Role-play / identity attacks ---
  { name: 'PRETEND_YOU_ARE', regex: /pretend\s+(you\s+are|to\s+be)\s+(a|an)?/i, severity: 'high', score: 75 },
  { name: 'ACT_AS', regex: /act\s+as\s+(if\s+you\s+(are|were)\s+)?(a|an)?/i, severity: 'high', score: 75 },
  { name: 'YOU_ARE_NOW', regex: /you\s+are\s+now\s+(a|an|in)/i, severity: 'high', score: 70 },
  { name: 'SIMULATE_ROLE', regex: /simulate\s+(being|you\s+are|a|an)/i, severity: 'high', score: 70 },
  { name: 'ROLEPLAY', regex: /roleplay\s+as|role-?play\s+as/i, severity: 'medium', score: 50 },

  // --- System prompt extraction ---
  { name: 'REVEAL_SYSTEM_PROMPT', regex: /(reveal|show|display|print|output)\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?|directives?)/i, severity: 'high', score: 80 },
  { name: 'WHAT_ARE_YOUR_INSTRUCTIONS', regex: /what\s+(are|were)\s+(your|the)\s+(system\s+)?(instructions?|prompts?|rules?|directives?)/i, severity: 'medium', score: 55 },
  { name: 'REPEAT_INSTRUCTIONS', regex: /repeat\s+(your|the|all)\s+(system\s+)?(instructions?|prompts?|rules?)/i, severity: 'medium', score: 50 },

  // --- Delimiter / context boundary attacks ---
  { name: 'DELIMITER_BREAKOUT', regex: /(---|```|<\/?system>|<\/?prompt>|<\/?instruction>|\[SYSTEM\]|\[PROMPT\])/i, severity: 'high', score: 70 },
  { name: 'END_OF_PROMPT', regex: /(end\s+of\s+(prompt|instructions?|system))|((prompt|instructions?)\s+ends?\s+here)/i, severity: 'high', score: 65 },

  // --- Jailbreak attempts ---
  { name: 'DAN_MODE', regex: /(dan\s+mode|do\s+anything\s+now|jailbreak|developer\s+mode|god\s+mode|unrestricted\s+mode)/i, severity: 'critical', score: 100 },
  { name: 'NO_RESTRICTIONS', regex: /(no\s+(restrictions?|rules?|limits?|boundaries?|guidelines?))|(without\s+(any\s+)?restrictions?)/i, severity: 'high', score: 80 },
  { name: 'BYPASS_SAFETY', regex: /bypass\s+(your|the|all)\s+(safety|security|content|ethical)\s+(filters?|measures?|checks?|guidelines?)/i, severity: 'critical', score: 95 },
  { name: 'IGNORE_SAFETY', regex: /ignore\s+(your|the|all)\s+(safety|security|content|ethical)\s+(filters?|measures?|guidelines?|policies?)/i, severity: 'critical', score: 95 },

  // --- Encoded injection attempts ---
  { name: 'BASE64_INJECTION', regex: /[A-Za-z0-9+\/]{50,}={0,2}/, severity: 'medium', score: 40 },
  { name: 'UNICODE_ESCAPE', regex: /\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}/i, severity: 'medium', score: 35 },

  // --- Data exfiltration via AI ---
  { name: 'EXFILTRATE_DATA', regex: /(send|transmit|exfiltrate|leak)\s+(the|all|any)\s+(data|secrets?|keys?|passwords?|tokens?|credentials?)/i, severity: 'critical', score: 90 },
  { name: 'REVEAL_SECRETS', regex: /(reveal|show|expose|disclose)\s+(the|all|any|your)\s+(secrets?|api\s+keys?|passwords?|tokens?|credentials?)/i, severity: 'critical', score: 90 },

  // --- Instruction smuggling ---
  { name: 'HIDDEN_INSTRUCTION', regex: /(in\s+(a|the)\s+(hidden|secret|invisible)\s+(message|instruction|prompt|comment))|((note|reminder|warning):\s*(ignore|disregard|forget))/i, severity: 'high', score: 75 },
  { name: 'TRANSLATE_AND_EXECUTE', regex: /translate\s+(this|the\s+following)\s+(and\s+)?(execute|run|follow|act\s+on)/i, severity: 'high', score: 70 },
];

// Seuil de détection : score >= 50 = injection détectée
const DETECTION_THRESHOLD = 50;

/**
 * Détecte les tentatives de prompt injection dans un texte.
 * @param text Le texte à analyser
 * @returns Résultat de la détection
 */
export function detectPromptInjection(text: string): InjectionDetectionResult {
  if (!text || typeof text !== 'string') {
    return { detected: false, severity: 'low', score: 0, matchedPatterns: [], sanitizedText: text ?? '' };
  }

  const matchedPatterns: string[] = [];
  let maxScore = 0;
  let maxSeverity: InjectionSeverity = 'low';

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.regex.test(text)) {
      matchedPatterns.push(pattern.name);
      if (pattern.score > maxScore) {
        maxScore = pattern.score;
        maxSeverity = pattern.severity;
      }
    }
  }

  const detected = maxScore >= DETECTION_THRESHOLD;

  // Sanitization basique : retire les délimiteurs suspects
  const sanitizedText = text
    .replace(/```/g, '')
    .replace(/<\/?(?:system|prompt|instruction)>/gi, '')
    .replace(/\[SYSTEM\]|\[PROMPT\]/gi, '')
    .trim();

  return {
    detected,
    severity: maxSeverity,
    score: maxScore,
    matchedPatterns,
    sanitizedText,
  };
}

/**
 * Détecte les injections dans un objet (tous les champs string).
 * Utilisé pour valider suggestedData, body de requête, etc.
 */
export function detectPromptInjectionInObject(obj: unknown): InjectionDetectionResult {
  if (!obj || typeof obj !== 'object') {
    return detectPromptInjection(String(obj ?? ''));
  }

  const strings: string[] = [];
  const extract = (val: unknown) => {
    if (typeof val === 'string') strings.push(val);
    else if (Array.isArray(val)) val.forEach(extract);
    else if (val && typeof val === 'object') Object.values(val).forEach(extract);
  };
  extract(obj);

  const combined = strings.join(' ');
  return detectPromptInjection(combined);
}

/**
 * Vérifie si un texte est sûr pour envoi à un LLM.
 * Retourne true si le texte est clean, false si une injection est détectée.
 */
export function isSafeForLLM(text: string): boolean {
  return !detectPromptInjection(text).detected;
}
