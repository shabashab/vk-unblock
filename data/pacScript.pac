function FindProxyForURL(url, host) {
        var proxyString = '\\proxyString\\';
        var domains = '\\domains\\';

        for(i = 0; i < domains.length; i++){
         if (shExpMatch(host, domains[i])) {
          return proxyString;
         }
        }
        return "DIRECT";
}