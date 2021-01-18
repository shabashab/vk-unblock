let App = {
  cachedUid: null,
  mainProxyUrl: "https://vk.com/",
  failedProxy: {},
  triedProxy: {},
  reservedTry: false,
  proxy: {
    scope: "regular",
    apply: async function (checkDomain) {
      await this.clearProxySettings();
      const settings = await this.getProxySettings();
      await this.setProxySettings(settings);

      return await App.checkConnect({url: checkDomain});
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

      const proxyString = Config.config.proxyString;
      const domains = JSON.stringify(Config.config.getAllDomains());

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
  init: async function () {
    await Config.loadCustomDomains();
    await this.addListeners();

    let proxyApplied = false;
    if(await Config.loadFromStorageAndUpdateAsync()) {
      proxyApplied = await App.proxy.apply(App.mainProxyUrl);
    }

    if(!proxyApplied)  {
      await this.downloadConfigAndApplyProxy();
    }
  },
  downloadConfigAndApplyProxy: async function (checkDomain) {
    await Config.downloadAndUpdateAsync();

    const proxyApplied = await App.proxy.apply(checkDomain);
    if (proxyApplied)
      await Config.saveToStorageAsync();

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
    const result = await App.downloadConfigAndApplyProxy(forUrl);
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
