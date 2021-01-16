var fs = require('fs');

const inputData = JSON.parse(
  fs.readFileSync("proxies.json")
);

const proxies = inputData.proxies;

var use_proxy = Math.random() < 0.4;


const proxy_index = Math.floor(Math.random()* proxies.length ) ;

console.log(use_proxy);
console.log(proxies[proxy_index]);