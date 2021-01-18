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
    const proxyString = Config.config.proxyString;
    const domains = JSON.stringify(Config.config.getAllDomains());

    return {
      mode: "pac_script",
      pacScript: {
        data: await PacScriptLoader.getPacScript(proxyString, domains)
      },
    };
  },
};