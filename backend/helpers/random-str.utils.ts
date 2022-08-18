function getRandomUpperCase(): string {
  return String.fromCharCode(Math.floor(Math.random() * 26) + 65);
}

function getRandomLowerCase(): string {
  return String.fromCharCode(Math.floor(Math.random() * 26) + 97);
}

function getRandomNumber(): string {
  return String.fromCharCode(Math.floor(Math.random() * 10) + 48);
}

export function generateRandomString(): string {
  const charCount = 6;
  let rand = '';
  for (let i = 0; i < charCount; i += 1) {
    const charType = Math.floor(Math.random() * 4);
    switch (charType) {
      case 0:
        rand += getRandomUpperCase();
        break;
      case 1:
        rand += getRandomLowerCase();
        break;
      case 2:
      default:
        rand += getRandomNumber();
        break;
    }
  }
  return rand;
}
