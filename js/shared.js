// Funzioni comuni prive di stato: non contengono regole didattiche.
window.StudyUtils = Object.freeze({
  normalizeAnswer: function(text) {
    return String(text).trim().toLowerCase()
      .replace(/[’‘ʼʹ′´`]/g, "")
      .replace(/[ˈˊˋ]/g, "")
      .replace(/ё/g, "\uE000")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\uE000/g, "ё")
      .replace(/\s+/g, " ");
  },
  escapeHtml: function(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },
  updateStats: function(session, elements) {
    elements.total.textContent = session.total;
    elements.correct.textContent = session.correct;
    elements.wrong.textContent = session.wrong;
    const accuracy = session.total === 0 ? 0 : Math.round(session.correct / session.total * 100);
    elements.accuracy.textContent = accuracy + "%";
  }
});
