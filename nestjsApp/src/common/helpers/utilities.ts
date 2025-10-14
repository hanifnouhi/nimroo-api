export function normalizeText(text: string) {
    return text.toLowerCase().trim();
}


export function getBlobHTTPHeaders(mimeType: string): {
    blobContentType: string;
    blobCacheControl: string;
  } {
    const cacheableTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'font/woff2',
      'font/woff',
      'font/ttf',
      'application/javascript',
      'text/css'
    ];
  
    const isCacheable = cacheableTypes.includes(mimeType);
  
    return {
      blobContentType: mimeType,
      blobCacheControl: isCacheable
        ? 'public, max-age=31536000'
        : 'no-cache'
    };
}
  
