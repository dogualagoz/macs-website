# Katkı Rehberi

Bu rehber, MACS web sitesi deposuna sorunsuz katkı yapabilmeniz için kısa ve net kuralları içerir. Küçük değişikliklerden yeni özelliklere kadar izlenecek yol aynıdır.

## Başlamadan Önce
- Depoyu fork/clone edin ve bağımlılıkları kurun.
- Backend için Python 3.11+, frontend için Node.js 18+ kullanın.
- .env dosyalarınızı örneklerden oluşturun (README’de belirtiliyor).

## Branch Stratejisi
- Geliştirme ana dalı: `developer`
- Özellik/iş parçası dalları:
  - `feature/<kisa-ozellik-adi>`
  - `fix/<kisa-duzeltme-adi>`
  - `chore/<kisa-is-adi>`

Örnek: `feature/event-detail-improvements`, `fix/cors-config`, `chore/update-readme`

## Commit Mesajı (Conventional Commits)
- `feat: ...` yeni özellik
- `fix: ...` hata düzeltme
- `chore: ...` yapılandırma/doküman/ci vb.
- `refactor: ...` davranışı değiştirmeyen kod düzeni
- `docs: ...` dokümantasyon

Örnek: `feat(events): event detail sayfasına saat formatı eklendi`

## Geliştirme Kuralları
- Frontend
  - React 18, CRA tabanı. `npm start` ile çalıştırın.
  - ESLint uyarılarını temiz tutun; build uyarısı bırakmayın.
  - CSS sınıf isimlerini bozmayın. Global stillerde dikkatli olun.
  - API çağrılarını `src/api/*` altına ekleyin. `src/services/api.js` geçiş amaçlı re-export.
- Backend
  - FastAPI + SQLAlchemy. `uvicorn main:app --reload` ile çalıştırın.
  - Tip ipuçlarını tercih edin; uç noktalarda uygun `response_model` kullanın.
  - Migration gerekiyorsa Alembic ile oluşturun ve açıklayıcı mesaj verin.

## Çalışma Adımları
1. `git checkout developer`
2. `git pull origin developer`
3. `git checkout -b feature/<konu>`
4. Geliştirme ve test
5. `git add -A && git commit -m "feat: ..."`
6. `git push origin feature/<konu>`
7. GitHub’da Pull Request (PR) açın (hedef dal: `developer`).

## PR Kontrol Listesi
- [ ] Uygulama local’de çalışıyor (backend ve frontend)
- [ ] ESLint uyarıları yok / minimize edildi
- [ ] README/Docs güncellendi (gerekliyse)
- [ ] UI değişiklikleri için ekran görüntüsü eklendi
- [ ] Alembic migration (gerekliyse) eklendi ve test edildi

## Kod İncelemesi
- En az bir onay bekleyin.
- Yorumları çözüp gerektiğinde ek commit’ler gönderin (force push gerekmez).

## Sorun Bildirme (Issues)
- Kısa başlık, net açıklama, yeniden üretme adımları ve beklenen/gerçek davranış.
- Log/ekran görüntüsü ve ortam bilgileri (OS, Node/Python sürümü) ekleyin.

## Güvenlik
- Güvenlik açığı şüphesi varsa herkese açık issue yerine proje yöneticisine özel olarak iletin.

Teşekkürler! Katkılarınız projeyi daha iyi hale getiriyor. 🙌
