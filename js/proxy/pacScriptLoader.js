let PacScriptLoader = {
  loadFileAsync: async function(filename) {
    const url = chrome.runtime.getURL(filename);
    const response = await fetch(url);
    return await response.text();
  },
  formatScript: async function(fileContent, proxyString, domains) {
    fileContent = fileContent.replace(/\\\\proxyString\\\\/, proxyString);
    fileContent = fileContent.replace(/\\\\domains\\\\/, domains);
    return fileContent;
  },
  getPacScript: async function(proxyString, domains) {
    let content = await this.loadFileAsync("data/pacScript.pac");
    return await this.formatScript(content, proxyString, domains);
  }
}