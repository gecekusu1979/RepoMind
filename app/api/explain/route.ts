import { NextRequest } from "next/server";
import { AnalyzeResponse, ArchitectureBucket } from "@/types/repo";

export const runtime = "edge";


function formatSize(kb: number): string {
    if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`;
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb} KB`;
}

function formatStars(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toString();
}


function classifyProjectDomain(data: AnalyzeResponse): string {
    const { analysis, meta } = data;
    const archNames = analysis.architecture.map((b) => b.name);
    const deps = [
        ...analysis.dependencies,
        ...analysis.devDependencies,
    ].map((d) => d.toLowerCase());
    const lang = meta.language?.toLowerCase() ?? "";
    const desc = (meta.description ?? "").toLowerCase();

    const hasFrontend = archNames.includes("Frontend");
    const hasBackend = archNames.includes("Backend");
    const hasDb = archNames.includes("Database");
    const hasInfra = archNames.includes("Infra/DevOps");

    if (deps.some((d) => ["commander", "yargs", "meow", "minimist", "inquirer", "oclif"].includes(d)))
        return "**CLI Aracı** — Komut satırı uygulaması";

    if (hasFrontend && hasBackend && hasDb)
        return "**Full-Stack Web Uygulaması** — Uçtan uca istemci + sunucu + veritabanı katmanları";

    if (hasFrontend && !hasBackend)
        return "**Frontend Web Uygulaması** — İstemci taraflı kullanıcı arayüzü";

    if (hasBackend && !hasFrontend)
        return "**Backend Servisi / REST API** — Sunucu taraflı iş mantığı ve API katmanı";

    if (deps.includes("rollup") || deps.includes("tsup") || deps.includes("unbuild") ||
        desc.includes("library") || desc.includes("package") || desc.includes("sdk"))
        return "**Kütüphane / SDK / NPM Paketi** — Yeniden kullanılabilir modül";

    if (hasInfra && archNames.length <= 2)
        return "**Altyapı / DevOps Projesi** — Konteyner, IaC veya otomasyon yapılandırması";

    if (lang === "dart" || deps.some((d) => d.includes("react-native") || d.includes("expo")))
        return "**Mobil Uygulama** — Çapraz platform veya native mobil";

    if (lang === "python" && desc.match(/ml|machine learning|model|neural|data/))
        return "**Veri Bilimi / Makine Öğrenmesi Projesi**";

    return "**Çok Amaçlı Yazılım Projesi**";
}


function inferTechStack(data: AnalyzeResponse): string[] {
    const allDeps = [
        ...data.analysis.dependencies,
        ...data.analysis.devDependencies,
    ].map((d) => d.toLowerCase());
    const lang = data.meta.language ?? "Unknown";
    const archNames = data.analysis.architecture.map((b) => b.name);
    const stack: string[] = [];

    if (lang) stack.push(`**Dil:** ${lang}`);

    if (allDeps.includes("next") || allDeps.includes("next.js")) stack.push("**Framework:** Next.js");
    else if (allDeps.includes("nuxt") || allDeps.includes("nuxt3")) stack.push("**Framework:** Nuxt.js");
    else if (allDeps.includes("react")) stack.push("**UI Kütüphanesi:** React");
    else if (allDeps.includes("vue")) stack.push("**Framework:** Vue.js");
    else if (allDeps.includes("svelte")) stack.push("**Framework:** Svelte");
    else if (allDeps.includes("angular") || allDeps.includes("@angular/core")) stack.push("**Framework:** Angular");
    else if (allDeps.includes("solid-js")) stack.push("**Framework:** SolidJS");

    if (allDeps.includes("express")) stack.push("**Web Sunucusu:** Express.js");
    else if (allDeps.includes("fastify")) stack.push("**Web Sunucusu:** Fastify");
    else if (allDeps.includes("hono")) stack.push("**Web Sunucusu:** Hono");
    else if (allDeps.includes("koa")) stack.push("**Web Sunucusu:** Koa");
    else if (allDeps.includes("nestjs") || allDeps.includes("@nestjs/core")) stack.push("**Framework:** NestJS");

    if (allDeps.includes("@prisma/client") || allDeps.includes("prisma")) stack.push("**ORM:** Prisma");
    else if (allDeps.includes("drizzle-orm")) stack.push("**ORM:** Drizzle");
    else if (allDeps.includes("mongoose")) stack.push("**ODM:** Mongoose / MongoDB");
    else if (allDeps.includes("sequelize")) stack.push("**ORM:** Sequelize");
    else if (allDeps.includes("typeorm")) stack.push("**ORM:** TypeORM");
    if (allDeps.some((d) => d.includes("pg") || d === "postgres")) stack.push("**Veritabanı:** PostgreSQL");
    else if (allDeps.includes("mysql2") || allDeps.includes("mysql")) stack.push("**Veritabanı:** MySQL");
    else if (allDeps.includes("better-sqlite3") || allDeps.includes("sqlite3")) stack.push("**Veritabanı:** SQLite");

    if (allDeps.includes("typescript")) stack.push("**Tip Sistemi:** TypeScript");
    if (allDeps.includes("vite")) stack.push("**Bundler:** Vite");
    else if (allDeps.includes("webpack")) stack.push("**Bundler:** Webpack");
    else if (allDeps.includes("rollup")) stack.push("**Bundler:** Rollup");
    else if (allDeps.includes("tsup")) stack.push("**Bundler:** tsup");
    if (allDeps.includes("tailwindcss")) stack.push("**CSS:** Tailwind CSS");
    else if (allDeps.includes("styled-components")) stack.push("**CSS-in-JS:** styled-components");
    else if (allDeps.includes("@emotion/react")) stack.push("**CSS-in-JS:** Emotion");

    if (allDeps.includes("zustand")) stack.push("**State:** Zustand");
    else if (allDeps.includes("redux") || allDeps.includes("@reduxjs/toolkit")) stack.push("**State:** Redux Toolkit");
    else if (allDeps.includes("jotai")) stack.push("**State:** Jotai");
    else if (allDeps.includes("recoil")) stack.push("**State:** Recoil");

    if (allDeps.includes("vitest")) stack.push("**Test:** Vitest");
    else if (allDeps.includes("jest")) stack.push("**Test:** Jest");
    if (allDeps.includes("playwright")) stack.push("**E2E:** Playwright");
    else if (allDeps.includes("cypress")) stack.push("**E2E:** Cypress");

    if (archNames.includes("Infra/DevOps")) stack.push("**CI/CD:** GitHub Actions veya benzeri");

    return stack;
}


function detectEntryPoints(data: AnalyzeResponse): string[] {
    const paths = data.analysis.firstLevelTree;
    const entries: string[] = [];

    const candidates = [
        "src/index.ts", "src/index.js", "src/main.ts", "src/main.js",
        "app/page.tsx", "app/layout.tsx", "app/index.tsx",
        "pages/index.tsx", "pages/index.js", "pages/_app.tsx",
        "index.ts", "index.js", "main.ts", "main.js",
        "server.ts", "server.js", "cli.ts", "cli.js",
        "src/app.ts", "src/app.js", "src/server.ts",
    ];

    for (const c of candidates) {
        if (paths.some((p) => p === c || p.endsWith("/" + c.split("/").pop()!))) {
            entries.push(`\`${c}\``);
        }
    }

    return entries.slice(0, 3);
}


function describeArchLayer(bucket: ArchitectureBucket): string {
    const samplePaths = bucket.paths.slice(0, 4).map((p) => `\`${p}\``).join(", ");
    const count = bucket.paths.length;

    const descriptions: Record<string, string> = {
        Frontend: `İstemci taraflı UI katmanı — ${count} dosya. Örnek yollar: ${samplePaths}`,
        Backend: `Sunucu taraflı API / iş mantığı katmanı — ${count} dosya. Örnek yollar: ${samplePaths}`,
        Database: `Veritabanı şeması, migration ve model katmanı — ${count} dosya. Örnek yollar: ${samplePaths}`,
        "Infra/DevOps": `Altyapı ve CI/CD yapılandırması — ${count} dosya. Örnek yollar: ${samplePaths}`,
        Tests: `Test suite — ${count} dosya. Örnek yollar: ${samplePaths}`,
        Config: `Yapılandırma ve tooling dosyaları — ${count} dosya. Örnek yollar: ${samplePaths}`,
        Other: `Diğer dosyalar — ${count} adet.`,
    };

    return descriptions[bucket.name] ?? `${bucket.name} — ${count} dosya. ${samplePaths}`;
}


function extractReadmeSummary(readme: string): string {
    if (!readme || readme.length < 10) return "";
    const cleaned = readme
        .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "") // badge links
        .replace(/<!--[\s\S]*?-->/g, "")             // HTML comments
        .replace(/^#{1,6}\s+.*/gm, "")              // Strip headers to find body text
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const paragraphs = cleaned.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 50);
    return paragraphs[0]?.slice(0, 400) ?? readme.slice(0, 300);
}


function generateReport(data: AnalyzeResponse): string {
    const { meta, analysis } = data;
    const { metrics, architecture, goodPractices, potentialProblems,
        totalFiles, totalSize, topLanguages, firstLevelTree } = analysis;

    const domain = classifyProjectDomain(data);
    const stack = inferTechStack(data);
    const entries = detectEntryPoints(data);
    const readmeSummary = extractReadmeSummary(analysis.readmeSummary);

    const archLayers = architecture.filter((b) => b.name !== "Other");
    const otherBucket = architecture.find((b) => b.name === "Other");
    const totalLangFiles = topLanguages.reduce((s, l) => s + l.count, 0);

    let section1 = `### 📌 1. Bu Proje Ne İşe Yarar?\n\n`;
    section1 += `**${meta.fullName}** — ${domain}\n\n`;

    if (meta.description) {
        section1 += `> ${meta.description}\n\n`;
    }

    if (readmeSummary) {
        section1 += `**README'den Özet:**\n${readmeSummary}\n\n`;
    } else {
        section1 += `_README içeriği bulunamadı veya çok kısa._\n\n`;
    }

    section1 += `**Temel Rakamlar:**\n`;
    section1 += `- ⭐ ${formatStars(meta.stars)} yıldız · 🍴 ${meta.forks.toLocaleString("tr-TR")} fork\n`;
    section1 += `- 📂 Toplam **${totalFiles} dosya** (${formatSize(totalSize / 1024)} disk üzerinde)\n`;
    section1 += `- 🐛 **${meta.openIssues}** açık issue\n`;
    if (meta.license) section1 += `- ⚖️ Lisans: **${meta.license}**\n`;
    if (meta.topics.length > 0) {
        section1 += `- 🏷️ Konular: ${meta.topics.slice(0, 8).map((t) => `\`${t}\``).join(", ")}\n`;
    }

    let section2 = `\n---\n\n### 🏗️ 2. Mimari Yapı & Veri Akışı\n\n`;

    if (archLayers.length > 0) {
        section2 += `**Tespit Edilen Katmanlar:**\n\n`;
        for (const b of archLayers) {
            section2 += `- **${b.icon} ${b.name}:** ${describeArchLayer(b)}\n`;
        }
        if (otherBucket && otherBucket.paths.length > 0) {
            section2 += `- **📁 Diğer:** ${otherBucket.paths.length} sınıflandırılmamış dosya.\n`;
        }
    } else {
        section2 += `_Belirgin bir mimari katman tespit edilemedi — proje tek klasörde yayılmış olabilir._\n`;
    }

    if (firstLevelTree.length > 0) {
        section2 += `\n**Kök Dizin Yapısı (ilk 2 seviye):**\n\`\`\`\n`;
        section2 += firstLevelTree.slice(0, 20).join("\n");
        if (firstLevelTree.length > 20) section2 += `\n... ve ${firstLevelTree.length - 20} öğe daha`;
        section2 += `\n\`\`\`\n`;
    }

    if (stack.length > 0) {
        section2 += `\n**Tespit Edilen Teknoloji Yığını:**\n`;
        for (const s of stack) {
            section2 += `- ${s}\n`;
        }
    }

    if (topLanguages.length > 0) {
        section2 += `\n**Dil Dağılımı** (${totalLangFiles} kod dosyası):\n`;
        for (const l of topLanguages.slice(0, 6)) {
            const bar = "█".repeat(Math.round(l.percentage / 5)) + "░".repeat(20 - Math.round(l.percentage / 5));
            section2 += `- \`${l.lang.padEnd(14)}\` ${bar} ${l.percentage}% (${l.count} dosya)\n`;
        }
    }

    if (entries.length > 0) {
        section2 += `\n**Muhtemel Giriş Noktaları:** ${entries.join(" · ")}\n`;
    }

    let section3 = `\n---\n\n### 🚀 3. Katkıcı Başlangıç Rehberi & Kritik Bulgular\n\n`;

    section3 += `**Kalite Metrikleri:**\n\n`;
    section3 += `| Metrik | Puan | Değerlendirme |\n`;
    section3 += `|--------|------|---------------|\n`;
    section3 += `| 🧪 Test Kapsamı | ${metrics.testScore}/100 | ${getScoreLabel(metrics.testScore)} |\n`;
    section3 += `| 📚 Dokümantasyon | ${metrics.docScore}/100 | ${getScoreLabel(metrics.docScore)} |\n`;
    section3 += `| 💊 Kod Sağlığı | ${metrics.healthScore}/100 | ${getScoreLabel(metrics.healthScore)} |\n`;
    section3 += `| 🏆 Genel Skor | ${metrics.overall}/100 | ${getScoreLabel(metrics.overall)} |\n\n`;

    section3 += `**Nereden Başlamalı?**\n`;
    if (entries.length > 0) {
        section3 += `1. 📂 Uygulamanın ana giriş noktası: ${entries[0]}\n`;
    }
    if (archLayers.some((b) => b.name === "Frontend")) {
        const fb = archLayers.find((b) => b.name === "Frontend")!;
        const firstFe = fb.paths[0];
        section3 += `2. 🎨 UI katmanını anlamak için: \`${firstFe}\` dosyasından başlayın.\n`;
    }
    if (archLayers.some((b) => b.name === "Backend")) {
        const bb = archLayers.find((b) => b.name === "Backend")!;
        const firstBe = bb.paths[0];
        section3 += `3. ⚙️ Sunucu mantığı için: \`${firstBe}\` dosyasına bakın.\n`;
    }
    if (archLayers.some((b) => b.name === "Database")) {
        const db = archLayers.find((b) => b.name === "Database")!;
        section3 += `4. 🗄️ Şema tanımları: \`${db.paths[0]}\` veya çevresindeki dosyalar.\n`;
    }
    section3 += `\n`;

    if (goodPractices.length > 0) {
        section3 += `**Güçlü Yönler (${goodPractices.length} iyi uygulama tespit edildi):**\n`;
        for (const p of goodPractices) {
            section3 += `- ${p}\n`;
        }
        section3 += "\n";
    }

    if (potentialProblems.length > 0) {
        section3 += `**⚠️ Dikkat Edilmesi Gereken Noktalar (${potentialProblems.length} bulgu):**\n`;
        for (const p of potentialProblems) {
            section3 += `- ${p}\n`;
        }
        section3 += "\n";
    }

    if (analysis.hasPackageJson) {
        const depCount = analysis.dependencies.length;
        const devDepCount = analysis.devDependencies.length;
        section3 += `**Bağımlılık Profili:** ${depCount} üretim + ${devDepCount} geliştirme bağımlılığı.\n`;
        if (depCount > 50) {
            section3 += `> 🟡 Yüksek bağımlılık sayısı — bundle boyutunu ve güvenlik yüzeyini artırabilir.\n`;
        } else if (depCount < 5) {
            section3 += `> ✅ Minimal bağımlılık — iyi izole edilmiş bir proje.\n`;
        }
        section3 += "\n";
    }

    if (analysis.truncated) {
        section3 += `> ℹ️ **Not:** Bu deponun dosya ağacı 100.000 öğeyi aşmaktadır. Analiz ilk 100k girdi üzerinden yapılmıştır.\n\n`;
    }

    section3 += `---\n_Bu rapor RepoMind heuristik motoru tarafından oluşturulmuştur — harici API anahtarı kullanılmadan._\n`;

    return section1 + section2 + section3;
}

function getScoreLabel(score: number): string {
    if (score >= 80) return "✅ Mükemmel";
    if (score >= 60) return "🟡 İyi";
    if (score >= 40) return "🟠 Orta";
    return "🔴 Zayıf";
}


export async function POST(req: NextRequest) {
    let data: AnalyzeResponse;
    try {
        const contentType = req.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            return new Response("Content-Type application/json olmalıdır.", { status: 415 });
        }
        data = await req.json();
    } catch {
        return new Response("Geçersiz istek gövdesi.", { status: 400 });
    }

    if (
        !data ||
        typeof data !== "object" ||
        typeof data.meta?.owner !== "string" ||
        typeof data.analysis !== "object"
    ) {
        return new Response("Geçersiz veri yapısı.", { status: 400 });
    }

    const report = generateReport(data);

    const words = report.split(/(?<=\s)|(?=\s)/);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            for (const word of words) {
                controller.enqueue(encoder.encode(word));
                await new Promise<void>((resolve) => setTimeout(resolve, 15));
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache",
            "X-Report-Engine": "heuristic-deterministic",
        },
    });
}
