import { SHEETS_CSV_URL } from '../config';
import { geocodeAddress } from './geocoding';
import { supabase } from './supabase';

export function parseCSV(csv: string): string[][] {
  // Strip UTF-8 BOM if present
  const text = csv.charCodeAt(0) === 0xFEFF ? csv.slice(1) : csv;
  const lines = text.split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  });
}

// Extracts city and state from full address strings like:
// "RUA FULANO 123, Bairro - Cidade, MG" or "RUA FULANO 123 CIDADE MG"
function extractCidadeEstado(endereco: string): { cidade: string; estado: string } {
  const m = endereco.match(/[,\s]+([A-Z]{2})\s*$/);
  if (!m) return { cidade: '', estado: '' };

  const estado = m[1];
  const withoutState = endereco.slice(0, endereco.lastIndexOf(m[0])).trim();

  const parts = withoutState.split(',');
  const lastPart = parts[parts.length - 1].trim().replace(/^[-\s]+/, '');

  const dashIdx = lastPart.lastIndexOf(' - ');
  const cidade = dashIdx >= 0 ? lastPart.substring(dashIdx + 3).trim() : lastPart.trim();

  return { cidade, estado };
}

async function processRows(
  rows: string[][],
  onProgress?: (msg: string) => void
): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
  const stats = { added: 0, updated: 0, skipped: 0, errors: [] as string[] };

  // CSV columns: A=ETA, B=Nó origem, C=Facility NEx (código), D=Modal, E=Nome Place, F=Endereço
  const dataRows = rows.slice(1).filter((r) => r.length >= 3 && r[2]);

  onProgress?.(`${dataRows.length} nodos encontrados...`);

  // Load existing NODOs with their current lat to decide insert vs update
  const { data: existing } = await supabase.from('nodos').select('id, codigo, lat');
  // Map: codigo → { id, hasCoords }
  const existingMap = new Map(
    (existing || []).map((n) => [n.codigo, { id: n.id, hasCoords: n.lat !== null }])
  );

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const codigo = row[2] || '';
    const nome = row[4] || row[2] || `NODO ${i + 1}`;
    const endereco = row[5] || '';
    const { cidade, estado } = extractCidadeEstado(endereco);

    if (!codigo) { stats.skipped++; continue; }

    const entry = existingMap.get(codigo);

    if (entry?.hasCoords) {
      // Already has coordinates → skip entirely
      stats.skipped++;
      continue;
    }

    // Geocode (new or existing without coordinates)
    onProgress?.(`[${i + 1}/${dataRows.length}] ${nome}...`);

    let lat: number | null = null;
    let lng: number | null = null;

    if (endereco) {
      const coords = await geocodeAddress(endereco);
      if (coords) { lat = coords.lat; lng = coords.lng; }
    }

    if (entry) {
      // Exists but had no coordinates → UPDATE
      const { error } = await supabase
        .from('nodos')
        .update({ nome, endereco, cidade, estado, lat, lng })
        .eq('id', entry.id);

      if (error) {
        stats.errors.push(`${nome}: ${error.message}`);
      } else {
        stats.updated++;
        if (lat) existingMap.set(codigo, { id: entry.id, hasCoords: true });
      }
    } else {
      // New → INSERT
      const { error } = await supabase.from('nodos').insert({
        codigo, nome, endereco, cidade, estado, lat, lng,
      });

      if (error) {
        stats.errors.push(`${nome}: ${error.message}`);
      } else {
        stats.added++;
        existingMap.set(codigo, { id: '', hasCoords: lat !== null });
      }
    }

    if (endereco) await new Promise((r) => setTimeout(r, 1100));
  }

  return stats;
}

export async function importNodosFromSheets(
  onProgress?: (msg: string) => void
): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
  onProgress?.('Buscando planilha Google Sheets...');
  const res = await fetch(SHEETS_CSV_URL);
  if (!res.ok) throw new Error('Não foi possível acessar a planilha. Tente fazer upload do CSV.');
  const csv = await res.text();
  const rows = parseCSV(csv);
  return processRows(rows, onProgress);
}

export async function importNodosFromCSV(
  csvText: string,
  onProgress?: (msg: string) => void
): Promise<{ added: number; updated: number; skipped: number; errors: string[] }> {
  onProgress?.('Lendo arquivo CSV...');
  const rows = parseCSV(csvText);
  return processRows(rows, onProgress);
}
