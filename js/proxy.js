let Proxy = {
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
};