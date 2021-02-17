function isNumber(strElement) {
  if (strElement.length > 1) {
    return [...strElement].every(isNumber);
  }

  const charCode = strElement.charCodeAt(0);
  if (charCode >= 48 && charCode <= 57) return true;

  return false;
}

function splitNumber(str) {
  let [number, finalString] = ['', ''];
  for (let element of str) {
    if (isNumber(element)) {
      number += element;
    } else {
      finalString += element;
    }
  }

  return [+number, finalString];
}

function splitNumberFor(str) {
  let [number, finalString] = ['', ''];
  for (let i = 0; i < str.length; i += 1) {
    if (isNumber(str[i])) {
      number = number + str[i];
    } else {
      finalString = finalString + str[i];
    }
  }

  return [+number, finalString];
}

function splitNumberWithArray(str) {
  const [number, finalString] = [...str].reduce((result, element) => {
    if (isNumber(element)) {
      result[0] += element;
    } else {
      result[1] += element;
    }

    return result;
  }, [0, '']);

  return [+number, finalString];
}

const repeat = (n, callback) => Array.from({ length: n }, () => callback());
function logInterval(callback, name = '') {
  const before = Date.now();
  callback();

  console.log(`${name ? name + '\n' : name} -result: ${Date.now() - before}ms\n`);
}

const data = '1024px';
const times = 100000;
// logInterval(() => repeat(times, () => splitNumber(data)), 'split1');
// logInterval(() => repeat(times, () => splitNumberWithArray(data)), 'split2');
// logInterval(() => repeat(times, () => splitNumberFor(data)), 'split3');
logInterval(() => repeat(times, () => {
  const result = [...data.matchAll(/(\d+)(\D+)/g)];

  return [result[1], result[2]];
}), 'regex');
