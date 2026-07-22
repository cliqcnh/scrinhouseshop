"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Download, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importBulkProducts, type BulkImportProduct, type BulkImportImage } from "@/actions/admin/bulk-products";

interface BulkUploadFormProps {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
}

export function BulkUploadForm({ categories, brands }: BulkUploadFormProps) {
  const router = useRouter();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imagesList, setImagesList] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ importedCount: number; errors: string[] } | null>(null);

  // Download Sample CSV
  function downloadTemplate() {
    const csvContent = [
      "name,slug,description,categoryName,brandName,productType,condition,sku,basePrice,compareAtPrice,tags,isFeatured,isActive,variantsString,imageNames",
      `iPhone 13,iphone-13,Good as new flagship Apple device,Phones,Apple,phone,uk_used,IPH13-BASE,1200.00,1500.00,"apple,flagship",true,true,128GB/Black/IPH13-128-BLK/1200/10;256GB/Silver/IPH13-256-SLV/1450/5,iphone13_front.jpg,iphone13_back.jpg`,
      `USB-C Fast Charger,usb-c-fast-charger,20W Super Fast Power Adapter,Accessories,Samsung,accessory,,USBC-20W,150.00,,charger,false,true,,charger_adapter.png`
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bulk_products_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Parse CSV client-side into JSON objects
  function parseCSV(text: string): BulkImportProduct[] {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const products: BulkImportProduct[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple comma separation (ignoring internal quote commas for simplicity, or using simple regex)
      // Standard CSV parsing regex matching unquoted fields or double-quoted fields
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
      const values = matches.map((v) => v.trim().replace(/^["']|["']$/g, ""));

      const row: Record<string, string | number | boolean | undefined> = {};
      headers.forEach((header, index) => {
        const val = values[index] ?? "";
        if (header === "basePrice" || header === "compareAtPrice") {
          row[header] = val ? Number(val) : 0;
        } else if (header === "isFeatured" || header === "isActive") {
          row[header] = val.toLowerCase() === "true";
        } else {
          row[header] = val;
        }
      });

      products.push({
        name: (row.name as string) ?? "",
        slug: (row.slug as string) ?? "",
        description: (row.description as string) ?? "",
        categoryName: (row.categoryName as string) ?? "",
        brandName: (row.brandName as string) ?? "",
        productType: ((row.productType as string) ?? "phone") as "phone" | "accessory" | "repair_part",
        condition: ((row.condition as string) ?? "") as "brand_new" | "uk_used" | "",
        sku: (row.sku as string) ?? "",
        basePrice: (row.basePrice as number) ?? 0,
        compareAtPrice: (row.compareAtPrice as number) || undefined,
        tags: (row.tags as string) ?? "",
        isFeatured: !!row.isFeatured,
        isActive: row.isActive !== false,
        variantsString: (row.variantsString as string) ?? "",
        imageNames: (row.imageNames as string) ?? "",
      });
    }

    return products;
  }

  // Convert File to base64 helper
  function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // strip prefix "data:image/jpeg;base64,"
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  async function handleImport() {
    if (!csvFile) {
      toast.error("Please upload a CSV file.");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      // 1. Read and parse CSV
      const csvText = await csvFile.text();
      const parsedProducts = parseCSV(csvText);

      if (parsedProducts.length === 0) {
        toast.error("CSV file is empty or formatted incorrectly.");
        setImporting(false);
        return;
      }

      // 2. Convert matching images to base64 payload
      const encodedImages: BulkImportImage[] = [];
      for (const file of imagesList) {
        const base64 = await toBase64(file);
        encodedImages.push({
          name: file.name,
          base64,
          type: file.type,
        });
      }

      // 3. Call Server Action
      const res = await importBulkProducts(parsedProducts, encodedImages);

      setResult({
        importedCount: res.importedCount,
        errors: res.errors,
      });

      if (res.success) {
        toast.success(`Successfully imported ${res.importedCount} products!`);
        router.refresh();
      } else {
        toast.warning(`Imported ${res.importedCount} products with some errors.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bulk import failed.";
      toast.error(message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <section className="rounded-lg border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Import Guide</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Follow the template format and make sure category names match your database categories exactly.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs">
            <Download className="size-3.5" /> Download CSV Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 border-l-2 border-primary/20 pl-3">
            <p className="font-semibold text-foreground">Available Categories:</p>
            <p className="text-muted-foreground">{categories.map((c) => c.name).join(", ") || "None yet"}</p>
          </div>
          <div className="space-y-1.5 border-l-2 border-primary/20 pl-3">
            <p className="font-semibold text-foreground">Available Brands:</p>
            <p className="text-muted-foreground">{brands.map((b) => b.name).join(", ") || "None yet"}</p>
          </div>
        </div>
      </section>

      {/* Form Panel */}
      <section className="grid grid-cols-1 gap-6 rounded-lg border border-border bg-background p-6">
        {/* CSV File Upload */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">1. Upload Products CSV File</Label>
          <div className="flex items-center gap-3">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              className="max-w-md text-xs cursor-pointer"
            />
            {csvFile && <FileText className="size-5 text-primary animate-pulse" />}
          </div>
        </div>

        {/* Product Images Upload */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">2. Select Product Images (Multi-select)</Label>
          <p className="text-xs text-muted-foreground">
            Select all product photos. Their filenames (e.g. <code>iphone13_front.jpg</code>) must match the names listed in your CSV <code>imageNames</code> column.
          </p>
          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setImagesList(files);
            }}
            className="max-w-md text-xs cursor-pointer"
          />
          {imagesList.length > 0 && (
            <div className="mt-2 text-xs text-green-600 font-semibold">
              ✓ {imagesList.length} image files selected
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button onClick={handleImport} disabled={importing || !csvFile}>
            {importing && <Loader2 className="mr-2 size-4 animate-spin" />}
            {importing ? "Processing Import…" : "Start Bulk Import"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
            Cancel
          </Button>
        </div>
      </section>

      {/* Results Log */}
      {result && (
        <section className="rounded-lg border border-border bg-background p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            {result.errors.length === 0 ? (
              <CheckCircle className="size-5 text-green-600" />
            ) : (
              <AlertTriangle className="size-5 text-yellow-600" />
            )}
            <h3 className="text-sm font-bold text-foreground">Import Completed</h3>
          </div>

          <div className="text-xs space-y-1">
            <p className="text-foreground font-semibold">
              Successfully imported products: <span className="text-green-600 font-bold">{result.importedCount}</span>
            </p>
            {result.errors.length > 0 ? (
              <p className="text-yellow-600 font-semibold">
                Errors / Warnings encountered: <span className="font-bold">{result.errors.length}</span>
              </p>
            ) : (
              <p className="text-green-600 font-semibold">✓ No errors or issues encountered during import.</p>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="border border-border bg-muted/10 p-3 max-h-60 overflow-y-auto space-y-1 rounded font-mono text-[11px] text-muted-foreground">
              {result.errors.map((err, i) => (
                <div key={i} className="py-0.5 border-b border-border/40 last:border-0">
                  {err}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
