const { app, net } = require('electron');

app.whenReady().then(async () => {
  console.log('App ready');
  const request = net.request({
    method: 'POST',
    url: 'https://howlongtobeat.com/api/search',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://howlongtobeat.com',
      'Referer': 'https://howlongtobeat.com/'
    }
  });

  const payload = {
    "searchType": "games",
    "searchTerms": ["Elden", "Ring"],
    "searchPage": 1,
    "size": 20,
    "searchOptions": {
      "games": {
        "userId": 0,
        "platform": "",
        "sortCategory": "popular",
        "rangeCategory": "main",
        "rangeTime": { "min": 0, "max": 0 },
        "gameplay": { "perspective": "", "flow": "", "genre": "" },
        "modifier": ""
      },
      "users": { "sortCategory": "postcount" },
      "filter": "",
      "sort": 0,
      "randomizer": 0
    }
  };

  request.on('response', (response) => {
    console.log(`STATUS: ${response.statusCode}`);
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      console.log('BODY:', data.substring(0, 500)); // Print first 500 chars
      app.quit();
    });
  });

  request.write(JSON.stringify(payload));
  request.end();
});
