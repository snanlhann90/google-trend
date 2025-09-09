# Apify Actor — Google Trends Scraper (Daily & Realtime)

Bu aktör, Google Trends'in **resmî JSON uçlarını** kullanarak hem **Realtime** hem de **Daily** trending verilerini çeker. DOM kazımaz; `)]}',` önekini temizleyip JSON'u güvenle parse eder ve normalize edilmiş item'ları Apify **Dataset**'e yazar.

## Özellikler
- ✅ Realtime (`/trends/api/realtimetrends`) ve Daily (`/trends/api/dailytrends`) destekleri
- ✅ DOM bağımlılığı yok; kırılmalara daha dayanıklı
- ✅ Normalize edilmiş alanlar (başlık, shareUrl, görsel, makaleler vs.)
- ✅ `_raw` ile ham item'ı da saklama opsiyonu

## Kurulum (Lokal)
```bash
npm i
apify run
```

## Girdi Örnekleri

**Realtime (Türkiye):**
```json
{
  "mode": "realtime",
  "geo": "TR",
  "hl": "tr",
  "tz": 180,
  "category": "all",
  "recordsPerInterval": 300,
  "recentSeconds": 20
}
```

**Daily (Türkiye):**
```json
{
  "mode": "daily",
  "geo": "TR",
  "hl": "tr",
  "tz": 180
}
```

## Çıktı
- **Dataset**: normalize edilmiş item listesi
- **Key-Value Store**: `OUTPUT.json` — çalışma özeti

### Realtime item alanları
- `type = "realtime"`
- `title`, `shareUrl`, `image`, `entities[]`, `score` (varsa)
- `articles[]` (title, url, source, time, snippet, image)
- `_raw` (opsiyonel ham veri)

### Daily item alanları
- `type = "daily"`
- `date`, `title`, `shareUrl`, `image`, `formattedTraffic`, `relatedQueries[]`
- `articles[]` (title, url, source, timeAgo, snippet, image)
- `_raw` (opsiyonel ham veri)

## Apify Platform
Projeyi Apify Store'a aktör olarak yüklediğinizde `INPUT_SCHEMA.json` otomatik form oluşturur.

## Not
Bu proje eğitim ve entegrasyon amaçlıdır; Google'ın kullanım şartlarını ve hız/erişim limitlerini gözetiniz.
