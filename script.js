/* ==========================================
   JALVAYU360 | TEAM AVIX
   Main frontend functionality
========================================== */

/* ---------- SPACE & METEOR ANIMATION ---------- */

const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

let stars = [];
let meteors = [];

function resizeSpace() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  stars = Array.from({ length: 170 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 1.4,
    alpha: Math.random(),
    speed: Math.random() * .3 + .05
  }));
}

window.addEventListener("resize", resizeSpace);
resizeSpace();

function createMeteor() {
  if (meteors.length < 3) {
    meteors.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight * .5,
      length: Math.random() * 110 + 60,
      speed: Math.random() * 9 + 7,
      opacity: 1
    });
  }
}

function animateSpace() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  stars.forEach(star => {
    star.alpha += (Math.random() - .5) * .03;
    star.alpha = Math.max(.2, Math.min(1, star.alpha));
    star.y += star.speed;

    if (star.y > h) {
      star.y = 0;
      star.x = Math.random() * w;
    }

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,225,255,${star.alpha})`;
    ctx.fill();
  });

  meteors.forEach((meteor, index) => {
    meteor.x -= meteor.speed;
    meteor.y += meteor.speed * .55;
    meteor.opacity -= .006;

    const gradient = ctx.createLinearGradient(
      meteor.x, meteor.y,
      meteor.x + meteor.length, meteor.y - meteor.length * .55
    );

    gradient.addColorStop(0, "rgba(41,230,255,0)");
    gradient.addColorStop(1, `rgba(255,255,255,${meteor.opacity})`);

    ctx.beginPath();
    ctx.moveTo(meteor.x, meteor.y);
    ctx.lineTo(
      meteor.x + meteor.length,
      meteor.y - meteor.length * .55
    );
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (meteor.opacity <= 0 || meteor.x < -200) {
      meteors.splice(index, 1);
    }
  });

  requestAnimationFrame(animateSpace);
}

animateSpace();

// Random meteor every 4 to 10 seconds
function scheduleMeteor() {
  createMeteor();
  setTimeout(scheduleMeteor, 4000 + Math.random() * 6000);
}

scheduleMeteor();


/* ---------- 3D EARTH ---------- */

let globeInstance = null;

function initializeGlobe() {
  const container = document.getElementById("globeViz");

  if (!container || typeof Globe !== "function") {
    container.innerHTML =
      '<div class="loading-message">Earth library unavailable. Check your internet connection and reload.</div>';
    return;
  }

  try {
    globeInstance = Globe()(container)
      .globeImageUrl(
        "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      )
      .bumpImageUrl(
        "https://unpkg.com/three-globe/example/img/earth-topology.png"
      )
      .backgroundImageUrl(
        "https://unpkg.com/three-globe/example/img/night-sky.png"
      )
      .showAtmosphere(true)
      .atmosphereColor("#38bfff")
      .atmosphereAltitude(0.18)
      .width(container.clientWidth)
      .height(container.clientHeight);

    globeInstance.pointOfView({
      lat: 20,
      lng: 78,
      altitude: 2.2
    });

    const controls = globeInstance.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = true;
    controls.minDistance = 110;
    controls.maxDistance = 500;

    document.querySelector(".loading-message")?.remove();

    const resizeGlobe = () => {
      if (globeInstance) {
        globeInstance
          .width(container.clientWidth)
          .height(container.clientHeight);
      }
    };

    window.addEventListener("resize", resizeGlobe);

  } catch (error) {
    console.error("Earth error:", error);
    container.innerHTML =
      '<div class="loading-message">Could not load Earth. Please refresh the page.</div>';
  }
}

document.getElementById("zoomIn").addEventListener("click", () => {
  if (!globeInstance) return;

  const view = globeInstance.pointOfView();
  globeInstance.pointOfView(
    { ...view, altitude: Math.max(.6, view.altitude * .75) },
    500
  );
});

document.getElementById("zoomOut").addEventListener("click", () => {
  if (!globeInstance) return;

  const view = globeInstance.pointOfView();
  globeInstance.pointOfView(
    { ...view, altitude: Math.min(8, view.altitude * 1.3) },
    500
  );
});

document.getElementById("resetGlobe").addEventListener("click", () => {
  if (!globeInstance) return;

  globeInstance.pointOfView({
    lat: 20,
    lng: 78,
    altitude: 2.2
  }, 1000);
});


/* ---------- REAL SATELLITE MAP ---------- */

let worldMap = null;

function initializeMap() {
  const mapElement = document.getElementById("worldMap");

  if (typeof L === "undefined") {
    mapElement.innerHTML =
      '<p style="padding:30px;color:white">Map library unavailable. Check internet connection.</p>';
    return;
  }

  worldMap = L.map("worldMap", {
    center: [22.5, 78.9],
    zoom: 4,
    zoomControl: true
  });

  // Esri World Imagery satellite basemap.
  // This avoids using the OSM standard tile server.
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: 'Tiles © <a href="https://www.esri.com/">Esri</a> — Sources: Esri, Maxar, Earthstar Geographics',
      maxZoom: 19
    }
  ).addTo(worldMap);

  L.marker([28.6139, 77.2090])
    .addTo(worldMap)
    .bindPopup("<b>New Delhi</b><br>India");

  L.marker([19.0760, 72.8777])
    .addTo(worldMap)
    .bindPopup("<b>Mumbai</b><br>India");

  L.marker([12.9716, 77.5946])
    .addTo(worldMap)
    .bindPopup("<b>Bengaluru</b><br>India");

  setTimeout(() => worldMap.invalidateSize(), 300);
}

document.getElementById("indiaBtn").addEventListener("click", () => {
  if (worldMap) {
    worldMap.flyTo([22.5, 78.9], 5, { duration: 1.5 });
  }
});


/* ---------- LIVE WEATHER USING OPEN-METEO ---------- */

const weatherForm = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const weatherResult = document.getElementById("weatherResult");

function weatherDescription(code) {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    80: "Rain showers",
    81: "Moderate rain showers",
    82: "Heavy rain showers",
    95: "Thunderstorm"
  };

  return descriptions[code] || "Weather information";
}

async function loadWeather(lat, lon, city) {
  weatherResult.innerHTML =
    '<div class="weather-empty">Loading live weather information...</div>';

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature," +
      "precipitation,rain,weather_code,wind_speed_10m" +
      "&daily=precipitation_sum,temperature_2m_max,temperature_2m_min" +
      "&timezone=auto&forecast_days=3";

    const response = await fetch(url);

    if (!response.ok) throw new Error("Weather service error");

    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

    weatherResult.innerHTML = `
      <div class="weather-card">
        <div class="weather-main">
          <h3>${escapeHTML(city)}</h3>
          <div class="temperature">${Math.round(current.temperature_2m)}°C</div>
          <strong>${weatherDescription(current.weather_code)}</strong>
          <small style="color:#91a8bc">
            Feels like ${current.apparent_temperature}°C
          </small>
          <small style="color:#91a8bc">
            Updated: ${new Date(current.time).toLocaleString()}
          </small>
        </div>

        <div class="weather-grid">
          <div class="weather-item">
            <small>Humidity</small>
            <strong>${current.relative_humidity_2m}%</strong>
          </div>
          <div class="weather-item">
            <small>Wind speed</small>
            <strong>${current.wind_speed_10m} km/h</strong>
          </div>
          <div class="weather-item">
            <small>Current precipitation</small>
            <strong>${current.precipitation} mm</strong>
          </div>
          <div class="weather-item">
            <small>Today's rainfall forecast</small>
            <strong>${daily.precipitation_sum[0]} mm</strong>
          </div>
          <div class="weather-item">
            <small>Maximum temperature</small>
            <strong>${daily.temperature_2m_max[0]}°C</strong>
          </div>
          <div class="weather-item">
            <small>Minimum temperature</small>
            <strong>${daily.temperature_2m_min[0]}°C</strong>
          </div>
        </div>
      </div>
    `;

  } catch (error) {
    console.error(error);
    weatherResult.innerHTML =
      '<div class="weather-empty">Weather information could not be loaded. Please try again.</div>';
  }
}

async function searchCity(city) {
  if (!city.trim()) return;

  weatherResult.innerHTML =
    '<div class="weather-empty">Finding location...</div>';

  try {
    const url =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error("City not found");
    }

    const location = data.results[0];
    const fullName = [
      location.name,
      location.admin1,
      location.country
    ].filter(Boolean).join(", ");

    await loadWeather(location.latitude, location.longitude, fullName);

  } catch (error) {
    weatherResult.innerHTML =
      '<div class="weather-empty">Location not found. Please check the city name.</div>';
  }
}

weatherForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  searchCity(cityInput.value);
});

document.getElementById("locateBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Your browser does not support location.");
    return;
  }

  weatherResult.innerHTML =
    '<div class="weather-empty">Requesting your location permission...</div>';

  navigator.geolocation.getCurrentPosition(
    position => {
      loadWeather(
        position.coords.latitude,
        position.coords.longitude,
        "Your Current Location"
      );
    },
    () => {
      weatherResult.innerHTML =
        '<div class="weather-empty">Location permission denied. Search your city instead.</div>';
    },
    { timeout: 10000 }
  );
});


/* ---------- GEMINI AI CHATBOT ---------- */

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatStatus = document.getElementById("chatStatus");

let chatHistory = [];
let currentLanguage = "English";

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function addMessage(text, sender) {
  const message = document.createElement("div");
  message.className =
    `message ${sender === "user" ? "user-message" : "ai-message"}`;

  message.textContent = text;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(message) {
  if (!message.trim()) return;

  addMessage(message, "user");
  chatInput.value = "";
  chatInput.disabled = true;
  chatStatus.textContent = "JalVayu AI is thinking...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        language: currentLanguage,
        history: chatHistory
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "AI request failed");
    }

    addMessage(data.reply, "ai");

    chatHistory.push(
      { role: "user", text: message },
      { role: "model", text: data.reply }
    );

    chatHistory = chatHistory.slice(-10);
    chatStatus.textContent = "Connected to Gemini AI";

  } catch (error) {
    console.error(error);
    addMessage(
      "Sorry! AI connection failed. Please check your backend and Gemini API key. " + error.message,
      "ai"
    );
    chatStatus.textContent = "AI connection error";
  }

  chatInput.disabled = false;
  chatInput.focus();
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  sendMessage(chatInput.value);
});

document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.textContent);
  });
});


/* ---------- LANGUAGE SWITCHING ---------- */

const translations = {
  en: {
    title: "Home",
    explore: "Explore Earth ↗",
    assistant: "Ask JalVayu AI",
    search: "Enter city (e.g. Mumbai)",
    chat: "Ask your climate question...",
    send: "Send ↗"
  },
  hi: {
    title: "होम",
    explore: "पृथ्वी देखें ↗",
    assistant: "जलवायु AI से पूछें",
    search: "शहर का नाम लिखें",
    chat: "अपना जलवायु संबंधी प्रश्न पूछें...",
    send: "भेजें ↗"
  }
};

function setLanguage(language) {
  currentLanguage = language === "hi" ? "Hindi (Devanagari)" : "English";

  document.documentElement.lang = language;

  document.querySelectorAll("[data-en][data-hi]").forEach(element => {
    element.textContent = element.dataset[language];
  });

  const t = translations[language];

  document.querySelector('a[href="#earth"].btn').textContent = t.explore;
  document.querySelector('a[href="#assistant"].btn').textContent = t.assistant;
  cityInput.placeholder = t.search;
  chatInput.placeholder = t.chat;
  chatForm.querySelector("button").textContent = t.send;

  document.querySelectorAll(".suggestion").forEach((button, index) => {
    const english = [
      "How can farmers save water?",
      "Explain climate change",
      "Tell me about rainfall"
    ];

    const hindi = [
      "किसान पानी कैसे बचा सकते हैं?",
      "जलवायु परिवर्तन समझाइए",
      "बारिश के बारे में बताइए"
    ];

    button.textContent = language === "hi"
      ? hindi[index]
      : english[index];
  });
}

document.getElementById("languageSelect")
  .addEventListener("change", event => {
    setLanguage(event.target.value);
  });


/* ---------- BACKEND STATUS ---------- */

async function checkBackend() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    console.log("JALVAYU360 backend:", data);

    if (data.gemini !== "configured") {
      chatStatus.textContent =
        "Backend online. Gemini API key needs configuration.";
    }
  } catch (error) {
    chatStatus.textContent = "Backend not connected.";
    console.error("Backend error:", error);
  }
}


/* ---------- INITIALIZATION ---------- */

window.addEventListener("load", () => {
  initializeGlobe();
  initializeMap();
  checkBackend();
});