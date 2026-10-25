/* Voiceoftaade site-wide automatic appearance.
   Uses the device colour preference everywhere, and ambient light only when the browser
   explicitly supports AmbientLightSensor. Sensor access is optional and failure-safe. */
(() => {
  const root = document.documentElement;
  const preference = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let ambientSensorWorking = false;
  let lastAmbientTheme = null;

  function applyTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#07172b' : '#f5f0e5');
  }
  function useDevicePreference() {
    if (!ambientSensorWorking) applyTheme(preference && preference.matches ? 'dark' : 'light');
  }

  useDevicePreference();
  if (preference) {
    const onPreferenceChange = () => useDevicePreference();
    if (preference.addEventListener) preference.addEventListener('change', onPreferenceChange);
    else if (preference.addListener) preference.addListener(onPreferenceChange);
  }

  // AmbientLightSensor is experimental and unavailable in many browsers.
  // Use hysteresis to avoid rapid theme flicker around a brightness threshold.
  if ('AmbientLightSensor' in window) {
    try {
      const sensor = new window.AmbientLightSensor({ frequency: 1 });
      sensor.addEventListener('reading', () => {
        const lux = Number(sensor.illuminance);
        if (!Number.isFinite(lux)) return;
        let theme = lastAmbientTheme;
        if (lux < 30) theme = 'dark';
        else if (lux > 80) theme = 'light';
        if (theme) {
          lastAmbientTheme = theme;
          ambientSensorWorking = true;
          applyTheme(theme);
        }
      });
      sensor.addEventListener('error', () => {
        ambientSensorWorking = false;
        useDevicePreference();
      });
      sensor.start();
    } catch (_) {
      // Sensor unavailable, permission blocked, or browser policy disallows it.
      // The site still automatically follows the system light/dark preference.
    }
  }
})();
