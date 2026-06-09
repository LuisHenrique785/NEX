import { SHEETS_CSV_URL } from '../config';
import { geocodeAddress } from './geocoding';
import { supabase } from './supabase';

export function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n').filter((l) => l.trim());
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

async function processRows(
  rows: string[][],
  onProgress?: (msg: string) => void
): Promise<{ added: number; skipped: number; errors: string[] }> {
  const stats = { added: 0, skipped: 0, errors: [] as string[] };

  // Skip header row
  const dataRows = rows.slice(1).filter((r) => r.length >= 2 && r[0]);

  onProgress?.(`${dataRows.length} nodos encontrados...`);

  const { data: existing } = await supabase.from('nodos').select('codigo');
  const existingCodes = new Set((existing || []).map((n) => n.codigo));

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    // Colunas: A=0(código), B=1(nome), C=2, D=3(cidade), E=4(estado), F=5(endereço)
    const codigo = row[0] || '';
    const nome = row[1] || row[0] || `NODO ${i + 1}`;
    const endereco = row[5] || row[2] || '';
    const cidade = row[3] || '';
    const estado = row[4] || '';

    if (!codigo) { stats.skipped++; continue; }
    if (existingCodes.has(codigo)) { stats.skipped++; continue; }

    onProgress?.(`[${i + 1}/${dataRows.length}] ${nome}...`);

    let lat: number | null = null;
    let lng: number | null = null;

    if (endereco) {
      const coords = await geocodeAddress(`${endereco}, ${cidade}, ${estado}`);
      if (coords) { lat = coords.lat; lng = coords.lng; }
    }

    const { error } = await supabase.from('nodos').insert({
      codigo, nome, endereco, cidade, estado, lat, lng,
    });

    if (error) {
      stats.errors.push(`${nome}: ${error.message}`);
    } else {
      stats.added++;
      existingCodes.add(codigo);
    }

    if (endereco) await new Promise((r) => setTimeout(r, 1100));
  }

  return stats;
}

export async function importNodosFromSheets(
  onProgress?: (msg: string) => void
): Promise<{ added: number; skipped: number; errors: string[] }> {
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
): Promise<{ added: number; skipped: number; errors: string[] }> {
  onProgress?.('Lendo arquivo CSV...');
  const rows = parseCSV(csvText);
  return processRows(rows, onProgress);
}
