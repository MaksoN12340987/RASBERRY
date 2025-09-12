let clock = () => {
  let date = new Date();
  let hors = date.getHours();
  let minuts = date.getMinutes();
  let seconds = date.getSeconds();

  hors = hors < 10 ? "0" + hors : hors;
  minuts = minuts < 10 ? "0" + minuts : minuts;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  let time = ` ${hors}:${minuts}:${seconds}`;
  document.getElementById("clock").innerText = time;
  setTimeout(clock, 1000);
};

clock();