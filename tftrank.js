require('dotenv').config()

const tmi = require('tmi.js');
const https = require('https');
const apikey = process.env.RIOT_API_KEY;

const client = new tmi.Client({
	options: { debug: true },
	connection: {
		secure: true,
		reconnect: true
	},
	identity: {
		username: process.env.TWITCH_USERNAME,
		password: process.env.TWITCH_OAUTH_KEY
	},
	channels: [ process.env.TWITCH_CHANNEL ]
});

client.connect();

client.on('message', (channel, tags, message, self) => {
	// Ignore echoed messages.
	if(self) return;

	if(message.toLowerCase().slice(0, 5) === '!rank') {
        var summonerName = process.env.SUMMONER_NAME;
        var summonerId = process.env.SUMMONER_ID;

        if (message.length > 6) {
          summonerName = encodeURIComponent(message.slice(6));
          process.stdout.write(summonerName);
        }

        var req1Options = {
          hostname: 'na1.api.riotgames.com',
          port: 443,
          path: `/tft/summoner/v1/summoners/by-name/${summonerName}?api_key=${apikey}`,
          method: 'GET'
        }

        var req1 = https.request(req1Options, res => {
          res.on('data', d => {
              if (res.statusCode == 200) {
                console.log(`The code is ${res.statusCode}`);
                var dObj1 = JSON.parse(d);
                console.log(dObj1);
                summonerId = encodeURIComponent(dObj1.id);
                process.stdout.write(`${summonerName} has ID ${summonerId}`);

                var req2Options = {
                  hostname: 'na1.api.riotgames.com',
                  port: 443,
                  path: `/tft/league/v1/entries/by-summoner/${summonerId}?api_key=${apikey}`,
                  method: 'GET'
                };

                var req2 = https.request(req2Options, res => {
                  res.on('data', d => {
                      if (res.statusCode == 200) {
                        var dObj2 = JSON.parse(d);
                        var tier = dObj2[0].tier.charAt(0) + dObj2[0].tier.slice(1).toLowerCase();
                        var rank = dObj2[0].rank;
                        var lp = dObj2[0].leaguePoints;
                        process.stdout.write(`${summonerName} is currently ${tier} ${rank} with ${lp} LP.`);
                        client.say(channel, `${dObj1.name} is currently ${tier} ${rank} with ${lp} LP.`);
                      } else {
                        process.stdout.write(`An error occurred trying to fetch summoner info.`);
                      }
                      
                  });
                });
                
                req2.on('error', error => {
                  console.error(error);
                  client.say(channel, `An error occurred trying to fetch summoner info.`);
                });
                req2.end();
              } else {
                process.stdout.write(`Summoner not found.`);
                client.say(channel, `Summoner not found.`);
              }
              
          });
        });
        
        req1.on('error', error => {
          console.error(error);
          client.say(channel, `Unable to contact Riot API.`);
        });
        
        req1.end();	
	}
});
