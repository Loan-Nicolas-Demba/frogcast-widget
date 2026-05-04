class WeatherWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.mainColor = "#045d63";
    this.latitude = null;
    this.longitude = null;
    this.dayAmount = 3;
    this.baseApi = "https://api.frogcast.com/api/v1";
    this.weatherData = {
      t2m: null,
      rh2m: null,
      windSpeed: null,
      windDirection: null,
      tcc: null,
      mtpa: null,
      ghi: null,
      mtpr: null,
      mtsr: null,
      storm_idx: null
    };
    this.selectedDayIndex = 0;
    this.forecastData = null;
  }

  connectedCallback() {
    const saved = localStorage.getItem("weatherWidgetDayAmount");
    if (saved === "3" || saved === "5") {
      this.dayAmount = Number(saved);
    }

    this.render();
    this.syncDaySelection();
    this.setupEvents();
    const toggle = this.shadowRoot.getElementById("dayToggle");
    if (toggle) {
      toggle.textContent = this.dayAmount === 3 ? "3-day Forecast" : "5-day Forecast";
    }
    this.loadForecast();
  }

  static get observedAttributes() {
    return ["main-color"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "main-color" && newValue) {
      this.mainColor = newValue;
      if (this.shadowRoot) {
        this.applyTheme();
      }
    }
  }

  applyTheme() {
    this.style.setProperty("--main-color", this.mainColor);
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
      background: var(--main-color, #045d63);
      box-sizing: border-box;
      color: #fff;
    }

    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .top-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .brand-name {
      display: flex;
      justify-content: flex-end;
    }

    .brand-logo {
      width: 230px;
      height: auto;
      display: block;
      object-fit: contain;
    }

    .current {
      margin-top: 8px;
      text-align: left;
    }

    .temperature-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    #temperature {
      margin: 0;
      font-size: 64px;
      line-height: 0.9;
      font-weight: 700;
      color: #fff;
    }

    .weather-details {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }

    #current-weather,
    #felt-temperature {
      margin: 0;
      color: #fff;
    }

    #current-weather {
      font-size: 18px;
      font-weight: 600;
    }

    #felt-temperature {
      font-size: 14px;
      opacity: 0.85;
    }
    .additional-weather {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .current-precipitation,
    .current-wind {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .current-precipitation p,
    .current-wind p {
      margin: 0;
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

    .day-toggle {
      padding: 10px 18px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .day-toggle:hover {
      background: rgba(255, 255, 255, 0.14);
    }

    .day-toggle:active {
      transform: scale(0.98);
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
      transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, outline-color 0.2s ease;
    }

    .forecast__day--selected {
      background: rgba(255, 255, 255, 0.14);
      outline: 2px solid rgba(255, 255, 255, 0.35);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2), 0 8px 18px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
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

    .hourly {
      margin-top: 18px;
    }

    .hourly__title {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
    }

    .hourly__list {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 6px;
      scrollbar-width: thin;
      scroll-snap-type: x proximity;
    }

    .hourly__item {
      flex: 0 0 140px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      scroll-snap-align: start;
    }

    .hourly__item {
      flex: 0 0 75px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      scroll-snap-align: start;
    }

    .hourly__time {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.75);
      margin: 0;
    }

    .hourly__icon {
      width: 24px;
      height: 24px;
      display: block;
    }

    .hourly__temp {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }

    .hourly__details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      margin-top: 4px;
    }

    .hourly__details p {
      margin: 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
    }
    
    .branding {
      margin: 14px 0 0;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }

    .branding a {
      color: inherit;
      text-decoration: none;
    }

    .branding a:hover {
      text-decoration: underline;
    }
  </style>

  <div class="widget">
    <div class="top">
      <button id="dayToggle" class="day-toggle" type="button">
        3-day Forecast
      </button>

      <div class="top-right">
        <div class="brand-name">
        <a href="https://frogcast.com" target="_blank" rel="noopener noreferrer">
          <img class="brand-logo" src="frogcast.webp" alt="Frogcast">
        </a>
        </div>
      </div>
    </div>

    <div class="current">
      <p id="output">Paris</p>

      <div class="temperature-row">
        <p id="temperature">--°C</p>

        <div class="weather-details">
          <p id="current-weather">Partiellement nuageux</p>
          <p id="felt-temperature">Ressenti 18°C</p>
        </div>
      </div>

      <div class="additional-weather">
        <div class="current-precipitation">
          <p id="current-precipitation">--</p>
        </div>
        <div class="current-wind">
          <p id="current-wind">--</p>
        </div>
      </div>
    </div>

    <section class="forecast">
      <h3 class="forecast__title">Forecast</h3>
      <div class="forecast__days" id="forecastDays"></div>
    </section>

    <section class="hourly">
      <h3 class="hourly__title">Hourly details</h3>
      <div class="hourly__list" id="hourlyList"></div>
    </section>

    <div class="branding">
      <a href="https://frogcast.com" target="_blank" rel="noopener noreferrer">
        Powered by FROGCAST API
      </a>
    </div>

    <div id="svg-library" hidden>
      <!-- STATES -->
      <svg id="icon-sunny" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
        <g id="clear-day__clear-day">
          <g id="clear-day__Sun">
            <circle id="clear-day__Core" cx="64" cy="64" r="19.5" fill="url(#sunny__paint0)" stroke="#f8af18"/>
            <g id="clear-day__Rays">
              <path fill="#f8af18" d="M61 19a3 3 0 1 1 6 0v14a3 3 0 0 1-6 0zM93.699 30.059A3 3 0 1 1 97.94 34.3l-9.9 9.9a3 3 0 1 1-4.242-4.243zM109 61a3 3 0 1 1 0 6H95a3 3 0 1 1 0-6zM97.941 93.699a3 3 0 1 1-4.243 4.242l-9.899-9.9a3 3 0 1 1 4.243-4.242zM61 95a3 3 0 1 1 6 0v14a3 3 0 1 1-6 0zM39.958 83.799a3 3 0 1 1 4.243 4.243l-9.9 9.9a3 3 0 1 1-4.242-4.243zM33 61a3 3 0 1 1 0 6H19a3 3 0 0 1 0-6zM44.201 39.958a3 3 0 1 1-4.243 4.243l-9.9-9.9a3 3 0 1 1 4.243-4.242z"/>
            </g>
          </g>
        </g>
        <defs>
          <linearGradient id="sunny__paint0" x1="64" x2="64" y1="44" y2="84" gradientUnits="userSpaceOnUse">
            <stop stop-color="#fbbf24"/>
            <stop offset="1" stop-color="#f8af18"/>
          </linearGradient>
        </defs>
      </svg>

      <svg id="icon-partly-cloudy" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .pc-sun { fill: url(#partly-cloudy__sunGradient); stroke: #f8af18; }
            .pc-none { fill: none; }
            .pc-cloud { fill: url(#partly-cloudy__cloudGradient); stroke: #e6effc; stroke-miterlimit: 10; }
            .pc-clip { clip-path: url(#partly-cloudy__clip); }
            .pc-ray { fill: #f8af18; }
          </style>
          <clipPath id="partly-cloudy__clip">
            <rect class="pc-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="partly-cloudy__sunGradient" x1="50" y1="81" x2="50" y2="55" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#fbbf24"/>
            <stop offset="1" stop-color="#f8af18"/>
          </linearGradient>
          <linearGradient id="partly-cloudy__cloudGradient" x1="69.41" y1="66.12" x2="69.41" y2="42.38" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f3f7fe"/>
            <stop offset="1" stop-color="#e6effc"/>
          </linearGradient>
        </defs>
        <g class="pc-clip">
          <g id="mostly-clear-day__mostly-clear-day">
            <g id="mostly-clear-day__Sky">
              <g id="mostly-clear-day__Sun">
                <circle id="mostly-clear-day__Core" class="pc-sun" cx="50" cy="62" r="12.5"/>
                <g id="mostly-clear-day__Rays">
                  <path class="pc-ray" d="M48,32c0-1.1.9-2,2-2s2,.9,2,2v9.33c0,1.1-.9,2-2,2s-2-.9-2-2v-9.33ZM69.8,39.37c.77-.79,2.03-.82,2.83-.05.79.77.82,2.03.05,2.83-.02.02-.03.03-.05.05l-6.6,6.6c-.78.78-2.05.78-2.83,0s-.78-2.05,0-2.83l6.6-6.6ZM80,60c1.1,0,2,.9,2,2s-.9,2-2,2h-9.33c-1.1,0-2-.9-2-2s.9-2,2-2h9.33ZM72.63,81.8c.79.77.82,2.03.05,2.83-.77.79-2.03.82-2.83.05-.02-.02-.03-.03-.05-.05l-6.6-6.6c-.78-.78-.78-2.05,0-2.83.78-.78,2.05-.78,2.83,0h0l6.6,6.6ZM48,82.67c0-1.1.9-2,2-2s2,.9,2,2v9.33c0,1.1-.9,2-2,2s-2-.9-2-2v-9.33ZM33.97,75.2c.78-.78,2.05-.78,2.83,0,.78.78.78,2.05,0,2.83l-6.6,6.6c-.78.78-2.05.78-2.83,0-.78-.78-.78-2.05,0-2.83h0l6.6-6.6ZM29.33,60c1.1,0,2,.9,2,2s-.9,2-2,2h-9.33c-1.1,0-2-.9-2-2s.9-2,2-2h9.33ZM36.8,45.97c.78.78.78,2.05,0,2.83s-2.05.78-2.83,0l-6.6-6.6c-.78-.78-.78-2.05,0-2.83.78-.78,2.05-.78,2.83,0h0l6.6,6.6Z"/>
                </g>
              </g>
              <g id="mostly-clear-day__Clouds">
                <g id="mostly-clear-day__Cloud">
                  <path id="mostly-clear-day__Cloud_2" class="pc-cloud" d="M65.06,68.42c2.42-3.65,7.53-5.23,11.85-3.54,4.35,1.7,6.7,6.2,5.58,10.36l-.11.43.48-.02c3.57-.15,6.55,2.59,6.55,5.82s-2.8,5.83-6.27,5.83c-9,0-18,0-26.99,0-3.48,0-6.39-2.55-6.71-5.68-.32-3.13,2.03-6.15,5.45-6.75l.35-.06-.06-.32c-.41-2.2.62-4.5,2.64-5.78,1.99-1.26,4.67-1.33,6.73-.17l.31.17.19-.29Z"/>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
      <svg id="icon-mostly-cloudy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128"><g id="partly-cloudy-day__partly-cloudy-day" clip-path="url(#partly-cloudy-day__clip0_1858_8241)"><g id="partly-cloudy-day__Sky"><g id="partly-cloudy-day__Sun"><circle id="partly-cloudy-day__Core" cx="39" cy="51" r="8.5" fill="url(#partly-cloudy-day__paint0_linear_1858_8241)" stroke="#f8af18"/><g id="partly-cloudy-day__Rays"><path fill="#f8af18" d="M37.688 31.313a1.312 1.312 0 1 1 2.624 0v6.125a1.312 1.312 0 1 1-2.624 0zM51.993 36.15a1.312 1.312 0 1 1 1.856 1.857l-4.33 4.33a1.312 1.312 0 1 1-1.857-1.855zM58.688 49.688a1.312 1.312 0 1 1 0 2.624h-6.126a1.312 1.312 0 1 1 0-2.624zM53.85 63.993a1.312 1.312 0 1 1-1.857 1.856l-4.33-4.33a1.312 1.312 0 1 1 1.855-1.857zM37.688 64.563a1.312 1.312 0 1 1 2.624 0v6.124a1.312 1.312 0 1 1-2.624 0zM28.482 59.662a1.312 1.312 0 1 1 1.856 1.856l-4.331 4.331a1.312 1.312 0 1 1-1.856-1.856zM25.438 49.688a1.312 1.312 0 1 1 0 2.624h-6.125a1.312 1.312 0 1 1 0-2.624zM30.338 40.482a1.312 1.312 0 1 1-1.856 1.856l-4.331-4.331a1.312 1.312 0 1 1 1.856-1.856z"/></g></g><g id="partly-cloudy-day__Clouds"><g id="partly-cloudy-day__Cloud"><path id="partly-cloudy-day__Cloud_2" fill="url(#partly-cloudy-day__paint1_linear_1858_8241)" stroke="#e6effc" stroke-miterlimit="10" d="M55.262 48.475c4.86-7.864 15.035-11.095 23.553-7.532 8.506 3.56 13.323 13.06 11.088 22.022l-.161.65.669-.03c7.01-.306 13.089 5.407 13.089 12.443 0 6.811-5.728 12.472-12.523 12.472H37.954c-6.826.002-12.751-5.33-13.395-12.14-.643-6.808 4.178-13.148 10.884-14.415l.483-.092-.084-.484c-.816-4.745 1.284-9.652 5.263-12.356 3.99-2.712 9.34-2.86 13.475-.373l.423.255z"/></g></g></g></g><defs><linearGradient id="partly-cloudy-day__paint0_linear_1858_8241" x1="39" x2="39" y1="42" y2="60" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#f8af18"/></linearGradient><linearGradient id="partly-cloudy-day__paint1_linear_1858_8241" x1="64.001" x2="64.001" y1="39" y2="89" gradientUnits="userSpaceOnUse"><stop stop-color="#f3f7fe"/><stop offset="1" stop-color="#e6effc"/></linearGradient><clipPath id="partly-cloudy-day__clip0_1858_8241"><rect width="128" height="128" fill="#fff"/></clipPath></defs></svg>
      
      <svg id="icon-clear-night" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
        <g id="clear-night__clear-night">
          <g id="clear-night__Moon">
            <path id="clear-night__Moon_2" fill="url(#clear-night__moonGradient)" stroke="#72b9d5" stroke-linecap="round" stroke-linejoin="round" d="M60.302 32.582C55.282 53.7 73.6 74.348 95.325 72.515 91.52 85.77 79.2 95.5 64.536 95.5 46.837 95.5 32.5 81.344 32.5 63.898c0-16.03 12.107-29.27 27.802-31.316"/>
          </g>
        </g>
        <defs>
          <linearGradient id="clear-night__moonGradient" x1="64" x2="64" y1="32" y2="96" gradientUnits="userSpaceOnUse">
            <stop stop-color="#86c3db"/>
            <stop offset="1" stop-color="#72b9d5"/>
          </linearGradient>
        </defs>
      </svg>

      <svg id="icon-partly-cloudy-night" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .pcn-none { fill: none; }
            .pcn-moon { fill: url(#partly-cloudy-night__moonGradient); stroke: #72b9d5; stroke-linecap: round; stroke-linejoin: round; }
            .pcn-cloud { fill: url(#partly-cloudy-night__cloudGradient); stroke: #e6effc; stroke-miterlimit: 10; }
            .pcn-clip { clip-path: url(#partly-cloudy-night__clip); }
          </style>
          <clipPath id="partly-cloudy-night__clip">
            <rect class="pcn-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="partly-cloudy-night__moonGradient" x1="54.91" y1="88" x2="54.91" y2="44" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#86c3db"/>
            <stop offset="1" stop-color="#72b9d5"/>
          </linearGradient>
          <linearGradient id="partly-cloudy-night__cloudGradient" x1="69" y1="68.09" x2="69" y2="41.91" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f3f7fe"/>
            <stop offset="1" stop-color="#e6effc"/>
          </linearGradient>
        </defs>
        <g class="pcn-clip">
          <g id="mostly-clear-night__mostly-clear-night">
            <g id="mostly-clear-night__Sky">
              <g id="mostly-clear-night__Moon">
                <path id="mostly-clear-night__Moon_2" class="pcn-moon" d="M52.25,42.59c-3.31,14.61,9.42,28.52,24.07,27.44-2.67,8.94-11.02,15.47-20.95,15.47-12.08,0-21.87-9.67-21.87-21.57,0-10.86,8.15-19.85,18.75-21.34"/>
              </g>
              <g id="mostly-clear-night__Clouds">
                <g id="mostly-clear-night__Cloud">
                  <path id="mostly-clear-night__Cloud_2" class="pcn-cloud" d="M64.65,66.92c2.42-4.02,7.53-5.76,11.85-3.9,4.35,1.87,6.7,6.83,5.58,11.42l-.11.47.48-.02c3.57-.16,6.55,2.86,6.55,6.41s-2.8,6.43-6.27,6.43c-9,0-18,0-26.99,0-3.48,0-6.39-2.81-6.71-6.26-.32-3.46,2.03-6.78,5.45-7.44l.35-.07-.06-.35c-.41-2.43.62-4.96,2.64-6.37,1.99-1.39,4.67-1.47,6.73-.19l.31.19.19-.31Z"/>
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-mostly-cloudy-night" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
        <g id="partly-cloudy-night__partly-cloudy-night" clip-path="url(#partly-cloudy-night__clip0)">
          <g id="partly-cloudy-night__Sky">
            <g id="partly-cloudy-night__Moon">
              <path id="partly-cloudy-night__Moon_2" fill="url(#partly-cloudy-night__moonGradient)" stroke="#72b9d5" stroke-linecap="round" stroke-linejoin="round" d="M35.115 34.595c-1.737 8.568 5.638 16.62 14.198 16.188-1.64 5.05-6.424 8.717-12.095 8.717-7.03 0-12.718-5.621-12.718-12.541 0-6.214 4.588-11.375 10.615-12.364"/>
            </g>
            <g id="partly-cloudy-night__Clouds">
              <g id="partly-cloudy-night__Cloud">
                <path id="partly-cloudy-night__Cloud_2" fill="url(#partly-cloudy-night__cloudGradient)" stroke="#e6effc" stroke-miterlimit="10" d="M55.262 48.475c4.86-7.864 15.035-11.095 23.553-7.532 8.506 3.56 13.323 13.06 11.088 22.022l-.161.65.669-.03c7.01-.306 13.089 5.407 13.089 12.443 0 6.811-5.728 12.472-12.523 12.472H37.954c-6.826.002-12.751-5.33-13.395-12.14-.643-6.808 4.178-13.148 10.884-14.415l.483-.092-.084-.484c-.816-4.745 1.284-9.652 5.263-12.356 3.99-2.712 9.34-2.86 13.475-.373l.423.255z"/>
              </g>
            </g>
          </g>
        </g>
        <defs>
          <linearGradient id="partly-cloudy-night__moonGradient" x1="37" x2="37" y1="34" y2="60" gradientUnits="userSpaceOnUse">
            <stop stop-color="#86c3db"/>
            <stop offset="1" stop-color="#72b9d5"/>
          </linearGradient>
          <linearGradient id="partly-cloudy-night__cloudGradient" x1="64.001" x2="64.001" y1="39" y2="89" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f3f7fe"/>
            <stop offset="1" stop-color="#e6effc"/>
          </linearGradient>
          <clipPath id="partly-cloudy-night__clip0">
            <rect width="128" height="128" fill="#fff"/>
          </clipPath>
        </defs>
      </svg>

      <svg id="icon-overcast" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 128 128">
        <g id="overcast__overcast" clip-path="url(#overcast__clip0)">
          <g id="overcast__Sky">
            <g id="overcast__Clouds">
              <g id="overcast__Secondary Cloud">
                <path id="overcast__Cloud" fill="url(#overcast__cloudDarkGradient)" stroke="#94a3b8" stroke-miterlimit="10" d="M83.84 48.693c2.404-3.735 7.375-5.164 11.478-3.516 4.043 1.624 6.496 6.012 5.392 10.26l-.17.653.675-.029c3.281-.137 6.285 2.404 6.285 5.713 0 3.202-2.831 5.726-6.011 5.726H74.977c-3.21 0-6.132-2.382-6.448-5.593-.315-3.2 2.088-6.066 5.235-6.636l.491-.09-.088-.49c-.394-2.198.645-4.442 2.518-5.664 1.925-1.256 4.492-1.32 6.483-.17l.413.237z"/>
              </g>
              <g id="overcast__Cloud_2">
                <path id="overcast__Cloud_3" fill="url(#overcast__cloudLightGradient)" stroke="#e6effc" stroke-miterlimit="10" d="M55.262 48.475c4.86-7.864 15.035-11.095 23.553-7.532 8.506 3.56 13.323 13.06 11.088 22.022l-.161.65.669-.03c7.01-.306 13.089 5.407 13.089 12.443 0 6.811-5.728 12.472-12.523 12.472H37.954c-6.826.002-12.751-5.33-13.395-12.14-.643-6.808 4.178-13.148 10.884-14.415l.483-.092-.084-.484c-.816-4.745 1.284-9.652 5.263-12.356 3.99-2.712 9.34-2.86 13.475-.373l.423.255z"/>
              </g>
            </g>
          </g>
        </g>
        <defs>
          <linearGradient id="overcast__cloudDarkGradient" x1="88" x2="88" y1="44" y2="68" gradientUnits="userSpaceOnUse">
            <stop stop-color="#b0bccd"/>
            <stop offset="1" stop-color="#94a3b8"/>
          </linearGradient>
          <linearGradient id="overcast__cloudLightGradient" x1="64.001" x2="64.001" y1="39" y2="89" gradientUnits="userSpaceOnUse">
            <stop stop-color="#f3f7fe"/>
            <stop offset="1" stop-color="#e6effc"/>
          </linearGradient>
          <clipPath id="overcast__clip0">
            <rect width="128" height="128" fill="#fff"/>
          </clipPath>
        </defs>
      </svg>     

      <!-- PRECIPITATION -->
      <svg id="icon-snow-and-rain" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .sr-drop {
              stroke: #0a5ad4;
              stroke-linecap: round;
              stroke-width: 4px;
              fill: none;
            }

            .sr-snow {
              fill: #86c3db;
            }

            .sr-clip {
              clip-path: url(#snow-rain__clip);
            }

            .sr-none {
              fill: none;
            }
          </style>
          <clipPath id="snow-rain__clip">
            <rect class="sr-none" width="128" height="128"/>
          </clipPath>
        </defs>
        <g class="sr-clip">
          <g id="snow-rain__sleet">
            <g id="snow-rain__Precipitation">
              <g id="snow-rain__Snowflakes">
                <path id="snow-rain__Snowflake_1" class="sr-snow" d="M52.58,90.37l-1.21-.69c.11-.44.11-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.19.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.1.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M47.87,90.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
                <path id="snow-rain__Snowflake_2" class="sr-snow" d="M67.58,106.37l-1.2-.69c.11-.44.1-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.19.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.1.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M62.87,106.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
                <path id="snow-rain__Snowflake_3" class="sr-snow" d="M82.58,90.37l-1.2-.69c.11-.44.1-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.18.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.11.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M77.87,90.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
              </g>
              <g id="snow-rain__Raindrops">
                <path id="snow-rain__Raindrop_1" class="sr-drop" d="M52,104v3"/>
                <path id="snow-rain__Raindrop_2" class="sr-drop" d="M64,88v3"/>
                <path id="snow-rain__Raindrop_3" class="sr-drop" d="M76,104v3"/>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-snow" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .sn-none {
              fill: none;
            }

            .sn-snow {
              fill: #86c3db;
            }

            .sn-clip {
              clip-path: url(#snow__clip);
            }
          </style>
          <clipPath id="snow__clip">
            <rect class="sn-none" width="128" height="128"/>
          </clipPath>
        </defs>
        <g class="sn-clip">
          <g id="snow__snow">
            <g id="snow__Precipitation">
              <g id="snow__Snowflakes">
                <path id="snow__Snowflake_1" class="sn-snow" d="M52.58,98.37l-1.21-.69c.11-.44.11-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.19.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.1.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M47.87,98.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
                <path id="snow__Snowflake_2" class="sn-snow" d="M67.58,90.37l-1.2-.69c.11-.44.1-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.19.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.1.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M62.87,90.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
                <path id="snow__Snowflake_3" class="sn-snow" d="M82.58,98.37l-1.2-.69c.11-.44.1-.91,0-1.35l1.21-.69c.4-.23.54-.73.31-1.13,0,0,0,0,0-.01-.24-.4-.75-.54-1.15-.31l-1.21.69c-.34-.32-.74-.55-1.18-.68v-1.38c-.02-.46-.39-.82-.84-.82-.46,0-.83.36-.84.82v1.38c-.44.13-.85.36-1.18.67l-1.21-.69c-.41-.23-.92-.09-1.16.32-.05.09-.09.19-.1.3-.04.34.12.67.42.83l1.2.69c-.11.44-.11.91,0,1.35l-1.21.69c-.3.17-.46.5-.42.83.04.34.29.62.62.7.22.06.45.03.64-.08l1.21-.69c.33.32.74.55,1.18.68v1.38c.02.46.39.82.84.82.46,0,.83-.36.84-.82v-1.38c.44-.13.85-.36,1.18-.67l1.21.69c.41.23.92.09,1.16-.31.05-.09.09-.2.1-.3.04-.34-.12-.67-.42-.83M77.87,98.09c-.44-.25-.69-.75-.62-1.25.07-.51.43-.92.93-1.05.49-.13,1.02.04,1.33.44.31.4.35.95.09,1.39-.36.6-1.12.8-1.73.46"/>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-heavy-rain" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .hr-drop {
              stroke: #0a5ad4;
              stroke-linecap: round;
              stroke-width: 4px;
              fill: none;
            }

            .hr-none {
              fill: none;
            }

            .hr-clip {
              clip-path: url(#heavy-rain__clip);
            }
          </style>
          <clipPath id="heavy-rain__clip">
            <rect class="hr-none" width="128" height="128"/>
          </clipPath>
        </defs>
        <g class="hr-clip">
          <g id="rain__rain">
            <g id="rain__Precipitation">
              <g id="rain__Raindrops">
                <path id="rain__Raindrop_1" class="hr-drop" d="M52,91v12"/>
                <path id="rain__Raindrop_2" class="hr-drop" d="M64,83v12"/>
                <path id="rain__Raindrop_3" class="hr-drop" d="M76,91v12"/>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-rain" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .r-drop {
              stroke: #0a5ad4;
              stroke-linecap: round;
              stroke-width: 4px;
              fill: none;
            }

            .r-none {
              fill: none;
            }

            .r-clip {
              clip-path: url(#rain__clip);
            }
          </style>
          <clipPath id="rain__clip">
            <rect class="r-none" width="128" height="128"/>
          </clipPath>
        </defs>
        <g class="r-clip">
          <g id="drizzle__drizzle">
            <g id="drizzle__Precipitation">
              <g id="drizzle__Raindrops">
                <path id="drizzle__Raindrop_1" class="r-drop" d="M52,95v3"/>
                <path id="drizzle__Raindrop_2" class="r-drop" d="M64,87v3"/>
                <path id="drizzle__Raindrop_3" class="r-drop" d="M76,95v3"/>
              </g>
            </g>
          </g>
        </g>
      </svg>

      <!-- STORM -->
      <svg id="icon-light-thunderstorm" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .lt-bolt {
              fill: url(#light-thunderstorm__boltGradient);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .lt-none {
              fill: none;
            }

            .lt-clip {
              clip-path: url(#light-thunderstorm__clip);
            }
          </style>
          <clipPath id="light-thunderstorm__clip">
            <rect class="lt-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="light-thunderstorm__boltGradient" x1="59.81" y1="44.18" x2="68.73" y2="39.06" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f7b23b"/>
            <stop offset="1" stop-color="#f6a823"/>
          </linearGradient>
        </defs>
        <g class="lt-clip">
          <g id="thunderstorms__thunderstorms">
            <g id="thunderstorms__Lightning">
              <path id="thunderstorms__Lightning_Bolt" class="lt-bolt" d="M67.14,79.36l-3.42,6.52-.17.33h5.3l-8.09,10.82,1.59-7.57.06-.27h-3.55l3.43-9.83h4.85Z"/>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-moderate-thunderstorm" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .mt-bolt {
              fill: url(#moderate-thunderstorm__boltGradient);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .mt-none {
              fill: none;
            }

            .mt-clip {
              clip-path: url(#moderate-thunderstorm__clip);
            }
          </style>
          <clipPath id="moderate-thunderstorm__clip">
            <rect class="mt-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="moderate-thunderstorm__boltGradient" x1="54.84" y1="47.1" x2="74.73" y2="35.68" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f7b23b"/>
            <stop offset="1" stop-color="#f6a823"/>
          </linearGradient>
        </defs>
        <g class="mt-clip">
          <g id="thunderstorms__thunderstorms">
            <g id="thunderstorms__Lightning">
              <path id="thunderstorms__Lightning_Bolt" class="mt-bolt" d="M71.17,68.5l-7.62,14.54-.38.73h11.83l-18.05,24.12,3.54-16.88.13-.6h-7.91l7.65-21.91h10.82Z"/>
            </g>
          </g>
        </g>
      </svg>

      <svg id="icon-severe-thunderstorm" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 128 128">
        <defs>
          <style>
            .st-bolt-main {
              fill: url(#severe-thunderstorm__boltGradientMain);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .st-bolt-left {
              fill: url(#severe-thunderstorm__boltGradientLeft);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .st-bolt-right {
              fill: url(#severe-thunderstorm__boltGradientRight);
              stroke: #f6a823;
              stroke-miterlimit: 10;
            }

            .st-none {
              fill: none;
            }

            .st-clip {
              clip-path: url(#severe-thunderstorm__clip);
            }
          </style>
          <clipPath id="severe-thunderstorm__clip">
            <rect class="st-none" width="128" height="128"/>
          </clipPath>
          <linearGradient id="severe-thunderstorm__boltGradientMain" x1="54.84" y1="47.1" x2="74.73" y2="35.68" gradientTransform="translate(0 130) scale(1 -1)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#f7b23b"/>
            <stop offset="1" stop-color="#f6a823"/>
          </linearGradient>
          <linearGradient id="severe-thunderstorm__boltGradientLeft" x1="39.2" y1="43.87" x2="48.12" y2="38.75" xlink:href="#severe-thunderstorm__boltGradientMain"/>
          <linearGradient id="severe-thunderstorm__boltGradientRight" x1="80.31" y1="43.87" x2="89.23" y2="38.75" xlink:href="#severe-thunderstorm__boltGradientMain"/>
        </defs>
        <g class="st-clip">
          <g id="thunderstorms__thunderstorms">
            <g id="thunderstorms__Lightning">
              <path id="thunderstorms__Lightning_Bolt" class="st-bolt-main" d="M71.17,68.5l-7.62,14.54-.38.73h11.83l-18.05,24.12,3.54-16.88.13-.6h-7.91l7.65-21.91h10.82Z"/>
            </g>
          </g>
        </g>
        <g id="thunderstorms__Lightning1">
          <path id="thunderstorms__Lightning_Bolt1" class="st-bolt-right" d="M87.64,79.67l-3.42,6.52-.17.33h5.3l-8.09,10.82,1.59-7.57.06-.27h-3.55l3.43-9.83h4.85Z"/>
        </g>
        <g id="thunderstorms__Lightning2">
          <path id="thunderstorms__Lightning_Bolt2" class="st-bolt-left" d="M46.52,79.67l-3.42,6.52-.17.33h5.3l-8.09,10.82,1.59-7.57.06-.27h-3.55l3.43-9.83h4.85Z"/>
        </g>
      </svg>
    </div>
    
  </div>
`;
  }

  setupEvents() {
    const toggle = this.shadowRoot.getElementById("dayToggle");

    if (toggle) {
      toggle.addEventListener("click", async () => {
        this.dayAmount = this.dayAmount === 3 ? 5 : 3;
        this.selectedDayIndex = 0;
        toggle.textContent = this.dayAmount === 3 ? "3-day Forecast" : "5-day Forecast";

        await this.renderForecast();
        this.renderHourlyDetails(0);
      });
    }

    this.shadowRoot.addEventListener("click", (e) => {
      const card = e.target.closest(".forecast__day");
      if (!card) return;

      this.selectedDayIndex = Number(card.dataset.dayIndex);

      this.renderForecast();
      this.renderHourlyDetails(this.selectedDayIndex);

      const hourlyList = this.shadowRoot.getElementById("hourlyList");
      if (hourlyList) hourlyList.scrollLeft = 0;
    });
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

      output.textContent = `Coordinates: ${this.formatCoordinates(this.latitude, this.longitude)}`;

      const [t2m, rh2m, windSpeed, windDirection, tcc, mtpa, ghi, mtpr, mtsr, storm_idx] = await Promise.all([
        this.getField("t2m"),
        this.getField("rh2m"),
        this.getField("10m_wind_speed"),
        this.getField("10m_wind_direction"),
        this.getField("tcc"),
        this.getField("mtpa"),
        this.getField("ghi"),
        this.getField("mtpr"),
        this.getField("mtsr"),
        this.getField("storm_idx"),
      ]);

      this.weatherData = {
        t2m,
        rh2m,
        windSpeed,
        windDirection,
        tcc,
        mtpa,
        ghi,
        mtpr,
        mtsr,
        storm_idx
      };


      await this.getTemperature();
      await this.getPrecipitation();
      await this.getHumidity();
      await this.getWind();
      await this.getCloudCover();
      await this.renderForecast();
      this.renderHourlyDetails(0);
    } catch (error) {
      output.textContent = `Error: ${error.message}`;
    }
  }

  async renderForecast() {
    const container = this.shadowRoot.getElementById("forecastDays");
    if (!container) return;

    const tempData = this.weatherData?.t2m;
    const days = this.groupForecastByDay(tempData, this.dayAmount);
    console.log(days);
    container.innerHTML = days.map((day, index) => `
      <article class="forecast__day ${index === this.selectedDayIndex ? "forecast__day--selected" : ""}" data-day-index="${index}">
        <p class="forecast__label">${day.label}</p>
        <div class="forecast__icon" id="forecast-icon-${index}"></div>
        <p class="forecast__temp-max">${day.max}°C</p>
        <p class="forecast__temp-min">${day.min}°C</p>
      </article>
    `).join("");

    days.forEach((day, index) => {
      const holder = this.shadowRoot.getElementById(`forecast-icon-${index}`);
      if (!holder) return;

      const weatherState = this.getWeatherState(day.ghi, day.tcc);
      const precipitationState = this.getWeatherPrecipitation(day.precip, day.snowRate);
      const stormState = this.getWeatherStorm(day.isStorm);

      const icon = this.getWeatherIcon(weatherState, precipitationState, stormState);
      holder.replaceChildren(icon);
    });
  }


  renderHourlyDetails(dayIndex = 0) {
    const container = this.shadowRoot.getElementById("hourlyList");
    if (!container || !this.weatherData.t2m) return;

    const days = this.groupHourlyByDay(this.weatherData.t2m, this.dayAmount);
    const day = days[dayIndex];

    if (!day) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      ${day.hours.map(hour => `
        
        <div class="hourly__item">
          <p class="hourly__time">${hour.time}</p>

          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="50" height="50" viewBox="0 0 32 32">
            <path fill="currentColor" d="M 15 3 L 15 8 L 17 8 L 17 3 L 15 3 z M 7.515625 6.1015625 L 6.1015625 7.515625 L 9.6367188 11.050781 L 11.050781 9.6367188 L 7.515625 6.1015625 z M 24.484375 6.1015625 L 20.949219 9.6367188 L 22.363281 11.050781 L 25.898438 7.515625 L 24.484375 6.1015625 z M 16 9 C 12.145849 9 9 12.145852 9 16 C 9 19.854148 12.145849 23 16 23 C 19.854151 23 23 19.854148 23 16 C 23 12.145852 19.854151 9 16 9 z M 16 11 C 18.773271 11 21 13.226731 21 16 C 21 18.773269 18.773271 21 16 21 C 13.226729 21 11 18.773269 11 16 C 11 13.226731 13.226729 11 16 11 z M 3 15 L 3 17 L 8 17 L 8 15 L 3 15 z M 24 15 L 24 17 L 29 17 L 29 15 L 24 15 z M 9.6367188 20.949219 L 6.1015625 24.484375 L 7.515625 25.898438 L 11.050781 22.363281 L 9.6367188 20.949219 z M 22.363281 20.949219 L 20.949219 22.363281 L 24.484375 25.898438 L 25.898438 24.484375 L 22.363281 20.949219 z M 15 24 L 15 29 L 17 29 L 17 24 L 15 24 z"></path>
          </svg>

          <p class="hourly__temp">${Math.round(hour.value)}°C</p>

          <div class="hourly__details">
            <p class="hourly__precipitation">25mm</p>
            <p class="hourly__wind-direction">N</p>
            <p class="hourly__wind-gust">35km/h</p>
            <p class="hourly__wind-speed">25km/h</p>
            <p class="hourly__humidity">54%</p>
          </div>
        </div>
      `).join("")}
    `;
  }

  syncDaySelection() {
    const input = this.shadowRoot.querySelector(`input[name="dayAmount"][value="${this.dayAmount}"]`);
    if (input) input.checked = true;
  }

  getPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  formatCoordinates(lat, lon, decimals = 2) {
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";

    const absLat = Math.abs(lat);
    const absLon = Math.abs(lon);

    return `${absLat.toFixed(decimals)}° ${latDir}, ${absLon.toFixed(decimals)}° ${lonDir}`;
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
      const row = apiData.data[i];

      if (!grouped.has(key)) {
        grouped.set(key, {
          t2m: [],
          ghi: [],
          tcc: [],
          precip: [],
          snowRate: [],
          isStorm: []
        });
      }

      const day = grouped.get(key);
      day.t2m.push(row[0]);
      day.ghi.push(row[1]);
      day.tcc.push(row[2]);
      day.precip.push(row[3]);
      day.snowRate.push(row[4]);
      day.isStorm.push(row[5]);
    });

    return [...grouped.entries()].map(([date, values], i) => ({
      date,
      label: i === 0
        ? "Today"
        : new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      min: Math.round(Math.min(...values.t2m)),
      max: Math.round(Math.max(...values.t2m)),
      t2m: values.t2m,
      ghi: values.ghi,
      tcc: values.tcc,
      precip: values.precip,
      snowRate: values.snowRate,
      isStorm: values.isStorm
    }));
  }


  groupHourlyByDay(apiData, days = this.dayAmount) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + days);

    const grouped = new Map();

    apiData.index.forEach((timestamp, i) => {
      const date = new Date(timestamp);
      if (date < start || date >= end) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const value = apiData.data[i][0];

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push({
        time: date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        }),
        value
      });
    });

    return [...grouped.entries()].map(([dateKey, hours], i) => {
      const values = hours.map(h => h.value);
      return {
        date: dateKey,
        label: i === 0 ? "Today" : new Date(dateKey).toLocaleDateString("en-US", { weekday: "short" }),
        min: Math.round(Math.min(...values)),
        max: Math.round(Math.max(...values)),
        hours
      };
    });
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
  getAverage(list) {
    if (!list.length) return null;
    return list.reduce((acc, value) => acc + value, 0) / list.length;
  }

  getDailyAverage(apiData, days = 1) {
    const filtered = this.filterByDayAmount(apiData, days);
    return this.getAverage(filtered);
  }
  

  // returns the [min, max] of a given list
  // getMinMax(apiData) {
  //   if (!apiData || !apiData.data || !apiData.data.length) return [null, null];
  //   console.log(apiData);
  //   let min = apiData.data[0][0];
  //   let max = apiData.data[0][0];

  //   for (let i = 1; i < apiData.data.length; i++) {
  //     const value = apiData.data[i][0];
  //     if (value < min) min = value;
  //     if (value > max) max = value;
  //   }
  //   console.log(min);
  //   return [min, max];
  // }

  // returns min and max for a given list of numbers
  getMinMaxFromList(values) {
    if (!values || !values.length) return [null, null];

    let min = values[0];
    let max = values[0];

    for (let i = 1; i < values.length; i++) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }

    return [min, max];
  }

  msToKmh(value) {
    return value * 3.6;
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
    const data = this.weatherData?.t2m;
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

  async getPrecipitation() {
    const data = this.weatherData?.mtpa;
    const currentDayData = this.filterByDayAmount(data, 1);
    console.log(currentDayData);

    if (!currentDayData.length) {
      this.shadowRoot.getElementById("current-precipitation").textContent = "No data";
      return null;
    }

    const precip = currentDayData[currentDayData.length-1];
    this.shadowRoot.getElementById("current-precipitation").textContent =
      `${Math.round(precip * 10) / 10}mm`;

    return precip;
  }

  async getHumidity() {
    const data = this.weatherData?.rh2m;
    const currentHourData = this.filterByCurrentHour(data);

    if (!currentHourData.length) {
      this.shadowRoot.getElementById("humidity").textContent = "No data";
      return null;
    }

    // const humidity = currentHourData[0];
    // const minmax = this.getMinMaxFromList(this.filterByDayAmount(data, 1));
    // this.shadowRoot.getElementById("humidity").textContent =
    //   `${Math.round(humidity)}%`;

    // this.shadowRoot.getElementById("minmax-humidity").textContent =
    //   `${Math.round(minmax[0])}-${Math.round(minmax[1])}%`;
    // return humidity;
  }

  async getWind() {
    const windSpeedData = this.weatherData?.windSpeed;
    const windDirectionData = this.weatherData?.windDirection;

    const dailyAverageSpeed = this.getDailyAverage(windSpeedData);
    const currentHourDirection = this.filterByCurrentHour(windDirectionData);

    if (!dailyAverageSpeed) {
      this.shadowRoot.getElementById("windSpeed").textContent = "No data";
      return null;
    }

    const windSpeed = this.msToKmh(dailyAverageSpeed);
    const windDirection = currentHourDirection.length ? this.degreesToCardinal(currentHourDirection[0]) : null;

    this.shadowRoot.getElementById("current-wind").textContent =
      `${Math.round(windSpeed * 10) / 10} km/h ${windDirection}`;

    // this.shadowRoot.getElementById("windSpeed").textContent =
    //   `${Math.round(windSpeed * 10) / 10} km/h ${windDirection}`;
    
    // const minmax = this.getMinMaxFromList(this.filterByDayAmount(windSpeedData, 1));
    // this.shadowRoot.getElementById("minmax-windSpeed").textContent =
    //   `${Math.round(minmax[0] * 10) / 10}-${Math.round(minmax[1] * 10) / 10}m/s`;
    return {
      speed: windSpeed,
      direction: windDirection
    };
  }

  async getCloudCover() {
    const data = this.weatherData?.tcc;
    const currentHourData = this.filterByCurrentHour(data);

    if (!currentHourData.length) {
      this.shadowRoot.getElementById("cloudCover").textContent = "No data";
      return null;
    }

    const cloud = currentHourData[0];
    // this.shadowRoot.getElementById("cloudCover").textContent =
    //   `${Math.round(cloud * 100)}%`;

    // const minmax = this.getMinMaxFromList(this.filterByDayAmount(data, 1));
    // this.shadowRoot.getElementById("minmax-cloudCover").textContent =
    //   `${Math.round(minmax[0] * 100)}-${Math.round(minmax[1] * 100)}%`;
    return cloud;
  }

  getWeatherState(ghi, tcc) {
    const cloud = tcc * 100;

    if (ghi > 0) {
      if (cloud < 10) return "sunny";
      if (cloud <= 30) return "partly-cloudy";
      if (cloud <= 80) return "mostly-cloudy";
      return "overcast";
    } else {
      if (cloud < 10) return "clear-night";
      if (cloud <= 30) return "partly-cloudy-night";
      if (cloud <= 80) return "mostly-cloudy-night";
      return "overcast";
    }
  }
    
  getWeatherPrecipitation(mtpr, mtsr) {
    const hasRain = mtpr > 0.2;
    const hasHeavyRain = mtpr > 5;
    const hasSnow = mtsr > 0.2;

    if (hasRain && hasSnow) return "snow-and-rain";
    if (hasSnow) return "snow";
    if (hasHeavyRain) return "heavy-rain";
    if (hasRain) return "rain";
    return null;
  }

  getWeatherStorm(storm_idx) {
    const storms = {
      1: "light-thunderstorm",
      2: "moderate-thunderstorm",
      3: "severe-thunderstorm"
    };

    return storms[storm_idx] ?? null;
  }

  getWeatherIcon(weatherState, precipitationState, stormState) {
    console.log(weatherState);
    console.log(precipitationState);
    console.log(stormState);
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 50 50");
    svg.setAttribute("class", "weather-icon");

    const layers = [];

    if (weatherState) {
      const sky = this.shadowRoot.getElementById(`icon-${weatherState}`);
      if (sky) layers.push(sky.cloneNode(true));
    }

    if (precipitationState) {
      const precip = this.shadowRoot.getElementById(`icon-${precipitationState}`);
      if (precip) layers.push(precip.cloneNode(true));
    }

    if (stormState) {
      const storm = this.shadowRoot.getElementById(`icon-${stormState}`);
      if (storm) layers.push(storm.cloneNode(true));
    }

    layers.forEach(layer => svg.appendChild(layer));
    return svg;
  }
}

customElements.define("weather-widget", WeatherWidget);