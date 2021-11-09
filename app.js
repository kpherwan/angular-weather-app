// Copyright 2017 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

// [START gae_node_request_example]
const express = require('express');
const axios = require('axios');

const app = express();

const sendRequest = async (params, url = "https://api.tomorrow.io/v4/timelines") => {
  try {
      const resp = await axios({
          method: 'GET',
          url,
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          params
      });
      if (resp.status == 200) {
        return resp.data;
      }
  } catch (err) {
      // Handle Error Here
      console.error(err);
  }
}

app.get('/', (req, res) => {
  res.status(200).send('Hello, worldnn!').end();
});

app.get('/autocomplete', async function (req, res) {
  let inputCity = req.query.inputCity;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.type('application/json');
  
  if(inputCity) {
    let response = await sendRequest({}, "https://maps.googleapis.com/maps/api/place/autocomplete/json?key=AIzaSyAcruZ1SZmg9_m7_ngriRVFDQuY_wyMw-I&types=(cities)&input=" + inputCity);
    if(response?.predictions) {
      const results = [];
      response.predictions.forEach(element => {
          if(element?.description.includes("USA")) {
            results.push({"city" : element.terms[0]?.value, "state": element.terms[1]?.value});
          }
      });
      res.send(results).end();
    }
    else {
      res.send({ "error": "Oops!" }).end();
    }
  }
  else {
    res.send({ "error": "Input city pending" }).end();
  }
  
});

app.get('/currentWeather', async function (req, res) {
  let location = req.query.location

  if (location) {
    
    let querystring = {
      "units": "metric", "timesteps": ["current", "1h"],
      "location": location,
      "apikey": process.env.TOMORROW_APIKEY,
      "fields": [
        "temperature", "temperatureApparent",
        "temperatureMin", "temperatureMax",
        "windSpeed", "windDirection",
        "humidity", "pressureSeaLevel",
        "uvIndex", "weatherCode",
        "precipitationProbability", "precipitationType",
        "visibility", "cloudCover"
      ],
      "timezone": "America/Los_Angeles",
      "units": "imperial"
    };

    let response1 = await sendRequest(querystring);

    querystring["timesteps"] = "1d";
    querystring["fields"].push("sunriseTime");
    querystring["fields"].push("moonPhase");
    querystring["fields"].push("sunsetTime");
    querystring["fields"].splice(querystring["fields"].indexOf("uvIndex"), 1);

    let response2 = await sendRequest(querystring);

    let resultJson;
    if (response1 && response2) {
      //resultJson = { "current": new Buffer.from(response1, "utf-8"), "day": new Buffer.from(response2, "utf-8") };
      resultJson = { "current": response1, "day": response2 };
    }
    else {
      resultJson = require("./weather-angular-app/sampleData.json");
      //resultJson = { "error": "Number of calls exceeded for tomorrow" };
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.type('application/json');
    res.send(resultJson).end();
  }
  else {
    res.send('Oops no location!').end();
  }

});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});
// [END gae_node_request_example]

module.exports = app;
