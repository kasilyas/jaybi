import type { AppConfig, Prisma } from '@prisma/client';

export const DEFAULT_TIERS = {
  free: { label: 'Gratuit', price: 0, limit: 5, features: ['Comparaison simple'] },
  pack1: { label: 'Essentiel', price: 29, limit: 20, features: ['Roadmap GPS', 'Sans pub'] },
  pack2: { label: 'Premium', price: 49, limit: 100, features: ['IA illimitée', 'Support prioritaire'] },
  unlimited: { label: 'Business', price: 199, limit: 1000, features: ['API Access', 'Multi-comptes'] },
};

export function configJson(value: Prisma.JsonValue | undefined): Prisma.JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function isComparisonEnabled(config: Pick<AppConfig, 'tiers'> | null): boolean {
  return configJson(configJson(config?.tiers).__features).comparisonEnabled === true;
}

export function serializeConfig(config: AppConfig | null) {
  const stored = configJson(config?.tiers);
  return {
    tiers: Object.fromEntries(Object.entries(DEFAULT_TIERS).map(([key, fallback]) => [key, stored[key] ?? fallback])),
    activeMaintenance: config?.activeMaintenance ?? false,
    comparisonEnabled: isComparisonEnabled(config),
  };
}
