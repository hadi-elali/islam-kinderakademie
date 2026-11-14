import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Read locally only. HAR files can contain tokens and personal data; output
// only service/table/bucket aggregates, never URLs, headers or response bodies.
export function summarizeHar(har) {
  const groups = new Map();
  for (const entry of har.log?.entries ?? []) {
    let url;
    try { url = new URL(entry.request.url); } catch { continue; }
    const segments = url.pathname.split('/').filter(Boolean);
    let category;
    if (segments[0] === 'rest' && segments[1] === 'v1') {
      category = segments[2] === 'rpc' ? `Database RPC/${segments[3]}` : `Database/${segments[2]}`;
    } else if (segments[0] === 'storage' && segments[1] === 'v1') {
      // Separate URL generation (POST) from file downloads (GET/206).
      const action = segments[2];
      const variant = segments[3];
      const bucket = ['sign','authenticated','public'].includes(variant) ? segments[4] : variant;
      const operation = entry.request.method === 'GET' ? 'download' : variant === 'sign' ? 'sign' : action;
      category = `Storage/${operation}/${bucket ?? 'other'}`;
    } else if (segments[0] === 'auth' && segments[1] === 'v1') {
      category = 'Auth';
    } else if (segments[0] === 'functions' && segments[1] === 'v1') {
      category = `Edge Functions/${segments[2]}`;
    } else continue;
    // Only emit known API identifiers. Never expose arbitrary object paths.
    category = category.replace(/[^a-zA-Z0-9_ /-]/g, '_');
    const row = groups.get(category) ?? {
      category, requests: 0, partialResponses: 0, errors: 0,
      decodedBytes: 0, encodedBodyBytes: 0, transferBytes: 0, unknownBodySizes: 0,
      responsesWithTransferSize: 0,
    };
    row.requests += 1;
    row.partialResponses += Number(entry.response?.status === 206);
    row.errors += Number(entry.response?.status >= 400);
    const contentSize = entry.response?.content?.size;
    if (Number.isFinite(contentSize) && contentSize >= 0) row.decodedBytes += contentSize;
    const bodySize = entry.response?.bodySize;
    if (Number.isFinite(bodySize) && bodySize >= 0) row.encodedBodyBytes += bodySize;
    else row.unknownBodySizes += 1;
    const transferSize = entry.response?._transferSize;
    if (Number.isFinite(transferSize) && transferSize >= 0) {
      row.transferBytes += transferSize;
      row.responsesWithTransferSize += 1;
    }
    groups.set(category, row);
  }
  return [...groups.values()].sort((a, b) => b.encodedBodyBytes - a.encodedBodyBytes);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) {
    console.error('Aufruf: node scripts/analyze-supabase-har.mjs /lokaler/pfad/aufnahme.har');
    process.exitCode = 1;
  } else {
    const har = JSON.parse(await readFile(process.argv[2], 'utf8'));
    console.table(summarizeHar(har));
    console.log('Nur lokal gemessene Browserdaten; keine Abrechnungswerte. Unbekannte Größen sind nicht null Bytes.');
  }
}
