
import { LEAGUE_AVERAGE_PROBS, probabilitiesToDiceRanges, outcomeToCode } from './startomatic/lib/probabilities';

function debugProbabilities() {
    console.log("League Average Probabilities:", LEAGUE_AVERAGE_PROBS);
    const ranges = probabilitiesToDiceRanges(LEAGUE_AVERAGE_PROBS);
    console.log("Dice Ranges:", ranges);

    let totalSlots = 0;
    for (const outcomes of Object.keys(ranges)) {
        const range = ranges[outcomes];
        const count = range[1] - range[0] + 1;
        console.log(`${outcomes}: [${range[0]}, ${range[1]}] (Count: ${count})`);

        // Check if range is valid (start > previous end) logic is handled inside function, 
        // but let's check for overlaps or if things are missing locally.
    }
}

debugProbabilities();
