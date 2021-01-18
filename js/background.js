let App = {
  mainProxyUrl: "https://vk.com/",
  searchProxyInProgress: false,
  globalSearchAttemptsCount: 0,
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
      proxyApplied = await Proxy.apply(App.mainProxyUrl);
    }

    if(!proxyApplied)  {
      await this.downloadConfigAndApplyProxy();
    }
  },
  downloadConfigAndApplyProxy: async function (checkDomain) {
    await Config.downloadAndUpdateAsync();

    const proxyApplied = await Proxy.apply(checkDomain);
    if (proxyApplied)
      await Config.saveToStorageAsync();

    return proxyApplied;
  },
  findWorkingProxy: async function (forUrl, localSearchAttemptsCount) {
    if (App.globalSearchAttemptsCount > 15) return false;
    if (!localSearchAttemptsCount && App.searchProxyInProgress) {
      return false;
    }
    App.searchProxyInProgress = true;
    localSearchAttemptsCount = localSearchAttemptsCount || 0;
    localSearchAttemptsCount++;

    //if (App.globalSearchAttemptsCount === 0) {
    //  setTimeout(function () {
    //    App.globalSearchAttemptsCount = 0;
    //  }, 3600 * 1000);
    //}

    App.globalSearchAttemptsCount++;
    const result = await App.downloadConfigAndApplyProxy(forUrl);
    if (result) {
      App.searchProxyInProgress = false;
      App.globalSearchAttemptsCount = 0;
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
