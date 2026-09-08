# Güvenlik Politikası (Security Policy)

RepoMind açık kaynak projesinin güvenliği ve kullanıcı gizliliği birinci önceliğimizdir. 

## Desteklenen Sürümler

Aşağıdaki tabloda güvenlik yamalarını alan güncel sürümler listelenmiştir:

| Sürüm | Destek Durumu |
| :--- | :--- |
| 1.x.x | :white_check_mark: Destekleniyor |
| < 1.0.0 | :x: Desteklenmiyor |

---

## Güvenlik Mimarisi & Alınan Önlemler

RepoMind çekirdeği aşağıdaki AppSec standartlarına göre sertleştirilmiştir:

1. **SSRF ve Path Traversal Savunması:** API proxy rotaları (`/api/contributors`, `/api/issues`) kullanıcıdan gelen `owner` ve `repo` parametrelerini sıkı bir doğrulama süzgecinden (`isValidGitHubSlug`) geçirir; `..`, URL encoding veya geçersiz karakterler barındıran istekler derhal `400 Bad Request` ile engellenir.
2. **DOM-based XSS İzolasyonu:** Chrome eklentisi DOM manipülasyonunda hiçbir şekilde `innerHTML` kullanmaz. Ağaçtan gelen Markdown çıktıları `rehype-sanitize` ile temizlenir.
3. **Mermaid Güvenliği:** Dinamik akış şemaları olası etiket enjeksiyonlarına karşı `securityLevel: 'strict'` modunda çalıştırılır.
4. **İstemci Tarafı Gizlilik:** WebLLM modeli doğrudan tarayıcının WebGPU arayüzünü kullanır; depoların kodları veya bağlam bilgileri hiçbir üçüncü taraf sunucuya aktarılmaz.

---

## Güvenlik Zafiyeti Bildirimi

Bir güvenlik açığı veya zafiyet tespit ettiyseniz lütfen bunu **herkese açık bir GitHub Issue olarak bildirmeyin**.

Bunun yerine sorumlu açıklama (responsible disclosure) ilkelerine uygun olarak:
* **E-posta:** `security@yourdomain.com` (veya GitHub Profil E-postanız)
* **GitHub Security Advisory:** Deponun **Security** sekmesi altındaki *"Report a vulnerability"* butonunu kullanarak özel bir bildirim oluşturun.

### Raporunuzda Lütfen Şunları Belirtin:
* Zafiyetin türü ve etkilenen bileşen/dosya yolu.
* Zafiyeti yeniden oluşturmak için adım adım talimatlar ve örnek PoC (Proof of Concept) girdisi.
* Varsa potansiyel çözüm önerisi.

Bildirilen güvenlik açıkları en geç **48 saat** içerisinde değerlendirilerek geri bildirim sağlanır ve yama yayınlanana kadar gizli tutulur.
