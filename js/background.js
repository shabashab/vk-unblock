let App = {
  cachedUid: null,
  config: {
    proxyString: "",
    customDomains: [],
    domains: [],
    getAllDomains() {
      return this.domains.concat(this.customDomains);
    }
  },
  mainProxyUrl: "https://vk.com/",
  failedProxy: {},
  triedProxy: {},
  reservedTry: false,
  getVpnCfgDomain: function () {
    return "https://check.proxy-config.com/";
  },
  getCfgUrl: function () {
    let fileName = "configg.json";
    return this.getVpnCfgDomain() + fileName;
  },
  proxy: {
    scope: "regular",
    apply: async function (checkDomain) {
      await this.clearProxySettings();
      const settings = await this.getProxySettings();
      await this.setProxySettings(settings);

      const connectivityStatus = await App.checkConnect({url: checkDomain});
      App.loadReserve();

      return connectivityStatus;
    },
    setProxySettings: async function (value) {
      return new Promise((resolve) => {
        chrome.proxy.settings.set(
          {
            value: value,
            scope: this.scope
          },
          () => resolve()
        )
      });
    },
    clearProxySettings: async function () {
      return new Promise((resolve) =>
        chrome.proxy.settings.clear(
          {
            scope: this.scope,
          },
          () => resolve()
        )
      );
    },
    getProxySettings: async function () {
      const scriptUrl = chrome.runtime.getURL("data/pacScript.pac");

      const proxyString = App.proxyString;
      const domains = JSON.stringify(App.config.getAllDomains());

      const response = await fetch(scriptUrl);
      let text = await response.text();

      text = text.replace(/\\\\proxyString\\\\/, proxyString);
      text = text.replace(/'\\\\domains\\\\'/, domains);

      return {
        mode: "pac_script",
        pacScript: {
          data: text
        },
      };

    },
  },
  checkConnect: async function (opts) {
    const url = (opts && opts.url) || App.mainProxyUrl;
    try {
      const response = await fetch(url);
      if (response && response.ok) return true;
    } catch (e) {
      return false;
    }
  },
  loadAsync: async function () {
    let url = App.getCfgUrl();
    let response = await fetch(url);
    let configObject = await response.json();
    this.config.domains = configObject.domains;
    this.config.proxyString = configObject.proxy_string;
    return configObject;
  },
  getStorage: async function () {
    return new Promise((resolve) => {
      chrome.storage.local.get("config", function (data) {
        resolve(data.config || {});
      });
    });
  },
  setStorage: async function (config) {
    return new Promise(((resolve) => {
      chrome.storage.local.set(
        {
          config: config,
        },
        function () {
          resolve(true);
        }
      );
    }));
  },
  loadReserve: function () {
    if (!App.proxyReserve) return;
    if (App.reservedTry) return;
    App.reservedTry = true;
    try {
      //const proxySettings =
        JSON.parse(atob(App.proxyReserve));
      //if (!proxySettings["data"]) return;
    } catch (e) {
    }
  },
  loadCustomDomains: async function () {
    const url = chrome.runtime.getURL("data/customDomains.json");
    const response = await fetch(url);
    const json = await response.json();
    this.config.customDomains = json.domains;
  },
  init: async function () {
    await this.loadCustomDomains();
    await this.addListeners();

    const config = App.getStorage();

    if (config.proxy_string && config.domains) {
      App.config.proxyString = config.proxy_string;
      App.config.domains = config.domains;

      const proxyApplyResult = await App.proxy.apply(App.mainProxyUrl);
      if (!proxyApplyResult) {
        await App.loadAndApply(App.mainProxyUrl);
      }
    } else {
      await App.loadAndApply(App.mainProxyUrl);
    }

    if (config.proxy_reserve) {
      App.proxyReserve = config.proxy_reserve;
    } else {
      setTimeout(function () {
        App.loadProxyReserve();
      }, 20 * 1000);
    }
  },
  loadAndApply: async function (checkDomain) {
    const conf = await App.loadAsync();
    if (!conf.proxy_string || !conf.domains)
      return;

    App.proxyString = conf.proxy_string;
    App.config.domains = conf.domains;

    const proxyApplied = await App.proxy.apply(checkDomain);
    if (proxyApplied) {
      await App.setStorage({
        proxy_string: conf.proxy_string,
        domains: conf.domains,
        proxy_reserve: App.proxyReserve || conf.proxy_reserve,
      });
    }
    return proxyApplied;
  },
  searchProxyInProgress: false,
  globalSearchAttemptsCount: 0,
  findWorkingProxy: async function (forUrl, localSearchAttemptsCount) {
    if (App.globalSearchAttemptsCount > 15) return false;
    if (!localSearchAttemptsCount && App.searchProxyInProgress) {
      return false;
    }
    App.searchProxyInProgress = true;
    localSearchAttemptsCount = localSearchAttemptsCount || 0;
    localSearchAttemptsCount++;
    if (App.globalSearchAttemptsCount === 0) {
      setTimeout(function () {
        App.globalSearchAttemptsCount = 0;
      }, 3600 * 1000);
    }
    App.globalSearchAttemptsCount++;
    const result = await App.loadAndApply(forUrl);
    if (result) {
      App.searchProxyInProgress = false;
      return true;
    } else if (localSearchAttemptsCount < 7) {
      setTimeout(function () {
        App.findWorkingProxy(forUrl, localSearchAttemptsCount);
      }, 1000);
    } else {
      App.searchProxyInProgress = false;
      return false;
    }
  },
  loadProxyReserve: async function () {
    if (!App.proxyReserve) {
      const loadedConfig = await App.loadAsync();
      if (loadedConfig && loadedConfig.proxy_reserve) {
        const config = await App.getStorage();
        config.proxy_reserve = loadedConfig.proxy_reserve;
        await App.setStorage(config);
      }
    }
  },
  addListeners: async function () {
    chrome.webRequest.onErrorOccurred.addListener(
      function (details) {
        if (
          "net::ERR_CONNECTION_TIMED_OUT" === details.error ||
          "net::ERR_TUNNEL_CONNECTION_FAILED" === details.error
        ) {
          let urlWithoutParams = details.url.replace(/\?.*/, "");
          if (App.urlInCoverage(details.url)) {
            App.findWorkingProxy(urlWithoutParams).then((res) => {
              if (res) {
                chrome.tabs.reload(details.tabId);
              }
            });
          }
        }
      },
      {
        urls: ["<all_urls>"],
        types: ["main_frame"],
      }
    );
  },
  urlInCoverage: function (url) {
    let inCoverage = false;
    for (let i = 0; i < App.config.getAllDomains().length; i++) {
      if (!App.config.getAllDomains()[i]) continue;
      if (url.indexOf(App.config.getAllDomains()[i]) > -1) {
        inCoverage = true;
        break;
      }
    }
    return inCoverage;
  },
};
App.init().then(() => {
}).catch((e) => console.log(e));
