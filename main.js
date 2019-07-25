import {
  getWeatherForecast
} from './Components/Modules/Weather';
import {
  getDay,
  getDate,
  getTime
} from './Components/Modules/TimeDate';
import {
  createSlotsForTimer,
  convertToTime,
  msToTime
} from './Components/Helpers/api';
import {
  endSession
} from './Components/Helpers/api';

import {
  Timer
} from './Components/Modules/Timer';

import {
  mpd
} from './Components/Modules/Music';

const exec = require('child_process').exec;

const Gpio = require('onoff').Gpio;
const uuid = require('uuid/v4')
const mqtt = require('mqtt');

const hostname = "mqtt://raspberrypi.local";
const client = mqtt.connect(hostname);
const button = new Gpio(17, 'in', 'rising', {
  debounceTimeout: 10
});

let timers = {};
button.watch((err, value) => {
  var size = Object.keys(timers).length;
  if (err) {
    throw err;
  }
  if (timers && size > 0) {
    Object.keys(timers).forEach(key => {
      var stopped = timers[key].stopAlarm();
      if (stopped) {
        delete timers[key];
      }
    });
  }
});


const handleTimer = (action, slots) => {
console.log(action,slots);
  var size = Object.keys(timers).length;
  let string = "";
  if (timers && size === 1) {
    Object.keys(timers).forEach(key => {
      if (action === 'pause') {
        timers[key].pause();
        string = "Paused your timer. "
      }
      if (action === 'resume') {
        timers[key].resume();
        string = "Resumed your timer. "
      }
      if (action === 'cancel') {
        timers[key].cancel();
        string = "Stopped your timer. "
      }
      if(action === 'timeLeft') {
        string = "There is " + timers[key].timeLeft() + " left on your timer. "
      }
    })

    return string;
  } else {
    if (timers && timers[slots.timerName]) {
      let slots = createSlotsForTimer(slots)
      if (!v.isUUID(slots.timerName)) {
        if (action === 'pause') {
          timers[slots.timerName].pause();
          string = "Paused your timer. "
        }
        if (action === 'resume') {
          timers[slots.timerName].resume();
          string = "Resumed your timer. "
        }
        if (action === 'cancel') {
          timers[slots.timerName].cancel();
          string = "Stopped your timer. "
        }
        if(action === 'timeLeft') {
          string = "There is " + timers[slots.timerName].timeLeft() + " left on your timer. "
        }
      }
    } else {
      string = Object.keys(timers).forEach(key => {
        if (action === 'pause') {
          timers[key].pause()
          string = "Paused your timer. "
        }
        if (action === 'resume') {
          timers[key].resume()
          string = "Resumed your timer. "
        }
        if (action === 'cancel') {
          timers[key].cancel()
          string = "Cancelled your timer. "
        }
        if(action === 'timeLeft') {
          string = "" + timers[key].timeLeft()
        }
      });

      return string;
    }

  }

  return "Sorry, something weng wrong. "

}

const parseData = (data) => {
  return {
    intent: data.intent ? data.intent.intentName : null,
    slots: data.slots
  }
}

const createSlots = (slots) => {
  const slotData = {};
  for (var i in slots) {
    slotData[slots[i].slotName] = slots[i].value.value ? slots[i].value.value : slots[i].value.from;
  }
  return slotData;
}

client.on('connect', function() {
  console.log("[Snips Log] Connected to MQTT broker " + hostname);
  client.subscribe('hermes/#');
});

client.on('message', function(topic, message) {
  if (topic === "hermes/asr/startListening") {
    onListeningStateChanged(true);
  } else if (topic === "hermes/asr/stopListening") {
    onListeningStateChanged(false);
  } else if (topic.match(/hermes\/hotword\/.+\/detected/g) !== null) {
    onHotwordDetected()
  } else if (topic.match(/hermes\/intent\/.+/g) !== null) {
    onIntentDetected(JSON.parse(message));
  }
});

function onIntentDetected(message) {
  const rawData = parseData(message);
  console.log(rawData);
  if (rawData.intent === 'nickdeb:searchWeather') {
    getWeatherForecast(createSlots(rawData.slots))
      .then(res => {
        client.publish('hermes/dialogueManager/endSession', JSON.stringify({
          sessionId: message.sessionId,
          text: endSession(res)
        }))
      })
  } else if (rawData.intent === 'nickdeb:getCurrentTime') {
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession(getTime(createSlots(rawData.slots)))
    }))
  } else if (rawData.intent === 'nickdeb:getCurrentDay') {
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession(getDay(createSlots(rawData.slots)))
    }))
  } else if (rawData.intent === 'nickdeb:getCurrentDate') {
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession(getDate(createSlots(rawData.slots)))
    }))
  } else if (rawData.intent === 'nickdeb:createTimer') {
    let slots = createSlotsForTimer(rawData.slots);
    timers[slots.timerName] = new Timer(() => console.log('done'), slots.timerLength, slots.timerName);
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession("Your timer is set!")
    }))
  } else if (rawData.intent === 'nickdeb:pauseTimer') {
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession(handleTimer('pause', rawData.slots))
    }))
  } else if (rawData.intent === 'nickdeb:piReboot') {
    exec("sudo reboot");
  } else if (rawData.intent === 'nickdeb:piShutdown') {
    exec("sudo shutdown");
  } else if (rawData.intent === 'nickdeb:piReconnectWifi') {
    exec("sudo systemctl daemon-reload");
    exec("sudo systemctl restart dhcpcd");
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession("Your wifi has been restarted. ")
    }));
  } else if (rawData.intent === 'nickdeb:cancelTalk') {
    Object.keys(timers).forEach(key => {
      if (timers[key].stopAlarm()) {
        delete timers[key];
      }
    });
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession("I have stopped your timer")
    }));
  } else if (rawData.intent === 'nickdeb:cancelTimer') {
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession(handleTimer('cancel', rawData.slots))
    }))
  } else if (rawData.intent === 'nickdeb:resumeTimer') {
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession(handleTimer('resume', rawData.slots))
    }))
  } else if (rawData.intent === 'nickdeb:getTimeLeft') {
    client.publish('hermes/dialogueManager/endSession', JSON.stringify({
      sessionId: message.sessionId,
      text: endSession(handleTimer('timeLeft', rawData.slots))
    }))
  }
}

function onHotwordDetected() {
  console.log("[Snips Log] Hotword detected");
}

function onListeningStateChanged(listening) {
  console.log("[Snips Log] " + (listening ? "Start" : "Stop") + " listening");
}


process.on('SIGINT', () => {
  button.unexport();
});
