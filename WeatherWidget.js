class WeatherWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.latitude = null;
    this.longitude = null;
    this.dayAmount = 3;
    this.baseApi = "https://api.frogcast.com/api/v1";
  }

  connectedCallback() {
    this.render();
    this.setupEvents();
    this.loadForecast();
  }

  render() {

    this.shadowRoot.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: Arial, sans-serif;
      background: transparent;
    }

    .widget {
      width: 100%;
      max-width: 560px;
      padding: 16px;
      border: 1px solid #ddd;
      border-radius: 14px;
      background: #045d63;
      box-sizing: border-box;
      color: #fff;
    }

    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .info h2 {
      margin: 0 0 6px;
      font-size: 20px;
      color: #fff;
    }

    .info p {
      margin: 0 0 12px;
      color: rgba(255, 255, 255, 0.8);
    }

    .current {
      min-width: 120px;
      text-align: right;
    }

    .current #temperature {
      margin: 0;
      font-size: 44px;
      line-height: 1;
      color: #fff;
    }

    .main-condition {
      display: flex;
      gap: 16px;
      margin: 18px 0;
      padding: 14px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
    }

    .main-condition > div {
      flex: 1;
    }

    .main-condition p {
      margin: 0;
    }

    .main-condition [id^="label-"] {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.75);
      margin-bottom: 6px;
    }

    .main-condition [id="humidity"],
    .main-condition [id="cloudCover"],
    .main-condition [id="windSpeed"] {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .branding {
      margin: 14px 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .day-selector {
      display: inline-flex;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.08);
    }

    .option {
      position: relative;
      cursor: pointer;
    }

    .option input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .option span {
      display: block;
      padding: 10px 18px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.85);
      transition: background 0.2s ease, color 0.2s ease;
    }

    .option input:checked + span {
      background: #2563eb;
      color: white;
    }

    /* Forecast section */
    .forecast {
      margin-top: 18px;
    }

    .forecast__title {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
    }

    .forecast__days {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
      gap: 12px;
    }

    .forecast__day {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      text-align: center;
    }

    .forecast__label {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
    }

    .forecast__icon {
      width: 36px;
      height: 36px;
      margin-bottom: 8px;
    }

    .forecast__temp-max {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }

    .forecast__temp-min {
      margin: 2px 0 0;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
    }
    
  </style>

  <div class="widget">
    <div class="top">
      <div class="day-selector">
        <label class="option">
          <input type="radio" name="dayAmount" value="3"checked>
          <span>3-day Forecast</span>
        </label>

        <label class="option">
          <input type="radio" name="dayAmount" value="5">
          <span>5-day Forecast</span>
        </label>
      </div>
      
      
      <div class="current">
        <p id="temperature">--</p>
      </div>
    </div>
    <p id="output">--</p>
    
    <div class="main-condition">
      <div class="Humidity">
        <p id="label-humidity">Humidity</p>
        <p id="humidity">--</p>
        <p id="minmax-humidity">--</p>
      </div>

      <div class="Wind">
        <p id="label-wind">Wind</p>
        <p id="windSpeed">--</p>
        <p id="minmax-windSpeed">--</p>
      </div>

      <div class="CloudCover">
        <p id="label-cloudCover">Cloud Cover</p>
        <p id="cloudCover">--</p>
        <p id="minmax-cloudCover">--</p>
      </div>     
    </div>

    <section class="forecast">
      <h3 class="forecast__title">Forecast</h3>
      <div class="forecast__days" id="forecastDays"></div>
    </section>

    <div class="branding">
      <slot name="branding"></slot>
    </div>

    
  </div>
`;
  }

  setupEvents() {
    const btn = this.shadowRoot.getElementById("locBtn");
    const dayInputs = this.shadowRoot.querySelectorAll('input[name="dayAmount"]');

    dayInputs.forEach(input => {
      input.addEventListener("change", async () => {
        this.dayAmount = Number(
          this.shadowRoot.querySelector('input[name="dayAmount"]:checked')?.value || 3
        );
        await this.loadForecast();
      });
    });

    // btn.addEventListener("click", () => this.handleLocationClick());
  }

  async loadForecast() {
    const output = this.shadowRoot.getElementById("output");

    if (!("geolocation" in navigator)) {
      output.textContent = "Geolocation is not supported by this browser.";
      return;
    }

    try {
      const position = await this.getPosition();
      this.latitude = position.coords.latitude;
      this.longitude = position.coords.longitude;

      output.textContent = `Latitude: ${this.latitude}, Longitude: ${this.longitude}`;

      await this.getTemperature();
      await this.getHumidity();
      await this.getWind();
      await this.getCloudCover();
      await this.renderForecast();
    } catch (error) {
      output.textContent = `Error: ${error.message}`;
    }
  }

  async renderForecast() {
    const container = this.shadowRoot.getElementById("forecastDays");
    if (!container) return;

    const tempData = await this.getField("t2m");
    const days = this.groupForecastByDay(tempData, this.dayAmount);

    container.innerHTML = days.map(day => `
      <article class="forecast__day">
        <p class="forecast__label">${day.label}</p>
        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 32 32">
          <path fill="currentColor" d="M 15 3 L 15 8 L 17 8 L 17 3 L 15 3 z M 7.515625 6.1015625 L 6.1015625 7.515625 L 9.6367188 11.050781 L 11.050781 9.6367188 L 7.515625 6.1015625 z M 24.484375 6.1015625 L 20.949219 9.6367188 L 22.363281 11.050781 L 25.898438 7.515625 L 24.484375 6.1015625 z M 16 9 C 12.145849 9 9 12.145852 9 16 C 9 19.854148 12.145849 23 16 23 C 19.854151 23 23 19.854148 23 16 C 23 12.145852 19.854151 9 16 9 z M 16 11 C 18.773271 11 21 13.226731 21 16 C 21 18.773269 18.773271 21 16 21 C 13.226729 21 11 18.773269 11 16 C 11 13.226731 13.226729 11 16 11 z M 3 15 L 3 17 L 8 17 L 8 15 L 3 15 z M 24 15 L 24 17 L 29 17 L 29 15 L 24 15 z M 9.6367188 20.949219 L 6.1015625 24.484375 L 7.515625 25.898438 L 11.050781 22.363281 L 9.6367188 20.949219 z M 22.363281 20.949219 L 20.949219 22.363281 L 24.484375 25.898438 L 25.898438 24.484375 L 22.363281 20.949219 z M 15 24 L 15 29 L 17 29 L 17 24 L 15 24 z"></path>
        </svg>
        <p class="forecast__temp-max">${day.max}°</p>
        <p class="forecast__temp-min">${day.min}°</p>
      </article>
    `).join("");
  }

  getPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  async getField(field) {
    const response = await fetch(
      `http://localhost:3001/forecast?latitude=${this.latitude}&longitude=${this.longitude}&fields=${field}`
    );

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    return await response.json();
  }

  // filters the data given to only get the data for the following dayAmount of days
  filterByDayAmount(apiData, days = this.dayAmount) {
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
  groupForecastByDay(apiData, days = this.dayAmount) {
  const now = new Date();
  const startUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));

  const endUTC = new Date(startUTC);
  endUTC.setUTCDate(startUTC.getUTCDate() + days);

  const grouped = new Map();

  apiData.index.forEach((timestamp, i) => {
    const date = new Date(timestamp);
    if (date < startUTC || date >= endUTC) return;

    const key = date.toISOString().slice(0, 10);
    const value = apiData.data[i][0];

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(value);
  });

  return [...grouped.entries()].map(([date, values], i) => ({
    date,
    label: i === 0
      ? "Today"
      : new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
    min: Math.round(Math.min(...values)),
    max: Math.round(Math.max(...values))
  }));
}

  // gets data for the current hour
  filterByCurrentHour(apiData) {
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
  // getAverage(list) {
  //   if (!list.length) return null;
  //   return list.reduce((acc, value) => acc + value, 0) / list.length;
  // }

  // getDailyAverage(apiData, days = 1) {
  //   const filtered = this.filterByDayAmount(apiData, days);
  //   return this.getAverage(filtered);
  // }
  //

  // returns the [min, max] of a given list
  getMinMax(apiData) {
    if (!apiData || !apiData.data || !apiData.data.length) return [null, null];

    let min = apiData.data[0][0];
    let max = apiData.data[0][0];

    for (let i = 1; i < apiData.data.length; i++) {
      const value = apiData.data[i][0];
      if (value < min) min = value;
      if (value > max) max = value;
    }

    return [Math.round(min), Math.round(max)];
  }

  // returns min and max for a given list of numbers
  getMinMaxFromList(values) {
    if (!values || !values.length) return [null, null];

    let min = values[0];
    let max = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }

    return [Math.round(min), Math.round(max)];
  }

  // convenience wrapper: min/max for a field over the selected forecast range
  getForecastMinMax(apiData, days = this.dayAmount) {
    const items = this.filterByDayAmount(apiData, days);
    const values = items.map(item => item.value);
    return this.getMinMaxFromList(values);
  }

  degreesToCardinal(deg) {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round(((deg % 360) / 45)) % 8;
    return directions[index];
  }

  async getTemperature() {
    const data = await this.getField("t2m");
    const currentHourData = this.filterByCurrentHour(data);

    if (!currentHourData.length) {
      this.shadowRoot.getElementById("temperature").textContent = "No data";
      return null;
    }

    const temp = currentHourData[0];
    this.shadowRoot.getElementById("temperature").textContent =
      `${Math.round(temp * 10) / 10}°C`;

    return temp;
  }

  async getHumidity() {
    const data = await this.getField("rh2m");
    const currentHourData = this.filterByCurrentHour(data);

    if (!currentHourData.length) {
      this.shadowRoot.getElementById("humidity").textContent = "No data";
      return null;
    }

    const humidity = currentHourData[0];
    const minmax = this.getMinMax(data);
    this.shadowRoot.getElementById("humidity").textContent =
      `${Math.round(humidity)}%`;

    this.shadowRoot.getElementById("minmax-humidity").textContent =
      `${minmax[0]}-${minmax[1]}%`;
    return humidity;
  }

  async getWind() {
    const windSpeedData = await this.getField("10m_wind_speed");
    const windDirectionData = await this.getField("10m_wind_direction");

    const currentHourSpeed = this.filterByCurrentHour(windSpeedData);
    const currentHourDirection = this.filterByCurrentHour(windDirectionData);

    if (!currentHourSpeed.length) {
      this.shadowRoot.getElementById("windSpeed").textContent = "No data";
      return null;
    }

    const windSpeed = currentHourSpeed[0];
    const windDirection = currentHourDirection.length ? this.degreesToCardinal(currentHourDirection[0]) : null;

    this.shadowRoot.getElementById("windSpeed").textContent =
      `${Math.round(windSpeed * 10) / 10} m/s ${windDirection}`;
    
    const minmax = this.getMinMax(windSpeedData);
    this.shadowRoot.getElementById("minmax-windSpeed").textContent =
      `${minmax[0]}-${minmax[1]}m/s`;
    return {
      speed: windSpeed,
      direction: windDirection
    };
  }

  async getCloudCover() {
    const data = await this.getField("tcc");
    const currentHourData = this.filterByCurrentHour(data);

    if (!currentHourData.length) {
      this.shadowRoot.getElementById("cloudCover").textContent = "No data";
      return null;
    }

    const cloud = currentHourData[0];
    this.shadowRoot.getElementById("cloudCover").textContent =
      `${Math.round(cloud * 100)}%`;

    const minmax = this.getMinMax(data);
    this.shadowRoot.getElementById("minmax-cloudCover").textContent =
      `${minmax[0]}-${minmax[1]}%`;
    return cloud;
  }
  
}

customElements.define("weather-widget", WeatherWidget);