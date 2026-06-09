import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Loader2, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

interface ImportResult {
  imported: number;
  total: number;
  columns: string[];
  mapping: Record<string, any>;
  message: string;
}

export function UploadCSV() {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);

    // Read a preview of the first 5 rows
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length > 0) {
        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1, 6).map(parseCSVLine);
        setPreview({ headers, rows });
      }
    };
    reader.readAsText(f.slice(0, 65536)); // first 64KB for preview
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.type === "text/csv")) {
      handleFile(f);
    } else {
      setError("Only CSV files are supported.");
    }
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // strip data:... prefix
          const comma = result.indexOf(",");
          resolve(comma !== -1 ? result.slice(comma + 1) : result);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const res = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: base64, filename: file.name }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setPreview(null);
  };

  const isCSV = file?.name?.endsWith(".csv");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Upload className="w-6 h-6 text-orange-500" />
          <div>
            <h2 className="text-lg font-semibold text-neutral-100">Import Weekly State File</h2>
            <p className="text-xs text-neutral-500">Drop a CSV from any state unclaimed property office — auto-maps columns</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-mono text-neutral-400 border-neutral-700">
          .CSV only
        </Badge>
      </div>

      {!result ? (
        <>
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer
              ${dragOver ? "border-orange-500 bg-orange-500/10" : "border-neutral-700 hover:border-neutral-500 bg-neutral-900/50"}
            `}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleInputChange}
              className="hidden"
            />
            {!file ? (
              <>
                <FileSpreadsheet className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400 font-medium mb-1">Drop a CSV file here</p>
                <p className="text-xs text-neutral-600">or click to browse</p>
              </>
            ) : (
              <div className="space-y-2">
                {isCSV ? (
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-500 mx-auto" />
                )}
                <p className="text-neutral-200 font-medium">{file.name}</p>
                <p className="text-xs text-neutral-500">{(file.size / 1024).toFixed(0)} KB</p>
                {!isCSV && (
                  <p className="text-xs text-red-400">Only .csv files are supported</p>
                )}
              </div>
            )}
          </div>

          {/* Preview Table */}
          {preview && (
            <Card className="border-neutral-800 bg-neutral-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-neutral-300">
                  <Table2 className="w-4 h-4" /> Preview (first 5 rows)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-neutral-800 hover:bg-transparent">
                        <TableHead className="text-neutral-500 text-xs w-10">#</TableHead>
                        {preview.headers.map((h, i) => (
                          <TableHead key={i} className="text-neutral-300 text-xs whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row, ri) => (
                        <TableRow key={ri} className="border-neutral-800">
                          <TableCell className="text-neutral-600 text-xs">{ri + 1}</TableCell>
                          {preview.headers.map((_, ci) => (
                            <TableCell key={ci} className="text-neutral-400 text-xs whitespace-nowrap">
                              {row[ci] || ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {file && isCSV && (
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Import {file.name}</>
                )}
              </Button>
              <Button variant="ghost" onClick={handleReset} className="text-neutral-400 hover:text-neutral-200">
                Cancel
              </Button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </>
      ) : (
        /* Result Screen */
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div>
                <h3 className="text-lg font-semibold text-emerald-300">Import Complete</h3>
                <p className="text-sm text-emerald-500/70">{result.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                <p className="text-2xl font-bold text-neutral-100">{result.imported}</p>
                <p className="text-xs text-neutral-500">Records imported</p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                <p className="text-2xl font-bold text-neutral-100">{result.total}</p>
                <p className="text-xs text-neutral-500">Total rows in file</p>
              </div>
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800">
                <p className="text-2xl font-bold text-neutral-100">{result.columns.length}</p>
                <p className="text-xs text-neutral-500">Columns detected</p>
              </div>
            </div>

            {/* Column Mapping */}
            {result.mapping && (
              <div className="mt-4 p-4 rounded-lg bg-neutral-900 border border-neutral-800">
                <h4 className="text-xs uppercase tracking-wide text-neutral-500 mb-3">Auto-Detected Column Mapping</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.entries(result.mapping).map(([field, val]) => {
                    if (field === "location") return null;
                    const displayVal = Array.isArray(val) ? val.filter(Boolean).join(" > ") : val;
                    return (
                      <div key={field} className="flex justify-between px-3 py-1.5 rounded bg-neutral-950">
                        <span className="text-neutral-500">{field}</span>
                        <span className="text-emerald-400 font-mono text-xs">
                          {displayVal || <span className="text-neutral-600">—</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleReset} variant="outline" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">
                Import Another File
              </Button>
              <Button
                onClick={() => window.location.hash = "#assets"}
                variant="ghost"
                className="text-orange-400 hover:text-orange-300"
              >
                View Asset DB →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Simple CSV line parser (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}
