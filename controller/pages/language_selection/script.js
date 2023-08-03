const languageButtons = document.querySelectorAll('.box');

languageButtons.forEach(button => {
  button.addEventListener('click', function () {
    const selectedLanguage = button.textContent.toLowerCase();
    window.select_language(selectedLanguage);
  });
});