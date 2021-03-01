export const botnames = [
  'bot-bush',
  'bot-bear',
  'bot-deer',
  'bot-owl',
  'bot-seal',
  'bot-ant',
  'bot-neo',
  'bot-horn',
  'bot-nova',
  'bot-corn',
  'bot-egg',
  'bot-kale',
  'bot-net',
  'bot-ant',
  'bot-song',
  'bot-alto',
  'bot-pig',
  'bot-yoda',
  'bot-fly',
  'bot-cow',
  'bot-dog',
  'bot-ant',
  'bot-corn',
  'bot-ham',
  'bot-bat',
  'bot-red',
  'bot-bane',
  'bot-mars',
  'bot-ice',
  'bot-neo',
  'bot-clef',
  'bot-fog',
  'bot-pig',
  'bot-sun',
  'bot-fly',
  'bot-kale',
  'bot-fern',
  'bot-neo',
  'bot-ice',
  'bot-dog',
  'bot-rice',
  'bot-rye',
  'bot-judo',
  'bot-fly',
  'bot-lime',
  'bot-pork',
  'bot-corn',
  'bot-tea',
  'bot-drum',
  'bot-beat',
  'bot-rat',
  'bot-log',
  'bot-sun',
  'bot-bush',
  'bot-rose',
  'bot-dog',
  'bot-harp'
];

export const getRandomBotName = (postfix: string = '') => {
  const randomIndex = Math.floor(Math.random() * (botnames.length));
  return `${botnames[randomIndex]}${postfix}`;
};