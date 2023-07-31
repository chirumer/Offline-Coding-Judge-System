const closeButton = document.getElementById('close-button');
const backButton = document.getElementById('back-btn');
const endButton = document.getElementById('end_test_btn');
const loginBtn = document.getElementById('login-btn');

closeButton.addEventListener('click', () => {
  window.end_test_early();
});

endButton.addEventListener('click', () => {
  window.end_test_early();
})