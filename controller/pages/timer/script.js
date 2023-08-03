const endButton = document.getElementById('end_test_btn');


endButton.addEventListener('click', () => {
  window.end_test_early();
})


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


// initially, user needs to select a question
addOverlayWithText('(Selection Window Is Open)');

window.timer_window.receive_activate((info) => {
  if (!info.attempted) {
    document.getElementById('run_code_btn').innerText = 'Load'
  }
  else {
    document.getElementById('run_code_btn').innerText = 'Run Code'
  }
  removeOverlay();
});








const timerElement = document.getElementById("timer");

// Function to start the countdown timer
function startTimer(initialSeconds) {
  let seconds = initialSeconds;

  // Function to update the timer display
  function updateTimer() {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    // Format the time as MM:SS
    const formattedTime = `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;

    // Update the timer display
    timerElement.textContent = `Time Left: ${formattedTime}`;

    // Check if time has run out
    if (seconds === 0) {
      clearInterval(timerInterval);
      window.time_over();
    } else {
      seconds--;
    }
  }

  // Update the timer immediately and then every second
  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);
}

// Call the startTimer function with the desired initial time in seconds
startTimer(60 * 60);


const change_question_btn = document.getElementById('change_question_btn');
change_question_btn.addEventListener('click', () => {
  addOverlayWithText('(Selection Window Is Open)');
  window.change_question();
});