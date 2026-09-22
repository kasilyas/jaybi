import { fetchAiSearchSuggestions, parseAiGroceryList } from '../lib/api';

export async function simulateDataSync() {
  return [];
}

export async function parseGroceryList(rawText: string): Promise<string[]> {
  if (!rawText.trim()) return [];
  return parseAiGroceryList(rawText);
}

export async function getSmartSearchSuggestions(query: string): Promise<string[]> {
  if (query.trim().length < 2) return [];
  return fetchAiSearchSuggestions(query);
}
