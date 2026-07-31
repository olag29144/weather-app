const statusPill = document.getElementById('status-pill');
const cityInput = document.getElementById('city-input');
const searchForm = document.getElementById('search-form');
const cityNameEl = document.getElementById('city-name');
const updatedTimeEl = document.getElementById('updated-time');
const weatherIconEl = document.getElementById('weather-icon');
const tempEl = document.getElementById('temp');
const conditionEl = document.getElementById('condition');
const summaryEl = document.getElementById('summary');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const precipitationEl = document.getElementById('precipitation');
const forecastListEl = document.getElementById('forecast-list');

const API_KEY = '664c3373b9efe20726cf707e9bfa2113';

searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = cityInput.value.trim();
    if (!query) return;
    await loadWeatherByCity(query);
});

// Small helper: fetch + throw a *useful* error if the response isn't OK
async function fetchJson(url, context) {
    let response;
    try {
        response = await fetch(url);
    } catch (networkErr) {
        // fetch() itself only throws on network-level failures (no internet,
        // DNS failure, CORS block, mixed-content block, etc.)
        throw new Error(`Network error while ${context}: ${networkErr.message}`);
    }

    let data;
    try {
        data = await response.json();
    } catch (parseErr) {
        throw new Error(`Could not parse response while ${context} (status ${response.status})`);
    }

    if (!response.ok) {
        // OWM error payloads look like { cod: 401, message: "Invalid API key..." }
        const apiMessage = data?.message || `HTTP ${response.status}`;
        if (response.status === 401) {
            throw new Error(`API key rejected while ${context}: ${apiMessage}. New OWM keys can take up to ~2 hours to activate — double check the key is correct and active.`);
        }
        if (response.status === 429) {
            throw new Error(`Rate limit hit while ${context}: ${apiMessage}`);
        }
        if (response.status === 404) {
            throw new Error(`Not found while ${context}: ${apiMessage}`);
        }
        throw new Error(`Error while ${context} (status ${response.status}): ${apiMessage}`);
    }

    return data;
}

async function loadWeatherByCity(query) {
    setStatus('Searching…');

    try {
        const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`;
        const geocodeData = await fetchJson(geocodeUrl, 'looking up city');

        if (!Array.isArray(geocodeData) || geocodeData.length === 0) {
            throw new Error('City not found. Try another name.');
        }

        const place = geocodeData[0];

        await loadWeather(
            place.lat,
            place.lon,
            place.name,
            place.country
        );

    } catch (error) {
        setStatus(error.message);
        console.error('[loadWeatherByCity]', error);
    }
}

async function loadWeather(lat, lon, cityName, countryName) {
    setStatus('Updating forecast…');

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;

    try {
        const [currentData, forecastData] = await Promise.all([
            fetchJson(currentUrl, 'fetching current weather'),
            fetchJson(forecastUrl, 'fetching forecast')
        ]);

        renderWeather(
            {
                current: currentData,
                forecast: forecastData
            },
            cityName,
            countryName
        );

        setStatus('Live forecast ready');

    } catch (error) {
        setStatus(error.message || 'Unable to fetch weather right now');
        console.error('[loadWeather]', error);
    }
}

function renderWeather(data, cityName, countryName) {
    const current = data.current;
    const forecast = data.forecast;
    const date = new Date();

    const currentWeatherCode = current.weather[0].id;
    const currentCondition = current.weather[0].description;

    cityNameEl.textContent = countryName ? `${cityName}, ${countryName}` : cityName;

    updatedTimeEl.textContent = `Updated ${date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
    })}`;

    tempEl.textContent = `${Math.round(current.main.temp)}°`;

    conditionEl.textContent = getWeatherLabel(currentWeatherCode);

    weatherIconEl.innerHTML = `<i class="${getWeatherIcon(currentWeatherCode)}"></i>`;

    const precipitation = current.rain?.['1h'] || current.snow?.['1h'] || 0;

    summaryEl.textContent =
        `Expect ${currentCondition.toLowerCase()} with ${precipitation} mm of precipitation.`;

    feelsLikeEl.textContent = `${Math.round(current.main.feels_like)}°`;

    humidityEl.textContent = `${Math.round(current.main.humidity)}%`;

    windEl.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;

    precipitationEl.textContent = `${precipitation} mm`;

    renderForecast(forecast);
}

function renderForecast(forecast) {
    const dailyForecast = {};

    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString();

        if (!dailyForecast[dateKey]) {
            dailyForecast[dateKey] = [];
        }

        dailyForecast[dateKey].push(item);
    });

    const days = Object.values(dailyForecast).slice(0, 5);

    forecastListEl.innerHTML = days.map((day, index) => {

        const temperatures = day.map(item => item.main.temp);

        const high = Math.round(Math.max(...temperatures));
        const low = Math.round(Math.min(...temperatures));

        const weatherItem = day[Math.floor(day.length / 2)];

        const code = weatherItem.weather[0].id;

        const dayName = index === 0
            ? 'Today'
            : new Date(weatherItem.dt * 1000).toLocaleDateString([], {
                weekday: 'short'
            });

        return `
            <article class="forecast-card">
                <div class="day">${dayName}</div>
                <div class="icon">
                    <i class="${getWeatherIcon(code)}"></i>
                </div>
                <div>${getWeatherLabel(code)}</div>
                <div class="range">${high}° / ${low}°</div>
            </article>
        `;
    }).join('');
}

function getWeatherLabel(code) {
    if (code >= 200 && code < 300) return 'Thunderstorm';
    if (code >= 300 && code < 400) return 'Drizzle';
    if (code >= 500 && code < 600) return 'Rain';
    if (code >= 600 && code < 700) return 'Snow';
    if (code >= 700 && code < 800) return 'Fog';
    if (code === 800) return 'Clear sky';
    if (code > 800 && code < 900) return 'Cloudy';
    return 'Weather update';
}

function getWeatherIcon(code) {
    if (code === 800) return 'fa-solid fa-sun';
    if (code === 801 || code === 802) return 'fa-solid fa-cloud-sun';
    if (code === 803 || code === 804) return 'fa-solid fa-cloud';
    if (code >= 200 && code < 300) return 'fa-solid fa-bolt';
    if (code >= 300 && code < 400) return 'fa-solid fa-cloud-rain';
    if (code >= 500 && code < 600) return 'fa-solid fa-cloud-rain';
    if (code >= 600 && code < 700) return 'fa-solid fa-snowflake';
    if (code >= 700 && code < 800) return 'fa-solid fa-smog';
    return 'fa-solid fa-cloud';
}

function setStatus(message) {
    statusPill.innerHTML = `<i class="fa-solid fa-satellite-dish"></i><span>${message}</span>`;
}

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            loadWeather(
                position.coords.latitude,
                position.coords.longitude,
                'Your location',
                ''
            );
        },
        (geoError) => {
            console.warn('Geolocation denied/unavailable, falling back to London:', geoError.message);
            loadWeatherByCity('London');
        }
    );
} else {
    loadWeatherByCity('London');
}