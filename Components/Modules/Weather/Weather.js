/*

HELPER FUNCTIONS LOCATED IN '../../Helpers/api';
functions include:

Query weather api,
Get location data


This file here connects to main.js and supplies it
with appropiate functions to query DarkSky weather api
The functions in here can be used in conjunction with Snips,
but must not be used as a main file as it has no MQTT connection.

Usage Cases:

"Whats the weather?" : "(Currently, Right now) it is __ degrees out. (Summary of weather conditions)"
"Whats the weather in Fenway park?" : "In ____, it is __ degrees (out). (Summary of weather conditions)"
"Whats the weather looking like at 5 pm?" : "At 5, (summary of weather conditions). It will be ___ degrees"
"Whats the weather like in fenway park at 12" : "At 12 In fenway park, (summary). It will be ___ degrees."
"Whats the weather like tomorrow in fenway park" : "tomorrow in fenway park, it will be ___ degrees out. (Summary of weather conditions)"
"Whats the weather like sunday" : "on sunday, it will be ___ degrees out. (Summary of weather conditions)"

Object to be passed to sentence:

{
place : "Fenway park" | undefined,
data : {(from checkTime/darksky)},
date : "On sunday" | "tomorrow" | "today" | "on friday"
}
*/

const fetch = require("node-fetch");
const fs = require('fs');

import {getLocationData} from '../../Helpers/api';

import {config} from '../../Helpers/config.config.js'

const darkSkyKey = config.weatherKey;


const createForecastSentence = (data) => {

  let sentence = "";
  let introSentence = createIntroSentence(data);
  if(introSentence.split(" ").length < 4) {
    sentence = introSentence + createTemperatures(data) + " " + createSummary(data);
  } else {
    sentence = introSentence + createSummary(data) + " " + createTemperatures(data);
  }

  return sentence;

}

const createIntroSentence = (data) => {
  let sentence = "";
  let order = []

  if(data.date && data.date.toLowerCase() !== 'today') {
    order.push(data.date)
  }
  if(data.date.toLowerCase() === 'today') {
    const intros = ["Currently", 'Right now', "Today"]
    order.push(intros[Math.floor(Math.random() * intros.length)])
  }

if(data.place) {
    order.push("In " + data.place)
  }
  return order.join(" ") + ", "
}

const createSummary =  (data) => {
  let sentence = "";

  if(data.data.summary.toLowerCase().includes("rain")) {
    if(Math.floor(Math.random() * 50 < 25)) {
    sentence = "Expect " + data.data.summary;
    } else {
      sentence = "There will be " + data.data.summary;
    }
  } else {
    if(Math.floor(Math.random() * 50 < 25)) {
      sentence = "Expect it to be " + data.data.summary;
    } else {
      sentence = "It will be " + data.data.summary;
    }
  }

  if(sentence.endsWith(".")) {
    return sentence;
  }

  return sentence + ". "
}

const createTemperatures = (data) => {
  if(data.date && data.date !== 'today' && data.data.temperature && !data.data.temperatureMax) {
    return `It will be ${Math.floor(data.data.temperature)} out.`
  } else {
    if(data.data.temperature) {
      return `It is ${Math.floor(data.data.temperature)} outside.`
    } else {
      return `There will be a high of ${Math.floor(data.data.temperatureHigh)} and a low of ${Math.floor(data.data.temperatureLow)}`
    }
  }
}


const getDate = (date) => {
  if(date === 'currently') {
    return "today"
  }
  if(date.toLocaleString().split(" ")[0] === new Date().toLocaleString().split(" ")[0]) {
    //Same today - get the hour it is at
    const hour = date.toLocaleString().split(" ")[1].split(":")[0] + " " + date.toLocaleString().split(" ")[2];
    return "At " + hour;
  } else {
    //Day in the future, return relevant date (tomorrow, on sunday, on april 18th)
    const todaymmDDyy = new Date().toLocaleString().split(" ")[0].split("/");
    const mmDDyy = date.toLocaleString().split(" ")[0].split("/");
    if(mmDDyy[1] < todaymmDDyy[1]) {
      if(mmDDyy[1] - todaymmDDyy[1] === 1) {
        return "Tomorrow"
      } else {
        const arrayOfDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return "On " + arrayOfDays[date.getDay()];
      }
    }
  }
  return "On sunday"
}

const checkTime = (weatherData, dateToFind, place) => {
  /*

  Function that takes in the weather data from dark sky and the date to find
  and proceeds to loop through the weather data, looking for the date to find
  within the weather data
  returns an object containing "message", "data", "type"

  */
  if(dateToFind === 'currently') {
    return {
      type : 'CURRENTLY',
      data : weatherData,
      place : place,
      date : getDate('currently')
    }
  }
  const timeData = weatherData.filter((item, i) => {
    const timeNow = new Date(item.time * 1000).getTime();
    let timeNext;
    if(i < weatherData.length - 1) {
      timeNext = new Date(weatherData[i+1].time * 1000).getTime();
    } else {
      timeNext = new Date((weatherData[i].time * 1000) + (60 * 60 * 1000)).getTime()
    }
    if(timeNow <= dateToFind.getTime() && dateToFind.getTime() < timeNext) {
      return true
    }

  })

  return {
    type : timeData[0].temperatureHigh ? 'DAY' : 'HOUR',
    data : timeData[0],
    place : place,
    date : getDate(dateToFind)
  };
}


const getLocationString = (data) => {
  let string = "";
  if(data.forecast_geographical_poi) {
    string = string + data.forecast_geographical_poi + " ";
  }
  if(data.forecast_locality) {
    string = string + data.forecast_locality + " ";
  }
  if(data.forecast_region) {
    string = string + data.forecast_region + " ";
  }
  if(data.forecast_country) {
    string = string + data.forecast_country + " ";
  }

  return string.substr(0, string.length - 1);
}



export const getWeatherForecast = (data) => {
  //Get the place as a string
  let place = "";
  let responseString = "";
  if(data) {
    place = getLocationString(data);
  }
  if (place === "") {
    place = null;
  }

  //query the latlong locator
  return getLocationData(place)
  .then(result => {
    //query the dark sky weather api for forecast
    return fetch("https://api.darksky.net/forecast/" + darkSkyKey + "/" + result[0] + "," + result[1] + "?exclude=[minutely]")
  })
  .then(res => {return res.json()})
  .catch(err => console.log(err))
  .then(response => {
    if(data && data.forecast_start_datetime) {
      //If there is a date/time that needs to be checked

      const todaysDate = new Date();
      const dateToFind = new Date(data.forecast_start_datetime);
      if(dateToFind.getTime() - (1000 * 60) >= todaysDate.getTime() && (todaysDate.getTime() + (60 * 60 * 24 * 1000)) >= dateToFind.getTime() + (1000 * 60) && todaysDate.toLocaleString().split(",")[0] === dateToFind.toLocaleString().split(",")[0] ) {
        //Within 24 hours and same day, get accurate hour data
        responseString = createForecastSentence(checkTime(response.hourly.data, dateToFind, place));
        console.log(responseString);
      } else {
        if(dateToFind.getTime() < todaysDate.getTime()) {
          if(dateToFind.toLocaleString().split(",")[0] === todaysDate.toLocaleString().split(",")[0]) {
            //Date is today, just in the past, get weather for today
            responseString = createForecastSentence(checkTime(response.daily.data, dateToFind, place));
            console.log(responseString);
          } else {
            //Date is in the past
            responseString = "I'm sorry, but I am not able to find weather in the past."
          }
        } else {
          //Not the same day or 36 hours in the future, must check daily weather forecast
          responseString = createForecastSentence(checkTime(response.daily.data, dateToFind, place));
          console.log(responseString);
        }
      }

    } else {
      if(place) {
        responseString = createForecastSentence(checkTime(response.currently, "currently", place));
        console.log(responseString);
      } else {
        responseString = createForecastSentence(checkTime(response.currently,"currently", place));
        console.log(responseString);      }
    }
  return responseString;
  })
}




/*


"mostly cloudy"
"partly cloudy"
"light rain"
"snowing"

*/
