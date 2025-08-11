import * as XLSX from "xlsx";

self.onmessage = async (e: MessageEvent<any>) => {
  const { buffer, name } = e.data;
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const rows = json.map((r) => ({
      Date: r.Date || r.date || "",
      Account: r.Account || r.account || "",
      Category: r.Category || r.category || "",
      AssetClass: r["Asset Class"] || r.assetClass || "",
      Currency: r.Currency || r.currency || "",
      Value: parseFloat(r.Value || r.value || 0)
    }));

    (self as any).postMessage({ type: "result", ok: true, rows });
  } catch (err: any) {
    (self as any).postMessage({ type: "result", ok: false, error: err.message });
  }
};
