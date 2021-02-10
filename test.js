// require('dotenv').config();

// const redis = require("redis");
// const Timer = require('timer-node');
// const client = redis.createClient({
//     "host": "scraperbox.be",
//     "password":"6Hv7XkbvWle8eK0tOBkG1fz/ECcoulu+xuj9EbEZKUALoLKBOUrIW2p92+UkQYGxzLlGjPfiXpr46GXa"});

// client.on("error", function(error) {
//   console.error(error);
// });

// client.set("41", 56);
// //client.incr("41", redis.print);
// //client.get("41", function(err, reply) {
//   // reply is null when the key is missing
// //  console.log(reply);
// //});
// client.quit();

// function sleep(ms) {
//   return new Promise((resolve) => {
//     setTimeout(resolve, ms);
//   });
// }

// (async () => {
//   const timeoutPromise = new Promise((resolve, reject) => {
//     setTimeout(resolve, 1500, 'timeout');
//   });

//   const result = await Promise.race([timeoutPromise, sleep(1000)]);
//   if(result == "timeout")
//     console.log("timeout");
//   else
//     console.log("no timeout");

// })();


const test = {"id":"1144","name":"__default__","data":{"comparisonRunId":774,"comparisonSize":2,"comparisonId":71,"params":{"language":"fr"},"scraperClass":"ExpediaWebScraper","inputData":{"origin":"BRU","destination":"AMS","departureDate":"2021-05-02"}},"opts":{"attempts":1,"delay":0,"timestamp":1612996452857},"progress":0,"delay":0,"timestamp":1612996452857,"attemptsMade":0,"stacktrace":[],"returnvalue":null,"finishedOn":null,"processedOn":1612996452761};

const t = test.data;

if ("commparisonRunId" in t )
  console.log("ok");

  const hero = {
    name: 'Batman'
  };

  console.log(hero.hasOwnProperty('name'));     // => true