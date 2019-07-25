const getEnding = (d) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}



export const getDay = (data) => {
  if(data && data.futureTime) {
      const time = new Date(data.futureTime).toLocaleString('en-us', {weekday : 'long'});
      return `It will be ${time}`;
    }
    const time = new Date().toLocaleString('en-us', {weekday : 'long'});
    return `It is ${time}`;
}

export const getDate = (data) => {
  if(data.futureTime) {
    const month = new Date(data.futureTime).toLocaleString('en-us', {month : 'long'});
    let day = new Date(data.futureTime).toLocaleString('en-us', {day : 'numeric'})
    day = day + getEnding(day);
    const year = new Date(data.futureTime).getFullYear();
    return `It will be ${month} ${day} ${year}`;
  }
  const month = new Date().toLocaleString('en-us', {month : 'long'});
  let day = new Date().toLocaleString('en-us', {day : 'numeric'})
  day = day + getEnding(day);
  const year = new Date().getFullYear();
  return `Today is ${month} ${day} ${year}`;
}

export const getTime = (data) => {
  if(data && data.futureTime) {
    const time = new Date(data.futureTime).toLocaleString('en-us', {hour : 'numeric', minute : 'numeric'});
    return `It will be ${time}`;
  }
  const time = new Date().toLocaleString('en-us', {hour : 'numeric', minute : 'numeric'});
  return `It is ${time}`;
}
