/**
 * Frontend anti-prompt injection detection.
 * Checks user text BEFORE sending to Gemini AI.
 * OWASP LLM01 / NIST AI RMF.
 */

const INJECTION_PATTERNS: { name: string; regex: RegExp; score: number }[] = [
  { name: 'IGNORE_PREVIOUS', regex: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/i, score: 100 },
  { name: 'DISREGARD_INSTRUCTIONS', regex: /disregard\s+(all\s+)?(the\s+)?(above|previous|prior)\s+(instructions?|prompts?|rules?)/i, score: 100 },
  { name: 'FORGET_INSTRUCTIONS', regex: /forget\s+(your|all|the|previous)\s+(instructions?|prompts?|rules?|guidelines?)/i, score: 95 },
  { name: 'OVERRIDE_INSTRUCTIONS', regex: /override\s+(your|the|all)\s+(instructions?|prompts?|rules?|system)/i, score: 95 },
  { name: 'PRETEND_YOU_ARE', regex: /pretend\s+(you\s+are|to\s+be)\s+(a|an)?/i, score: 75 },
  { name: 'ACT_AS', regex: /act\s+as\s+(if\s+you\s+(are|were)\s+)?(a|an)?/i, score: 75 },
  { name: 'YOU_ARE_NOW', regex: /you\s+are\s+now\s+(a|an|in)/i, score: 70 },
  { name: 'DAN_MODE', regex: /(dan\s+mode|do\s+anything\s+now|jailbreak|developer\s+mode|god\s+mode|unrestricted\s+mode)/i, score: 100 },
  { name: 'NO_RESTRICTIONS', regex: /(no\s+(restrictions?|rules?|limits?|boundaries?|guidelines?))|(without\s+(any\s+)?restrictions?)/i, score: 80 },
  { name: 'BYPASS_SAFETY', regex: /bypass\s+(your|the|all)\s+(safety|security|content|ethical)\s+(filters?|measures?|checks?|guidelines?)/i, score: 95 },
  { name: 'REVEAL_SYSTEM_PROMPT', regex: /(reveal|show|display|print|output)\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?|directives?)/i, score: 80 },
  { name: 'DELIMITER_BREAKOUT', regex: /(---|```|<\/?system>|<\/?prompt>|<\/?instruction>|\[SYSTEM\]|\[PROMPT\])/i, score: 70 },
  { name: 'EXFILTRATE_DATA', regex: /(send|transmit|exfiltrate|leak)\s+(the|all|any)\s+(data|secrets?|keys?|passwords?|tokens?|credentials?)/i, score: 90 },
  { name: 'HIDDEN_INSTRUCTION', regex: /(in\s+(a|the)\s+(hidden|secret|invisible)\s+(message|instruction|prompt|comment))|((note|reminder|warning):\s*(ignore|disregard|forget))/i, score: 75 },
];

const THRESHOLD = 50;

export interface DetectionResult {
  detected: boolean;
  score: number;
  patterns: string[];
}

export function detectInjection(text: string): DetectionResult {
  if (!text || typeof text !== 'string') return { detected: false, score: 0, patterns: [] };
  let maxScore = 0;
  const matched: string[] = [];
  for (const p of INJECTION_PATTERNS) {
    if (p.regex.test(text)) {
      matched.push(p.name);
      if (p.score > maxScore) maxScore = p.score;
    }
  }
  return { detected: maxScore >= THRESHOLD, score: maxScore, patterns: matched };
}
