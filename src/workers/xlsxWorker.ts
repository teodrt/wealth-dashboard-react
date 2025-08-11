import * as XLSX from "xlsx";

/**
 * Parser per file con 3 colonne minime:
 * - Anno (es. 2024)
 * - Mese (es. Gennaio, Febbraio, ... — case-insensitive; gestisce anche "GIugno")
 * - Una o più colonne categoria (es. N26, Revolut, ecc.). Ogni colonna è una categoria.
 *
 * Accetta anche XLSX con foglio unico o CSV.
 * Gestione numeri: rimuove i punti come separatori migliaia, converte virgola in punto, gestisce "-".
 */

export type ParsedRow = {
  Date: string;        // YYYY-MM-01
  Account: string;     // = nome categoria (es. N26)
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
  // Fix typo frequente tipo "giugno", "GIugno", ecc.
  const s2 = s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const n = MONTHS[s2 as keyof typeof MONTHS];
  return n || null;
}

function parseItNumber(v: any): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (!s || s === "-") return null;
  // togli separatore migliaia ".", spazi; trasforma virgola in punto
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

    // Leggi tutte le righe come oggetti
    const raw: any[] = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });

    if (!raw.length) {
      return (self as any).postMessage({ type: "result", ok: false, error: "Il file è vuoto." } as Msg);
    }

    // Determina intestazioni
    const headerKeys = Object.keys(raw[0] ?? {});
    const annoKey = headerKeys.find(k => /^anno$/i.test(String(k).trim()));
    const meseKey = headerKeys.find(k => /^mese$/i.test(String(k).trim()));

    if (!annoKey || !meseKey) {
      return (self as any).postMessage({
        type: "result",
        ok: false,
        error: "Intestazioni richieste: 'Anno' e 'Mese'."
      } as Msg);
    }

    // Tutte le altre colonne sono categorie (es. N26, ecc.)
    const categoryCols = headerKeys.filter(k => k !== annoKey && k !== meseKey);

    if (!categoryCols.length) {
      return (self as any).postMessage({
        type: "result",
        ok: false,
        error: "Nessuna categoria trovata. Aggiungi almeno una colonna (es. 'N26')."
      } as Msg);
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

      const y = String(year).padStart(4, "0");
      const m = String(mnum).padStart(2, "0");
      const iso = `${y}-${m}-01`;

      for (const col of categoryCols) {
        const val = parseItNumber(r[col]);
        if (val == null) continue; // salta celle vuote/-
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
    if (!out.length) {
      (self as any).postMessage({ type: "result", ok: false, error: "Parsed 0 rows. Verifica Anno/Mese e i numeri." } as Msg);
    } else {
      (self as any).postMessage({ type: "result", ok: true, rows: out } as Msg);
    }
  } catch (err: any) {
    (self as any).postMessage({ type: "result", ok: false, error: err?.message || "Errore di parsing" } as Msg);
  }
};
