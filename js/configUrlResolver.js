let ConfigUrlResolver = {
  getConfigDomain: function() {
    return "https://check.proxy-config.com/";
  },
  getConfigUrl: function() {
    let fileName = "configg.json";
    return this.getConfigDomain() + fileName;
  }
}