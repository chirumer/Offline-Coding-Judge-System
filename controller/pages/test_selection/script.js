const closeButton = document.getElementById('close-button');
const openBtn = document.getElementById('open-btn');

closeButton.addEventListener('click', () => {
  window.close_window();
});

openBtn.addEventListener('click', () => {
  const testNameInput = document.getElementById('testNameInput').value;
  const encryptionCodeInput = document.getElementById('encryptionCodeInput').value;

  const test_credentials = {
    test_name: testNameInput,
    encryption_code: encryptionCodeInput
  };

  window.send_test_credentials(test_credentials);
});