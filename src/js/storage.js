let Storage = {
  getConfig: async function() {
    return new Promise((resolve) => {
      chrome.storage.local.get("config", function (data) {
        resolve(data.config || {});
      });
    });
  },
  setConfig: async function(value) {
    return new Promise(((resolve) => {
      chrome.storage.local.set(
        {
          config: value,
        },
        function () {
          resolve(true);
        }
      );
    }));
  }
}