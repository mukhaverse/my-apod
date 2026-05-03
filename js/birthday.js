const API_KEY = "NOn1aJPhv7MbOkQu1zu46bY3RJqnZK89YGd77lYC";

const isLocal = window.location.hostname === "localhost";
const BASE_URL = "https://my-apod.onrender.com";

//  simple mobile detection
// const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
// both are not nedded now I made the doanload work!!!
// disable download when mobile + production
// const disableDownload = !isLocal && isMobile;

const bdayInput   = document.getElementById("bday-input");
const nameInput   = document.getElementById("name-input");
const exploreBtn  = document.getElementById("explore-btn");
const picContainer = document.querySelector(".pic");

let currentData = null;
let currentMode = "raw";



bdayInput.addEventListener("change", () => {
  document.getElementById("form-error").style.display = "none";
});

nameInput.addEventListener("keyup", () => {
  nameInput.style.borderColor = nameInput.value ? "#cab437" : "";
});







function proxyUrl(rawUrl) {
  const secure = rawUrl.replace(/^http:\/\//i, "https://");
  return `${BASE_URL}/apod-image?url=${encodeURIComponent(secure)}`;
}






function loadProxiedImage(rawUrl, alt = "") {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = () => {
      reject(new Error("Image failed to load through proxy."));
    };

    img.src = proxyUrl(rawUrl);
    img.alt = alt;
  });
}





exploreBtn.addEventListener("click", () => {
  const date = bdayInput.value;
  const err = document.getElementById("form-error");

  if (!date) {
    err.textContent = "Please select your birth date.";
    err.style.display = "block";
    return;
  }

  if (date < "1995-06-16") {
    err.textContent = "Date must be after June 16, 1995.";
    err.style.display = "block";
    return;
  }

  err.style.display = "none";
  fetchByDate(date);
});







// APOD API fetch 
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

    picContainer.innerHTML = "";

    const errMsg = document.createElement("p");

    errMsg.className = "proxy-error";

    errMsg.textContent = "Failed to load data!. Try another date.";

    picContainer.appendChild(errMsg);
    console.error(err);


  }
}


// ─── Render result 

function renderResult(data) {

  picContainer.innerHTML = "";

  const mediaWrapper = document.createElement("div");

  mediaWrapper.className = "pic-media";

  const controls = document.createElement("div");
  controls.className = "pic-controls";



  controls.innerHTML = `
    <button class="btn btn--outline" id="mode-toggle">Polaroid</button>
    <button class="btn btn--hero" id="download-btn">Download</button>
    <button class="btn btn--outline" id="clear-btn">Clear</button>
  `;

  picContainer.appendChild(mediaWrapper);
  picContainer.appendChild(controls);

  renderMedia(data, mediaWrapper);

  

  const info = document.createElement("div");
  info.className = "pic-info";

  info.innerHTML = `
    <p><strong>Title:</strong> ${data.title}</p>
    <p><strong>Date:</strong> ${data.date}</p>
    <p><strong>Type:</strong> ${data.media_type}</p>
    <p><strong>Copyright:</strong> ${data.copyright || "NASA / Public"}</p>
  `;

  picContainer.appendChild(info);



  document.getElementById("mode-toggle").addEventListener("click", () => {
    currentMode = currentMode === "raw" ? "polaroid" : "raw";
    document.getElementById("mode-toggle").textContent =
      currentMode === "raw" ? "Polaroid" : "Original";
    renderMedia(data, mediaWrapper);
  });



  document.getElementById("download-btn").addEventListener("click", () => {

    if (currentMode === "raw") downloadOriginal();
    else downloadPolaroid();

  });


 
  document.getElementById("clear-btn").addEventListener("click", () => {
    picContainer.innerHTML = `<img src="assets/spinny.gif">`;

    currentData = null;
    currentMode = "raw";

    document.querySelector(".birthday").classList.remove("expanded");

  });

  document.querySelector(".birthday").classList.add("expanded");


}








async function renderMedia(data, container) {

  container.innerHTML = "";

  if (data.media_type !== "image") {
    const iframe = document.createElement("iframe");
    iframe.src = data.url;
    iframe.allowFullscreen = true;
    container.appendChild(iframe);
    return;
  }


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

      setTimeout(() => wrapper.classList.add("active"), 50);

    }

  } catch (err) {

    container.innerHTML = `
      <p class="proxy-error">
         Image failed to load!.<br>
        <small><a href="${data.url}" target="_blank">View original ↗</a></small>
      </p>
    `;
  }


}







async function downloadOriginal() {
  if (!currentData || currentData.media_type !== "image") return;

  try {
    const res = await fetch(proxyUrl(currentData.url));

    if (!res.ok) throw new Error("Download failed");

    const blob = await res.blob();
    triggerDownload(blob, "nasa-apod.jpg");

  } catch (err) {
    alert(`Download failed`);
    console.error(err);
  }
}




async function downloadPolaroid() {
  if (!currentData || currentData.media_type !== "image") return;

  try {
    const canvas = await createPolaroidCanvas(currentData);
    canvas.toBlob((blob) => {
      if (!blob) return;
      triggerDownload(blob, "polaroid.png");
    }, "image/png");

  } catch (err) {
    alert(`Polaroid download failed`);
    console.error(err);
  }
}










async function createPolaroidCanvas(data) {
  const img = await loadProxiedImage(data.url, data.title);

  const width  = 800;
  const side   = 40;
  const top    = 40;
  const bottom = 160;
  const imgW   = width - side * 2;

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






function triggerDownload(blob, filename) {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}