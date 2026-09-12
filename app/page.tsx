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
import { ExportReportModal } from "@/components/ExportReportModal";
import { RecentRepos } from "@/components/RecentRepos";
import { BusFactorCard } from "@/components/BusFactorCard";
import { GoodFirstIssues } from "@/components/GoodFirstIssues";
import { PackageAuditCard } from "@/components/PackageAuditCard";
import { DevOpsHealthCard } from "@/components/DevOpsHealthCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommitHistoryChart } from "@/components/CommitHistoryChart";
import { getCached, setCached } from "@/lib/cache";
import { AlertCircle, GitBranch, Zap, Code2, Shield, BarChart3, GitCompare } from "lucide-react";
import dynamic from "next/dynamic";

const ArchitectureFlow = dynamic(() => import("@/components/ArchitectureFlow").then(m => m.ArchitectureFlow), { ssr: false });
const DependencyGraph = dynamic(() => import("@/components/DependencyGraph").then(m => m.DependencyGraph), { ssr: false });
const WebLLMChat = dynamic(() => import("@/components/WebLLMChat").then(m => m.WebLLMChat), { ssr: false });

type AppState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'rate-limited'; error: string }
  | { status: 'error'; error: string }
  | { status: 'success'; data: AnalyzeResponse };

export default function Home() {
  const [state, setState] = useState<AppState>({ status: 'idle' });
  const [currentRepo, setCurrentRepo] = useState<string | undefined>();
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);

  const runAnalysis = useCallback(async (url: string) => {
    setState({ status: "loading" });
    setSelectedLayer(null);

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
      setState({ status: "success", data: result });
      setCurrentRepo(result.meta.fullName);
      setCached(result.meta.fullName, result);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Beklenmedik bir hata oluştu.";
      if (message.includes("403") || message.includes("API rate limit")) {
        setState({ status: "rate-limited", error: message });
      } else {
        setState({ status: "error", error: message });
      }
    }
  }, []);

  const handleAnalyze = useCallback(async (url: string) => {
    const normalized = url.trim().replace(/\.git$/, "");
    const match = normalized.match(/github\.com[/:]([^/]+)\/([^/]+)/) ??
      normalized.match(/^([^/]+)\/([^/]+)$/);
    if (match) {
      const fullName = `${match[1]}/${match[2]}`;
      const cached = getCached(fullName);
      if (cached) {
        setState({ status: "success", data: cached });
        setCurrentRepo(fullName);
        setSelectedLayer(null);
        return;
      }
    }
    await runAnalysis(url);
  }, [runAnalysis]);

  const handleRecentSelect = useCallback((fullName: string) => {
    const cached = getCached(fullName);
    if (cached) {
      setState({ status: "success", data: cached });
      setCurrentRepo(fullName);
      setSelectedLayer(null);
    } else {
      runAnalysis(`https://github.com/${fullName}`);
    }
  }, [runAnalysis]);

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#070710] text-zinc-900 dark:text-white selection:bg-violet-500/30">
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
                <GitBranch className="w-5 h-5 text-zinc-900 dark:text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
                RepoMind
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/vs"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/5 dark:bg-white/5 hover:bg-zinc-900/10 dark:hover:bg-white/10 border border-zinc-900/10 dark:border-white/10 text-zinc-900/50 dark:text-white/50 hover:text-zinc-900/80 dark:hover:text-white/80 text-xs rounded-xl transition-all font-medium"
              >
                <GitCompare className="w-3.5 h-3.5" />
                Karşılaştır
              </a>
              <ThemeToggle />
            </div>
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
            <p className="text-zinc-900/50 dark:text-white/50 text-base md:text-lg max-w-xl leading-relaxed">
              Heuristik analiz + AI açıklamaları. Klonlama yok. Sadece GitHub URL&apos;si.
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
            <RepoInput onAnalyze={handleAnalyze} isLoading={state.status === "loading"} />
            <RecentRepos onSelect={handleRecentSelect} currentRepo={currentRepo} />
          </div>
        </section>

        {/* Loading Skeleton */}
        {state.status === "loading" && (
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
        {state.status === "rate-limited" && (
          <div className="max-w-2xl mx-auto pb-16 animate-in fade-in">
            <div className="flex items-start gap-4 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <AlertCircle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-500">GitHub API Limiti Aşıldı</h3>
                  <p className="text-sm text-amber-500/80 mt-1">
                    Saatlik 60 istek sınırına ulaştınız. Analize devam etmek için bir GitHub Token ekleyebilirsiniz.
                  </p>
                </div>
                <div className="p-3 bg-black/20 rounded-xl text-xs font-mono text-amber-200/70">
                  {state.error}
                </div>
              </div>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="max-w-2xl mx-auto pb-16">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Analiz başarısız</p>
                <p className="text-sm text-red-400/70">{state.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {state.status === "success" && (
          <section className="pb-16 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Card */}
            <div className="p-5 md:p-6 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <RepoHeader
                    meta={state.data.meta}
                    totalFiles={state.data.analysis.totalFiles}
                    truncated={state.data.analysis.truncated}
                    activity={state.data.analysis.activity}
                  />
                </div>
                {/* Feature 1: Enhanced Export Modal */}
                <ExportReportModal data={state.data} />
              </div>
            </div>

            {/* Bento Grid: Architecture + Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              {/* Left: Architecture + Language + Treemap + Dependencies */}
              <div className="space-y-4">
                <div className="p-5 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl">
                  <ArchitectureTree buckets={state.data.analysis.architecture} />
                </div>

                {/* Feature 4: Cross-filter enabled Mermaid diagram */}
                <ArchitectureFlow
                  buckets={state.data.analysis.architecture}
                  onLayerSelect={setSelectedLayer}
                  selectedLayer={selectedLayer}
                />

                {state.data.analysis.topLanguages.length > 0 && (
                  <div className="p-5 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl">
                    <LanguageBar languages={state.data.analysis.topLanguages} />
                  </div>
                )}

                {/* Feature 4: Cross-filter enabled Treemap */}
                <div className="p-5 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl">
                  <TreemapVisualizer
                    files={state.data.analysis.architecture.flatMap((b) =>
                      b.paths.map((p) => ({
                        path: p,
                        type: "blob" as const,
                        size: undefined,
                      }))
                    )}
                    selectedLayer={selectedLayer}
                    onClearFilter={() => setSelectedLayer(null)}
                    buckets={state.data.analysis.architecture}
                  />
                </div>

                {/* Feature 2: DevOps Health Card */}
                {state.data.analysis.devopsAudit && (
                  <DevOpsHealthCard audit={state.data.analysis.devopsAudit} />
                )}

                {/* Dependencies Graph */}
                <DependencyGraph
                  dependencies={state.data.analysis.dependencies}
                  devDependencies={state.data.analysis.devDependencies}
                />
              </div>

              {/* Right: Scores + Security */}
              <div className="space-y-4 lg:sticky lg:top-6 self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto no-scrollbar pb-8">
                <div className="p-5 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl h-fit">
                  <ScorePanel
                    testScore={state.data.analysis.metrics.testScore}
                    docScore={state.data.analysis.metrics.docScore}
                    healthScore={state.data.analysis.metrics.healthScore}
                    overall={state.data.analysis.metrics.overall}
                  />
                </div>

                <div className="space-y-4 pt-1">
                  {state.data.analysis.commitActivity && state.data.analysis.commitActivity.length > 0 && (
                    <CommitHistoryChart data={state.data.analysis.commitActivity} />
                  )}
                  <PackageAuditCard audit={state.data.analysis.packageAudit} />
                  <SecurityCard security={state.data.analysis.security} />
                </div>

                {/* Badge URL card */}
                <div className="p-4 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-900/30 dark:text-white/30 uppercase tracking-widest">
                    Rozet URL&apos;leri
                  </h3>
                  <div className="space-y-1.5">
                    {(["health", "test", "doc"] as const).map((metric) => {
                      const badgeUrl = `/api/badge/${state.data.meta.owner}/${state.data.meta.name}?metric=${metric}`;
                      return (
                        <a
                          key={metric}
                          href={badgeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 group"
                        >
                          <code className="text-[10px] font-mono text-zinc-900/30 dark:text-white/30 group-hover:text-zinc-900/60 dark:text-white/60 bg-zinc-900/5 dark:bg-white/5 px-2 py-1 rounded-lg truncate w-full transition-colors">
                            /api/badge/{state.data.meta.owner}/{state.data.meta.name}?metric={metric}
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
              <BusFactorCard meta={state.data.meta} />
              <GoodFirstIssues meta={state.data.meta} />
            </div>

            {/* Badges */}
            <div className="p-5 md:p-6 bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/10 dark:border-white/10 rounded-2xl">
              <BadgeList
                goodPractices={state.data.analysis.goodPractices}
                potentialProblems={state.data.analysis.potentialProblems}
              />
            </div>

            {/* AI Explain & WebLLM Chat (Feature 5: Persona Selector) */}
            <ExplainDrawer data={state.data} />
            <WebLLMChat data={state.data} />
          </section>
        )}

        {/* Footer */}
        {state.status === "idle" && (
          <footer className="pb-16 text-center text-zinc-900/20 dark:text-white/20 text-xs space-y-3">
            <p className="flex items-center justify-center gap-1.5 opacity-60">
              RepoMind Chrome Eklentisini yükleyerek GitHub üzerinde tek tıkla analiz başlatabilirsiniz.
            </p>
            <p>Klonlama yok. Sadece GitHub API + heuristik motor.</p>
            <p>
              <code className="font-mono bg-zinc-900/5 dark:bg-white/5 px-1.5 py-0.5 rounded">GITHUB_TOKEN</code>{" "}
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
    <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 rounded-full text-xs text-zinc-900/50 dark:text-white/50">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={`bg-zinc-900/[0.03] dark:bg-white/[0.03] border border-zinc-900/5 dark:border-white/5 animate-pulse ${className}`}
    />
  );
}
