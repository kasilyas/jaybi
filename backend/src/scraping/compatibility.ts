type Candidate = { name: string; ean?: string | null; unit?: string; weight?: number; brand?: { name: string } | string | null };
const canonical = (s: string) => s.toLocaleLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim();
function format(p: Candidate): string | null {
  const m = p.name.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(kg|ml|cl|g|l)\b/i);
  const unit = (m?.[3] ?? p.unit ?? '').toLowerCase();
  const quantity = m ? Number(m[2].replace(',', '.')) : p.weight ?? 0;
  if (!(quantity > 0)) return null;
  const scale: Record<string, [string, number]> = { kg: ['mass', 1000], g: ['mass', 1], l: ['volume', 1000], cl: ['volume', 10], ml: ['volume', 1], unit: ['unit', 1] };
  const conversion = scale[unit];
  return conversion ? `${conversion[0]}:${quantity * conversion[1]}:count=${m?.[1] ?? 1}` : null;
}
export function compatible(a: Candidate, b: Candidate): boolean {
  if (a.ean && b.ean && a.ean !== b.ean) return false;
  const brand = (p: Candidate) => typeof p.brand === 'string' ? p.brand : p.brand?.name;
  const ab = brand(a), bb = brand(b);
  if (ab && bb && canonical(ab) !== canonical(bb)) return false;
  const af = format(a), bf = format(b);
  // Unknown formats require review rather than automatically merging.
  return !!af && !!bf && af === bf;
}
