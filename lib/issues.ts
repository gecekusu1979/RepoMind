import { GitHubIssue } from "@/types/repo";

export function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const MINUTE = 60;
    const HOUR = MINUTE * 60;
    const DAY = HOUR * 24;
    const MONTH = DAY * 30;
    const YEAR = DAY * 365;

    if (diffInSeconds < MINUTE) {
        return "az önce";
    } else if (diffInSeconds < HOUR) {
        return `${Math.floor(diffInSeconds / MINUTE)} dakika önce`;
    } else if (diffInSeconds < DAY) {
        return `${Math.floor(diffInSeconds / HOUR)} saat önce`;
    } else if (diffInSeconds < MONTH) {
        return `${Math.floor(diffInSeconds / DAY)} gün önce`;
    } else if (diffInSeconds < YEAR) {
        return `${Math.floor(diffInSeconds / MONTH)} ay önce`;
    }
    return `${Math.floor(diffInSeconds / YEAR)} yıl önce`;
}

interface RawGitHubIssue {
    id: number;
    number: number;
    title: string;
    html_url: string;
    comments: number;
    created_at: string;
    pull_request?: unknown;
    user?: { login?: string } | null;
}

export function processIssues(rawIssues: RawGitHubIssue[]): GitHubIssue[] {
    const pureIssues = rawIssues.filter(i => !i.pull_request);

    return pureIssues.map(i => ({
        id: i.id,
        number: i.number,
        title: i.title,
        html_url: i.html_url,
        comments: i.comments,
        created_at: i.created_at,
        user: { login: i.user?.login || "bilinmeyen" }
    })).slice(0, 5);
}
