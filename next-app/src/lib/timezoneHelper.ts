/**
 * Utility to calculate the optimal send time based on a recipient's timezone.
 * Rules:
 * - Send days: Tuesday, Wednesday, Thursday
 * - Send window: 9:00 AM to 11:00 AM (local time to the recipient)
 * 
 * Returns a Date object representing the optimal UTC time to send the email.
 */
export function getOptimalSendTime(recipientTimezone: string): Date {
    // We use Intl.DateTimeFormat to work with the recipient's timezone
    const now = new Date();

    // Fallback if timezone is invalid
    let tz = recipientTimezone;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
    } catch (e) {
        tz = "America/New_York";
    }

    // Helper to get local date components for the target timezone
    const getTargetLocalTime = (date: Date) => {
        const str = date.toLocaleString('en-US', { timeZone: tz, hour12: false });
        // str format: "M/D/YYYY, 24:MM:SS"
        const [datePart, timePart] = str.split(', ');
        const [month, day, year] = datePart.split('/').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);

        // Also get the day of the week in that timezone (0-6)
        const weekdayStr = date.toLocaleString('en-US', { timeZone: tz, weekday: 'short' });
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekday = days.indexOf(weekdayStr);

        return { year, month: month - 1, day, hour, minute, second, weekday };
    };

    let targetLocal = getTargetLocalTime(now);

    // Valid days: Tue(2), Wed(3), Thu(4)
    const validDays = [2, 3, 4];

    let offsetDays = 0;

    // If today is a valid day, check if we missed the window (past 11 AM)
    if (validDays.includes(targetLocal.weekday)) {
        if (targetLocal.hour >= 11) {
            // Missed the window, move to the next valid day
            offsetDays = targetLocal.weekday === 4 ? 5 : 1; // If Thu, next is Tue (+5). Next is +1 otherwise.
        } else if (targetLocal.hour < 9) {
            // Still early, send today at 9 AM
            offsetDays = 0;
        } else {
            // We are IN the window (9 AM to 11 AM). Best is to send soon.
            // Let's bias towards the start of the next hour or right now + small offset
            // Actually, if we are in the window, to strictly follow "9 to 11am", we can just send "now" 
            // plus 5 minutes to avoid exact hour spikes if desired, but user didn't ask for that.
            // Let's just return a time 5 minutes from now if we are in the window.
            return new Date(now.getTime() + 5 * 60000);
        }
    } else {
        // Not a valid day. Calculate days until next Tuesday.
        // targetLocal.weekday: 0(Sun), 1(Mon), 5(Fri), 6(Sat)
        if (targetLocal.weekday === 0) offsetDays = 2; // Sun -> Tue
        else if (targetLocal.weekday === 1) offsetDays = 1; // Mon -> Tue
        else if (targetLocal.weekday === 5) offsetDays = 4; // Fri -> Tue
        else if (targetLocal.weekday === 6) offsetDays = 3; // Sat -> Tue
    }

    // Now we need to construct the Date object for 9:30 AM (middle of the window) 
    // on the target day in the target timezone.

    // A robust way to set the time in a specific timezone using JS Date:
    // Create a string that can be parsed as UTC, then find the offset
    // This is tricky in plain JS. Let's use the current offset difference.

    // We iterate hour by hour to find the exact timestamp.
    let attemptTimestamp = now.getTime();

    // Fast forward roughly `offsetDays` days
    attemptTimestamp += offsetDays * 24 * 60 * 60 * 1000;

    // Refine to find exactly 9:30 AM
    for (let i = 0; i < 48; i++) { // search within 48 hours to cross boundaries
        const checkDate = new Date(attemptTimestamp);
        const checkLocal = getTargetLocalTime(checkDate);

        if (validDays.includes(checkLocal.weekday) && checkLocal.hour === 9) {
            // We found the 9 AM hour!
            // Let's lock in 9:30 AM
            // We know attemptTimestamp puts us at hour 9. adjust minutes.
            const minDiff = 30 - checkLocal.minute;
            return new Date(attemptTimestamp + minDiff * 60000);
        }

        // increment by 1 hour
        attemptTimestamp += 60 * 60 * 1000;
    }

    // Fallback: send now
    return now;
}
