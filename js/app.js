const homeView = document.getElementById("homeView");
const vocabView = document.getElementById("vocabView");
const grammarView = document.getElementById("grammarView");

const homeButton = document.getElementById("homeButton");
const openVocabButton = document.getElementById("openVocabButton");
const openGrammarButton = document.getElementById("openGrammarButton");

openVocabButton.addEventListener("click", function() {
  showView("vocab");

  if (window.VocabModule) {
    window.VocabModule.start();
  }
});

openGrammarButton.addEventListener("click", function() {
  showView("grammar");

  if (window.GrammarModule) {
    window.GrammarModule.start();
  }
});

homeButton.addEventListener("click", function() {
  showView("home");
});

function showView(viewName) {
  homeView.classList.add("hidden");
  vocabView.classList.add("hidden");
  grammarView.classList.add("hidden");
  homeButton.classList.add("hidden");

  if (viewName === "home") {
    homeView.classList.remove("hidden");
    return;
  }

  if (viewName === "vocab") {
    vocabView.classList.remove("hidden");
    homeButton.classList.remove("hidden");
    return;
  }

  if (viewName === "grammar") {
    grammarView.classList.remove("hidden");
    homeButton.classList.remove("hidden");
  }
}