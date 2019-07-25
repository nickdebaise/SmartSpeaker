const Sound = require('node-aplay');

const mqtt = require('mqtt');

const hostname = "mqtt://raspberrypi.local";
const client  = mqtt.connect(hostname);

export function Timer(callback, delay, name) {
  console.log("CREATING TIMER FOR " + delay)
    var timerId, start, remaining = delay;
    var beep = null;
    var completeAndCancelled = false;
    var ringing = false;

    this.pause = function() {
        clearTimeout(timerId);
        remaining -= Date.now() - start;
    };

    this.resume = function() {
        start = Date.now();
        clearTimeout(timerId);
        timerId = setTimeout(() => this.finish(name, callback), remaining);
    };

    this.cancel = function() {
      clearTimeout(timerId);
      remaining = 0;
    }

    this.finish = (name, callback) => {
      ringing = true;
      let rounds = 0;
      console.log("Finished with " + name);
      beep = new Sound("/home/pi/Snips/Components/blip.wav");
      beep.play()
	beep.on('complete', () => {
	rounds++;
	if(rounds < 20 && !completeAndCancelled && ringing) {beep.play()}
      });
      callback();
    }

    this.stopAlarm = () => {
      if(beep && !completeAndCancelled && ringing) {
        beep.pause();
        completeAndCancelled = true;
        ringing = false;
        this.restart();
        return true;
      }
      return false;
    }
    
    this.restart = () => {
    	if(beep){
    	  beep.resume()
    	}
    }
    
    this.timeLeft = () => {
    	return msToTime(remaining);
    }

    this.resume();
}


export const msToTime = (duration) => {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    let string = " ";
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

