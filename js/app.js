(function () {
  const $ = id => document.getElementById(id);
  const modules = { vocab: window.VocabModule, grammar: window.GrammarModule };
  let active = 'home';
  let stage = 'config';
  let pending = null;
  const dialog = $('exitDialog');
  function show(view, nextStage = 'config') {
    active = view; stage = nextStage;
    ['home', 'vocab', 'grammar'].forEach(name => $(name + 'View').classList.toggle('hidden', name !== view));
    $('appTitle').textContent = view === 'home' ? 'Studio Russo' : view === 'vocab' ? 'Vocabolario' : 'Grammatica';
    $('homeButton').classList.toggle('hidden', view === 'home');
    $('settingsButton').classList.toggle('hidden', view === 'home' || nextStage === 'config');
    ['vocab','grammar'].forEach(name => {
      $(name + 'Config').classList.toggle('hidden', !(view === name && nextStage === 'config'));
      $(name + 'Exercise').classList.toggle('hidden', !(view === name && nextStage === 'exercise'));
    });
    document.body.classList.toggle('on-home', view === 'home');
    window.scrollTo(0,0);
  }
  function leave(destination) {
    if (active === 'home') return;
    const m = modules[active];
    if (stage === 'exercise' && m.hasAnswers()) {
      pending = destination;
      dialog.showModal();
      return;
    }
    completeLeave(destination);
  }
  function completeLeave(destination) {
    modules[active].pause();
    if (destination === 'home') { show('home'); return; }
    modules[active].endSession();
    show(active, 'config');
  }
  $('cancelExit').addEventListener('click', () => {pending=null;dialog.close();});
  $('confirmExit').addEventListener('click', () => { const d=pending; pending=null; dialog.close(); if(d) completeLeave(d); });
  dialog.addEventListener('cancel', () => {pending=null;});
  $('homeButton').addEventListener('click', () => leave('home'));
  $('settingsButton').addEventListener('click', () => leave('config'));
  for(const name of ['vocab','grammar']) {
    $(name === 'vocab' ? 'openVocabButton':'openGrammarButton').addEventListener('click', () => {
      modules[name].start(); modules[name].resetDefaults(); show(name,'config');
    });
    $(name === 'vocab' ? 'startButton':'grammarStartButton').addEventListener('click', () => {
      modules[name].resetSession(); show(name,'exercise'); modules[name].begin();
    });
  }
  // Selettori segmentati legati ai select nativi, usati come unica fonte dei valori.
  function segment(id, labels) {
    const select=$(id), wrap=document.createElement('div');
    wrap.className='segment';wrap.setAttribute('role','group');
    wrap.setAttribute('aria-label',select.previousElementSibling?.textContent || 'Selezione');
    function sync(){[...wrap.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(select.selectedIndex===i)));}
    [...select.options].forEach((option,i)=>{
      const button=document.createElement('button');button.type='button';
      button.textContent=labels?.[i]||option.textContent;
      button.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();});
      wrap.appendChild(button);
    });
    select.classList.add('segment-source');select.after(wrap);select.addEventListener('change',sync);
    sync();
  }
  segment('directionSelect',['IT → RU','RU → IT']);
  segment('modeSelect',['Scelta multipla','Risposta scritta']);
  // Direzione grammaticale: stessi elementi visivi con diciture specifiche.
  segment('grammarDirectionSelect',['Base → Forma','Forma → Base']);
  $('grammarStartButton').disabled=true;
  // Gestione tastiera solo quando l'esercizio e' attivo: non interferire con controlli nativi.
  document.addEventListener('keydown', e => {
    if(e.key !== 'Enter' || e.repeat || e.isComposing || dialog.open || active === 'home' || stage !== 'exercise') return;
    if(e.target.closest('button,select,summary,a')) return;
    if(modules[active].canAdvance()) {e.preventDefault();modules[active].advance();}
  });
  window.StudyNavigation={show};
  show('home');
})();
