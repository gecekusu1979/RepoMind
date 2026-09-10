# 🧠 RepoMind

> **Zero-Config, In-Browser GitHub Repository Analyzer & Architecture Radar**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![WebGPU](https://img.shields.io/badge/Local_AI-WebGPU_SmolLM2-emerald)](https://webllm.mlc.ai/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/gecekusu1979/RepoMind/pulls)

**RepoMind**, herhangi bir açık kaynak GitHub deposunun mimarisini, kod sağlığını, bağımlılık risklerini ve sürdürülebilirliğini **depoyu yerel makinenize klonlamadan** saniyeler içinde analiz eden modern bir geliştirici aracıdır.

Dışarıdan zorunlu bir LLM veya GitHub API anahtarına ihtiyaç duymaz; analizleri GitHub Tree API ve kural tabanlı algoritmalarla yerel olarak yürütür, yapay zekayı ise **WebGPU (WebLLM)** aracılığıyla doğrudan kullanıcının tarayıcısında çalıştırır

---

## ⚡ Temel Özellikler

* **Klonlamasız $O(N)$ Ağaç Taraması:** `git clone` maliyeti olmadan GitHub Git Trees API (`recursive=1`) üzerinden dosya hiyerarşisini tek bir istekte çözümler.
* **Tarayıcı İçi Yerel AI (WebGPU):** `@mlc-ai/web-llm` ve `SmolLM2-135M` modeli ile tarayıcı sekmesinde çalışan, sıfır token maliyetli yerel repo asistanı.
* **Otomatik Mimari Haritalandırma:** Frontend, Backend, Veritabanı ve DevOps katmanlarını dizin yapısından tespit eder ve interaktif **Mermaid v11** akış şemasına döker.
* **Sağlık & Kalite Skorları:** Test kapsama oranı ($S_{\text{test}}$), dokümantasyon yeterliliği ($S_{\text{doc}}$) ve bakım puanı ($S_{\text{health}}$).
* **Bus Factor & Sürdürülebilirlik:** En aktif 10 katkıcıyı analiz ederek projenin tek bir geliştiriciye bağımlılık riskini (SPOF) tespit eder.
* **Güvenlik & Paket Denetimi:** `package.json` içerisindeki terk edilmiş paketleri (e.g., `moment`, `request`), şüpheli `postinstall` betiklerini ve virütik lisansları (GPL/AGPL) bayraklar.
* **Good First Issues Radarı:** Yeni katkıcılar için repodaki başlangıç seviyesi görevleri PR'lardan ayıklayarak listeler.
* **Dinamik SVG Rozetleri:** `README.md` dosyalarına doğrudan eklenebilen Shield tarzı canlı sağlık rozetleri üretir.
* **Manifest V3 Chrome Eklentisi:** `github.com` üzerinde gezinirken repo başlığına tek tıkla analiz başlatan güvenli bir buton ekler.

---

## 🛠️ Teknoloji Yığını

* **Çatı:** [Next.js 16](https://nextjs.org) (App Router, React Server Components)
* **Dil:** TypeScript (Strict Mode)
* **Arayüz:** Tailwind CSS, Lucide Icons, Recharts, Mermaid.js
* **İstemci Yapay Zekası:** [@mlc-ai/web-llm](https://webllm.mlc.ai/) (SmolLM2 quantized via WebGPU)
* **Güvenlik:** `rehype-sanitize`, `isValidGitHubSlug` traversal & SSRF korumaları

---

## 🚀 Hızlı Başlangıç

RepoMind **%100 anahtarsız (zero-key)** çalışacak şekilde tasarlanmıştır.

```bash
# 1. Depoyu klonlayın
git clone https://github.com/gecekusu1979/RepoMind.git
cd RepoMind

# 2. Bağımlılıkları yükleyin
npm install

# 3. Geliştirme sunucusunu başlatın
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açarak dilediğiniz depoyu analiz etmeye başlayabilirsiniz.

> **Not (Opsiyonel GitHub Token):** Anonim isteklerde GitHub saatlik 60 istek sınırı uygular. Bu limiti saatte 5.000 isteğe çıkarmak isterseniz `.env.local` dosyasına kişisel tokenınızı ekleyebilirsiniz:
>
> ```env
> GITHUB_TOKEN=ghp_kisisel_erisim_tokeniniz_buraya
> ```

---

## 🛡️ Dinamik README Rozeti (Badge API)

Deponuzun canlı sağlık skorunu projenizin kendi `README.md` dosyasına eklemek için:

```markdown
[![RepoMind Health](https://repomind.dev/api/badge/owner/repo?metric=health)](https://repomind.dev/?url=https://github.com/owner/repo)
```
Desteklenen metrikler: `metric=health`, `metric=test`, `metric=doc`.

---

## 📄 Lisans

Bu proje **GNU General Public License v3.0 (GPL-3.0)** altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakabilirsiniz.
