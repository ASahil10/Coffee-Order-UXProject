
const questions = [
    { key: "drink", text: "What drink would you like? Latte, Cappuccino, Americano, Espresso, or Coffee?" },
    { key: "size", text: "What size would you like? Small, Medium, or Large?" },
    { key: "milk", text: "What milk would you like? Regular, Oat, Almond, Soy, or None?" },
    { key: "temperature", text: "Would you like it Hot or Iced?" },
    { key: "extras", text: "Any extras? Vanilla, Caramel, Whipped Cream, or None?" },
    { key: "quantity", text: "How many drinks would you like?" },
    { key: "pickupTime", text: "What time would you like to pick up your order?" },
    { key: "paymentMethod", text: "How would you like to pay? Cash, Debit, or Credit?" }
];

const prices = {
    Coffee: 2.50,
    Latte: 4.50,
    Cappuccino: 4.00,
    Americano: 3.00,
    Espresso: 2.75
};

let order = {};
let step = 0;
let correctionMode = false;
let waitingForField = false;
let conversationPaused = false;

function reply(text) {
    if (conversationPaused) return;

    displayMessage(text, "avatar");

    if (typeof window.speak === "function") {
        window.speak(text);
    }
}

function askQuestion() {
    if (step < questions.length) {
        reply(questions[step].text);
    }
}

function calculateTotal() {
    if (!order.drink || !order.size) {
        delete order.total;
        return;
    }

    let price = prices[order.drink];

    if (order.size === "Medium") price += 0.50;
    if (order.size === "Large") price += 1.00;

    if (["Oat", "Almond", "Soy"].includes(order.milk)) {
        price += 0.75;
    }

    if (order.extras && order.extras !== "None") {
        price += 0.50;
    }

    order.total = Number(
        (price * (order.quantity || 1)).toFixed(2)
    );
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
        const answer = choices[key].find(
            choice => choice.toLowerCase() === text.toLowerCase()
        );

        return answer || null;
    }

    if (key === "quantity") {
        const number = Number(text);

        if (Number.isInteger(number) && number >= 1 && number <= 20) {
            return number;
        }

        return null;
    }

    if (key === "pickupTime") {
        const value = text.trim();

        if (value.length >= 2 && value.length <= 50) {
            return value;
        }

        return null;
    }

    return null;
}

function showOrder() {
    calculateTotal();
    updateOrderSummary(order);

    reply(
        "Your order is ready for review! " +
        order.quantity + " " + order.size + " " +
        order.drink + "(s), with " + order.milk +
        " milk, " + order.temperature +
        ", extras: " + order.extras +
        ". Pickup: " + order.pickupTime +
        ". Payment: " + order.paymentMethod +
        ". Estimated total: $" + order.total.toFixed(2) +
        " CAD. Type Confirm to finish, or use Change an answer."
    );
}

window.handleUserInput = function(text) {
    if (conversationPaused) return;

    text = String(text).trim();

    if (!text) return;

    if (correctionMode && !waitingForField) {
        const field = questions.find(
            question => question.key.toLowerCase() === text.toLowerCase()
        );

        if (!field) {
            reply("Please enter a field name such as drink, size, milk, temperature, extras, quantity, pickupTime, or paymentMethod.");
            return;
        }

        step = questions.indexOf(field);
        waitingForField = true;
        askQuestion();
        return;
    }

    if (step >= questions.length && !correctionMode) {
        if (text.toLowerCase() === "confirm") {
            reply("Thank you! Your order has been confirmed in this demo. No payment or real order was submitted.");
        } else {
            reply("Type Confirm to finish, or click Change an answer.");
        }
        return;
    }

    const key = questions[step].key;
    const answer = validateAnswer(key, text);

    if (answer === null) {
        reply("Sorry, I didn't understand that choice. Please try again.");
        askQuestion();
        return;
    }

    order[key] = answer;
    calculateTotal();
    updateOrderSummary(order);

    if (correctionMode) {
        correctionMode = false;
        waitingForField = false;
        step = questions.length;

        reply("Your answer has been updated!");
        showOrder();
        return;
    }

    step++;

    if (step < questions.length) {
        askQuestion();
    } else {
        showOrder();
    }
};

window.beginCorrection = function() {
    if (conversationPaused) return;

    if (Object.keys(order).length === 0) {
        reply("Please start your order first.");
        return;
    }

    correctionMode = true;
    waitingForField = false;

    reply("What would you like to change? Enter drink, size, milk, temperature, extras, quantity, pickupTime, or paymentMethod.");
};

window.resetConversation = function() {
    order = {};
    step = 0;
    correctionMode = false;
    waitingForField = false;
    conversationPaused = false;

    updateOrderSummary(order);
    reply("Let's start a new order!");
    askQuestion();
};

window.onPauseChanged = function(paused) {
    conversationPaused = paused;
};

updateOrderSummary(order);
