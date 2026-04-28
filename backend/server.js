const express = require("express");
const cors = require("cors");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));



const app = express();
app.use(cors());





app.get("/apod-image", async (req, res) => {
  const imageUrl = req.query.url;
  console.log("Fetching:", imageUrl);

  if (!imageUrl || !imageUrl.includes("apod.nasa.gov")) {
    return res.status(400).send("Invalid image source");
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "image/*"
      }
    });

    if (!response.ok) {
      console.error("Bad response:", response.status, imageUrl);
      return res.status(500).send("Image not found or blocked");
    }

    const buffer = await response.arrayBuffer();

    res.set({
      "Content-Type": response.headers.get("content-type") || "image/jpeg",
      "Access-Control-Allow-Origin": "*"
    });

    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).send("Failed to fetch image");
  }
});


app.get("/", (req, res) => {
  res.send("APOD proxy running");
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});