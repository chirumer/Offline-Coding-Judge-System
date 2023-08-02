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


function addOverlayWithText(displayText) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay'; // Add a class for styling
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Adjust the transparency here
  overlay.style.zIndex = '9999'; // Adjust the z-index as needed

  const text = document.createElement('div');
  text.className = 'overlay-text'; // Add a class for styling
  text.style.display = 'flex';
  text.style.justifyContent = 'center';
  text.style.alignItems = 'center';
  text.style.width = '100%';
  text.style.height = '100%';
  text.style.color = '#ffffff'; // Text color
  text.style.fontSize = '24px'; // Text font size
  text.style.fontWeight = 'bold'; // Make the text bold
  text.style.fontFamily = 'Arial, sans-serif'; // Use a custom font (change to your preferred font)
  text.innerText = displayText; // Text content

  overlay.appendChild(text);
  document.body.appendChild(overlay);
}

function removeOverlay() {
  const overlay = document.querySelector('.overlay');
  if (overlay) {
    overlay.parentNode.removeChild(overlay);
  }
}