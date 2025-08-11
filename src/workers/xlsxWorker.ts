import * as XLSX from "xlsx";

export type ParsedRow = {
  Date: string; Account: string; Category?: string; AssetClass?: string; Currency?: string; Value: number;
};

function parseDate(input: any): string {
  if (input == null || input === "") return "";
  if (typeof input === "number") {
    const epoch = (XLSX.SSF as any)?.parse_date_code?.(input);
    if (epoch) {
      const d = new Date(epoch.y, (epoch.m || 1) - 1, epoch.d || 1);
      return d.toISOString().slice(0, 10);
    }
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? String(input) : d.toISOString().slice(0, 10);
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
    const sheetName = wb.SheetNames.includes("Balances") ? "Balances" : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return (self as any).postMessage({ type: "result", ok: false, error: "No sheet found." } as Msg);

    const rowsRaw: any[] = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    const total = rowsRaw.length || 1;
    const batch = Math.max(50, Math.floor(total / 20));
    const out: ParsedRow[] = [];

    for (let i = 0; i < rowsRaw.length; i++) {
      const r = rowsRaw[i];
      const rawValue = r.Value ?? r.Amount ?? r.Valore ?? r.Importo ?? 0;
      const row: ParsedRow = {
        Date: parseDate(r.Date ?? r.Data ?? r.Giorno ?? ""),
        Account: r.Account ?? r.Conto ?? r.Portafoglio ?? "",
        Category: r.Category ?? r.Categoria ?? "Other",
        AssetClass: r.AssetClass ?? r.Asset ?? "Other",
        Currency: r.Currency ?? r.Valuta ?? "EUR",
        Value: Number(rawValue)
      };
      if (row.Date && row.Account && !isNaN(row.Value)) out.push(row);
      if (i % batch === 0) (self as any).postMessage({ type: "progress", value: Math.round((i / total) * 100) } as Msg);
    }
    (self as any).postMessage({ type: "progress", value: 100 } as Msg);
    if (!out.length) (self as any).postMessage({ type: "result", ok: false, error: "Parsed 0 rows. Check columns and sheet name." } as Msg);
    else (self as any).postMessage({ type: "result", ok: true, rows: out } as Msg);
  } catch (err: any) {
    (self as any).postMessage({ type: "result", ok: false, error: err?.message || "Parse error" } as Msg);
  }
};
