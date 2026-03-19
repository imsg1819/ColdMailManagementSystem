// 50+ common spam trigger words that email providers flag
// Each word is lowercase for case-insensitive matching
export const SPAM_WORDS: string[] = [
    // Urgency & pressure
    "act now", "urgent", "hurry", "limited time", "expires", "immediately",
    "don't miss", "last chance", "only today", "deadline",

    // Money & financial
    "free", "winner", "prize", "cash", "bonus", "earn money",
    "no cost", "no fees", "save big", "discount", "cheap",
    "double your", "make money", "extra income", "financial freedom",

    // Too-good-to-be-true
    "guaranteed", "risk free", "no obligation", "100%", "promise",
    "miracle", "amazing", "incredible offer", "once in a lifetime",

    // Call-to-action spam
    "click here", "click below", "click now", "buy now", "order now",
    "subscribe now", "sign up free", "join now", "apply now",

    // Shady phrases
    "congratulations", "you have been selected", "dear friend",
    "no strings attached", "this is not spam", "bulk email",
    "mass email", "undisclosed", "hidden charges",

    // Marketing overuse
    "special promotion", "exclusive deal", "best price",
    "lowest price", "offer expires", "while supplies last",
    "call now", "toll free", "credit card", "unsecured",
];

// Points deducted per spam word found (heavier for subject line)
export const SUBJECT_PENALTY = 8;  // Subject spam hits harder
export const BODY_PENALTY = 4;     // Body spam is less severe
