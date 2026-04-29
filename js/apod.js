const NASA_API_KEY = "NOn1aJPhv7MbOkQu1zu46bY3RJqnZK89YGd77lYC";

const URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`;

const titleEl = document.getElementById("apod-title");
const descEl = document.getElementById("apod-explanation");
const frameEl = document.getElementById("apod-frame");

const dateEl = document.getElementById("apod-date");

const overlay = document.getElementById("apod-overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const closeBtn = document.getElementById("overlay-close");

async function getAPOD() {
  try {
    frameEl.innerHTML = "Loading...";

    const res = await fetch(URL);
    const data = await res.json();

    renderAPOD(data);

  } catch (err) {
    frameEl.innerHTML = "Failed to load";
    console.error(err);
  }
}



function renderAPOD(data) {
  titleEl.textContent = data.title;

  descEl.innerHTML = `
    <p class="apod-body">
      ${data.explanation.slice(0, 180)}...
      <span class="read-more-inline">
        <span class="read-more-icon">&rarr;</span>
      </span>
    </p>
  `;

  const trigger = descEl.querySelector(".read-more-inline");

  trigger.addEventListener("click", () => {
    overlayTitle.textContent = data.title;
    overlayText.textContent = data.explanation;
    overlay.classList.add("active");
  });

  frameEl.innerHTML = "";

  dateEl.textContent = data.date;

  if (data.media_type === "image") {
    const img = document.createElement("img");
    img.src = data.url;
    img.alt = data.title;
    frameEl.appendChild(img);
  } else {
    const iframe = document.createElement("iframe");
    iframe.src = data.url;
    iframe.allowFullscreen = true;
    frameEl.appendChild(iframe);
  }
}



closeBtn.addEventListener("click", () => {
  overlay.classList.remove("active");
});


overlay.addEventListener("click", (e) => {
  if (e.target === overlay) {
    overlay.classList.remove("active");
  }
});

getAPOD();