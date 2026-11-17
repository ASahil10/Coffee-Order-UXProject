# Barista Bean — interface contribution

Open index.html in a browser, or use VS Code Live Server. No installation or build required. All assets are local CSS; internet is not needed for this interface.

Files owned by Person 1: index.html, style.css, interface.js. The cup avatar is CSS artwork.

## Implemented
Responsive desktop/mobile interface; avatar states; safe chat rendering; text submission and suggestion buttons; summary rendering; pause/resume; restart confirmation; accessible labels, keyboard focus, reduced motion. Voice and ordering controls show honest notices until connected. There is no real payment or order submission.

## Person 2: ordering integration
Load your conversation.js after interface.js in index.html. Provide window.handleUserInput(text). The interface already displays the user message; do not duplicate it. For each reply call displayMessage(reply, 'avatar'), then speak(reply) if the voice module is available. Call updateOrderSummary(order) when choices change.

Order keys: drink, size, milk, temperature, extras (string or array), quantity, pickupTime, paymentMethod, total (number in CAD). Missing keys display a dash. Call updateOrderSummary({drink:'Latte',size:'Medium',milk:'Oat',total:4.50}) to preview.

Provide beginCorrection() for the Change an answer button. Provide resetConversation() to clear ordering state and display the initial question after restart. Initial page greeting is displayed by interface.js; avoid displaying a second greeting on module load.

## Person 3: voice integration
Load voice.js after interface.js. Provide startVoiceInput() and speak(text). Call receiveVoiceTranscript(text) after recognition to let users inspect/edit before sending. Call setAvatarState('listening'), setAvatarState('processing'), setAvatarState('speaking'), or setAvatarState('waiting') as appropriate. Report errors using showNotice(text). Keep all spoken replies visible with displayMessage().

Listen for bean:pause (event.detail.paused) and bean:restart events to stop recognition and speech. Person 2 can implement onPauseChanged(paused) if needed. These hooks must be connected before claiming end-to-end pause/restart support. Handle permission denial, recognition retry, unavailable speech support, and prevent speech output from being recorded as input.

## Before submission
Create wireframes and persona/journey documents, connect teammates' modules, test a full order and corrections, test with at least three users, and document findings. This package finishes the interface code contribution, not the full assignment.
