'use strict';

/**
 * Get corresponding ASCII character(s) for the given index
 * @param {number} index
 * @returns {string} Corresponding ASCII character
 */
function getCharForIndex(index) {
  if (index < 0) {
    throw RangeError('Index must be equal or greater then zero.');
  }

  // 48 (mapping start char code)
  // 90 (mapping end char code)
  // 90-48=42 is the available characters count
  if (index < 43) {
    // one char
    const i = Number.parseInt(`0x${index}`, 16);
    const c = String.fromCharCode(48 /* ASCII 48 = '0' */ + i);
    return `.${c}`;
  }

  // multi-chars
  const remainder = (index % 43);
  const division = ((index - remainder) / 43); // TODO ?What if division >= 43
  // NOTE Can index up to 1764 (42^2) w/o the implementation of the todo above

  const ret = ['~', getCharForIndex(division), getCharForIndex(remainder)].join('');
  return `.${ret}`;
}
/**
 * Substitute string elements of an array to reduce size
 * @param {Array} theArray Original array to process
 * @returns {string}
 */
function compress(theArray) {
  const freq = {}; // "word": #freq
  const freqKeys = [];

  const theArrayStr = JSON.stringify(theArray);

  //
  const processSingleItem = (item) => {
    // eslint-disable-next-line default-case
    switch (typeof item) {
      case 'string': {
        if (item.indexOf(',') > -1) {
          iterate(item.split(','));
        } else if (item.length > 2) {
          if (!freqKeys.includes(item)) {
            freq[item] = 0;
            freqKeys.push(item);
          }

          freq[item] += 1;
        }

        break;
      }

      case 'object': {
        if (Array.isArray(item)) {
          iterate(item);
        } else {
          iterateObj(item);
        }
        // TODO Consider objects too

        break;
      }
    }
  };
  const iterateObj = (obj) => {
    let value;
    Object.keys(obj).forEach((key) => {
      value = obj[key];

      processSingleItem(key);
      processSingleItem(value);
    });
  };
  const iterate = (iterable) => {
    iterable.forEach(item => processSingleItem(item));
  };

  iterate(theArray);

  if (freqKeys.length < 5) {
    return theArrayStr.replace(new RegExp(/"/, 'g'), '\'');
  }

  // NOTE `freqKeys` is useless from now on

  // TODO Sort `freq` to get keys list

  let estimatedMapLen = 0;
  const gain = Object.keys(freq)
    .map((key) => { estimatedMapLen += (key.length + 1); return (key.length - 2) * freq[key]; })
    .reduce((acc, curr) => acc + curr);

  if (estimatedMapLen > gain) {
    return theArrayStr.replace(new RegExp(/"/, 'g'), '\'');
  }

  const sorted = Object.keys(freq)
    .map(key => [key, key.length * freq[key]])
    .sort((a, b) => (a[1] > b[1] ? -1 : 1))
    .map((item, index) => [item[0], getCharForIndex(index)]);

  let finalStr = theArrayStr.replace(new RegExp(/"/, 'g'), '\'');
  sorted.forEach((item) => {
    finalStr = finalStr.replace(new RegExp(item[0], 'g'), item[1]);
  });

  return `${sorted.map(item => item[0]).join(',')}${finalStr}`;
}
/**
 * @param {string} theStr
 * @returns {array}
 */
function decompress(theStr) {
  const map = [];
  const curr = [];

  const last = theStr.indexOf('[');
  if (last === 0) {
    // was not compressed - nothing to do here
  } else {
    for (let i = 0, c = theStr[i]; i < last; i += 1, c = theStr[i]) {
      if (c === ',') {
        map.push([getCharForIndex(map.length), curr.join('')]);
        curr.splice(0, curr.length); // clear `curr`
      } else {
        curr.push(c);
      }
    }
    // add the last buffered
    map.push([getCharForIndex(map.length), curr.join('')]);
    curr.splice(0, curr.length); // clear `curr`
  }

  let finalStr = theStr.substring(last).replace(new RegExp(/'/, 'g'), '"');
  map.forEach((item) => {
    // finalStr = finalStr.replace(new RegExp(`.${item[0]}`, 'g'), item[1]);
    finalStr = finalStr.replace(new RegExp(`\\${item[0]}`, 'g'), item[1]);
  });

  return JSON.parse(finalStr);
}

module.exports = {
  compress,
  decompress,
};
