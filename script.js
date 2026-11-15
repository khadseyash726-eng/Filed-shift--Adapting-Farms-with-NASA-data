
let currentLocation = null;
let rainfallChart = null;
let map = null;
let mapMarker = null;
let globe = null;

const $ = (id) => document.getElementById(id);

function setStatus(message) {
  $("locationStatus").textContent = message;
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function weatherIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

async function searchLocation() {
  const query = $("locationInput").value.trim();

  if (!query) {
    setStatus("Please enter a village, town or city name.");
    return;
  }

  setStatus("Searching for location...");

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const response = await fetch(url);

    if (!response.ok) throw new Error("Location search failed.");

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      setStatus("Location not found. Try another spelling.");
      return;
    }

    const place = data.results.find(p => p.country_code === "IN") || data.results[0];

    await selectLocation({
      name: place.name,
      country: place.country || "",
      admin: place.admin1 || "",
      latitude: place.latitude,
      longitude: place.longitude
    });
  } catch (error) {
    setStatus("Could not search location. Check your internet connection.");
    console.error(error);
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus("Your browser does not support location access.");
    return;
  }

  setStatus("Requesting your location...");

  navigator.geolocation.getCurrentPosition(
    async position => {
      await selectLocation({
        name: "Your selected location",
        country: "",
        admin: "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    },
    () => setStatus("Location permission denied. You can search by city name."),
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

async function selectLocation(place) {
  currentLocation = place;

  const fullName = [place.name, place.admin, place.country].filter(Boolean).join(", ");

  $("selectedLocation").textContent = fullName;
  $("coordinatesText").textContent =
    `Latitude: ${place.latitude.toFixed(3)} | Longitude: ${place.longitude.toFixed(3)}`;
  $("rainLocation").textContent = fullName;
  $("globeLocationName").textContent = fullName;
  $("globeWeatherPlace").textContent = "Loading weather information...";
  $("globeWeatherDetails").textContent = "";

  if (map) {
    map.setView([place.latitude, place.longitude], 8);
    if (mapMarker) map.removeLayer(mapMarker);
    mapMarker = L.marker([place.latitude, place.longitude]).addTo(map)
      .bindPopup(fullName).openPopup();
  }

  if (globe) {
    globe.pointsData([{
      lat: place.latitude,
      lng: place.longitude,
      size: 0.6,
      color: "#64e6a1"
    }]);
    globe.pointOfView({ lat: place.latitude, lng: place.longitude, altitude: 1.8 }, 1000);
  }

  setStatus("Location selected. Loading weather and NASA data...");

  await Promise.allSettled([
    loadWeather(place),
    loadNASAData(place)
  ]);

  setStatus("Location data loading completed. Check the sections below.");
}

async function loadWeather(place) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");

  url.search = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto",
    forecast_days: "7"
  });

  const response = await fetch(url);

  if (!response.ok) throw new Error("Weather API failed.");

  const data = await response.json();
  const current = data.current;

  $("temperature").textContent = `${current.temperature_2m} °C`;
  $("feelsLike").textContent = `Feels like ${current.apparent_temperature} °C`;
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("precipitation").textContent = `${current.precipitation} mm`;
  $("windSpeed").textContent = `${current.wind_speed_10m} km/h`;

  $("weatherSource").textContent = "Source: Open-Meteo weather API";
  $("weatherUpdated").textContent = `Model time: ${current.time || "Not available"}`;

  $("globeWeatherPlace").textContent = "Current weather";
  $("globeWeatherDetails").textContent =
    `${current.temperature_2m}°C • ${current.relative_humidity_2m}% humidity • ${current.precipitation} mm precipitation`;

  const forecastHTML = data.daily.time.map((day, index) => `
    <article class="forecast-card glass">
      <p>${new Date(day + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}</p>
      <div class="forecast-icon">${weatherIcon(data.daily.weather_code[index])}</div>
      <strong>${Math.round(data.daily.temperature_2m_max[index])}°</strong>
      <p>${Math.round(data.daily.temperature_2m_min[index])}° min</p>
      <small>🌧️ ${data.daily.precipitation_sum[index]} mm</small>
    </article>
  `).join("");

  $("forecastCards").innerHTML = forecastHTML;
}

async function loadNASAData(place) {
  $("rainStatus").textContent = "Loading NASA POWER data...";
  $("nasaDate").textContent = "Fetching daily data from NASA POWER...";

  try {
    const end = dateDaysAgo(3);
    const start = dateDaysAgo(367);

    const url = new URL("https://power.larc.nasa.gov/api/temporal/daily/point");

    url.search = new URLSearchParams({
      parameters: "PRECTOTCORR,T2M,RH2M",
      community: "AG",
      longitude: place.longitude,
      latitude: place.latitude,
      start,
      end,
      format: "JSON"
    });

    const response = await fetch(url);

    if (!response.ok) throw new Error("NASA POWER request failed.");

    const data = await response.json();
    const parameters = data.properties.parameter;

    const rainfall = parameters.PRECTOTCORR || {};
    const temperature = parameters.T2M || {};
    const humidity = parameters.RH2M || {};

    const validRain = Object.entries(rainfall)
      .filter(([date, value]) => /^\d{8}$/.test(date) && Number.isFinite(value) && value >= 0)
      .sort(([a], [b]) => a.localeCompare(b));

    if (!validRain.length) throw new Error("No valid NASA rainfall data.");

    const totalRain = validRain.reduce((sum, [, value]) => sum + value, 0);

    const monthly = {};

    validRain.forEach(([date, value]) => {
      const month = date.slice(0, 6);
      monthly[month] = (monthly[month] || 0) + value;
    });

    const monthEntries = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    const labels = monthEntries.map(([month]) => {
      const year = month.slice(0, 4);
      const monthName = new Date(Number(year), Number(month.slice(4, 6)) - 1)
        .toLocaleDateString("en", { month: "short" });
      return `${monthName} ${year}`;
    });

    const values = monthEntries.map(([, value]) => Number(value.toFixed(1)));

    const wettestIndex = values.indexOf(Math.max(...values));

    $("annualRainfall").textContent = `${totalRain.toFixed(1)} mm`;
    $("wettestMonth").textContent = labels[wettestIndex] || "—";
    $("rainStatus").textContent = `${validRain.length} daily records`;
    $("nasaRainfall").textContent = `Total rainfall: ${totalRain.toFixed(1)} mm`;

    const validTemp = Object.values(temperature).filter(v => Number.isFinite(v) && v > -90);
    const validHumidity = Object.values(humidity).filter(v => Number.isFinite(v) && v >= 0);

    $("nasaTemperature").textContent = validTemp.length
      ? `Average temperature: ${(validTemp.reduce((a,b) => a+b,0) / validTemp.length).toFixed(1)} °C`
      : "Temperature: unavailable";

    $("nasaHumidity").textContent = validHumidity.length
      ? `Average relative humidity: ${(validHumidity.reduce((a,b) => a+b,0) / validHumidity.length).toFixed(1)}%`
      : "Humidity: unavailable";

    $("nasaDate").textContent = `NASA POWER daily data: ${start} to ${end}`;

    drawRainfallChart(labels, values);
  } catch (error) {
    console.error(error);
    $("rainStatus").textContent = "NASA data unavailable";
    $("nasaDate").textContent = "Could not load NASA POWER data. Please try again later.";
  }
}

function drawRainfallChart(labels, values) {
  const ctx = $("rainfallChart");

  if (rainfallChart) rainfallChart.destroy();

  rainfallChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Rainfall (mm)",
        data: values,
        backgroundColor: "rgba(100,230,161,0.65)",
        borderColor: "#64e6a1",
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#dceaff" } }
      },
      scales: {
        x: {
          ticks: { color: "#9aabc2" },
          grid: { color: "rgba(255,255,255,.05)" }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Rainfall (mm)",
            color: "#9aabc2"
          },
          ticks: { color: "#9aabc2" },
          grid: { color: "rgba(255,255,255,.08)" }
        }
      }
    }
  });
}

function initializeMap() {
  map = L.map("earthMap").setView([20.5937, 78.9629], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18
  }).addTo(map);

  map.on("click", async event => {
    await selectLocation({
      name: "Map selected location",
      country: "",
      admin: "",
      latitude: event.latlng.lat,
      longitude: event.latlng.lng
    });
  });
}

function initializeGlobe() {
  const container = $("globeViz");

  if (!window.Globe) {
    container.textContent = "3D globe could not load. Check your internet connection.";
    return;
  }

  globe = Globe()(container)
    .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
    .backgroundColor("#071323")
    .showAtmosphere(true)
    .atmosphereColor("#4ebdff")
    .atmosphereAltitude(0.18)
    .pointsData([])
    .pointAltitude("size")
    .pointColor("color")
    .pointRadius(0.4)
    .onGlobeClick(async point => {
      if (!point) return;
      await selectLocation({
        name: "Globe selected location",
        country: "",
        admin: "",
        latitude: point.lat,
        longitude: point.lng
      });
    });

  globe.width(container.clientWidth);
  globe.height(container.clientHeight);
}

const answers = [
  {
    keywords: ["rotation", "crop rotation"],
    answer: "Crop rotation means growing different crops in sequence on the same field. Rotating cereals with legumes can support soil fertility and help break some pest and disease cycles."
  },
  {
    keywords: ["drought", "dry"],
    answer: "Drought is a period of unusually low water availability. Farmers can explore drought-tolerant crops, soil cover, water conservation and local agricultural advice."
  },
  {
    keywords: ["rain", "rainfall", "precipitation"],
    answer: "Rainfall affects soil moisture, planting schedules and crop growth. Both too little and too much rain can create challenges for farming."
  },
  {
    keywords: ["soil moisture", "moisture"],
    answer: "Soil moisture is the water stored in soil. It helps plants absorb nutrients and supports growth. NASA satellite observations can help monitor moisture conditions over large areas."
  },
  {
    keywords: ["nasa", "data"],
    answer: "NASA POWER provides accessible Earth observation and meteorological data. This prototype uses its daily precipitation, temperature and humidity parameters."
  },
  {
    keywords: ["weather", "temperature"],
    answer: "The weather dashboard uses Open-Meteo for current weather and a seven-day forecast. Select a location to view its conditions."
  },
  {
    keywords: ["legume", "pulses"],
    answer: "Legumes such as chickpea and pigeon pea can contribute to soil nitrogen through biological nitrogen fixation. Suitability depends on local soil, season and water availability."
  }
];

function getBotAnswer(question) {
  const text = question.toLowerCase();

  const match = answers.find(item =>
    item.keywords.some(keyword => text.includes(keyword))
  );

  return match
    ? match.answer
    : "I can help with general questions about crop rotation, drought, rainfall, soil moisture, NASA data and weather. Try asking about one of these topics.";
}

function addMessage(message, type) {
  const element = document.createElement("div");
  element.className = `message ${type}-message`;
  element.textContent = message;
  $("chatMessages").appendChild(element);
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
}

function sendChatMessage(message) {
  const question = message.trim();
  if (!question) return;

  addMessage(question, "user");
  addMessage(getBotAnswer(question), "bot");
}

function initializeChat() {
  $("chatForm").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("chatInput");
    sendChatMessage(input.value);
    input.value = "";
  });

  document.querySelectorAll(".question-btn").forEach(button => {
    button.addEventListener("click", () => sendChatMessage(button.textContent));
  });
}

function generateAdvisory() {
  const soil = $("soilType").value;
  const water = $("waterLevel").value;
  const priority = $("priority").value;
  const rain = $("rainCondition").value;

  let suggestions = [];
  let explanation = "";

  if (water === "low" || rain === "low") {
    suggestions = ["Explore drought-tolerant crops", "Consider suitable pulses", "Use soil-moisture conservation practices"];
    explanation = "Low water availability or drought risk makes water conservation especially important.";
  } else if (water === "high" || rain === "high") {
    suggestions = ["Check drainage before planting", "Consider locally suitable crops that tolerate wet conditions", "Monitor waterlogging risk"];
    explanation = "Excess water can affect roots and crop growth. Local drainage conditions matter.";
  } else {
    suggestions = ["Explore a cereal-legume rotation", "Consider locally suitable pulses", "Maintain soil cover between crops"];
    explanation = "A diversified crop sequence can support soil health when it is suitable for the local season and soil.";
  }

  if (soil === "black") {
    explanation += " Black soil can retain moisture; drainage and seasonal conditions should be checked.";
  } else if (soil === "sandy") {
    explanation += " Sandy soil often drains quickly, so water and organic matter management are important.";
  } else if (soil === "red") {
    explanation += " Red soil varies widely; a soil test can help guide nutrient management.";
  } else if (soil === "alluvial") {
    explanation += " Alluvial soil can vary in texture and fertility, so local testing is useful.";
  } else {
    explanation += " Identify your soil type through a soil test before making a planting decision.";
  }

  if (priority === "soil") {
    suggestions.push("Include suitable legumes to support soil fertility");
  } else if (priority === "water") {
    suggestions.push("Compare crops by seasonal water requirement");
  } else if (priority === "income") {
    suggestions.push("Compare local market demand and production costs");
  } else {
    suggestions.push("Diversify crops and monitor seasonal climate risks");
  }

  $("advisoryResult").innerHTML = `
    <div class="advisory-icon">🌱</div>
    <h3>Suggested Farming Actions</h3>
    <p>${explanation}</p>
    <ul>${suggestions.map(item => `<li>${item}</li>`).join("")}</ul>
    <p><strong>Important:</strong> This is an educational prototype, not a validated farm recommendation. Confirm with local agricultural experts.</p>
  `;
}

function initializeLanguageSelector() {
  const translations = {
    en: ["Home", "Dashboard", "Rainfall", "3D Earth", "AI Assistant", "Crop Advisory"],
    mr: ["मुख्यपृष्ठ", "डॅशबोर्ड", "पाऊस", "3D पृथ्वी", "AI सहाय्यक", "पीक सल्ला"],
    hi: ["होम", "डैशबोर्ड", "वर्षा", "3D पृथ्वी", "AI सहायक", "फसल सलाह"]
  };

  $("languageSelect").addEventListener("change", event => {
    const language = event.target.value;
    document.querySelectorAll(".navbar nav a").forEach((link, index) => {
      link.textContent = translations[language][index];
    });
  });
}

function initializeApp() {
  $("searchLocation").addEventListener("click", searchLocation);
  $("locationInput").addEventListener("keydown", event => {
    if (event.key === "Enter") searchLocation();
  });

  $("useMyLocation").addEventListener("click", useMyLocation);
  $("getAdvisory").addEventListener("click", generateAdvisory);

  initializeMap();
  initializeGlobe();
  initializeChat();
  initializeLanguageSelector();
}

window.addEventListener("load", initializeApp);
