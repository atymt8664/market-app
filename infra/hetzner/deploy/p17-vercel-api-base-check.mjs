const WEB = "https://www.souq-arab.com";
const html = await (await fetch(`${WEB}/`)).text();
const index = html.match(/assets\/index-[^"']+\.js/)?.[0];
const mainImport = index
  ? (await (await fetch(`${WEB}/${index}`)).text()).match(/import\("\.\/([^"]+)"/)?.[1]
  : null;
const main = mainImport ? `assets/${mainImport}` : null;
let hit = false;
let chunk = null;
if (main) {
  const js = await (await fetch(`${WEB}/${main}`)).text();
  hit = js.includes("api.souq-arab.com");
  chunk = main;
}
console.log(
  JSON.stringify(
    {
      index,
      main: chunk,
      hasProductionApiHost: hit,
      verdict: hit ? "VITE_API_BASE_FALLBACK_OK" : "VITE_API_BASE_VERIFY_FAIL",
    },
    null,
    2,
  ),
);
