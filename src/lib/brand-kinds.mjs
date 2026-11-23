// Brands page filter: which entries of the brands index are Home Assistant integrations (software, services,
// protocols, add-ons, a maker's own integration such as "Viessmann ViCare") rather than brands (makers, carmakers,
// operators, transport networks, companies). Ids as on the brands page (brands.ts brandId). An entry not listed is
// a brand: a new logo in a README shows as a brand until its id is added here.
// Plain module, unit-tested in test/brand-kinds.test.mjs.
export const INTEGRATIONS = new Set([
  "adguard-home", "alarmo", "alexa-devices", "alexa-media-player", "android-tv", "anniversaries", "anylist",
  "apc-ups-daemon", "apex-fusion-local", "apple-find-my", "apsystems-ecu-reader", "atlantic-cozytouch", "auto-backup",
  "backrest", "bermuda-ble", "blitzortung", "bosch-indego", "bring", "caldav", "certificate-expiry", "cookidoo",
  "daikin-onecta", "deconz", "deluge", "dns-ip", "dockhand", "donetick", "duplicati", "duplicati-monitor",
  "dwd-weather-warnings", "edf-tempo", "emby", "enphase-envoy", "esphome", "esphome-toug", "fast-com",
  "flightradar24", "forecast-solar", "fox-ess-modbus", "freebox-player", "frigate", "gazpar", "google-air-quality",
  "google-calendar", "google-cast", "google-family-link", "google-find-my-device", "google-generative-ai",
  "google-tasks", "grocy", "ha-linky", "habitica", "hass-agent", "healthchecks-io", "heos", "holiday",
  "home-assistant", "home-assistant-companion-app", "homekit", "homekit-device", "huawei-solar", "hunter-hydrawise",
  "ibeacon", "icloud", "iperf3", "jellyfin", "kitchenowl", "knx", "kodi", "lg-webos-tv", "linky-tic", "lnxlink",
  "local-calendar", "local-tuya", "localthings", "lunar-phase", "matter", "mealie", "melcloud", "met-no", "meteoalarm",
  "meteorologisk-institutt-met-no", "modbus", "monitor-docker", "moon", "moonraker", "mqtt", "music-assistant",
  "myelectricaldata", "myuplink", "myvaillant", "network-ups-tools", "nginx-proxy-manager", "nws-alerts", "octoprint",
  "ollama", "onedrive-backup", "ookla-speedtest", "open-charge-alliance-ocpp", "open-meteo-solar-forecast",
  "openuv", "openweathermap", "opentherm-gateway", "openwrt", "opnsense", "ourgroceries", "overkiz",
  "panasonic-aquarea", "pentair-intellicenter", "pentair-screenlogic", "pfsense", "philips-tv", "pi-hole", "ping",
  "plex", "portainer", "proxmox-ve", "prusalink", "public-transport", "qbittorrent", "radarr", "lidarr", "sonarr",
  "reef-pi", "remember-the-milk", "remote-calendar", "rika-firenet", "samba-backup", "samsung-tv", "season", "seerr",
  "smartthings", "snmp", "solar-optimizer", "solaredge-optimizers", "solcast-pv-forecast", "somfy-mylink",
  "speedtest-net", "speedtest-tracker", "squeezebox", "sun", "system-bridge", "tasmota", "tautulli", "teamtracker",
  "technitium-dns", "todoist", "traccar", "traefik", "transmission", "ubiquiti-unifi", "unifi-protect", "uptime-kuma",
  "viessmann-vicare", "waqi", "waste-collection-schedule", "whois", "wled", "workday", "worx-landroid", "xiaomi-home",
  "xiaomi-mi-home", "xiaomi-miio", "yahoo-finance", "z-wave", "zehnder-comfoconnect", "zha", "zigbee",
  "zigbee-home-automation", "zigbee2mqtt", "zoraxy",
]);

/** "integration" for a Home Assistant integration, "brand" otherwise. */
export const brandKind = (id) => (INTEGRATIONS.has(id) ? "integration" : "brand");
