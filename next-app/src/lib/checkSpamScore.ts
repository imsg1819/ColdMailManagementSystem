import { SPAM_WORDS, SUBJECT_PENALTY, BODY_PENALTY } from "./spamWords";

export interface SpamCheckResult {
    score: number;          // 0–100, higher = safer
    flaggedWords: string[]; // list of found spam words
}

/**
 * Scans email subject + body for spam trigger words.
 * Starts at 100 and deducts per match. Subject hits penalize harder.
 * Returns { score, flaggedWords }.
 */
export function checkSpamScore(subject: string, body: string): SpamCheckResult {
    const subjectLower = subject.toLowerCase();
    // Strip HTML tags from body before scanning
    const bodyLower = body.replace(/<[^>]*>/g, " ").toLowerCase();

    const flaggedWords: string[] = [];
    let totalPenalty = 0;

    for (const word of SPAM_WORDS) {
        const wordLower = word.toLowerCase();

        // Check subject — heavier penalty
        if (subjectLower.includes(wordLower)) {
            if (!flaggedWords.includes(word)) flaggedWords.push(word);
            totalPenalty += SUBJECT_PENALTY;
        }

        // Check body — lighter penalty
        if (bodyLower.includes(wordLower)) {
            if (!flaggedWords.includes(word)) flaggedWords.push(word);
            totalPenalty += BODY_PENALTY;
        }
    }

    // Clamp score between 0 and 100
    const score = Math.max(0, 100 - totalPenalty);

    return { score, flaggedWords };
}
