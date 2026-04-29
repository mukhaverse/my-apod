const express = require("express");
const cors = require("cors");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());

// Allowed image origins
const ALLOWED_ORIGINS = [
  "apod.nasa.gov",
  "apod.nasa.gov",
  "www.youtube.com",         // APOD sometimes links YouTube thumbnails
  "img.youtube.com",
];

function isAllowedUrl(url) {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_ORIGINS.some(
      (origin) => hostname === origin || hostname.endsWith("." + origin)
    );
  } catch {
    return false;
  }
}

// Rotate through realistic User-Agent strings to avoid blocks
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
];

function randomAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Fetch with timeout + retry
async function fetchWithRetry(url, options = {}, retries = 3, timeoutMs = 12000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      const isLast = attempt === retries;
      const isTimeout = err.name === "AbortError" || err.code === "ETIMEDOUT";

      console.warn(
        `Attempt ${attempt}/${retries} failed for ${url}: ${err.message}`
      );

      if (isLast) throw err;

      // Back off before retrying (500ms, 1500ms, ...)
      const delay = 500 * (attempt * attempt);
      await new Promise((r) => setTimeout(r, delay));

      // On timeout, try switching to the HTTPS version if it wasn't already
      if (isTimeout && url.startsWith("http://")) {
        url = url.replace("http://", "https://");
        console.log("Retrying with HTTPS:", url);
      }
    }
  }
}

app.get("/apod-image", async (req, res) => {
  const imageUrl = req.query.url;
  console.log("Proxy request for:", imageUrl);

  if (!imageUrl || !isAllowedUrl(imageUrl)) {
    return res.status(400).json({ error: "Invalid or disallowed image source" });
  }

  // Force HTTPS — Render blocks outbound HTTP on some plans
  const secureUrl = imageUrl.replace(/^http:\/\//i, "https://");

  try {
    const response = await fetchWithRetry(secureUrl, {
      headers: {
        "User-Agent": randomAgent(),
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        // Spoof a referrer that looks like a legitimate browser visit
        "Referer": "https://apod.nasa.gov/apod/",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      console.error(`Upstream error: HTTP ${response.status} for ${secureUrl}`);
      return res.status(502).json({
        error: `Upstream returned ${response.status}`,
        url: secureUrl,
      });
    }

    const contentType =
      response.headers.get("content-type") || "image/jpeg";

    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
      console.error("Unexpected content-type:", contentType);
      return res.status(502).json({ error: "Upstream did not return an image" });
    }

    const buffer = await response.arrayBuffer();

    res.set({
      "Content-Type": contentType,
      "Content-Length": buffer.byteLength,
      "Cache-Control": "public, max-age=86400", // cache for 24h on CDN / browser
      "Access-Control-Allow-Origin": "*",
    });

    return res.send(Buffer.from(buffer));

  } catch (err) {
    const isTimeout = err.name === "AbortError" || err.code === "ETIMEDOUT";

    console.error("Final fetch error:", err.code || err.name, err.message);

    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? "NASA image server timed out after 3 attempts. Try again in a moment."
        : "Failed to fetch image from NASA.",
      detail: err.message,
    });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/", (_req, res) => res.send("APOD proxy running"));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));