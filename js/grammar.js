window.GrammarModule = (function() {
  let grammarItems = [];
  let currentExercise = null;
  let initialized = false;
  let optionsOpen = true;
  let autoNextTimer = null;

  const RECENT_LIMIT = 10;
  const AUTO_NEXT_DELAY = 1000;
  const MAX_PICK_ATTEMPTS = 80;
  const N_WRONG = 10;

  const session = {
    type: "all",
    category: "all",
    direction: "base_to_form",
    total: 0,
    correct: 0,
    wrong: 0,
    recentIds: [],
    statsById: {}
  };

  const grammarView = document.getElementById("grammarView");

  function start() {
    if (!initialized) {
      initialized = true;
      bindEvents();
      loadGrammar();
      return;
    }

    renderStartMessage();
  }

  function bindEvents() {
    const startButton = document.getElementById("grammarStartButton");
    const toggleOptionsButton = document.getElementById("grammarToggleOptionsButton");
    const nextButton = document.getElementById("grammarNextButton");

    startButton.addEventListener("click", function() {
      updateSettingsFromControls();
      closeOptions();
      nextQuestion();
    });

    toggleOptionsButton.addEventListener("click", function() {
      toggleOptions();
    });

    nextButton.addEventListener("click", function() {
      nextQuestion();
    });
  }

  function loadGrammar() {
    fetch("data/grammar.json?nocache=" + Date.now())
      .then(function(response) {
        if (!response.ok) {
          throw new Error("Errore nel caricamento di data/grammar.json");
        }

        return response.json();
      })
      .then(function(data) {
        grammarItems = Array.isArray(data.items)
          ? data.items.filter(function(item) {
              return item.active;
            })
          : [];

        initializeSessionStats();
        populateFilters();
        renderStartMessage();
        updateStatsDisplay();
      })
      .catch(function(error) {
        const questionArea = document.getElementById("grammarQuestionArea");

        questionArea.innerHTML =
          '<p class="placeholder">Errore: ' +
          escapeHtml(error.message) +
          '</p>';
      });
  }

  function initializeSessionStats() {
    session.statsById = {};

    grammarItems.forEach(function(item) {
      getAvailableFormKeys(item).forEach(function(formKey) {
        const baseToFormId = buildExerciseId(item, formKey, "base_to_form");
        const formToBaseId = buildExerciseId(item, formKey, "form_to_base");

        session.statsById[baseToFormId] = createEmptyStat();
        session.statsById[formToBaseId] = createEmptyStat();
      });
    });
  }

  function createEmptyStat() {
    return {
      seen: 0,
      correct: 0,
      wrong: 0,
      lastSeen: null,
      prompt: "",
      answer: ""
    };
  }

  function populateFilters() {
    const categorySelect = document.getElementById("grammarCategorySelect");

    const categories = [];

    grammarItems.forEach(function(item) {
      if (item.category && categories.indexOf(item.category) === -1) {
        categories.push(item.category);
      }
    });

    categories.sort();

    categories.forEach(function(category) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categorySelect.appendChild(option);
    });
  }

  function renderStartMessage() {
    const questionArea = document.getElementById("grammarQuestionArea");
    const answerArea = document.getElementById("grammarAnswerArea");
    const feedbackArea = document.getElementById("grammarFeedbackArea");
    const nextButton = document.getElementById("grammarNextButton");

    clearAutoNextTimer();

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
    const optionsPanel = document.getElementById("grammarOptionsPanel");
    const toggleOptionsButton = document.getElementById("grammarToggleOptionsButton");

    optionsOpen = true;
    optionsPanel.classList.remove("closed");
    toggleOptionsButton.textContent = "Nascondi opzioni";
  }

  function closeOptions() {
    const optionsPanel = document.getElementById("grammarOptionsPanel");
    const toggleOptionsButton = document.getElementById("grammarToggleOptionsButton");

    optionsOpen = false;
    optionsPanel.classList.add("closed");
    toggleOptionsButton.textContent = "Mostra opzioni";
  }

  function updateSettingsFromControls() {
    const typeSelect = document.getElementById("grammarTypeSelect");
    const categorySelect = document.getElementById("grammarCategorySelect");
    const directionSelect = document.getElementById("grammarDirectionSelect");

    session.type = typeSelect.value;
    session.category = categorySelect.value;
    session.direction = directionSelect.value;
  }

  function getFilteredItems() {
    return grammarItems.filter(function(item) {
      const matchType =
        session.type === "all" ||
        item.type === session.type;

      const matchCategory =
        session.category === "all" ||
        item.category === session.category;

      return matchType && matchCategory && getAvailableFormKeys(item).length > 0;
    });
  }

  function nextQuestion() {
    clearAutoNextTimer();
    updateSettingsFromControls();

    const available = getFilteredItems();

    if (available.length === 0) {
      const questionArea = document.getElementById("grammarQuestionArea");
      const answerArea = document.getElementById("grammarAnswerArea");
      const feedbackArea = document.getElementById("grammarFeedbackArea");
      const nextButton = document.getElementById("grammarNextButton");
      nextButton.classList.add("hidden");

      questionArea.innerHTML =
        '<p class="placeholder">Nessuna forma disponibile con questi filtri.</p>';

      answerArea.innerHTML = "";
      feedbackArea.innerHTML = "";

      

      return;
    }

    currentExercise = chooseRandomExercise(available);

    if (!currentExercise) {
      const questionArea = document.getElementById("grammarQuestionArea");

      questionArea.innerHTML =
        '<p class="placeholder">Impossibile selezionare un esercizio.</p>';

      return;
    }

    renderQuestion(currentExercise);
    renderWrittenAnswer();

    const feedbackArea = document.getElementById("grammarFeedbackArea");
    feedbackArea.innerHTML = "";

    const nextButton = document.getElementById("grammarNextButton");
    nextButton.classList.add("hidden");
  }

  function chooseRandomExercise(items) {
    for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS; attempt++) {
      const item = randomChoice(items);
      const formKeys = getAvailableFormKeys(item);

      if (formKeys.length === 0) {
        continue;
      }

      const formKey = randomChoice(formKeys);
      const exercise = buildExercise(item, formKey);

      if (session.recentIds.indexOf(exercise.id) === -1) {
        return exercise;
      }
    }

    const fallbackItem = randomChoice(items);

    if (!fallbackItem) {
      return null;
    }

    const fallbackKeys = getAvailableFormKeys(fallbackItem);

    if (fallbackKeys.length === 0) {
      return null;
    }

    return buildExercise(fallbackItem, randomChoice(fallbackKeys));
  }

  function buildExercise(item, formKey) {
    const direction = session.direction;
    const formValue = String(item.forms[formKey]).trim();
    const formLabel = getFormLabel(formKey);
    const id = buildExerciseId(item, formKey, direction);

    if (direction === "form_to_base") {
      return {
        id: id,
        item: item,
        formKey: formKey,
        formLabel: formLabel,
        question: formValue,
        prompt: "forma base",
        answer: item.base,
        displayPrompt: formLabel
      };
    }

    return {
      id: id,
      item: item,
      formKey: formKey,
      formLabel: formLabel,
      question: item.base,
      prompt: formLabel,
      answer: formValue,
      displayPrompt: item.italian || ""
    };
  }

  function buildExerciseId(item, formKey, direction) {
    return item.type + ":" + item.id + ":" + formKey + ":" + direction;
  }

  function renderQuestion(exercise) {
    const questionArea = document.getElementById("grammarQuestionArea");

    let html = "";

    html += '<div class="question-main">' +
      escapeHtml(exercise.question) +
      '</div>';

    html += '<div class="question-prompt">';

    if (exercise.prompt && exercise.prompt.trim() !== "") {
      html += escapeHtml(exercise.prompt);
    } else {
      html += "&nbsp;";
    }

    html += '</div>';

    if (exercise.displayPrompt && exercise.displayPrompt.trim() !== "") {
      html += '<div class="meta">' +
        escapeHtml(exercise.displayPrompt) +
        '</div>';
    } else {
      html += '<div class="meta">&nbsp;</div>';
    }

    questionArea.innerHTML = html;
  }

  function renderWrittenAnswer() {
    const answerArea = document.getElementById("grammarAnswerArea");

    answerArea.innerHTML =
      '<div class="written-row">' +
        '<input id="grammarWrittenInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" />' +
        '<button id="grammarCheckButton">OK</button>' +
      '</div>';

    const input = document.getElementById("grammarWrittenInput");
    const checkButton = document.getElementById("grammarCheckButton");

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
      normalizeAnswer(userAnswer) === normalizeAnswer(currentExercise.answer);

    input.disabled = true;
    button.disabled = true;

    processAnswer(isCorrect);
  }

  function processAnswer(isCorrect) {
    updateStats(currentExercise, isCorrect);
    updateRecentIds(currentExercise.id);
    updateStatsDisplay();

    const feedbackArea = document.getElementById("grammarFeedbackArea");
    const nextButton = document.getElementById("grammarNextButton");

    nextButton.classList.add("hidden");

    if (isCorrect) {
      feedbackArea.innerHTML =
        '<div class="feedback correct">Corretto.</div>';

      autoNextTimer = setTimeout(function() {
        nextQuestion();
      }, AUTO_NEXT_DELAY);

      return;
    }

    feedbackArea.innerHTML =
      '<div class="feedback wrong">Sbagliato. Risposta corretta: ' +
      escapeHtml(currentExercise.answer) +
      '</div>';

    nextButton.classList.remove("hidden");
  }

  function updateStats(exercise, isCorrect) {
    let stat = session.statsById[exercise.id];

    if (!stat) {
      stat = createEmptyStat();
      session.statsById[exercise.id] = stat;
    }

    stat.seen += 1;
    stat.lastSeen = session.total + 1;
    stat.prompt = exercise.question + " — " + exercise.prompt;
    stat.answer = exercise.answer;

    if (isCorrect) {
      stat.correct += 1;
      session.correct += 1;
    } else {
      stat.wrong += 1;
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
    const totalStat = document.getElementById("grammarTotalStat");
    const correctStat = document.getElementById("grammarCorrectStat");
    const wrongStat = document.getElementById("grammarWrongStat");
    const accuracyStat = document.getElementById("grammarAccuracyStat");

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
    const wrongList = document.getElementById("grammarWrongList");

    const items = Object.keys(session.statsById)
      .map(function(id) {
        const stat = session.statsById[id];

        return {
          id: id,
          stat: stat
        };
      })
      .filter(function(entry) {
        return entry.stat.wrong > 0;
      })
      .sort(function(a, b) {
        return b.stat.wrong - a.stat.wrong;
      })
      .slice(0, N_WRONG);

    wrongList.innerHTML = "";

    items.forEach(function(entry) {
      const li = document.createElement("li");

      li.textContent =
        entry.stat.prompt +
        " → " +
        entry.stat.answer +
        " — " +
        entry.stat.wrong +
        " errori";

      wrongList.appendChild(li);
    });
  }

  function getAvailableFormKeys(item) {
    if (!item.forms) {
      return [];
    }

    return Object.keys(item.forms).filter(function(key) {
      const value = item.forms[key];
      return value !== null && value !== undefined && String(value).trim() !== "";
    });
  }

  function getFormLabel(formKey) {
    const labels = {
      nom_sg: "nominativo singolare",
      gen_sg: "genitivo singolare",
      dat_sg: "dativo singolare",
      acc_sg: "accusativo singolare",
      instr_sg: "strumentale singolare",
      prep_sg: "prepositivo singolare",

      nom_pl: "nominativo plurale",
      gen_pl: "genitivo plurale",
      dat_pl: "dativo plurale",
      acc_pl: "accusativo plurale",
      instr_pl: "strumentale plurale",
      prep_pl: "prepositivo plurale",

      present_1sg: "presente, 1ª singolare",
      present_2sg: "presente, 2ª singolare",
      present_3sg: "presente, 3ª singolare",
      present_1pl: "presente, 1ª plurale",
      present_2pl: "presente, 2ª plurale",
      present_3pl: "presente, 3ª plurale",

      future_1sg: "futuro, 1ª singolare",
      future_2sg: "futuro, 2ª singolare",
      future_3sg: "futuro, 3ª singolare",
      future_1pl: "futuro, 1ª plurale",
      future_2pl: "futuro, 2ª plurale",
      future_3pl: "futuro, 3ª plurale",

      past_m: "passato maschile",
      past_f: "passato femminile",
      past_n: "passato neutro",
      past_pl: "passato plurale",

      imperative_sg: "imperativo singolare",
      imperative_pl: "imperativo plurale"
    };

    return labels[formKey] || formKey;
  }

  function normalizeAnswer(text) {
    let value = String(text).trim().toLowerCase();

    value = value.split("ё").join("е");
    value = value.replace(/\s+/g, " ");

    return value;
  }

  function randomChoice(array) {
    if (!array || array.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  function clearAutoNextTimer() {
    if (autoNextTimer) {
      clearTimeout(autoNextTimer);
      autoNextTimer = null;
    }
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