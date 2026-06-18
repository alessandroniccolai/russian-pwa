window.VocabModule = (function() {
  let vocab = [];
  let currentItem = null;
  let currentCorrectAnswer = "";
  let currentDirection = "it-ru";
  let currentMode = "multiple";
  let initialized = false;
  let optionsOpen = true;
  let autoNextTimer = null;

  const RECENT_LIMIT = 5;
  const AUTO_NEXT_DELAY = 1000;

  const session = {
    category: "all",
    type: "all",
    total: 0,
    correct: 0,
    wrong: 0,
    recentIds: [],
    statsById: {}
  };

  const directionSelect = document.getElementById("directionSelect");
  const modeSelect = document.getElementById("modeSelect");
  const categorySelect = document.getElementById("categorySelect");
  const typeSelect = document.getElementById("typeSelect");
  const startButton = document.getElementById("startButton");
  const nextButton = document.getElementById("nextButton");
  const toggleOptionsButton = document.getElementById("toggleOptionsButton");
  const optionsPanel = document.getElementById("optionsPanel");

  const questionArea = document.getElementById("questionArea");
  const answerArea = document.getElementById("answerArea");
  const feedbackArea = document.getElementById("feedbackArea");

  const totalStat = document.getElementById("totalStat");
  const correctStat = document.getElementById("correctStat");
  const wrongStat = document.getElementById("wrongStat");
  const accuracyStat = document.getElementById("accuracyStat");
  const wrongList = document.getElementById("wrongList");

  function start() {
    if (initialized) {
      return;
    }

    initialized = true;
    bindEvents();
    loadVocab();
  }

  function bindEvents() {
    startButton.addEventListener("click", function() {
      updateSettingsFromControls();
      closeOptions();
      nextQuestion();
    });

    nextButton.addEventListener("click", function() {
      nextQuestion();
    });

    toggleOptionsButton.addEventListener("click", function() {
      toggleOptions();
    });
  }

  function loadVocab() {
    fetch("data/vocab.json")
      .then(function(response) {
        if (!response.ok) {
          throw new Error("Errore nel caricamento di data/vocab.json");
        }
        return response.json();
      })
      .then(function(data) {
        vocab = data.filter(function(item) {
          return item.active;
        });

        initializeSessionStats();
        populateFilters();
        renderStartMessage();
      })
      .catch(function(error) {
        questionArea.innerHTML =
          '<p class="placeholder">Errore: ' + escapeHtml(error.message) + "</p>";
      });
  }

  function initializeSessionStats() {
    vocab.forEach(function(item) {
      session.statsById[item.id] = {
        seen: 0,
        correct: 0,
        wrong: 0,
        weight: 1.0,
        lastSeen: null
      };
    });
  }

  function populateFilters() {
    const categories = [];
    const types = [];

    vocab.forEach(function(item) {
      item.categories.forEach(function(category) {
        if (categories.indexOf(category) === -1) {
          categories.push(category);
        }
      });

      if (types.indexOf(item.type) === -1) {
        types.push(item.type);
      }
    });

    categories.sort();
    types.sort();

    categories.forEach(function(category) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });

    types.forEach(function(type) {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      typeSelect.appendChild(option);
    });
  }

  function renderStartMessage() {
    questionArea.innerHTML =
      '<p class="placeholder">Scegli le opzioni e premi “Inizia”.</p>';
    answerArea.innerHTML = "";
    feedbackArea.innerHTML = "";
    nextButton.classList.add("hidden");
  }

  function toggleOptions() {
    if (optionsOpen) {
      closeOptions();
    } else {
      openOptions();
    }
  }

  function openOptions() {
    optionsOpen = true;
    optionsPanel.classList.remove("closed");
    toggleOptionsButton.textContent = "Nascondi opzioni";
  }

  function closeOptions() {
    optionsOpen = false;
    optionsPanel.classList.add("closed");
    toggleOptionsButton.textContent = "Mostra opzioni";
  }

  function updateSettingsFromControls() {
    currentDirection = directionSelect.value;
    currentMode = modeSelect.value;
    session.category = categorySelect.value;
    session.type = typeSelect.value;
  }

  function getFilteredVocab() {
    return vocab.filter(function(item) {
      const matchCategory =
        session.category === "all" ||
        item.categories.indexOf(session.category) !== -1;

      const matchType =
        session.type === "all" ||
        item.type === session.type;

      return matchCategory && matchType;
    });
  }

  function nextQuestion() {
    clearAutoNextTimer();
    updateSettingsFromControls();

    const available = getFilteredVocab();

    if (available.length === 0) {
      questionArea.innerHTML =
        '<p class="placeholder">Nessun vocabolo disponibile con questi filtri.</p>';
      answerArea.innerHTML = "";
      feedbackArea.innerHTML = "";
      nextButton.classList.add("hidden");
      return;
    }

    currentItem = chooseWeightedItem(available);

    if (!currentItem) {
      questionArea.innerHTML =
        '<p class="placeholder">Impossibile selezionare una parola.</p>';
      return;
    }

    renderQuestion(currentItem);

    if (currentMode === "multiple") {
      renderMultipleChoice(currentItem, available);
    } else {
      renderWrittenAnswer();
    }

    feedbackArea.innerHTML = "";
    nextButton.classList.add("hidden");
  }

  function chooseWeightedItem(items) {
    let candidates = items.filter(function(item) {
      return session.recentIds.indexOf(item.id) === -1;
    });

    if (candidates.length === 0) {
      candidates = items.slice();
    }

    let totalWeight = 0;

    candidates.forEach(function(item) {
      totalWeight += session.statsById[item.id].weight;
    });

    let randomValue = Math.random() * totalWeight;

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      randomValue -= session.statsById[item.id].weight;

      if (randomValue <= 0) {
        return item;
      }
    }

    return candidates[candidates.length - 1];
  }

function renderQuestion(item) {
  const questionText = currentDirection === "it-ru" ? item.it : item.ru;
  const promptText =
    currentDirection === "it-ru" ? item.prompt.it : item.prompt.ru;
  const answerText = currentDirection === "it-ru" ? item.ru : item.it;

  currentCorrectAnswer = answerText;

  let html = "";

  html += '<div class="question-main">' + escapeHtml(questionText) + "</div>";

  html += '<div class="question-prompt">';
  if (promptText && promptText.trim() !== "") {
    html += escapeHtml(promptText);
  } else {
    html += "&nbsp;";
  }
  html += "</div>";

  questionArea.innerHTML = html;
}

  function renderMultipleChoice(item, available) {
    const correct = currentDirection === "it-ru" ? item.ru : item.it;
    const alternatives = buildAlternatives(item, available, correct);

    let html = "";

    if (alternatives.length < 4) {
      html += '<p class="placeholder">';
      html += "Nota: il dataset contiene solo ";
      html += alternatives.length;
      html += " alternative disponibili.";
      html += "</p>";
    }

    html += '<div class="answers">';

    alternatives.forEach(function(answer) {
      html +=
        '<button class="answer-button" data-answer="' +
        escapeHtml(answer) +
        '">';
      html += escapeHtml(answer);
      html += "</button>";
    });

    html += "</div>";

    answerArea.innerHTML = html;

    const buttons = answerArea.querySelectorAll(".answer-button");

    buttons.forEach(function(button) {
      button.addEventListener("click", function() {
        const selectedAnswer = button.getAttribute("data-answer");
        const isCorrect = selectedAnswer === correct;

        buttons.forEach(function(btn) {
          btn.disabled = true;

          if (btn.getAttribute("data-answer") === correct) {
            btn.classList.add("correct");
          }

          if (btn === button && !isCorrect) {
            btn.classList.add("wrong");
          }
        });

        processAnswer(isCorrect);
      });
    });
  }

  function buildAlternatives(item, available, correct) {
    const alternatives = [correct];

    const allCandidates = vocab.filter(function(candidate) {
      if (candidate.id === item.id) {
        return false;
      }

      const candidateAnswer =
        currentDirection === "it-ru" ? candidate.ru : candidate.it;

      return candidateAnswer !== correct;
    });

    const availableIds = available.map(function(candidate) {
      return candidate.id;
    });

    const preferredInsideFilter = allCandidates.filter(function(candidate) {
      const insideFilter = availableIds.indexOf(candidate.id) !== -1;
      const similar = isSimilarDistractor(candidate, item);

      return insideFilter && similar;
    });

    const otherInsideFilter = allCandidates.filter(function(candidate) {
      const insideFilter = availableIds.indexOf(candidate.id) !== -1;
      const similar = isSimilarDistractor(candidate, item);

      return insideFilter && !similar;
    });

    const preferredOutsideFilter = allCandidates.filter(function(candidate) {
      const insideFilter = availableIds.indexOf(candidate.id) !== -1;
      const similar = isSimilarDistractor(candidate, item);

      return !insideFilter && similar;
    });

    const otherOutsideFilter = allCandidates.filter(function(candidate) {
      const insideFilter = availableIds.indexOf(candidate.id) !== -1;
      const similar = isSimilarDistractor(candidate, item);

      return !insideFilter && !similar;
    });

    const orderedDistractors = []
      .concat(shuffleArray(preferredInsideFilter))
      .concat(shuffleArray(otherInsideFilter))
      .concat(shuffleArray(preferredOutsideFilter))
      .concat(shuffleArray(otherOutsideFilter));

    for (let i = 0; i < orderedDistractors.length; i++) {
      const candidate = orderedDistractors[i];

      const answer =
        currentDirection === "it-ru" ? candidate.ru : candidate.it;

      if (alternatives.indexOf(answer) === -1) {
        alternatives.push(answer);
      }

      if (alternatives.length === 4) {
        break;
      }
    }

    return shuffleArray(alternatives);
  }

  function isSimilarDistractor(candidate, item) {
  return candidate.type === item.type;
}

  function renderWrittenAnswer() {
    answerArea.innerHTML =
      '<div class="written-row">' +
      '<input id="writtenInput" type="text" autocomplete="off" autocapitalize="off" />' +
      '<button id="checkButton">OK</button>' +
      "</div>";

    const input = document.getElementById("writtenInput");
    const checkButton = document.getElementById("checkButton");

    input.focus();

    checkButton.addEventListener("click", function() {
      checkWrittenAnswer(input, checkButton);
    });

    input.addEventListener("keydown", function(event) {
      if (event.key === "Enter") {
        checkWrittenAnswer(input, checkButton);
      }
    });
  }

  function checkWrittenAnswer(input, button) {
    const userAnswer = input.value;

    const isCorrect =
      normalizeAnswer(userAnswer) === normalizeAnswer(currentCorrectAnswer);

    input.disabled = true;
    button.disabled = true;

    processAnswer(isCorrect);
  }

  function processAnswer(isCorrect) {
  updateAdaptiveStats(currentItem, isCorrect);
  updateRecentIds(currentItem.id);
  updateStatsDisplay();

  nextButton.classList.add("hidden");

  if (isCorrect) {
    feedbackArea.innerHTML =
      '<div class="feedback correct">Corretto.</div>';
  } else {
    feedbackArea.innerHTML =
      '<div class="feedback wrong">Sbagliato. Risposta corretta: ' +
      escapeHtml(currentCorrectAnswer) +
      "</div>";
  }

  autoNextTimer = setTimeout(function() {
    nextQuestion();
  }, AUTO_NEXT_DELAY);
}

  function clearAutoNextTimer() {
    if (autoNextTimer) {
      clearTimeout(autoNextTimer);
      autoNextTimer = null;
    }
  }

  function updateAdaptiveStats(item, isCorrect) {
    const stat = session.statsById[item.id];

    stat.seen += 1;
    stat.lastSeen = session.total + 1;

    if (isCorrect) {
      stat.correct += 1;
      stat.weight = Math.max(0.25, stat.weight * 0.6);
      session.correct += 1;
    } else {
      stat.wrong += 1;
      stat.weight = Math.min(6.0, stat.weight * 2.0);
      session.wrong += 1;
    }

    session.total += 1;
  }

  function updateRecentIds(id) {
    session.recentIds.push(id);

    while (session.recentIds.length > RECENT_LIMIT) {
      session.recentIds.shift();
    }
  }

  function updateStatsDisplay() {
    totalStat.textContent = session.total;
    correctStat.textContent = session.correct;
    wrongStat.textContent = session.wrong;

    const accuracy =
      session.total === 0
        ? 0
        : Math.round((session.correct / session.total) * 100);

    accuracyStat.textContent = accuracy + "%";

    renderWrongList();
  }

  function renderWrongList() {
    const items = vocab
      .map(function(item) {
        const stat = session.statsById[item.id];

        return {
          item: item,
          wrong: stat.wrong
        };
      })
      .filter(function(entry) {
        return entry.wrong > 0;
      })
      .sort(function(a, b) {
        return b.wrong - a.wrong;
      })
      .slice(0, 5);

    wrongList.innerHTML = "";

    items.forEach(function(entry) {
      const li = document.createElement("li");

      li.textContent =
        entry.item.ru +
        " → " +
        entry.item.it +
        " — " +
        entry.wrong +
        " errori";

      wrongList.appendChild(li);
    });
  }

  function normalizeAnswer(text) {
    let value = String(text).trim().toLowerCase();

    value = value.split("ё").join("е");

    return value;
  }

  function shuffleArray(array) {
    const copy = array.slice();

    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }

    return copy;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    start: start
  };
})();