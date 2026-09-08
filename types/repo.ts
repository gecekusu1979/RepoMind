export interface RepoMeta {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  license: string | null;
  openIssues: number;
  size: number;
  url: string;
  homepage: string | null;
  watchers: number;
}

export interface FileTreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha?: string;
}

export interface ArchitectureBucket {
  name: "Frontend" | "Backend" | "Database" | "Infra/DevOps" | "Tests" | "Config" | "Other";
  icon: string;
  paths: string[];
  color: string;
}

export interface MetricScores {
  testScore: number;
  docScore: number;
  healthScore: number;
  overall: number;
}

// ─── Security ───────────────────────────────────────────────────

export type SecurityRiskLevel = "Clean" | "Low" | "Critical";

export interface SecurityFinding {
  path: string;
  severity: "low" | "critical";
  reason: string;
  recommendation: string;
}

export interface SecurityScanResult {
  riskLevel: SecurityRiskLevel;
  findings: SecurityFinding[];
}

// ─── Activity ───────────────────────────────────────────────────

export type ActivityStatus =
  | "Aktif Geliştirme"
  | "Düşük Aktivite"
  | "Terk Edilmiş (Stale)"
  | "Yeni Proje";

export interface ActivityResult {
  status: ActivityStatus;
  activityScore: number; // 0-100
  daysSinceUpdate: number;
  color: string;
  emoji: string;
}

// ─── Treemap ────────────────────────────────────────────────────

export type FileCategory = "code" | "styling" | "assets" | "config" | "other";

export interface TreemapNode {
  name: string;
  path: string;
  value: number; // byte size (leaf) or cumulative (dir)
  category?: FileCategory;
  children?: TreemapNode[];
  depth?: number;
}

// ─── Contributors & Bus Factor ──────────────────────────────────

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export type BusFactorRisk = "Kritik Risk" | "Ortalama Risk" | "Sağlıklı";

export interface BusFactorResult {
  topContributors: Contributor[];
  totalCommitsTop10: number;
  top1Share: number;
  top3Share: number;
  risk: BusFactorRisk;
  color: string;
  advice: string;
}

// ─── Issues ─────────────────────────────────────────────────────

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  comments: number;
  created_at: string;
  user: {
    login: string;
  };
}

// ─── Package Audit ──────────────────────────────────────────────

export type PackageRiskSeverity = "high" | "medium";

export interface PackageAuditFinding {
  name: string;
  severity: PackageRiskSeverity;
  reason: string;
  recommendation: string;
}

export interface PackageAuditResult {
  hasPackageJson: boolean;
  findings: PackageAuditFinding[];
}

// ─── Cache ──────────────────────────────────────────────────────

export interface CachedAnalysis {
  data: AnalyzeResponse;
  cachedAt: number; // unix ms timestamp
}

export interface RecentRepo {
  fullName: string;
  cachedAt: number;
  stars: number;
  language: string | null;
}

// ─── Analysis ───────────────────────────────────────────────────

export interface AnalysisResult {
  totalFiles: number;
  totalSize: number;
  architecture: ArchitectureBucket[];
  metrics: MetricScores;
  goodPractices: string[];
  potentialProblems: string[];
  topLanguages: { lang: string; count: number; percentage: number }[];
  directoryDepth: number;
  hasPackageJson: boolean;
  dependencies: string[];
  devDependencies: string[];
  readmeSummary: string;
  firstLevelTree: string[];
  truncated: boolean;
  security: SecurityScanResult;
  activity: ActivityResult;
  packageAudit: PackageAuditResult;
}

export interface AnalyzeResponse {
  meta: RepoMeta;
  analysis: AnalysisResult;
}

export interface ExplainRequest {
  meta: RepoMeta;
  analysis: AnalysisResult;
}

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
}
