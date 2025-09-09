// Apify Actor: Google Trends Scraper (Daily & Realtime)
// Çalışma mantığı: DOM kazımak yerine Google Trends'in JSON API uçlarını çağırır,
// )]}', önekinı temizleyip güvenli biçimde parse eder, normalize edip Dataset'e yazar.

import Apify from 'apify';
import { gotScraping } from 'got-scraping';

const stripJsonPrefix = (raw) => {
  // Google Trends API çoğu yanıta )]}', öneki ekler — bunu temizleyelim
  if (typeof raw !== 'string') return raw;
  const prefix = ")]}',";
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
};

const fetchJson = async (url, headers = {}) => {
  const res = await gotScraping({
    url,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Referer': 'https://trends.google.com/',
      ...headers,
    },
    timeout: { request: 30000 },
    http2: true,
  });
  const cleaned = stripJsonPrefix(res.body);
  return JSON.parse(cleaned);
};

const normalizeRealtime = (json) => {
  // Kaynak: /trends/api/realtimetrends yanıtındaki yapı
  // Ör. json.storySummaries.trendingStories[]
  const out = [];
  const stories = json?.storySummaries?.trendingStories ?? [];

  for (const s of stories) {
    const title = s?.title ?? s?.entityNames?.[0] ?? null;
    const shareUrl = s?.shareUrl ?? null;

    // Görseller
    const image = s?.image?.imageUrl ?? s?.image?.newsUrl ?? null;

    // İlgili makaleler
    const articles = (s?.articles ?? []).map((a) => ({
      title: a?.title ?? null,
      url: a?.url ?? null,
      source: a?.source ?? null,
      time: a?.time ?? null, // ISO olmayabilir; olduğu gibi bırakıyoruz
      snippet: a?.snippet ?? null,
      image: a?.image?.imageUrl ?? null,
    }));

    // İlgili varlıklar (entity) ve skorlar
    const entities = (s?.entityNames ?? []);
    const score = s?.ranking?.score ?? null; // Bazı bölgelerde mevcut olmayabilir

    out.push({
      type: 'realtime',
      title,
      shareUrl,
      image,
      entities,
      score,
      articlesCount: articles.length,
      articles,
      _raw: s,
    });
  }
  return out;
};

const normalizeDaily = (json) => {
  // Kaynak: /trends/api/dailytrends yanıtındaki yapı
  // Ör. json.default.trendingSearchesDays[].trendingSearches[]
  const out = [];
  const days = json?.default?.trendingSearchesDays ?? [];
  for (const d of days) {
    const date = d.date ?? d.formattedDate ?? null;
    const searches = d?.trendingSearches ?? [];

    for (const s of searches) {
      const title = s?.title?.query ?? null;
      const shareUrl = s?.shareUrl ?? null;
      const formattedTraffic = s?.formattedTraffic ?? null;

      const image =
        s?.image?.imageUrl ??
        s?.image?.newsUrl ??
        s?.image?.source ?? null;

      const relatedQueries = (s?.relatedQueries ?? []).map((rq) => rq.query);

      const articles = (s?.articles ?? []).map((a) => ({
        title: a?.title ?? null,
        url: a?.url ?? null,
        source: a?.source ?? null,
        timeAgo: a?.timeAgo ?? null,
        snippet: a?.snippet ?? null,
        image: a?.image?.imageUrl ?? null,
      }));

      out.push({
        type: 'daily',
        date,
        title,
        shareUrl,
        image,
        formattedTraffic,
        relatedQueries,
        articlesCount: articles.length,
        articles,
        _raw: s,
      });
    }
  }
  return out;
};

Apify.main(async () => {
  const input = await Apify.getInput();

  const {
    // Genel
    mode = 'realtime', // "realtime" veya "daily"
    geo = 'TR',        // Ülke kodu (örn: TR, US, DE...)
    hl = 'tr',         // Dil (örn: tr, en, de...)
    tz = 180,          // Dakika cinsinden timezone offset (TR için +03:00 => 180)
    // Realtime parametreleri
    category = 'all',  // Kategori: 'all' genelde iyi bir varsayılan
    recordsPerInterval = 300, // ri
    recentSeconds = 20,       // rs
    // Daily parametreleri (çoğu durumda sadece temel parametreler yeterli)
  } = input || {};

  const kv = await Apify.openKeyValueStore();
  const dataset = await Apify.openDataset();

  if (mode === 'realtime') {
    const url = `https://trends.google.com/trends/api/realtimetrends?hl=${encodeURIComponent(
      hl,
    )}&tz=${encodeURIComponent(tz)}&cat=${encodeURIComponent(
      category,
    )}&fi=0&fs=0&geo=${encodeURIComponent(
      geo,
    )}&ri=${encodeURIComponent(recordsPerInterval)}&rs=${encodeURIComponent(
      recentSeconds,
    )}&sort=0`;

    Apify.utils.log.info(`Fetching realtime trends: ${url}`);
    const json = await fetchJson(url);

    const items = normalizeRealtime(json);
    Apify.utils.log.info(`Realtime items: ${items.length}`);

    if (items.length) await dataset.pushData(items);

    await kv.setValue('OUTPUT', {
      mode,
      geo,
      hl,
      tz,
      category,
      recordsPerInterval,
      recentSeconds,
      itemCount: items.length,
      fetchedAt: new Date().toISOString(),
      endpoint: url,
    });
  } else if (mode === 'daily') {
    const url = `https://trends.google.com/trends/api/dailytrends?hl=${encodeURIComponent(
      hl,
    )}&tz=${encodeURIComponent(tz)}&geo=${encodeURIComponent(geo)}&ns=15`;

    Apify.utils.log.info(`Fetching daily trends: ${url}`);
    const json = await fetchJson(url);

    const items = normalizeDaily(json);
    Apify.utils.log.info(`Daily items: ${items.length}`);

    if (items.length) await dataset.pushData(items);

    await kv.setValue('OUTPUT', {
      mode,
      geo,
      hl,
      tz,
      itemCount: items.length,
      fetchedAt: new Date().toISOString(),
      endpoint: url,
    });
  } else {
    throw new Error(`Geçersiz mode: ${mode}. "realtime" veya "daily" kullanın.`);
  }

  Apify.utils.log.info('Done.');
});
