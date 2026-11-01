function updateDateFavicon() {
  const now = new Date();
  const day = now.getDate();
  const fontSize = day < 10 ? 28 : 21;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="5" y="9" width="54" height="50" rx="11" fill="#183153"/><path d="M5 22h54" stroke="#4f83cc" stroke-width="8"/><path d="M20 5v12M44 5v12" stroke="#183153" stroke-linecap="round" stroke-width="6"/><text x="32" y="49" fill="#fff" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle">${day}</text></svg>`;
  let favicon = document.querySelector('link[rel~="icon"]');

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.append(favicon);
  }

  favicon.type = "image/svg+xml";
  favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 250);
  window.clearTimeout(updateDateFavicon.timer);
  updateDateFavicon.timer = window.setTimeout(
    updateDateFavicon,
    nextMidnight.getTime() - now.getTime(),
  );
}

updateDateFavicon();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    updateDateFavicon();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => {
        console.error("De offline ondersteuning kon niet worden gestart.", error);
      });
  });
}
