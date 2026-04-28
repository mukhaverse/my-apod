const API_KEY = "NOn1aJPhv7MbOkQu1zu46bY3RJqnZK89YGd77lYC";




const BASE_URL = "http://localhost:3001";

// const BASE_URL = "https://my-apod.onrender.com";


const bdayInput = document.getElementById("bday-input");
const nameInput = document.getElementById("name-input");
const exploreBtn = document.getElementById("explore-btn");
const picContainer = document.querySelector(".pic");

let currentData = null;
let currentMode = "raw";



exploreBtn.addEventListener("click", () => {
  const date = bdayInput.value;
  if (!date) return;

  fetchByDate(date);
});





async function fetchByDate(date) {
  try {
    picContainer.innerHTML = `<div class="spinner"></div>`;

    const res = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&date=${date}`
    );

    const data = await res.json();
    currentData = data;

    renderResult(data);

  } catch (err) {
    picContainer.innerHTML = "Failed to load";
    console.error(err);
  }
}





function renderResult(data) {

  picContainer.innerHTML = "";

  const mediaWrapper = document.createElement("div");
  mediaWrapper.className = "pic-media";

  const controls = document.createElement("div");
  controls.className = "pic-controls";

  controls.innerHTML = `
    <button class="btn btn--outline" id="mode-toggle">
      Polaroid
    </button>
    <button class="btn btn--hero" id="download-btn">
      Download
    </button>
  `;

  picContainer.appendChild(mediaWrapper);
  picContainer.appendChild(controls);

  renderMedia(data, mediaWrapper);

  document.getElementById("mode-toggle").addEventListener("click", async () => {
    currentMode = currentMode === "raw" ? "polaroid" : "raw";

    document.getElementById("mode-toggle").textContent =
      currentMode === "raw" ? "Polaroid" : "Original";

    await renderMedia(data, mediaWrapper);
  });

  document.getElementById("download-btn").addEventListener("click", () => {
    if (currentMode === "raw") {
      downloadOriginal();
    } else {
      downloadPolaroid();
    }
  });

  document.querySelector(".birthday").classList.add("expanded");

}





async function renderMedia(data, container) {


  container.innerHTML = "";

  const imageUrl = data.url;
  const proxyUrl = `${BASE_URL}/apod-image?url=${encodeURIComponent(imageUrl)}`;

  
  if (currentMode === "raw") {
    if (data.media_type === "image") {
      const img = document.createElement("img");
      img.src = proxyUrl;
      img.alt = data.title;
      container.appendChild(img);
    } else {
      const iframe = document.createElement("iframe");
      iframe.src = data.url;
      iframe.allowFullscreen = true;
      container.appendChild(iframe);
    }
  }

 
  else {
    const wrapper = document.createElement("div");
    wrapper.className = "polaroid-preview";

    const img = document.createElement("img");
    img.src = proxyUrl;

    const caption = document.createElement("div");
    caption.className = "polaroid-caption";

    const name = nameInput.value || "";
    const date = new Date(data.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    caption.textContent = `${name}${name ? " • " : ""}${date}`;

    wrapper.appendChild(img);
    wrapper.appendChild(caption);

    container.appendChild(wrapper);

    setTimeout(() => {
      wrapper.classList.add("active");
    }, 50);

  }


}





async function downloadOriginal() {
  if (!currentData || currentData.media_type !== "image") return;

  const imageUrl = currentData.url;
  const proxyUrl = `${BASE_URL}/apod-image?url=${encodeURIComponent(imageUrl)}`;

  const res = await fetch(proxyUrl);
  const blob = await res.blob();

  const blobUrl = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = "nasa-apod.jpg";
  link.click();

  window.URL.revokeObjectURL(blobUrl);
}





function createPolaroidCanvas(data) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const width = 800;
    const height = 1000;

    canvas.width = width;
    canvas.height = height;

    const imageUrl = data.url;
    const proxyUrl = `${BASE_URL}/apod-image?url=${encodeURIComponent(imageUrl)}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = proxyUrl;

    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);

      const side = 40;
      const top = 40;
      const bottom = 160;

      const imgW = width - side * 2;
      const imgH = height - top - bottom;

      ctx.drawImage(img, side, top, imgW, imgH);

      ctx.fillStyle = "#222";
      ctx.textAlign = "center";

      const name = nameInput.value || "";
      const date = new Date(data.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      const y = top + imgH + 50;

      ctx.font = "22px serif";
      ctx.fillText(name, width / 2, y);

      ctx.font = "20px serif";
      ctx.fillText(`• ${date}`, width / 2, y + 32);

      resolve(canvas);
    };
  });
}




async function downloadPolaroid() {
  if (!currentData || currentData.media_type !== "image") return;

  const canvas = await createPolaroidCanvas(currentData);

  const link = document.createElement("a");
  link.download = "polaroid.png";
  link.href = canvas.toDataURL();
  link.click();
}