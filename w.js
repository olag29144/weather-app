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

searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = cityInput.value.trim();
    if (!query) return;
    await loadWeatherByCity(query);
});

async function loadWeatherByCity(query) {
    setStatus('Searching…');
    try {
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();

        if (!geocodeData.results || geocodeData.results.length === 0) {
            throw new Error('City not found. Try another name.');
        }

        const place = geocodeData.results[0];
        await loadWeather(place.latitude, place.longitude, place.name, place.country);
    } catch (error) {
        setStatus(error.message);
        console.error(error);
    }
}

async function loadWeather(lat, lon, cityName, countryName) {
    setStatus('Updating forecast…');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        renderWeather(data, cityName, countryName);
        setStatus('Live forecast ready');
    } catch (error) {
        setStatus('Unable to fetch weather right now');
        console.error(error);
    }
}

function renderWeather(data, cityName, countryName) {
    const current = data.current;
    const daily = data.daily;
    const date = new Date();

    cityNameEl.textContent = `${cityName}, ${countryName}`;
    updatedTimeEl.textContent = `Updated ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    tempEl.textContent = `${Math.round(current.temperature_2m)}°`;
    conditionEl.textContent = getWeatherLabel(current.weather_code);
    weatherIconEl.innerHTML = `<i class="${getWeatherIcon(current.weather_code)}"></i>`;
    summaryEl.textContent = `Expect ${getWeatherLabel(current.weather_code).toLowerCase()} with ${current.precipitation} mm of precipitation.`;
    feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}°`;
    humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    windEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
    precipitationEl.textContent = `${current.precipitation} mm`;

    forecastListEl.innerHTML = daily.time.slice(0, 5).map((day, index) => {
        const dayName = new Date(day).toLocaleDateString([], { weekday: 'short' });
        const code = daily.weather_code[index];
        const high = Math.round(daily.temperature_2m_max[index]);
        const low = Math.round(daily.temperature_2m_min[index]);
        return `
            <article class="forecast-card">
                <div class="day">${dayName}</div>
                <div class="icon"><i class="${getWeatherIcon(code)}"></i></div>
                <div>${getWeatherLabel(code)}</div>
                <div class="range">${high}° / ${low}°</div>
            </article>
        `;
    }).join('');
}

function getWeatherLabel(code) {
    const weatherMap = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Rime fog',
        51: 'Light drizzle',
        53: 'Drizzle',
        55: 'Dense drizzle',
        61: 'Light rain',
        63: 'Rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Snow',
        75: 'Heavy snow',
        80: 'Rain showers',
        81: 'Heavy showers',
        85: 'Snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Severe thunderstorm',
    };
    return weatherMap[code] || 'Weather update';
}

function getWeatherIcon(code) {
    if (code === 0 || code === 1) return 'fa-solid fa-sun';
    if (code >= 2 && code <= 3) return 'fa-solid fa-cloud';
    if (code >= 45 && code <= 48) return 'fa-solid fa-smog';
    if (code >= 51 && code <= 65) return 'fa-solid fa-cloud-rain';
    if (code >= 71 && code <= 85) return 'fa-solid fa-snowflake';
    if (code >= 95) return 'fa-solid fa-bolt';
    return 'fa-solid fa-cloud';
}

function setStatus(message) {
    statusPill.innerHTML = `<i class="fa-solid fa-satellite-dish"></i><span>${message}</span>`;
}

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            loadWeather(position.coords.latitude, position.coords.longitude, 'Your location', '');
        },
        () => {
            loadWeatherByCity('London');
        }
    );
} else {
    loadWeatherByCity('London');
}
