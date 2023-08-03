window.get_questions_info().then((questions_info) => {
  const scrollableContainer = document.getElementById('scrollable-container');

  console.log(questions_info);

  questions_info.forEach((question, index) => {
    const card = document.createElement('div');
    card.classList.add('card');

    const cardNumber = document.createElement('div');
    cardNumber.classList.add('card-number');
    cardNumber.textContent = `Q.No. ${index + 1}/${questions_info.length}`;
    card.appendChild(cardNumber);

    const cardTitle = document.createElement('div');
    cardTitle.classList.add('card-title');
    cardTitle.textContent = question.title;
    card.appendChild(cardTitle);

    const cardInfo = document.createElement('div');
    cardInfo.classList.add('card-info');

    const cardTopic = document.createElement('div');
    cardTopic.classList.add('card-topic');
    cardTopic.textContent = `Topic: ${question.topic}`;
    cardInfo.appendChild(cardTopic);

    const cardDifficulty = document.createElement('div');
    cardDifficulty.classList.add('card-difficulty');
    cardDifficulty.textContent = `Difficulty: ${question.difficulty}`;
    cardInfo.appendChild(cardDifficulty);

    const cardStatus = document.createElement('div');
    cardStatus.classList.add('card-status');
    cardStatus.textContent = question.attempted ? '(Attempted)' : '(Not Attempted)';
    cardInfo.appendChild(cardStatus);

    const cardPoints = document.createElement('div');
    cardPoints.classList.add('card-points');
    cardPoints.textContent = `Points Earned: ${question.points_earned}/${question.points}`;
    cardInfo.appendChild(cardPoints);

    card.appendChild(cardInfo);

    const loadButton = document.createElement('button');
    loadButton.classList.add('card-button', 'button-19');
    loadButton.textContent = 'Load';
    card.appendChild(loadButton);

    loadButton.addEventListener('click', () => {
      window.select_question(question.id);
    });

    scrollableContainer.appendChild(card);
  });
});