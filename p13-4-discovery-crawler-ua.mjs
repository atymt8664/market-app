/**
 * P13-4 — shared User-Agent patterns for search + AI discoverability crawlers.
 * Keep vercel.json rewrite regex in sync with VERCEL_DISCOVERY_UA_FRAGMENT.
 */

/** Substring matched inside vercel.json `value` regex for discovery crawlers. */
export const VERCEL_DISCOVERY_UA_FRAGMENT =
  "facebookexternalhit|Facebot|WhatsApp|TelegramBot|Twitterbot|LinkedInBot|Slackbot|Discordbot|TikTokSpider|Snapchat|vkShare|PinterestBot|Embedly|Googlebot|Google-InspectionTool|Googlebot-Image|Storebot-Google|DuplexWeb-Google|Bingbot|BingPreview|msnbot|GPTBot|ChatGPT-User|ClaudeBot|anthropic-ai|PerplexityBot|Applebot-Extended|cohere-ai|Bytespider";

const DISCOVERY_CRAWLER_UA =
  /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot|TikTokSpider|Snapchat|vkShare|PinterestBot|Embedly|Google-Structured-Data-Testing-Tool|Googlebot|Google-InspectionTool|Googlebot-Image|Storebot-Google|DuplexWeb-Google|Bingbot|BingPreview|msnbot|GPTBot|ChatGPT-User|ClaudeBot|anthropic-ai|PerplexityBot|Applebot-Extended|cohere-ai|Bytespider/i;

export const BINGBOT_UA =
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";

export const GPTBOT_UA =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)";

export const CLAUDEBOT_UA =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +https://anthropic.com)";

export const PERPLEXITYBOT_UA =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)";

export function isDiscoveryCrawler(userAgent) {
  return DISCOVERY_CRAWLER_UA.test(userAgent || "");
}

/** @deprecated P11 alias — use isDiscoveryCrawler */
export function isSocialCrawler(userAgent) {
  return isDiscoveryCrawler(userAgent);
}
