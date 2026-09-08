"use client";

import { useState, useCallback } from "react";
import { AnalyzeResponse } from "@/types/repo";
import { RepoInput } from "@/components/RepoInput";
import { RepoHeader } from "@/components/RepoHeader";
import { ArchitectureTree } from "@/components/ArchitectureTree";
import { ScorePanel } from "@/components/ScoreCard";
import { BadgeList } from "@/components/BadgeList";
import { ExplainDrawer } from "@/components/ExplainDrawer";
import { LanguageBar } from "@/components/LanguageBar";
import { TreemapVisualizer } from "@/components/TreemapVisualizer";
import { SecurityCard } from "@/components/SecurityCard";
import { ExportReport } from "@/components/ExportReport";
import { RecentRepos } from "@/components/RecentRepos";
import { BusFactorCard } from "@/components/BusFactorCard";
import { GoodFirstIssues } from "@/components/GoodFirstIssues";
import { PackageAuditCard } from "@/components/PackageAuditCard";
import { getCached, setCached } from "@/lib/cache";
import { AlertCircle, GitBranch, Zap, Code2, Shield, BarChart3, GitCompare } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import heavy/browser-only components
const ArchitectureFlow = dynamic(() => import("@/components/ArchitectureFlow").then(m => m.ArchitectureFlow), { ssr: false });
const WebLLMChat = dynamic(() => import("@/components/WebLLMChat").then(m => m.WebLLMChat), { ssr: false });

export default function Home() {
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRepo, setCurrentRepo] = useState<string | undefined>();

  const runAnalysis = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      const result = json as AnalyzeResponse;
      setData(result);
      setCurrentRepo(result.meta.fullName);
      setCached(result.meta.fullName, result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Beklenmedik bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnalyze = useCallback(async (url: string) => {
    // Normalize short form owner/repo → fullName check
    const normalized = url.trim().replace(/\.git$/, "");
    const match = normalized.match(/github\.com[/:]([^/]+)\/([^/]+)/) ??
      normalized.match(/^([^/]+)\/([^/]+)$/);
    if (match) {
      const fullName = `${match[1]}/${match[2]}`;
      const cached = getCached(fullName);
      if (cached) {
        setData(cached);
        setCurrentRepo(fullName);
        setError(null);
        setLoading(false);
        return;
      }
    }
    await runAnalysis(url);
  }, [runAnalysis]);

  const handleRecentSelect = useCallback((fullName: string) => {
    const cached = getCached(fullName);
    if (cached) {
      setData(cached);
      setCurrentRepo(fullName);
      setError(null);
    } else {
      runAnalysis(`https://github.com/${fullName}`);
    }
  }, [runAnalysis]);

  return (
    <main className="min-h-screen bg-[#070710] text-white selection:bg-violet-500/30">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="pt-16 pb-12 space-y-8">
          {/* Logo + Nav */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                RepoMind
              </span>
            </div>
            <a
              href="/vs"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 text-xs rounded-xl transition-all font-medium"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Karşılaştır
            </a>
          </div>

          {/* Title */}
          <div className="flex flex-col items-center text-center space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl leading-[1.1]">
              Herhangi bir{" "}
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                GitHub deposunu
              </span>{" "}
              <br className="hidden md:block" />
              saniyeler içinde anlayın
            </h1>
            <p className="text-white/50 text-base md:text-lg max-w-xl leading-relaxed">
              Heuristik analiz + AI açıklamaları. Klonlama yok. Sadece GitHub URL'si.
            </p>

            {/* Feature pills */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <FeaturePill icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} label="Süper hızlı" />
              <FeaturePill icon={<Code2 className="w-3.5 h-3.5 text-blue-400" />} label="Mimari tespiti" />
              <FeaturePill icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />} label="Güvenlik taraması" />
              <FeaturePill icon={<BarChart3 className="w-3.5 h-3.5 text-violet-400" />} label="Dosya ısı haritası" />
            </div>
          </div>

          {/* Input */}
          <div className="max-w-2xl mx-auto space-y-3">
            <RepoInput onAnalyze={handleAnalyze} isLoading={loading} />
            <RecentRepos onSelect={handleRecentSelect} currentRepo={currentRepo} />
          </div>
        </section>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4 pb-16 animate-in fade-in duration-300">
            <SkeletonBlock className="h-36 rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              <SkeletonBlock className="h-96 rounded-2xl" />
              <SkeletonBlock className="h-96 rounded-2xl" />
            </div>
            <SkeletonBlock className="h-48 rounded-2xl" />
            <SkeletonBlock className="h-72 rounded-2xl" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="max-w-2xl mx-auto pb-16">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Analiz başarısız</p>
                <p className="text-sm text-red-400/70">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {data && !loading && (
          <section className="pb-16 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Card */}
            <div className="p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <RepoHeader
                    meta={data.meta}
                    totalFiles={data.analysis.totalFiles}
                    truncated={data.analysis.truncated}
                    activity={data.analysis.activity}
                  />
                </div>
                {/* Export buttons */}
                <ExportReport data={data} />
              </div>
            </div>

            {/* Bento Grid: Architecture + Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              {/* Left: Architecture + Language + Treemap + Dependencies */}
              <div className="space-y-4">
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl">
                  <ArchitectureTree buckets={data.analysis.architecture} />
                </div>

                <ArchitectureFlow buckets={data.analysis.architecture} />

                {data.analysis.topLanguages.length > 0 && (
                  <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <LanguageBar languages={data.analysis.topLanguages} />
                  </div>
                )}

                {/* Treemap Visualizer */}
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl">
                  <TreemapVisualizer files={data.analysis.architecture.flatMap((b) =>
                    b.paths.map((p) => ({
                      path: p,
                      type: "blob" as const,
                      size: undefined,
                    }))
                  )} />
                </div>

                {/* Dependencies */}
                {data.analysis.dependencies.length > 0 && (
                  <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl">
                    <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
                      Bağımlılıklar ({data.analysis.dependencies.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {data.analysis.dependencies.slice(0, 30).map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-white/50"
                        >
                          {dep}
                        </span>
                      ))}
                      {data.analysis.dependencies.length > 30 && (
                        <span className="px-2 py-0.5 text-xs text-white/30">
                          +{data.analysis.dependencies.length - 30} daha
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Scores + Security */}
              <div className="space-y-4">
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl h-fit lg:sticky lg:top-6">
                  <ScorePanel
                    testScore={data.analysis.metrics.testScore}
                    docScore={data.analysis.metrics.docScore}
                    healthScore={data.analysis.metrics.healthScore}
                    overall={data.analysis.metrics.overall}
                  />
                </div>

                {/* Security scan card */}
                <div className="lg:sticky lg:top-[calc(6rem+var(--score-panel-height,340px))] space-y-4">
                  <PackageAuditCard audit={data.analysis.packageAudit} />
                  <SecurityCard security={data.analysis.security} />
                </div>

                {/* Badge URL card */}
                <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2">
                  <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                    Rozet URL'leri
                  </h3>
                  <div className="space-y-1.5">
                    {(["health", "test", "doc"] as const).map((metric) => {
                      const badgeUrl = `/api/badge/${data.meta.owner}/${data.meta.name}?metric=${metric}`;
                      return (
                        <a
                          key={metric}
                          href={badgeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 group"
                        >
                          <code className="text-[10px] font-mono text-white/30 group-hover:text-white/60 bg-white/5 px-2 py-1 rounded-lg truncate w-full transition-colors">
                            /api/badge/{data.meta.owner}/{data.meta.name}?metric={metric}
                          </code>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Full Width Dynamic Row: Bus Factor & Good First Issues */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BusFactorCard meta={data.meta} />
              <GoodFirstIssues meta={data.meta} />
            </div>

            {/* Badges */}
            <div className="p-5 md:p-6 bg-white/[0.03] border border-white/10 rounded-2xl">
              <BadgeList
                goodPractices={data.analysis.goodPractices}
                potentialProblems={data.analysis.potentialProblems}
              />
            </div>

            {/* AI Explain & WebLLM Chat */}
            <ExplainDrawer data={data} />
            <WebLLMChat data={data} />
          </section>
        )}

        {/* Footer */}
        {!data && !loading && !error && (
          <footer className="pb-16 text-center text-white/20 text-xs space-y-3">
            <p className="flex items-center justify-center gap-1.5 opacity-60">
              RepoMind Chrome Eklentisini yükleyerek GitHub üzerinde tek tıkla analiz başlatabilirsiniz.
            </p>
            <p>Klonlama yok. Sadece GitHub API + heuristik motor.</p>
            <p>
              <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded">GITHUB_TOKEN</code>{" "}
              opsiyonel — 60 → 5,000 istek/saat.
            </p>
          </footer>
        )}
      </div>
    </main>
  );
}

function FeaturePill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/50">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`bg-white/[0.03] border border-white/5 animate-pulse ${className}`}
    />
  );
}
