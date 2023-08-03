const startButton = document.getElementById('start-btn');

startButton.addEventListener('click', () => {
  window.start_test();
});

const closeButton = document.getElementById('close-button');
closeButton.addEventListener('click', () => {
  window.close_window();
});