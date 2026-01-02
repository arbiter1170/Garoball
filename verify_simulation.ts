
import { simulatePlateAppearance, initializeGame } from './startomatic/lib/simulation';
import { SeededRng } from './startomatic/lib/rng';
import { LEAGUE_AVERAGE_PROBS } from './startomatic/lib/probabilities';

// Mock context 
const mockGame = initializeGame('season1', 'team1', 'team2', ['p1'], ['p2'], 'pitcher1', 'pitcher2', 1);
const rng = new SeededRng('test-seed');

const ctx = {
    game: mockGame as any,
    homeRatings: new Map(), // Empty map means league average will be used
    awayRatings: new Map(),
    rng
};

function verifySimulation() {
    const counts: Record<string, number> = {};
    const total = 10000;

    for (let i = 0; i < total; i++) {
        const result = simulatePlateAppearance(ctx);
        counts[result.outcome] = (counts[result.outcome] || 0) + 1;
    }

    console.log("Outcome Distribution (10,000 simulations):");
    for (const outcome of Object.keys(counts)) {
        const pct = (counts[outcome] / total) * 100;
        const expected = (LEAGUE_AVERAGE_PROBS[outcome as any] || 0) * 100;
        console.log(`${outcome}: ${pct.toFixed(2)}% (Expected: ${expected.toFixed(2)}%)`);
    }
}

verifySimulation();
