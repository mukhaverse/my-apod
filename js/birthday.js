const API_KEY = "NOn1aJPhv7MbOkQu1zu46bY3RJqnZK89YGd77lYC";

const isLocal = window.location.hostname === "localhost";
// const BASE_URL = isLocal
//   ? "http://localhost:3001"
//   : "https://my-apod.onrender.com";

  const BASE_URL = "https://my-apod.onrender.com";


// 📱 simple mobile detection
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 🚫 disable download when mobile + production
const disableDownload = !isLocal && isMobile;

const bdayInput   = document.getElementById("bday-input");
const nameInput   = document.getElementById("name-input");
const exploreBtn  = document.getElementById("explore-btn");
const picContainer = document.querySelector(".pic");

let currentData = null;
let currentMode = "raw";


// ─── Proxy URL helper ────────────────────────────────────────────────────────

function proxyUrl(rawUrl) {
  // Always force HTTPS before encoding — mirrors what the server does
  const secure = rawUrl.replace(/^http:\/\//i, "https://");
  return `${BASE_URL}/apod-image?url=${encodeURIComponent(secure)}`;
}


// ─── Fetch an image via proxy and return an <img> element ───────────────────

function loadProxiedImage(rawUrl, alt = "") {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";  // needed for canvas taint-free export

    img.onload = () => resolve(img);
    img.onerror = () => {
      // Proxy may have returned a JSON error body — surface a clear message
      reject(new Error("Image failed to load through proxy. NASA may be temporarily unavailable."));
    };

    img.src = proxyUrl(rawUrl);
    img.alt = alt;
  });
}


// ─── Explore button ──────────────────────────────────────────────────────────

exploreBtn.addEventListener("click", () => {
  const date = bdayInput.value;
  if (!date) return;
  fetchByDate(date);
});


// ─── NASA APOD API fetch ─────────────────────────────────────────────────────

async function fetchByDate(date) {
  try {
    picContainer.innerHTML = `<div class="spinner"></div>`;

    const res = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&date=${date}`
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.msg || `NASA API error: ${res.status}`);
    }

    const data = await res.json();
    currentData = data;
    renderResult(data);

  } catch (err) {
    picContainer.innerHTML = `<p class="proxy-error">⚠️ ${err.message}</p>`;
    console.error(err);
  }
}


// ─── Render result shell (controls + media area) ─────────────────────────────

function renderResult(data) {
  picContainer.innerHTML = "";

  const mediaWrapper = document.createElement("div");
  mediaWrapper.className = "pic-media";

  const controls = document.createElement("div");
  controls.className = "pic-controls";

  controls.innerHTML = `
    <button class="btn btn--outline" id="mode-toggle">Polaroid</button>
    ${
      disableDownload
        ? `<span class="download-disabled">Download coming soon</span>`
        : `<button class="btn btn--hero" id="download-btn">Download</button>`
    }
  `;

  picContainer.appendChild(mediaWrapper);
  picContainer.appendChild(controls);

  renderMedia(data, mediaWrapper);

  document.getElementById("mode-toggle").addEventListener("click", () => {
    currentMode = currentMode === "raw" ? "polaroid" : "raw";
    document.getElementById("mode-toggle").textContent =
      currentMode === "raw" ? "Polaroid" : "Original";
    renderMedia(data, mediaWrapper);
  });

  const downloadBtn = document.getElementById("download-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (currentMode === "raw") downloadOriginal();
      else downloadPolaroid();
    });
  }

  document.querySelector(".birthday").classList.add("expanded");
}


// ─── Render media (raw or polaroid) ──────────────────────────────────────────

async function renderMedia(data, container) {
  container.innerHTML = "";

  if (data.media_type !== "image") {
    // Video / iframe fallback (proxy not needed)
    const iframe = document.createElement("iframe");
    iframe.src = data.url;
    iframe.allowFullscreen = true;
    container.appendChild(iframe);
    return;
  }

  // Show a lightweight spinner while the image loads through the proxy
  container.innerHTML = `<div class="spinner"></div>`;

  try {
    const img = await loadProxiedImage(data.url, data.title);

    container.innerHTML = "";

    if (currentMode === "raw") {
      container.appendChild(img);

    } else {
      const wrapper = document.createElement("div");
      wrapper.className = "polaroid-preview";

      const caption = document.createElement("div");
      caption.className = "polaroid-caption";

      const name = nameInput.value || "";
      const date = new Date(data.date + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      caption.textContent = `${name}${name ? " • " : ""}${date}`;

      wrapper.appendChild(img);
      wrapper.appendChild(caption);
      container.appendChild(wrapper);

      // Trigger CSS transition
      setTimeout(() => wrapper.classList.add("active"), 50);
    }

  } catch (err) {
    container.innerHTML = `
      <p class="proxy-error">
        ⚠️ ${err.message}<br>
        <small>You can still <a href="${data.url}" target="_blank" rel="noopener">view the original on NASA ↗</a></small>
      </p>
    `;
  }
}


// ─── Download: original ───────────────────────────────────────────────────────

async function downloadOriginal() {
  if (!currentData || currentData.media_type !== "image") return;

  try {
    const res = await fetch(proxyUrl(currentData.url));

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Proxy returned ${res.status}`);
    }

    const blob = await res.blob();
    triggerDownload(blob, "nasa-apod.jpg");

  } catch (err) {
    alert(`Download failed: ${err.message}`);
    console.error(err);
  }
}


// ─── Download: polaroid ───────────────────────────────────────────────────────

async function downloadPolaroid() {
  if (!currentData || currentData.media_type !== "image") return;

  try {
    const canvas = await createPolaroidCanvas(currentData);
    canvas.toBlob((blob) => {
      if (!blob) { alert("Canvas export failed."); return; }
      triggerDownload(blob, "polaroid.png");
    }, "image/png");

  } catch (err) {
    alert(`Polaroid download failed: ${err.message}`);
    console.error(err);
  }
}


// ─── Canvas builder for polaroid ─────────────────────────────────────────────

async function createPolaroidCanvas(data) {
  const img = await loadProxiedImage(data.url, data.title);

  const width  = 800;
  const side   = 40;
  const top    = 40;
  const bottom = 160;
  const imgW   = width - side * 2;

  // Preserve aspect ratio of the actual loaded image
  const aspect = img.naturalHeight / img.naturalWidth;
  const imgH   = Math.round(imgW * aspect);
  const height = top + imgH + bottom;

  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, side, top, imgW, imgH);

  const name = nameInput.value || "";
  const date = new Date(data.date + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const y = top + imgH + 50;
  ctx.fillStyle = "#222";
  ctx.textAlign = "center";

  if (name) {
    ctx.font = "bold 26px serif";
    ctx.fillText(name, width / 2, y);
    ctx.font = "20px serif";
    ctx.fillText(date, width / 2, y + 38);
  } else {
    ctx.font = "22px serif";
    ctx.fillText(date, width / 2, y + 19);
  }

  return canvas;
}


// ─── Utility ──────────────────────────────────────────────────────────────────

function triggerDownload(blob, filename) {
  // Use window.URL explicitly — bare `URL` can be shadowed in some environments
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  // Link must be in the DOM for Firefox and some mobile browsers to trigger the download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Delay revoke so the browser has time to start the download
  setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}