/* Person 1: interface only. No speech service or ordering rules are implemented here. */
const conversation = document.querySelector('#conversation');
const input = document.querySelector('#message-input');
let paused = false;
let lastReply = '';
const greeting = 'Hi! I’m Bean, your coffee companion. What can I get started for you today?';

// Person 2 calls this to display replies; textContent keeps messages safe.
window.displayMessage = function (text, sender = 'avatar') {
  const message = document.createElement('div');
  message.className = sender === 'user' ? 'message user' : 'message';
  const name = document.createElement('span');
  name.className = 'sender';
  name.textContent = sender === 'user' ? 'You' : 'Bean';
  message.append(name, document.createTextNode(String(text)));
  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
  if (sender !== 'user') lastReply = String(text);
};
window.setAvatarState = function (state) {
  const labels = {waiting:'Ready to help', listening:'Listening…', processing:'Thinking…', speaking:'Speaking…', paused:'Paused'};
  if (!(state in labels)) return;
  document.querySelector('#avatar').dataset.state = state;
  document.querySelector('#status').textContent = labels[state];
};
window.showNotice = text => { document.querySelector('#notice').textContent = text; };
// Pass numeric total in CAD. Omitted choices are displayed as not selected.
window.updateOrderSummary = function (order = {}, opts = {}) {
  const container = document.querySelector('#order-details');
  container.replaceChildren();
  const fields = {drink:'Drink',size:'Size',milk:'Milk',temperature:'Temperature',extras:'Extras',quantity:'Quantity',pickupTime:'Pickup',paymentMethod:'Payment'};
  const list = document.createElement('dl');
  for (const [key,label] of Object.entries(fields)) {
    const row = document.createElement('div'); row.className='order-row'+((opts.changed||[]).includes(key)?' flash':'')+(opts.asking===key?' now':'');
    const term=document.createElement('dt'); term.textContent=label;
    const value=document.createElement('dd');
    value.textContent=Array.isArray(order[key]) ? (order[key].join(', ') || 'None') : String(order[key] ?? '—');
    if ((opts.changed||[]).includes(key)) value.textContent+=' ✓ updated'; else if (opts.asking===key && order[key]===undefined) value.textContent='Asking now…';
    row.append(term,value);
    if (order[key] !== undefined) {   // one-tap correction for any answered item
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'row-change'; edit.textContent = 'Change'; edit.disabled = paused;
      edit.setAttribute('aria-label', 'Change ' + label.toLowerCase());
      edit.addEventListener('click', () => submitAnswer('Change ' + label.toLowerCase()));
      row.append(edit);
    }
    list.append(row);
  }
  container.append(list); setProgress(order, opts.label);
  document.querySelector('#order-total').textContent=Number.isFinite(order.total) ? new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(order.total) : '—';
};
function submitAnswer(text) {
  text = String(text).trim();
  if (!text || paused) return;
  displayMessage(text,'user'); input.value='';
  // Person 2 provides handleUserInput(text); it should not display the user message again.
  if (typeof window.handleUserInput === 'function') window.handleUserInput(text);
  else showNotice('Message displayed. The ordering logic has not been connected yet.');
}
document.querySelector('#message-form').addEventListener('submit',event=>{event.preventDefault();submitAnswer(input.value)});
document.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>submitAnswer(button.dataset.answer)));
document.querySelector('#mic-button').addEventListener('click',()=>{
  if(window.isListening&&window.isListening()) window.stopVoiceInput();
  else if(typeof window.startVoiceInput==='function') window.startVoiceInput();
  else showNotice('Voice input is not connected yet. You can type your answer below.');
});
// Person 3 calls receiveVoiceTranscript after recognition; user can edit before sending.
window.receiveVoiceTranscript = text => {
  input.value=String(text);
  if(!reviewVoice){hideHeard();submitAnswer(text);return;}
  showHeard('I heard: “'+text+'”',true);input.focus();
  showNotice('Check what we heard. Press Send, edit it, or try again.');
};
document.querySelector('#repeat-button').addEventListener('click',()=>{
  if(typeof window.speak==='function') window.speak(lastReply, true);
  else showNotice('Spoken responses are not connected yet. Bean’s latest reply is visible in the chat.');
});
document.querySelector('#change-button').addEventListener('click',()=>{
  if(typeof window.beginCorrection==='function') window.beginCorrection();
  else {input.focus();showNotice('Correction logic is not connected yet. Your teammate will connect this button to beginCorrection().');}
});
document.querySelector('#pause-button').addEventListener('click',event=>{
  paused=!paused; setBtn(event.currentTarget,paused?'▶':'⏸',paused?'Resume':'Pause');event.currentTarget.setAttribute('aria-pressed',String(paused));
  document.querySelectorAll('#message-form button,#message-input,[data-answer],#change-button,#repeat-button,.row-change').forEach(control=>control.disabled=paused);
  setAvatarState(paused?'paused':'waiting');
  window.dispatchEvent(new CustomEvent('bean:pause',{detail:{paused}}));
  if(typeof window.onPauseChanged==='function') window.onPauseChanged(paused);
});
const dialog=document.querySelector('#restart-dialog');
document.querySelector('#restart-button').addEventListener('click',()=>dialog.showModal());
document.querySelector('#cancel-restart').addEventListener('click',()=>dialog.close());
document.querySelector('#confirm-restart').addEventListener('click',()=>{
  dialog.close();
  if(paused) document.querySelector('#pause-button').click();
  conversation.replaceChildren(); input.value='';updateOrderSummary();setAvatarState('waiting');
  if(typeof window.resetConversation==='function') window.resetConversation();
  else displayMessage(greeting);
  window.dispatchEvent(new Event('bean:restart'));
  showNotice('Fresh conversation started.');input.focus();
});

/* ---- Added UX features ---- */
let reviewVoice = true;
const heard = document.querySelector('#heard'), heardText = document.querySelector('#heard-text');
function showHeard(text, withButtons) {
  heardText.textContent = text; heard.hidden = false;
  heard.querySelectorAll('button').forEach(b => b.hidden = !withButtons);
}
function hideHeard() { heard.hidden = true; }
window.showLiveTranscript = text => showHeard('Hearing: “' + text + '”', false);   // interim speech results
document.querySelector('#heard-send').addEventListener('click', () => { hideHeard(); submitAnswer(input.value); });
document.querySelector('#heard-retry').addEventListener('click', () => { hideHeard(); input.value = ''; document.querySelector('#mic-button').click(); });
document.querySelector('#message-form').addEventListener('submit', hideHeard);
window.setMicActive = on => {
  const mic = document.querySelector('#mic-button');
  mic.setAttribute('aria-pressed', String(on)); mic.classList.toggle('listening', on);
  mic.setAttribute('aria-label', on ? 'Stop listening' : 'Start voice input');
};

// Suggested answers change with each question (error prevention).
window.updateSuggestions = function (options = []) {
  const box = document.querySelector('.suggestions');
  box.replaceChildren();
  options.forEach(option => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.answer = option; button.textContent = option; button.disabled = paused;
    button.addEventListener('click', () => submitAnswer(option));
    box.append(button);
  });
};
window.setHint = text => { document.querySelector('#hint').textContent = 'Try saying: “' + text + '”. Alt+M to talk, Esc to stop.'; };

// Typing indicator shown while Bean "thinks".
window.showTyping = on => {
  document.querySelector('.typing')?.remove();
  if (!on) return;
  const dots = document.createElement('div'); dots.className = 'message typing'; dots.setAttribute('aria-hidden', 'true');
  dots.innerHTML = '<i></i><i></i><i></i>'; conversation.append(dots); conversation.scrollTop = conversation.scrollHeight;
};

function setProgress(order, label) {
  const keys = ['drink','size','milk','temperature','extras','quantity','pickupTime','paymentMethod'];
  const n = keys.filter(k => order[k] !== undefined).length;
  document.querySelector('#progress-text').textContent = label || ('Step ' + Math.min(n + 1, keys.length) + ' of ' + keys.length);
  document.querySelector('#progress-count').textContent = n + ' of ' + keys.length + ' answered';
  const bar = document.querySelector('#progress-bar');
  bar.setAttribute('aria-valuenow', n);
  bar.firstElementChild.style.width = (label === 'Order placed ✓' ? 100 : n / keys.length * 100) + '%';
}

// Receipt card after the order is confirmed.
window.showReceipt = function (order, number) {
  const card = document.createElement('div'); card.className = 'receipt';
  const title = document.createElement('h3'); title.textContent = 'Order #' + number + ' confirmed'; card.append(title);
  const extras = Array.isArray(order.extras) ? (order.extras.join(', ') || 'None') : order.extras;
  [['Order', order.quantity + ' × ' + order.size + ' ' + order.temperature + ' ' + order.drink + ' (' + (order.milk === 'None' ? 'no milk' : order.milk + ' milk') + ')'],
   ['Extras', extras], ['Pickup', order.pickupTime], ['Payment', order.paymentMethod], ['Total', '$' + order.total.toFixed(2) + ' CAD']]
    .forEach(([k, v]) => { const p = document.createElement('p'); p.textContent = k + ': ' + v; card.append(p); });
  conversation.append(card); conversation.scrollTop = conversation.scrollHeight;
};

// Back (undo), voice-review toggle, text size, keyboard shortcuts.
document.querySelector('#back-button').addEventListener('click', () => {
  if (paused) return; displayMessage('Back', 'user');
  if (typeof window.handleUserInput === 'function') window.handleUserInput('back');
});
document.querySelector('#review-button').addEventListener('click', event => {
  reviewVoice = !reviewVoice; event.currentTarget.setAttribute('aria-pressed', String(reviewVoice));
  setBtn(event.currentTarget, '📝', 'Review voice: ' + (reviewVoice ? 'on' : 'off'));
});
let zoom = 1;
const setZoom = d => { zoom = Math.max(1, Math.min(1.5, zoom + d)); document.documentElement.style.setProperty('--zoom', zoom); };
document.querySelector('#text-larger').addEventListener('click', () => setZoom(0.125));
document.querySelector('#text-smaller').addEventListener('click', () => setZoom(-0.125));
document.addEventListener('keydown', event => {
  if (event.altKey && event.code === 'KeyM') { event.preventDefault(); document.querySelector('#mic-button').click(); }
  if (event.key === 'Escape' && !dialog.open && typeof window.stopAllVoice === 'function') window.stopAllVoice();
});
// Spoken replies on/off (text is always shown).
let speakOn = true;
document.querySelector('#voice-button').addEventListener('click', event => {
  speakOn = !speakOn; event.currentTarget.setAttribute('aria-pressed', String(speakOn));
  setBtn(event.currentTarget, speakOn ? '🔊' : '🔇', 'Spoken replies: ' + (speakOn ? 'on' : 'off'));
  if (typeof window.setSpeakEnabled === 'function') window.setSpeakEnabled(speakOn);
  showNotice(speakOn ? 'Bean will read replies aloud.' : 'Spoken replies are off. Replies still appear as text.');
});
// Light / dark theme switch (remembered between visits). Light is the default.
function setBtn(button, icon, label) { button.querySelector('.ic').textContent = icon; button.querySelector('.lbl').textContent = label; }
const themeButton = document.querySelector('#theme-button');
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  setBtn(themeButton, theme === 'dark' ? '☀️' : '🌙', theme === 'dark' ? 'Light mode' : 'Dark mode');
  try { localStorage.setItem('bean-theme', theme); } catch (e) { /* storage may be blocked */ }
}
themeButton.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
let savedTheme = 'light'; try { savedTheme = localStorage.getItem('bean-theme') || 'light'; } catch (e) {}
applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
updateOrderSummary();displayMessage(greeting);
