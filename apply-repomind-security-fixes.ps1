# RepoMind guvenlik duzeltmeleri - tek seferde uygular (PowerShell surumu).
# KULLANIM: Bu dosyayi RepoMind reposunun KOK dizinine kaydedip calistirin:
#   .\apply-repomind-security-fixes.ps1
#
# Duzeltilen 4 madde:
#  1) components/DependencyGraph.tsx - analiz edilen repodaki package.json
#     bagimlilik adlari Mermaid diyagramina sanitize edilmeden gomuluyordu
#     (stored XSS / graph-injection riski). Artik escape ediliyor.
#  2) components/ArchitectureFlow.tsx - gereksiz `securityLevel: "loose"`
#     kaldirildi (click handler'lar zaten addEventListener ile bagliydi,
#     bu ayarin hicbir islevi yoktu, sadece sanitizasyonu kapatiyordu).
#  3) lib/rateLimit.ts - x-forwarded-for'daki ILK (spoof edilebilir) deger
#     yerine guvenilir proxy'nin ekledigi SON deger kullaniliyor.
#  4) app/api/explain/route.ts - diger route'larda olan rate limit eksikti,
#     eklendi.

git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "HATA: Bu script bir git deposunun icinde calistirilmali (RepoMind kok dizini)." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "components\DependencyGraph.tsx")) {
    Write-Host "HATA: components\DependencyGraph.tsx bulunamadi. RepoMind kok dizininde oldugunuzdan emin olun." -ForegroundColor Red
    exit 1
}

$patchContent = @'
diff --git a/app/api/explain/route.ts b/app/api/explain/route.ts
index 3fe938e..8389be9 100644
--- a/app/api/explain/route.ts
+++ b/app/api/explain/route.ts
@@ -1,5 +1,6 @@
-import { NextRequest } from "next/server";
+import { NextRequest, NextResponse } from "next/server";
 import { AnalyzeResponse, ArchitectureBucket } from "@/types/repo";
+import { checkRateLimit, rateLimitHeaders } from "@/lib/rateLimit";
 
 export const runtime = "edge";
 
@@ -327,6 +328,17 @@ function getScoreLabel(score: number): string {
 
 
 export async function POST(req: NextRequest) {
+    // Diğer tüm route'larda olduğu gibi rate limit — daha önce bu endpoint'te
+    // hiç yoktu, kelime-kelime yapay gecikmeli streaming ile birleşince
+    // ucuz bir kaynak tüketimi (DoS) vektörüydü.
+    const rate = checkRateLimit(req, "explain", 20, 60_000);
+    if (!rate.ok) {
+        return NextResponse.json(
+            { error: "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin." },
+            { status: 429, headers: rateLimitHeaders(rate) }
+        );
+    }
+
     let data: AnalyzeResponse;
     try {
         const contentType = req.headers.get("content-type") ?? "";
@@ -368,6 +380,7 @@ export async function POST(req: NextRequest) {
             "Transfer-Encoding": "chunked",
             "Cache-Control": "no-cache",
             "X-Report-Engine": "heuristic-deterministic",
+            ...rateLimitHeaders(rate),
         },
     });
 }
diff --git a/components/ArchitectureFlow.tsx b/components/ArchitectureFlow.tsx
index 26f5cf7..0a678bc 100644
--- a/components/ArchitectureFlow.tsx
+++ b/components/ArchitectureFlow.tsx
@@ -27,7 +27,14 @@ export function ArchitectureFlow({ buckets, onLayerSelect, selectedLayer }: Arch
                     startOnLoad: false,
                     theme: "dark",
                     fontFamily: "inherit",
-                    securityLevel: "loose", // Must be loose to allow click handlers
+                    // Not: "loose" GEREKMİYOR — tıklama olayları aşağıdaki ayrı
+                    // useEffect'te doğrudan addEventListener ile bağlanıyor,
+                    // Mermaid'in "click" direktifi kullanılmıyor. "loose" modu
+                    // sadece Mermaid'in SVG çıktısına uyguladığı DOMPurify
+                    // sanitizasyonunu devre dışı bırakır ve node etiketlerine
+                    // (bucket adları burada sabit olsa da, global config paylaşımı
+                    // yüzünden DependencyGraph gibi kullanıcı verisi içeren diğer
+                    // diyagramları da etkiler) XSS riski açardı — kaldırıldı.
                     flowchart: { curve: "basis" }
                 });
 
diff --git a/components/DependencyGraph.tsx b/components/DependencyGraph.tsx
index af76db3..d4f3bad 100644
--- a/components/DependencyGraph.tsx
+++ b/components/DependencyGraph.tsx
@@ -9,6 +9,17 @@ interface DependencyGraphProps {
     devDependencies: string[];
 }
 
+// Analiz edilen deponun package.json'undan gelen bağımlılık adları güvenilir
+// değildir (saldırgan kontrollü olabilir). Mermaid diyagram söz dizimini
+// kırabilecek karakterleri (tırnak, köşeli/süslü parantez, backtick, `|`)
+// temizleyip uzunluğu sınırlıyoruz — XSS/graph-injection'a karşı.
+function sanitizeMermaidLabel(text: string): string {
+    return text
+        .replace(/[`"'<>{}[\]|]/g, "")
+        .replace(/\r?\n/g, " ")
+        .slice(0, 100);
+}
+
 export function DependencyGraph({ dependencies, devDependencies }: DependencyGraphProps) {
     const id = useId().replace(/:/g, "");
     const [svg, setSvg] = useState<string | null>(null);
@@ -37,7 +48,7 @@ export function DependencyGraph({ dependencies, devDependencies }: DependencyGra
                     const visibleDeps = dependencies.slice(0, 15);
                     visibleDeps.forEach((dep, i) => {
                         const safeDep = `dep_${i}`;
-                        code += `  Deps --> ${safeDep}["${dep}"]\n`;
+                        code += `  Deps --> ${safeDep}["${sanitizeMermaidLabel(dep)}"]\n`;
                         code += `  style ${safeDep} fill:#22c55e22,stroke:#22c55e,stroke-width:1px,color:#fff\n`;
                     });
                     if (dependencies.length > 15) {
@@ -51,7 +62,7 @@ export function DependencyGraph({ dependencies, devDependencies }: DependencyGra
                     const visibleDevDeps = devDependencies.slice(0, 15);
                     visibleDevDeps.forEach((dep, i) => {
                         const safeDep = `devdep_${i}`;
-                        code += `  DevDeps --> ${safeDep}["${dep}"]\n`;
+                        code += `  DevDeps --> ${safeDep}["${sanitizeMermaidLabel(dep)}"]\n`;
                         code += `  style ${safeDep} fill:#f59e0b22,stroke:#f59e0b,stroke-width:1px,color:#fff\n`;
                     });
                     if (devDependencies.length > 15) {
diff --git a/lib/rateLimit.ts b/lib/rateLimit.ts
index 61c9325..dba15cb 100644
--- a/lib/rateLimit.ts
+++ b/lib/rateLimit.ts
@@ -28,8 +28,19 @@ function cleanup(now: number) {
 }
 
 function getClientIp(req: NextRequest): string {
+    // ÖNEMLİ: x-forwarded-for zincirindeki İLK değer istemci tarafından
+    // serbestçe set edilebilir (spoof edilebilir) — buna güvenmek rate
+    // limit'i tamamen anlamsız kılar (her istekte farklı sahte IP
+    // gönderilerek bypass edilir). Tek bir güvenilir reverse proxy'nin
+    // (örn. Vercel edge) arkasında çalışıldığı varsayımıyla, proxy'nin
+    // eklediği SON değeri kullanıyoruz; bu istemci tarafından üzerine
+    // yazılamaz. Birden fazla güvenilir proxy katmanı varsa bu mantığı
+    // proxy sayınıza göre ayarlayın.
     const forwardedFor = req.headers.get("x-forwarded-for");
-    if (forwardedFor) return forwardedFor.split(",")[0].trim();
+    if (forwardedFor) {
+        const parts = forwardedFor.split(",").map((p) => p.trim()).filter(Boolean);
+        if (parts.length > 0) return parts[parts.length - 1];
+    }
     const realIp = req.headers.get("x-real-ip");
     if (realIp) return realIp;
     return "unknown";
'@
$patchFile = Join-Path $env:TEMP "repomind-security-fixes.patch"
[System.IO.File]::WriteAllText($patchFile, $patchContent, (New-Object System.Text.UTF8Encoding($false)))

git apply --check --ignore-whitespace $patchFile *> $null
if ($LASTEXITCODE -eq 0) {
    git apply --ignore-whitespace $patchFile
    Write-Host "4 degisiklik basariyla uygulandi." -ForegroundColor Green
} else {
    git apply --check --3way --ignore-whitespace $patchFile *> $null
    if ($LASTEXITCODE -eq 0) {
        git apply --3way --ignore-whitespace $patchFile
        Write-Host "4 degisiklik 3-way merge ile uygulandi (dosyalarinizda kucuk farklar vardi)." -ForegroundColor Yellow
    } else {
        Write-Host "HATA: Patch uygulanamadi - muhtemelen dosyalariniz klonladigim surumden farkli." -ForegroundColor Red
        Write-Host ("Patch dosyasi surada duruyor, elle inceleyip uygulayabilirsiniz: " + $patchFile)
        exit 1
    }
}

Remove-Item $patchFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Dogrulama icin:"
Write-Host "  npx tsc --noEmit"
Write-Host "  npx vitest run"
