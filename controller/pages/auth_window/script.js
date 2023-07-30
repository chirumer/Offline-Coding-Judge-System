const closeButton = document.getElementById('close-button');
const syncButton = document.getElementById('sync-btn');
const loginButton = document.getElementById('proceed-btn');

closeButton.addEventListener('click', () => {
  window.close_window();
});

syncButton.addEventListener('click', () => {
  window.sync_credentials();
});

loginButton.addEventListener('click', () => {
});
