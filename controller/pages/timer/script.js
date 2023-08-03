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

let state;
window.timer_window.receive_activate((info) => {
  const btn = document.getElementById('run_code_btn');

  const run_handler = (() => {
    window.run_program();
  });

  const load_handler = (() => {
    window.load_template();
    make_run_btn(btn);

    // Update the attempted display
    totalAttempted += 1;
    const attemptedDisplay = document.getElementById("attempted");
    attemptedDisplay.textContent = `${totalAttempted}/${numQuestions}`;
  });

  btn.addEventListener('click', () => {
    if (state == 'run') {
      run_handler();
    }
    else {
      load_handler();
    }
  });

  function make_run_btn(btn) {
    btn.innerText = 'Run Code';
    state = 'run';
  }
  function make_load_btn(btn) {
    btn.innerText = 'Load';
    state = 'load';
  }

  if (!info.attempted) {
    make_load_btn(btn);
  }
  else {
    make_run_btn(btn);
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


let totalPointsPossible;
let numQuestions;
let totalAttempted = 0;

window.get_questions_info().then((info) => {
  const { questions_info } = info;

  // Calculate total points earned and total possible points
  let totalPointsEarned = 0;
  totalAttempted = 0;
  totalPointsPossible = 0;
  numQuestions = questions_info.length

  for (const question of questions_info) {
    totalPointsPossible += question.points;
    if (question.attempted) {
      totalPointsEarned += question.points_earned;
      totalAttempted++;
    }
  }

  // Update the points display
  const pointsDisplay = document.getElementById("points");
  pointsDisplay.textContent = `${totalPointsEarned}/${totalPointsPossible}`;

  // Update the attempted display
  const attemptedDisplay = document.getElementById("attempted");
  attemptedDisplay.textContent = `${totalAttempted}/${numQuestions}`;
});
