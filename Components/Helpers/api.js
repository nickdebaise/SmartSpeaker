const fetch = require("node-fetch");
import {config} from './config.config.js';

import {getReminders} from '../Modules/Reminders';

const uuid = require('uuid/v4');
const v = require("validator");

const googleMapsKey = config.googleMapsApiKey;


export const endSession = (text) => {
    return text + getReminders();
}

export const getLocationData = (mark) => {
  let resp = null;
  if(!mark && mark !== "") {
    if(!config.location) {
    return fetch("https://www.googleapis.com/geolocation/v1/geolocate?key=" + googleMapsKey, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
    })
    .then(res => {
      return res.json();
    })
    .catch(err => {console.log(err);return null;})
    .then(response => {
      if(response.location) {
        return [response.location.lat, response.location.lng];
      } else {
        return null;
      }
    })
    .catch(err => {console.log(err); return null;})
  }
  } else {

    const url = "https://maps.googleapis.com/maps/api/geocode/json?key=" + googleMapsKey + "&address=" + encodeURIComponent(mark);


    return fetch(url,{
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
    })
    .then(res => {
      return res.json()
    })
    .catch(err => {console.log(err); return null;})
    .then(response => {
      if(response.results[0]) {
        return [response.results[0].geometry.location.lat, response.results[0].geometry.location.lng];
      }
    })
    .catch(err => {console.log(err); return null})
  }

}

export const handleTimer = (action, slots, timers) => {
console.log(timers)
var size = Object.keys(timers).length;
  if(timers && size === 1) {
  console.log("Pausing")
    Object.keys(timers).forEach(key => {
      if(action === 'pause') {
      timers[key].pause(); 
      console.log("paused")
      return "Paused your timer"
      }
      if(action === 'resume') {
      timers[key].resume(); 
      return "Resumed your timer"
      }
      if(action === 'cancel') {
      timers[key].cancel(); 
      return "Stopped your timer"
      }
    })
  } else {
	if(timers) {
	    let slots = createSlotsForTimer(slots)
	    if(!v.isUUID(slots.timerName)) {
	      if(action === 'pause') {timers[slots.timerName].pause(); return "Paused your timer"}
	      if(action === 'resume') {timers[slots.timerName].resume(); return "Resumed your timer"}
	      if(action === 'cancel') {timers[slots.timerName].cancel(); return "Stopped your timer"}
	}
    } else {
      return "Cannot stop timer as it doesnt have a name and there are multiple timers"
    }

  }
  
  return "Sorry, something weng wrong"
  
}

export const convertToTime = (values) => {
  const helper = {
    'seconds' : 1000,
    'minutes' : 60000,
    'hours' : 3600000,
    'days' : 86400000,
    'weeks' : 604800000
  }

  let sum = 0;

  Object.keys(values).forEach(key => {
    if(key !== 'kind') {
      if(values[key] > 0) {
        sum = sum + values[key] * helper[key];
      }
    }
  })

  return sum
}

export const createSlotsForTimer = (data) => {
  let slots = {}
  for(var i in data) {
    if(data[i].slotName === 'timerLength') {
      slots[data[i].slotName] = convertToTime(data[i].value)
    } else {
    slots[data[i].slotName] = data[i].value.value
    }
  }

  if(!slots.timerLength) {
    //1 minute
    slots.timerLength = 1 * 1000 * 60;
  }
  if(!slots.timerName) {
    slots.timerName = uuid();
  }

  return slots;
}

export const msToTime = (duration) => {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    let string = "";
    if(hours > 0) {
      string = string + hours + " hours ";
    }
    if(minutes > 0) {
      string = string + minutes + " minutes ";
    }

    if(seconds > 0) {
      string = string + seconds + " seconds ";
    }

  return string;
}
