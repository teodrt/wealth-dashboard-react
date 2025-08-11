import * as XLSX from "xlsx";

export type ParsedRow = {
  Date: string;        // YYYY-MM-01
  Account: string;     // = nome categoria (colonna)
  Category?: string;   // = nome categoria
  AssetClass?: string; // "Other"
  Currency?: string;   // "EUR"
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
    const { buffer, name } = e.data;
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
    if (!sheet) return (self as any).postMessage({ type: "result", ok: false, error: "Nessun foglio trovato." } as Msg);

    const raw: any[] = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    if (!raw.length) return (self as any).postMessage({ type: "result", ok: false, error: "Il file è vuoto." } as Msg);

    const headerKeys = Object.keys(raw[0] ?? {});
    const annoKey = headerKeys.find(k => /^anno$/i.test(String(k).trim()));
    const meseKey = headerKeys.find(k => /^mese$/i.test(String(k).trim()));
    if (!annoKey || !meseKey) {
      return (self as any).postMessage({ type: "result", ok: false, error: "Intestazioni richieste: 'Anno' e 'Mese'." } as Msg);
    }
    const categoryCols = headerKeys.filter(k => k !== annoKey && k !== meseKey);
    if (!categoryCols.length) {
      return (self as any).postMessage({ type: "result", ok: false, error: "Aggiungi almeno una colonna categoria (es. 'N26')." } as Msg);
    }

    const total = raw.length;
    const batch = Math.max(25, Math.floor(total / 20));
    const out: ParsedRow[] = [];

    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      const year = Number(String(r[annoKey]).trim());
      const mnum = normMonth(r[meseKey]);
      if (!year || !mnum) {
        if (i % batch === 0) (self as any).postMessage({ type: "progress", value: Math.round((i / total) * 100) } as Msg);
        continue;
      }
      const iso = `${String(year).padStart(4,"0")}-${String(mnum).padStart(2,"0")}-01`;

      // 🔒 STOP alla prima cella vuota: se una categoria in questa riga è vuota, ignoro tutte le successive
      for (const col of categoryCols) {
        const cell = r[col];
        const cellStr = String(cell ?? '').trim();
        if (cellStr === '') break; // blocca qui per questa riga

        const val = parseItNumber(cell);
        if (val == null) continue; // non vuota ma non numerica → salta solo questa

        const catName = String(col).trim() || "Categoria";
        out.push({
          Date: iso,
          Account: catName,
          Category: catName,
          AssetClass: "Other",
          Currency: "EUR",
          Value: val
        });
      }

      if (i % batch === 0) (self as any).postMessage({ type: "progress", value: Math.round((i / total) * 100) } as Msg);
    }

    (self as any).postMessage({ type: "progress", value: 100 } as Msg);
    if (!out.length) (self as any).postMessage({ type: "result", ok: false, error: "Parsed 0 rows. Controlla Anno/Mese e i numeri." } as Msg);
    else (self as any).postMessage({ type: "result", ok: true, rows: out } as Msg);
  } catch (err: any) {
    (self as any).postMessage({ type: "result", ok: false, error: err?.message || "Errore di parsing" } as Msg);
  }
};
