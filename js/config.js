let Config = {
  config: {
    proxyString: "",
    customDomains: [],
    domains: [],
    getAllDomains() {
      return this.domains.concat(this.customDomains);
    },
  },
  loadCustomDomains: async function () {
    const url = chrome.runtime.getURL("data/customDomains.json");
    const response = await fetch(url);
    const json = await response.json();
    this.config.customDomains = json.domains;
  },
  updateConfig: function (newConfig) {
    if (newConfig.domains)
      this.config.domains = newConfig.domains;

    if (newConfig.customDomains)
      this.config.customDomains = newConfig.domains;

    if (newConfig.proxyString)
      this.config.proxyString = newConfig.proxyString;

    if (newConfig.proxy_string)
      this.config.proxyString = newConfig.proxy_string;

    if (newConfig.proxy_reserve)
      this.config.proxyReserve = newConfig.proxy_reserve;
  },
  downloadAndUpdateAsync: async function () {
    try {
      this.updateConfig(await this.downloadAsync());
      return true;
    } catch {
      return false;
    }
  },
  loadFromStorageAndUpdateAsync: async function () {
    try {
      this.update(await this.loadFromStorageAsync());
      return true
    } catch {
      return false;
    }
  },
  downloadAsync: async function () {
    const url = ConfigUrlResolver.getConfigUrl();
    const response = await fetch(url);
    return await response.json();
  },
  loadFromStorageAsync: async function () {
    try {
      return await Storage.getConfig();
    } catch {
      throw "Config not found in storage";
    }
  },
  saveToStorageAsync: async function () {
    await Storage.setConfig({
      proxyString: this.config.proxyString,
      domains: this.config.domains
    });
  },
};