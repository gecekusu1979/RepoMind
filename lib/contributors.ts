import { Contributor, BusFactorResult, BusFactorRisk } from "@/types/repo";

export function calculateBusFactor(contributors: Contributor[]): BusFactorResult {
    if (!contributors || contributors.length === 0) {
        return {
            topContributors: [],
            totalCommitsTop10: 0,
            top1Share: 0,
            top3Share: 0,
            risk: "Sağlıklı",
            color: "#10b981", // emerald
            advice: "Yeterli veri yok.",
        };
    }

    const totalCommitsTop10 = contributors.reduce((sum, c) => sum + c.contributions, 0);
    const top1 = contributors[0]?.contributions || 0;
    const top1Share = Math.round((top1 / totalCommitsTop10) * 100);

    let top3 = 0;
    for (let i = 0; i < Math.min(3, contributors.length); i++) {
        top3 += contributors[i].contributions;
    }
    const top3Share = Math.round((top3 / totalCommitsTop10) * 100);

    let risk: BusFactorRisk = "Sağlıklı";
    let color = "#10b981"; // emerald
    let advice = "Geliştirme yükü takıma iyi dağıtılmış durumda.";

    if (top1Share > 70) {
        risk = "Kritik Risk";
        color = "#ef4444"; // red
        advice = "Tek geliştiriciye aşırı bağımlılık (Single point of failure). Proje sağlığı riskli.";
    } else if (top1Share >= 45 || top3Share > 85) {
        risk = "Ortalama Risk";
        color = "#f59e0b"; // amber
        advice = "Çekirdek katkı sağlayan 1-2 kişiye bağımlılık yüksek.";
    }

    return {
        topContributors: contributors.slice(0, 10),
        totalCommitsTop10,
        top1Share,
        top3Share,
        risk,
        color,
        advice,
    };
}
