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
window.updateOrderSummary = function (order = {}) {
  const container = document.querySelector('#order-details');
  container.replaceChildren();
  const fields = {drink:'Drink',size:'Size',milk:'Milk',temperature:'Temperature',extras:'Extras',quantity:'Quantity',pickupTime:'Pickup',paymentMethod:'Payment'};
  const list = document.createElement('dl');
  for (const [key,label] of Object.entries(fields)) {
    const row = document.createElement('div'); row.className='order-row';
    const term=document.createElement('dt'); term.textContent=label;
    const value=document.createElement('dd');
    value.textContent=Array.isArray(order[key]) ? (order[key].join(', ') || 'None') : String(order[key] ?? '—');
    row.append(term,value); list.append(row);
  }
  container.append(list);
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
  if(typeof window.startVoiceInput==='function') window.startVoiceInput();
  else showNotice('Voice input is not connected yet. You can type your answer below.');
});
// Person 3 calls receiveVoiceTranscript after recognition; user can edit before sending.
window.receiveVoiceTranscript = text => {input.value=String(text);input.focus();showNotice('Check what we heard, edit if needed, then press Send.');};
document.querySelector('#repeat-button').addEventListener('click',()=>{
  if(typeof window.speak==='function') window.speak(lastReply);
  else showNotice('Spoken responses are not connected yet. Bean’s latest reply is visible in the chat.');
});
document.querySelector('#change-button').addEventListener('click',()=>{
  if(typeof window.beginCorrection==='function') window.beginCorrection();
  else {input.focus();showNotice('Correction logic is not connected yet. Your teammate will connect this button to beginCorrection().');}
});
document.querySelector('#pause-button').addEventListener('click',event=>{
  paused=!paused; event.target.textContent=paused?'Resume':'Pause';event.target.setAttribute('aria-pressed',String(paused));
  document.querySelectorAll('#message-form button,#message-input,[data-answer],#change-button,#repeat-button').forEach(control=>control.disabled=paused);
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
updateOrderSummary();displayMessage(greeting);
