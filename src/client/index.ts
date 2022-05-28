import { initGame } from './GameManager';

document.getElementById('login-btn').addEventListener("click", (e) => {
  const name = (document.getElementById('login-text') as HTMLInputElement).value;
  console.log('login', { name });
  if (name) {
    window.fetch('login', {
      method: 'post',
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify({
        name
      }),
    })
      .then(r => r.json())
      .then(r => {
        console.log('Logged In, starting application', r);
        (window as any).custom = { name };
        startApplication();
      })
      .catch(e => {
        console.error(e);
        alert('error');
      });
  }
  e.preventDefault();
});

function startApplication() {
  document.getElementById('login-container').remove();

  const app = initGame();

  window.addEventListener('resize', function () {
    app.scale.resize(window.innerWidth, window.innerHeight);
  }, false);

  (window as any).app = app;
}
