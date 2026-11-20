const questions = [
    { key: "drink", text: "Hello! I am Barista Bean. I can help you order your coffee using voice or text. What drink would you like? Latte, Cappuccino, Americano, Espresso, or Coffee?", options: ["Latte", "Cappuccino", "Americano", "Espresso", "Coffee"] },
    { key: "size", text: "What size would you like? Small, Medium, or Large?", options: ["Small", "Medium", "Large"] },
    { key: "milk", text: "What milk would you like? Regular, Oat, Almond, Soy, or None?", options: ["Regular", "Oat", "Almond", "Soy", "None"] },
    { key: "temperature", text: "Would you like it Hot or Iced?", options: ["Hot", "Iced"] },
    { key: "extras", text: "Any extras? Vanilla, Caramel, Whipped Cream, or None?", options: ["Vanilla", "Caramel", "Whipped Cream", "None"] },
    { key: "quantity", text: "How many drinks would you like?", options: ["1", "2", "3", "4", "5"] },
    { key: "pickupTime", text: "What time would you like to pick up your order?", options: ["10 minutes", "20 minutes", "30 minutes", "1 hour"] },
    { key: "paymentMethod", text: "How would you like to pay? For your security, I only need to know the method (Cash, Debit, or Credit), please do not share your card number.", options: ["Cash", "Debit", "Credit"] }
];

const prices = { Coffee: 2.50, Latte: 4.50, Cappuccino: 4.00, Americano: 3.00, Espresso: 2.75 };

let order = {};
let step = 0;
let correctionMode = false;
let waitingForField = false;
let conversationPaused = false;

function reply(text) {
    if (conversationPaused) return;
    if (window.displayMessage) window.displayMessage(text, "avatar");
    if (typeof window.speak === "function") window.speak(text);
}

function askQuestion() {
    if (step < questions.length) {
        reply(questions[step].text);
        if (typeof window.updateSuggestions === "function") {
            window.updateSuggestions(questions[step].options);
        }
    }
}

function calculateTotal() {
    if (!order.drink || !order.size) { delete order.total; return; }
    let price = prices[order.drink];
    if (order.size === "Medium") price += 0.50;
    if (order.size === "Large") price += 1.00;
    if (["Oat", "Almond", "Soy"].includes(order.milk)) price += 0.75;
    if (order.extras && order.extras !== "None") price += 0.50;
    order.total = Number((price * (order.quantity || 1)).toFixed(2));
}

function validateAnswer(key, text) {
    const choices = {
        drink: ["Coffee", "Latte", "Cappuccino", "Americano", "Espresso"],
        size: ["Small", "Medium", "Large"],
        milk: ["Regular", "Oat", "Almond", "Soy", "None"],
        temperature: ["Hot", "Iced"],
        extras: ["Vanilla", "Caramel", "Whipped Cream", "None"],
        paymentMethod: ["Cash", "Debit", "Credit"]
    };

    if (choices[key]) {
        return choices[key].find(choice => choice.toLowerCase() === text.toLowerCase()) || null;
    }
    if (key === "quantity") {
        const number = Number(text);
        return (Number.isInteger(number) && number >= 1 && number <= 20) ? number : null;
    }
    if (key === "pickupTime") {
        const value = text.trim();
        return (value.length >= 2 && value.length <= 50) ? value : null;
    }
    return null;
}

function showOrder() {
    calculateTotal();
    if (window.updateOrderSummary) window.updateOrderSummary(order);
    if (typeof window.updateSuggestions === "function") window.updateSuggestions(["Confirm"]);

    reply(`Your order is ready for review! ${order.quantity} ${order.size} ${order.drink}(s), with ${order.milk} milk, ${order.temperature}, extras: ${order.extras}. Pickup: ${order.pickupTime}. Payment: ${order.paymentMethod}. Estimated total: $${order.total.toFixed(2)} CAD. Type Confirm to finish, or use Change an answer.`);
}

window.handleUserInput = function(text) {
    if (conversationPaused) return;
    text = String(text).trim();
    if (!text) return;

    if (correctionMode && !waitingForField) {
        const field = questions.find(q => q.key.toLowerCase() === text.toLowerCase());
        if (!field) {
            reply("Please enter a valid field name such as drink, size, milk, temperature, extras, quantity, pickupTime, or paymentMethod.");
            return;
        }
        step = questions.indexOf(field);
        waitingForField = true;
        askQuestion();
        return;
    }

    if (step >= questions.length && !correctionMode) {
        if (text.toLowerCase() === "confirm") {
            if (typeof window.updateSuggestions === "function") window.updateSuggestions([]);
            reply("Thank you! Your order has been confirmed in this demo.");
        } else {
            reply("Type Confirm to finish, or click Change an answer.");
        }
        return;
    }

    const key = questions[step].key;
    const answer = validateAnswer(key, text);

    if (answer === null) {
        reply("I didn't quite catch that. " + questions[step].text);
        if (typeof window.updateSuggestions === "function" && questions[step].options) {
            window.updateSuggestions(questions[step].options);
        }
        return;
    }

    order[key] = answer;
    calculateTotal();
    if (window.updateOrderSummary) window.updateOrderSummary(order);

    if (correctionMode) {
        correctionMode = false;
        waitingForField = false;
        step = questions.length;
        reply("Your answer has been updated!");
        showOrder();
        return;
    }

    step++;
    if (step < questions.length) askQuestion();
    else showOrder();
};

window.beginCorrection = function() {
    if (conversationPaused) return;
    if (Object.keys(order).length === 0) {
        reply("Please start your order first.");
        return;
    }
    correctionMode = true;
    waitingForField = false;
    if (typeof window.updateSuggestions === "function") {
        window.updateSuggestions(["Drink", "Size", "Milk", "Temperature", "Extras", "Quantity", "PickupTime", "PaymentMethod"]);
    }
    reply("What would you like to change? Enter drink, size, milk, temperature, extras, quantity, pickupTime, or paymentMethod.");
};

window.resetConversation = function() {
    order = {};
    step = 0;
    correctionMode = false;
    waitingForField = false;
    conversationPaused = false;
    if (window.updateOrderSummary) window.updateOrderSummary(order);
    askQuestion();
};

window.onPauseChanged = function(paused) {
    conversationPaused = paused;
};