const closeButton = document.getElementById('close-button');
const syncButton = document.getElementById('sync-btn');
const loginButton = document.getElementById('proceed-btn');
const backButton = document.getElementById('back-btn');

closeButton.addEventListener('click', () => {
  window.close_window();
});

syncButton.addEventListener('click', () => {
  window.sync_credentials();
});

loginButton.addEventListener('click', () => {
  window.go_to_login();
});

backButton.addEventListener('click', () => {
  window.go_to_test_selection();
});
