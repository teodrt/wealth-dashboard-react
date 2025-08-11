import * as XLSX from "xlsx";

export type ParsedRow = {
  Date: string;
  Account: string;
  Category?: string;
  AssetClass?: string;
  Currency?: string;
  Value: number;
};

const MONTHS: Record<string, number> = {
  "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6,
  "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12
};

function normMonth(m: any): number | null {
  if (m == null) return null;
  const s = String(m).trim().toLowerCase().replace(/\s+/g, "");
  const s2 = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return MONTHS[s2 as keyof typeof MONTHS] || null;
}

function parseItNumber(v: any): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s || s === "-") return null;
  s = s.replace(/\./g, "").replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? null : n;
}

type Msg =
  | { type: "progress"; value: number }
  | { type: "result"; ok: boolean; rows?: ParsedRow[]; error?: string };

self.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer; name: string }>) => {
  try {
    const buffer = e.data.buffer;
    const name = e.data.name;

    (self as any).postMessage({ type: "progress", value: 1 } as Msg);

    const isCSV = /\.csv$/i.test(name);
    let wb: XLSX.WorkBook;
    if (isCSV) {
      const text = new TextDecoder().decode(new Uint8Array(buffer));
      wb = XLSX.read(text, { type: "string" });
    } else {
      wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    }

    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) { (self as any).postMessage({ type: "result", ok: false, error: "Nessun foglio trovato." } as Msg); return; }

    const raw: any[] = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    if (!raw.length) { (self as any).postMessage({ type: "result", ok: false, error: "Il file è vuoto." } as Msg); return; }

    const headerKeys = Object.keys(raw[0] ?? {});
    const annoKey = headerKeys.find(k => /^anno$/i.test(String(k).trim()));
    const meseKey = headerKeys.find(k => /^mese$/i.test(String(k).trim()));
    if (!annoKey || !meseKey) { (self as any).postMessage({ type: "result", ok: false, error: "Intestazioni richieste: 'Anno' e 'Mese'." } as Msg); return; }

    const categoryCols = headerKeys.filter(k => k !== annoKey && k !== meseKey);
    if (!categoryCols.length) { (self as any).postMessage({ type: "result", ok: false, error: "Aggiungi almeno una colonna categoria." } as Msg); return; }

    const total = raw.length;
    const out: ParsedRow[] = [];

    // progress reale a chunk
    const steps = Math.min(60, Math.max(20, Math.ceil(total / 50)));
    const chunkSize = Math.max(10, Math.ceil(total / steps));

    let processed = 0;
    for (let start = 0; start < total; start += chunkSize) {
      const end = Math.min(total, start + chunkSize);

      for (let i = start; i < end; i++) {
        const r = raw[i];
        const year = Number(String(r[annoKey]).trim());
        const mnum = normMonth(r[meseKey]);
        if (year && mnum) {
          const iso = String(year).padStart(4,"0") + "-" + String(mnum).padStart(2,"0") + "-01";
          // stop alla prima cella vuota
          for (const col of categoryCols) {
            const cellStr = String(r[col] ?? '').trim();
            if (cellStr === '') break;
            const val = parseItNumber(r[col]);
            if (val == null) continue;
            const catName = String(col).trim() || "Categoria";
            out.push({ Date: iso, Account: catName, Category: catName, AssetClass: "Other", Currency: "EUR", Value: val });
          }
        }
        processed++;
      }

      const pct = Math.max(1, Math.min(99, Math.round((processed / total) * 98)));
      (self as any).postMessage({ type: "progress", value: pct } as Msg);
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    (self as any).postMessage({ type: "progress", value: 100 } as Msg);
    (self as any).postMessage({ type: "result", ok: true, rows: out } as Msg);
  } catch (err: any) {
    (self as any).postMessage({ type: "result", ok: false, error: err?.message || "Errore di parsing" } as Msg);
  }
};
