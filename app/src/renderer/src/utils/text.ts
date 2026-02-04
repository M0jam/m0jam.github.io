
export function stripSteamBBCode(text: string): string {
  if (!text) return '';

  let processed = text;

  // 1. Remove [img] tags and their content (urls) as they are not useful in text summaries
  processed = processed.replace(/\[img\][\s\S]*?\[\/img\]/gi, '');

  // 2. Remove [url=...] tags but keep the content inside
  // Matches [url=https://...]Text[/url] -> Text
  processed = processed.replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, '$1');

  // 3. Remove simple tags [b], [/b], [h1], [list], [*], etc.
  // We replace them with a space to ensure words don't merge (e.g. Header[h1]Title -> Header Title)
  processed = processed.replace(/\[\/?[^\]]+\]/g, ' ');

  // 4. Handle specific Steam/Valve BBCode quirks if any
  // e.g. [noparse]...[/noparse] - we might want to keep content
  // The regex above already strips the tags.

  // 5. Replace HTML break tags if they exist (sometimes mixed)
  processed = processed.replace(/<br\s*\/?>/gi, ' ');

  // 6. Decode common HTML entities (basic ones)
  processed = processed
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");

  // 7. Collapse multiple spaces/newlines into single space
  processed = processed.replace(/\s+/g, ' ').trim();

  return processed;
}

export function truncateText(text: string, maxLength: number = 150): string {
    if (!text) return '';
    const clean = stripSteamBBCode(text);
    if (clean.length <= maxLength) return clean;
    return clean.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}
