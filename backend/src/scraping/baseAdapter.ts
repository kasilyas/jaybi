import { ScrapedProduct } from './types.js';

/**
 * Classe abstraite pour les adaptateurs de scraping.
 * RÈGLE D'OR : les adapters ne JAMAIS écrivent dans les tables métier.
 */
export abstract class BaseAdapter {
  abstract readonly name: string;
  abstract readonly sourceType: 'scraper' | 'api' | 'csv';

  protected rateLimitMs = 2000;
  protected maxPages = 50;
  protected timeoutMs = 30000;
  protected userAgent = 'JaybiBot/1.0 (+contact@jaybi.ma)';

  abstract scrape(): Promise<ScrapedProduct[]>;

  protected async checkRobotsTxt(baseUrl: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': this.userAgent },
      });
      clearTimeout(timeout);
      if (!res.ok) return true; // pas de robots.txt = tout autorisé
      const text = await res.text();
      const lines = text.split('\n');
      let ourAgent = false;
      const disallowPaths: string[] = [];
      const allowPaths: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith('user-agent:')) {
          const agent = trimmed.split(':')[1].trim();
          ourAgent = agent === '*' || agent.includes('jaybibot');
        }
        if (ourAgent) {
          if (trimmed.startsWith('disallow:')) {
            const path = trimmed.split(':')[1].trim();
            if (path) disallowPaths.push(path);
          }
          if (trimmed.startsWith('allow:')) {
            const path = trimmed.split(':')[1].trim();
            if (path) allowPaths.push(path);
          }
        }
      }

      // Si "Disallow: /" (root only, nothing after) → tout est interdit
      if (disallowPaths.includes('/')) return false;

      // Vérifie si le chemin qu'on veut scraper est explicitement disallow
      const targetPath = new URL(baseUrl).pathname;
      for (const disallow of disallowPaths) {
        // "Disallow: /admin" bloque "/admin" et "/admin/*"
        if (targetPath.startsWith(disallow)) {
          // Mais vérifie s'il y a un Allow plus spécifique
          const hasSpecificAllow = allowPaths.some(a => targetPath.startsWith(a) && a.length > disallow.length);
          if (!hasSpecificAllow) return false;
        }
      }

      return true;
    } catch {
      return true; // si on peut pas vérifier, on autorise
    }
  }

  protected async fetchWithRetry(url: string, retries = 3): Promise<string> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': this.userAgent },
        });
        clearTimeout(timeout);

        if (res.status === 429 || res.status === 503) {
          const delay = this.rateLimitMs * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
        if (res.status === 403) throw new Error(`Anti-bot détecté (403) sur ${url}`);
        if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
        return await res.text();
      } catch (err) {
        if (attempt === retries - 1) throw err;
        const delay = this.rateLimitMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    throw new Error(`Max retries exceeded for ${url}`);
  }

  protected async rateLimit(): Promise<void> {
    await this.sleep(this.rateLimitMs);
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
