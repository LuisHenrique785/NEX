const BR_STATES = /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/;

function addStateIfMissing(address: string): string {
  return BR_STATES.test(address) ? address : `${address}, MG`;
}

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const base = addStateIfMissing(address.trim());
  // Try: with accents, then without accents (Nominatim indexing is inconsistent for BR addresses)
  const attempts = [base, stripAccents(base)];

  for (let i = 0; i < attempts.length; i++) {
    try {
      if (i > 0) await new Promise((r) => setTimeout(r, 1100));
      const encoded = encodeURIComponent(attempts[i] + ', Brasil');
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=br`;
      const res = await fetch(url, { headers: { 'User-Agent': 'NEX-Inventory-App/1.0' } });
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch {
      // continue to next attempt
    }
  }
  return null;
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
