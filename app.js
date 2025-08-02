const apiKey = "bf5cc53d9910071a5f1386e2e4371f37";

const countries = {
  CO: {
    name: "Colombia",
    cities: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga"]
  },
  MX: {
    name: "México",
    cities: ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "Cancún"]
  },
  AR: {
    name: "Argentina",
    cities: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata", "San Miguel de Tucumán"]
  },
  BR: {
    name: "Brasil",
    cities: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte"]
  },
  CL: {
    name: "Chile",
    cities: ["Santiago", "Valparaíso", "Concepción", "La Serena", "Antofagasta", "Temuco"]
  },
  PE: {
    name: "Perú",
    cities: ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Cusco"]
  },
  EC: {
    name: "Ecuador",
    cities: ["Quito", "Guayaquil", "Cuenca", "Ambato", "Manta", "Loja"]
  }
};
const flags = {
  CO: "🇨🇴", MX: "🇲🇽", AR: "🇦🇷", BR: "🇧🇷", CL: "🇨🇱", PE: "🇵🇪", EC: "🇪🇨"
};
let comparisonMode = false;
let citiesToCompare = [];

// Mapa
let map; // para mantener referencia global al mapa
let marker; // para actualizar el punto

// Busqueda
const cityInput = document.getElementById('city-input');
const searchButton = document.getElementById('search-button');
const clearIcon = document.getElementById('clear-icon');

const countryContainer = document.querySelector('.country-selector'); // Contenedor Paises
const citiesContainer = document.querySelector('.cities-container');
let relojInterval; // Contenedor Ciudad

// Mostrar hora pais
function mostrarHoraPorTimezone(nombreCiudad, timezoneOffset) {
    clearInterval(relojInterval); // Detenemos el anterior si existe

    const ciudadNombre = document.querySelector('.ciudad-nombre');
    const horaTexto = document.querySelector('.hora-local');

    ciudadNombre.textContent = 'Hora local';
    ciudadNombre.classList.add('titulo-hora')

    const actualizarHora = () => {
        const nowUTC = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
        const horaLocal = new Date(nowUTC + timezoneOffset * 1000);

        horaTexto.textContent = `🕒 ${horaLocal.toLocaleTimeString('es-CO', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace('a. m.', 'AM').replace('p. m.', 'PM')}`;
    };

    actualizarHora(); // Muestra inmediatamente
    relojInterval = setInterval(actualizarHora, 1000); // Actualiza cada segundo
}

// Mayuscula
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

window.addEventListener('DOMContentLoaded', () => {
  renderCountryButtons();
  loadWeatherCards("CO"); // <- AQUÍ
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        obtenerClimaPorCoordenadas(latitude, longitude);
      },
      (error) => {
        console.warn("Ubicación no permitida o no disponible:", error.message);
        loadWeatherCards("CO"); // <- Y TAMBIÉN AQUÍ
      }
    );
  } else {
    loadWeatherCards("CO"); // <- Y TAMBIÉN AQUÍ
  }
});

// Renderizar botones de los paises
function renderCountryButtons() {
  Object.entries(countries).forEach(([code, data]) => {
    const btn = document.createElement('button');
    btn.textContent = `${flags[code]} | ${data.name}`;
    btn.addEventListener('click', () => {
      citiesContainer.innerHTML = ""; // Limpiar clima anterior
      loadWeatherCards(code);
    });
    countryContainer.appendChild(btn);
  });
}

// Cargar las cards
function loadWeatherCards(countryCode) {
    const selected = countries[countryCode];
     if (!selected) return;

    selected.cities.forEach((city, index) => {
        getCityWeather(city, countryCode, index === 0); // true si es la primera
    });
}

// OBtener las ciudades
async function getCityWeather(city, countryCode, isFirst = false, isSearch = false) {
  const code = countryCode || '';
  const key = `${city.trim()},${code}`.toLowerCase();
  const cityKey = encodeURIComponent(key);

  // Evita duplicados
  if (citiesContainer.querySelector(`[data-city="${cityKey}"]`)) return;

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${encodeURIComponent(code)}&appid=${apiKey}&units=metric&lang=es`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} - ${res.statusText}`);

    const data = await res.json();
    if (data.cod !== 200 && data.cod !== "200") return;

     const iconClass = data.weather[0].main.toLowerCase().includes("rain") ? "weather-icon rainy-icon" : "weather-icon";

    if (isFirst) {
      mostrarHoraPorTimezone(data.name, data.timezone);
    }

    // Limpia si es búsqueda
    if (isSearch) {
      citiesContainer.innerHTML = ''; // Limpia tarjetas anteriores
    }

    const card = document.createElement('div');
    card.className = 'weather-card';
    card.setAttribute('data-city', cityKey);
    card.innerHTML = `
      <h3 class="title-card">${data.name}</h3>
      <p class="description">${capitalize(data.weather[0].description)}</p>
      <img class="${iconClass}" src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="icono">
      <p class="grados">${Math.round(data.main.temp)} °C</p>
    `;
    card.addEventListener('click', () => onCityClick(data.name, data.sys.country));
    citiesContainer.appendChild(card);

  } catch (err) {
    console.error(`Error con ${cityKey}:`, err);
  }
}

// Obtener pronosticos de los 5 dias de la ciudad
async function get5DayForecast(city, countryCode) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city},${countryCode}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Agrupar por días a las 12:00:00
        const dailyForecast = data.list.filter(entry => entry.dt_txt.includes("12:00:00"));
        return dailyForecast;

    } catch (error) {
        console.error('Error al obtener el pronóstico:', error);
        return [];
    }
}

// Mostrar tarjetas del pronóstico
function renderForecast(forecastList) {
    const container = document.querySelector('.forecast-container');
    container.innerHTML = ''; // Limpiar antes de agregar

    forecastList.forEach(item => {
        const date = new Date(item.dt_txt);
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
        const iconUrl = `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;

        const card = document.createElement('div');
        card.classList.add('forecast-card');
        card.innerHTML = `
            <h4>${dayName}</h4>
            <img src="${iconUrl}" alt="${item.weather[0].description}" />
            <p>${item.main.temp.toFixed(1)} °C</p>
            <small>${item.weather[0].description}</small>
        `;

        container.appendChild(card);
    });
}

// Conectar al hacer clic en una ciudad
function onCityClick(city, countryCode) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city},${countryCode}&appid=${apiKey}&units=metric&lang=es`;

  fetch(forecastUrl)
    .then(res => res.json())
    .then(data => {
        mostrarHoraPorTimezone(data.city.name, data.city.timezone);
        const forecastOverlay = document.querySelector('.forecast-overlay');
        const forecastTitle = document.querySelector('.forecast-title');
        const forecastCards = document.querySelector('.forecast-cards');

        forecastCards.innerHTML = '';
        forecastTitle.textContent = `Pronóstico para ${city}`;
        forecastTitle.classList.add('libertinus');
        forecastTitle.style.fontSize = '17px';

        // Filtrar para mostrar 1 pronóstico por día (ej. 12:00)
        const dailyForecasts = data.list.filter(item => item.dt_txt.includes('12:00:00'));

        dailyForecasts.forEach(day => {
            const fecha = new Date(day.dt_txt);
            const diaSemana = fecha.toLocaleDateString('es-CO', { weekday: 'short' }).toUpperCase(); // "DOM"
            const diaNumero = fecha.getDate(); // 8
            const mes = fecha.toLocaleDateString('es-CO', { month: 'short' }).toUpperCase(); // "AGO"

            const fechaFormateada = `${diaSemana}, ${diaNumero} ${mes}`;

            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <strong><p class="libertinus negro">${fechaFormateada}</p></strong>
                <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="">
                <strong><p class="negro">${day.main.temp}°C</p></strong>
                <p class="gris">${capitalize(day.weather[0].description)}</p>
            `;
            forecastCards.appendChild(card);
        });

        // Mostrar modal con animación
        forecastOverlay.classList.add('show');
    })
    .catch(err => console.error('Error al obtener pronóstico:', err));
}

// Cerrar modal
document.querySelector('.close-forecast').addEventListener('click', () => {
  document.querySelector('.forecast-overlay').classList.remove('show');
});

// Obtener clima por coordenadas
async function obtenerClimaPorCoordenadas(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=es`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.cod !== 200) throw new Error(data.message);

    // Mostrar modal con la información de ubicación
    mostrarModalUbicacion(data);

    // Guardamos temporalmente la data para usarla al aceptar
    window.userLocationData = data;

  } catch (error) {
    console.error("Error al obtener clima por ubicación:", error);
  }
}

// Mostrar el modal anterior
function mostrarModalUbicacion(data) {
    const modal = document.querySelector('.modal-ubicacion');
    const titulo = modal.querySelector('.modal-titulo');
    const descripcion = modal.querySelector('.modal-descripcion');
    const hora = modal.querySelector('.modal-hora');

    const ciudad = data.name;
    const pais = data.sys.country;
    const temp = data.main.temp.toFixed(1);
    const desc = capitalize(data.weather[0].description);

    mostrarHoraPorTimezone(data.name, data.timezone);

    titulo.textContent = `📍 Estás en ${ciudad}, ${pais}`;
    titulo.classList.add('negro');
    titulo.classList.add('libertinus');
    descripcion.textContent = `☁️ ${desc} | 🌡️ ${temp}°C`;
    descripcion.classList.add('gris')
    hora.textContent = document.querySelector('.hora-local').textContent;
    hora.classList.add('gris')
    modal.classList.add('show');
}

// Cerrar modal
document.querySelector('.aceptar-modal').addEventListener('click', () => {
  document.querySelector('.modal-ubicacion').classList.remove('show');
});
document.querySelector('.cerrar-modal').addEventListener('click', () => {
  document.querySelector('.modal-ubicacion').classList.remove('show');
});

// Busqueda
searchButton.addEventListener('click', runSearch);
cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') runSearch(e);
});
async function runSearch(e) {
  e.preventDefault();
  const raw = cityInput.value.trim();
  if (!raw) return;
  cityInput.value = '';
  const cityName = raw.replace(/,/g, '').slice(0, 50);
  await getCityWeather(cityName, '', false, true); // <-- importante: true para isSearch
}
cityInput.addEventListener('input', () => {
  // Capitaliza automáticamente la primera letra mientras escribe
  cityInput.value = capitalize(cityInput.value);

  clearIcon.style.display = cityInput.value ? 'block' : 'none';
});
clearIcon.addEventListener('click', () => {
  cityInput.value = '';
  clearIcon.style.display = 'none';
  citiesContainer.innerHTML = '';
  loadWeatherCards("CO"); // <- AQUÍ
});





