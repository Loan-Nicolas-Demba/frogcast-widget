const params = new URLSearchParams(window.location.search);
const title = params.get("title") || "My Widget";
const message = params.get("message") || "Hello from the widget.";

const baseApi = "https://api.frogcast.com/api/v1";

document.getElementById("title").textContent = title;
document.getElementById("message").textContent = message;

location
const btn = document.getElementById("locBtn");
const output = document.getElementById("output");
let latitude;
let longitude;
let dayAmount;

// sets and updates the Amount of days selected by the user
const dayInputs = document.querySelectorAll('input[name="dayAmount"]');
dayInputs.forEach(input => {
  input.addEventListener("change", () => {
    dayAmount = Number(document.querySelector('input[name="dayAmount"]:checked')?.value || 3);;
    console.log(dayAmount);
  });
});

btn.addEventListener("click", async () => {
  if (!("geolocation" in navigator)) {
    output.textContent = "Geolocation is not supported by this browser.";
    return;
  }

  try {
    const position = await getPosition();
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;

    output.textContent = `Latitude: ${latitude}, Longitude: ${longitude}`;

    await getTemperature();
    await getCloudCover();
    await getHumidity();
    await getWind();
    // await getTemperature();
  } catch (error) {
    output.textContent = `Error: ${error.message}`;
  }
});

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

// general function to get a selected field from the api
async function getField(latitude, longitude, field) {
    const response = await fetch(
    `http://localhost:3001/forecast?latitude=${latitude}&longitude=${longitude}&fields=${field}`
  );
  
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}

// filters the data given to only get the data for the following dayAmount of days
function filterByDayAmount(apiData, days = dayAmount) {
    const now = new Date();
    const startUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));

    const endUTC = new Date(startUTC);
    endUTC.setUTCDate(startUTC.getUTCDate() + days);

    return apiData.index
    .map((timestamp, i) => ({
        timestamp: new Date(timestamp),
        value: apiData.data[i][0]
    }))
    .filter(item => item.timestamp >= startUTC && item.timestamp < endUTC)
    .map(item => item.value);
    
}

// gets data for the current hour
function filterByCurrentHour(apiData) {
  const now = new Date();
  const currentHour = now.getHours();

  return apiData.index
    .map((timestamp, i) => ({
      date: new Date(timestamp),
      value: apiData.data[i][0]
    }))
    .filter(item => item.date.getHours() === currentHour)
    .map(item => item.value);
}

// pas sûr de l'utilité
function getAverage(list) {
  if (!list.length) return null;
  return list.reduce((acc, value) => acc + value, 0) / list.length;
}

function getDailyAverage(apiData, days = 1) {
  const filtered = filterByDayAmount(apiData, days);
  return getAverage(filtered);
}
//

// returns the [min, max] of a given list
function getMinMax(list) {
  if (!list.length) return [null, null];

  return list.reduce(
    ([min, max], value) => [
      Math.min(min, value),
      Math.max(max, value)
    ],
    [Infinity, -Infinity]
  );
}

async function getTemperature() {
  const data = await getField(latitude, longitude, "t2m");
  const currentHourData = filterByCurrentHour(data);

  if (!currentHourData.length) {
    document.getElementById("temperature").textContent = "No data";
    return null;
  }

  const temp = currentHourData[0];
  document.getElementById("temperature").textContent =
    `${Math.round(temp * 10) / 10}°C`;

  return temp;
}

async function getCloudCover() {
  const data = await getField(latitude, longitude, "tcc");
  const currentHourData = filterByCurrentHour(data);

  if (!currentHourData.length) {
    document.getElementById("cloudCover").textContent = "No data";
    return null;
  }

  const cloud = currentHourData[0];
  document.getElementById("cloudCover").textContent =
    `${Math.round(cloud * 100)}%`;

  return cloud;
}

async function getHumidity() {
    const data = await getField(latitude, longitude, "rh2m");
    const filteredData = filterByDayAmount(data);
    const avgHumidity = getDailyAverage(data, 1);
    console.log(avgHumidity);
    document.getElementById("humidity").textContent =
    avgHumidity === null
        ? "No data"
        : `${Math.round(avgHumidity)}%`;

    return filteredData;
}

async function getWind() {
    const windSpeed = await getField(latitude, longitude, "10m_wind_speed");
    const windDirection = await getField(latitude, longitude, "10m_wind_direction");

    const filteredData = filterByDayAmount(windSpeed);
    const avgWindSpeed = getDailyAverage(windSpeed, 1);
    console.log(avgWindSpeed);
    document.getElementById("windSpeed").textContent =
    avgWindSpeed === null
        ? "No data"
        : `${Math.round(avgWindSpeed * 10) / 10}m/s`;

    return filteredData;
}
