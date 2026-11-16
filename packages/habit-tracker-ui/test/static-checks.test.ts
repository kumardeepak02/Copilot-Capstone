/**
 * EPMCDMETST-72536: static checks (architecture sections 5, 12; NFR-2, NFR-3, DR-13; T19).
 * Plain Node test: reads the three assets from disk. No DOM needed.
 */
import { readAsset } from './helpers/loadApp';

const indexHtml = readAsset('index.html');
const stylesCss = readAsset('styles.css');
const appJs = readAsset('app.js');

function hits(source: string, pattern: RegExp): string[] {
  const found: string[] = [];
  source.split('\n').forEach((line, i) => {
    if (pattern.test(line)) {
      found.push(String(i + 1) + ': ' + line.trim());
    }
  });
  return found;
}

describe('static checks', () => {
  it('app.js has no HTML-injection or code-evaluation APIs', () => {
    const pattern = /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new Function\s*\(/;
    expect(hits(appJs, pattern)).toEqual([]);
  });

  it('no http:// or https:// URL in index.html, styles.css, or app.js (no external resources)', () => {
    const pattern = /https?:\/\//;
    expect(hits(indexHtml, pattern)).toEqual([]);
    expect(hits(stylesCss, pattern)).toEqual([]);
    expect(hits(appJs, pattern)).toEqual([]);
  });

  it('index.html does not load the script as an ES module', () => {
    expect(hits(indexHtml, /type\s*=\s*["']module["']/)).toEqual([]);
  });

  it('app.js makes no network calls', () => {
    const pattern = /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/;
    expect(hits(appJs, pattern)).toEqual([]);
  });

  it('app.js has no console call (no telemetry in the normal path)', () => {
    expect(hits(appJs, /\bconsole\./)).toEqual([]);
  });

  it('index.html and styles.css reference only local assets', () => {
    expect(hits(indexHtml, /<(script|link)[^>]+(src|href)\s*=\s*["'](?!styles\.css|app\.js)[^"']*["']/)).toEqual([]);
    expect(hits(stylesCss, /@import|url\(\s*["']?(?!data:)[a-z]+:/i)).toEqual([]);
  });
});
