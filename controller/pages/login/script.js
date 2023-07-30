const closeButton = document.getElementById('close-button');
const backButton = document.getElementById('back-btn');
const loginBtn = document.getElementById('login-btn');

closeButton.addEventListener('click', () => {
  window.close_window();
});

backButton.addEventListener('click', () => {
  window.go_back();
});

loginBtn.addEventListener('click', () => {
  const emailInput = document.getElementById('emailInput').value;
  const accessCodeInput = document.getElementById('accessCodeInput').value;

  const credentials = {
    email: emailInput,
    accessCode: accessCodeInput
  };

  window.send_login(credentials);
});