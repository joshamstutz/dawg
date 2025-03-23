import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './dawg.css'

const UnderdogTracker = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);
    const [profitLoss, setProfitLoss] = useState(0);
    const [betAmount, setBetAmount] = useState(100);
    const [showCompleted, setShowCompleted] = useState(true);
    const [availableSports, setAvailableSports] = useState([]);
    const [lastUpdated, setLastUpdated] = useState('Unknown');
    const [sortMethod, setSortMethod] = useState('time');
    const [filterByTeams, setFilterByTeams] = useState(true);

    const API_KEY = process.env.REACT_APP_API_KEY;
    const BASE_URL = "https://api.the-odds-api.com/v4";

    const SPORTS_CACHE_KEY = "underdogSportsCache";
    const ODDS_CACHE_KEY = "underdogOddsCache";
    const CACHE_TIME_KEY = "underdogCacheTime";
    const COMPLETED_GAMES_CACHE_KEY = "underdogCompletedGamesCache";


    const initialTeams = {
        east: [
            { seed: 1, name: "Duke Blue Devils" },
            { seed: 16, name: "American Eagles/Mount St Mary's Mountaineers" },
            { seed: 8, name: "Mississippi St Bulldogs" },
            { seed: 9, name: "Baylor Bears" },
            { seed: 5, name: "Oregon Ducks" },
            { seed: 12, name: "Liberty Flames" },
            { seed: 4, name: "Arizona Wildcats" },
            { seed: 13, name: "Akron Zips" },
            { seed: 6, name: "BYU Cougars" },
            { seed: 11, name: "VCU Rams" },
            { seed: 3, name: "Wisconsin Badgers" },
            { seed: 14, name: "Montana Grizzlies" },
            { seed: 7, name: "St Mary's Gaels" },
            { seed: 10, name: "Vanderbilt Commodores" },
            { seed: 2, name: "Alabama Crimson Tide" },
            { seed: 15, name: "Robert Morris Colonials" },
        ],
        west: [
            { seed: 1, name: "Florida Gators" },
            { seed: 16, name: "Norfolk St Spartans" },
            { seed: 8, name: "UConn Huskies" },
            { seed: 9, name: "Oklahoma Sooners" },
            { seed: 5, name: "Memphis Tigers" },
            { seed: 12, name: "Colorado St Rams" },
            { seed: 4, name: "Maryland Terrapins" },
            { seed: 13, name: "Grand Canyon Antelopes" },
            { seed: 6, name: "Missouri Tigers" },
            { seed: 11, name: "Drake Bulldogs" },
            { seed: 3, name: "Texas Tech Red Raiders" },
            { seed: 14, name: "UNC Wilmington Seahawks" },
            { seed: 7, name: "Kansas Jayhawks" },
            { seed: 10, name: "Arkansas Razorbacks" },
            { seed: 2, name: "Saint John's Red Storm" },
            { seed: 15, name: "Omaha Mavericks" },
        ],
        south: [
            { seed: 1, name: "Auburn Tigers" },
            { seed: 16, name: "Alabama St Hornets/St Francis Terriers" },
            { seed: 8, name: "Louisville Cardinals" },
            { seed: 9, name: "Creighton Bluejays" },
            { seed: 5, name: "Michigan Wolverines" },
            { seed: 12, name: "UC San Diego Tritons" },
            { seed: 4, name: "Texas A&M Aggies" },
            { seed: 13, name: "Yale Bulldogs" },
            { seed: 6, name: "Ole Miss Rebels" },
            { seed: 11, name: "San Diego St Aztecs/North Carolina Tar Heels" },
            { seed: 3, name: "Iowa St Cyclones" },
            { seed: 14, name: "Lipscomb Bisons" },
            { seed: 7, name: "Marquette Golden Eagles" },
            { seed: 10, name: "New Mexico Lobos" },
            { seed: 2, name: "Michigan St Spartans" },
            { seed: 15, name: "Bryant Bulldogs" },
        ],
        midwest: [
            { seed: 1, name: "Houston Cougars" },
            { seed: 16, name: "SIU Edwardsville Cougars" },
            { seed: 8, name: "Gonzaga Bulldogs" },
            { seed: 9, name: "Georgia Bulldogs" },
            { seed: 5, name: "Clemson Tigers" },
            { seed: 12, name: "McNeese Cowboys" },
            { seed: 4, name: "Purdue Boilermakers" },
            { seed: 13, name: "High Point Panthers" },
            { seed: 6, name: "Illinois Fighting Illini" },
            { seed: 11, name: "Texas Longhorns/Xavier Musketeers" },
            { seed: 3, name: "Kentucky Wildcats" },
            { seed: 14, name: "Troy Trojans" },
            { seed: 7, name: "UCLA Bruins" },
            { seed: 10, name: "Utah St Aggies" },
            { seed: 2, name: "Tennessee Volunteers" },
            { seed: 15, name: "Wofford Terriers" },
        ]
    };

    const getAllTeamNames = () => {
        let allTeams = [];
        Object.values(initialTeams).forEach(region => {
            region.forEach(team => {
                if (team.name.includes('/')) {
                    const splitTeams = team.name.split('/');
                    splitTeams.forEach(splitTeam => allTeams.push(splitTeam.trim()));
                } else {
                    allTeams.push(team.name);
                }
            });
        });
        return allTeams;
    };

    const handleManualRefresh = () => {
        console.log("Manually refreshing data");

        // Clear existing cache
        localStorage.removeItem(SPORTS_CACHE_KEY);
        localStorage.removeItem(ODDS_CACHE_KEY);
        localStorage.removeItem(CACHE_TIME_KEY);

        // Reset loading and error states
        setLoading(true);
        setError(null);

        // Fetch sports data
        fetchSports();
    };

    const bracketTeams = getAllTeamNames();

    const involvesTournamentTeam = (game) => {
        if (!filterByTeams) return true;

        const homeTeamMatch = bracketTeams.some(team =>
            game.homeTeam?.includes(team) || team.includes(game.homeTeam)
        );

        const awayTeamMatch = bracketTeams.some(team =>
            game.awayTeam?.includes(team) || team.includes(game.awayTeam)
        );

        return homeTeamMatch || awayTeamMatch;
    };

    const sortGames = (games, method) => {
        if (method === 'time') {
            return [...games].sort((a, b) => a.startTime - b.startTime);
        } else if (method === 'timeDesc') {
            return [...games].sort((a, b) => b.startTime - a.startTime);
        } else if (method === 'profit') {
            return [...games].sort((a, b) => {
                const profitA = calculatePotentialProfit(a.underdogOdds, betAmount);
                const profitB = calculatePotentialProfit(b.underdogOdds, betAmount);
                return profitB - profitA;
            });
        } else if (method === 'profitDesc') {
            return [...games].sort((a, b) => {
                const profitA = calculatePotentialProfit(a.underdogOdds, betAmount);
                const profitB = calculatePotentialProfit(b.underdogOdds, betAmount);
                return profitA - profitB;
            });
        }
        return games;
    };

    const shouldRefreshData = () => {
        const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
        const today = new Date().toDateString();

        return !cacheTime || cacheTime !== today;
    };

    useEffect(() => {
        const fetchSports = async () => {
            try {
                const cachedSports = localStorage.getItem(SPORTS_CACHE_KEY);
                const cachedOdds = localStorage.getItem(ODDS_CACHE_KEY);
                const cacheTime = localStorage.getItem(CACHE_TIME_KEY);

                setLastUpdated(cacheTime || 'Unknown');

                if (cachedSports && cachedOdds && !shouldRefreshData()) {
                    console.log("Using cached data from today");
                    setAvailableSports(JSON.parse(cachedSports));
                    processCachedOdds(JSON.parse(cachedOdds));
                    return;
                }

                console.log("Fetching fresh data");
                const response = await axios.get(`${BASE_URL}/sports`, {
                    params: {
                        apiKey: API_KEY
                    }
                });

                const sportsData = response.data;
                setAvailableSports(sportsData);

                localStorage.setItem(SPORTS_CACHE_KEY, JSON.stringify(sportsData));

                const ncaaBasketballSports = sportsData.filter(sport =>
                    sport.key.includes('basketball') &&
                    (sport.key.includes('ncaa') || sport.key.includes('college'))
                );

                if (ncaaBasketballSports.length > 0) {
                    fetchOddsForSport(ncaaBasketballSports[0].key);
                } else {
                    setError('Could not find NCAA basketball in available sports. Available sports: ' +
                        sportsData.map(s => s.key).join(', '));
                    setLoading(false);
                }
            } catch (err) {
                console.error("Error fetching sports:", err);
                setError('Error fetching available sports: ' + err.message);
                setLoading(false);
            }
        };

        fetchSports();

        const checkForRefresh = () => {
            const now = new Date();

            if (shouldRefreshData()) {
                console.log("Auto refreshing data at:", now);

                localStorage.removeItem(SPORTS_CACHE_KEY);
                localStorage.removeItem(ODDS_CACHE_KEY);
                localStorage.removeItem(CACHE_TIME_KEY);

                fetchSports();
            }
        };

        const intervalId = setInterval(checkForRefresh, 60000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const scheduleNextRefresh = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(now.getDate() + 1);

            tomorrow.setHours(1, 30, 32, 0);

            const timeUntilRefresh = tomorrow - now;
            console.log(`Scheduled next refresh in ${timeUntilRefresh / 1000 / 60} minutes`);

            const timeoutId = setTimeout(() => {
                console.log("Executing 1:30 AM Eastern refresh");

                localStorage.removeItem(SPORTS_CACHE_KEY);
                localStorage.removeItem(ODDS_CACHE_KEY);
                localStorage.removeItem(CACHE_TIME_KEY);

                fetchSports();

                scheduleNextRefresh();
            }, timeUntilRefresh);

            return timeoutId;
        };

        const timeoutId = scheduleNextRefresh();

        return () => clearTimeout(timeoutId);
    }, []);

    const processCachedOdds = (oddsData) => {
        const processedGames = processGamesData(oddsData);
        setGames(processedGames);
        setLoading(false);
    };

    const fetchSports = async () => {
        try {
            const response = await axios.get(`${BASE_URL}/sports`, {
                params: {
                    apiKey: API_KEY
                }
            });

            const sportsData = response.data;
            setAvailableSports(sportsData);

            localStorage.setItem(SPORTS_CACHE_KEY, JSON.stringify(sportsData));

            const ncaaBasketballSports = sportsData.filter(sport =>
                sport.key.includes('basketball') &&
                (sport.key.includes('ncaa') || sport.key.includes('college'))
            );

            if (ncaaBasketballSports.length > 0) {
                fetchOddsForSport(ncaaBasketballSports[0].key);
            } else {
                setError('Could not find NCAA basketball in available sports. Available sports: ' +
                    sportsData.map(s => s.key).join(', '));
                setLoading(false);
            }
        } catch (err) {
            console.error("Error fetching sports:", err);
            setError('Error fetching available sports: ' + err.message);
            setLoading(false);
        }
    };

    const fetchOddsForSport = async (sportKey) => {
        try {
            setLoading(true);
            const response = await axios.get(`${BASE_URL}/sports/${sportKey}/odds`, {
                params: {
                    apiKey: API_KEY,
                    regions: 'us',
                    markets: 'h2h,spreads',
                    oddsFormat: 'american'
                }
            });

            // Fetch scores for the same sport
            const scoresResponse = await axios.get(`${BASE_URL}/sports/${sportKey}/scores`, {
                params: {
                    apiKey: API_KEY,
                    daysFrom: 1  // Retrieve games from the past 1 day
                }
            });

            // Merge existing cached completed games with new scores
            const cachedCompletedGames = JSON.parse(localStorage.getItem(COMPLETED_GAMES_CACHE_KEY) || '[]');

            // Filter and merge unique completed games
            const newCompletedGames = scoresResponse.data.filter(score =>
                score.completed &&
                score.scores &&
                !cachedCompletedGames.some(cached => cached.id === score.id)
            );

            const mergedCompletedGames = [...cachedCompletedGames, ...newCompletedGames];

            // Store merged completed games
            localStorage.setItem(COMPLETED_GAMES_CACHE_KEY, JSON.stringify(mergedCompletedGames));

            localStorage.setItem(ODDS_CACHE_KEY, JSON.stringify(response.data));

            const currentDate = new Date().toDateString();
            localStorage.setItem(CACHE_TIME_KEY, currentDate);
            setLastUpdated(currentDate);

            const processedGames = processGamesData(response.data);
            setGames(processedGames);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching odds or scores:", err);
            setError('Error fetching data: ' + err.message);
            setLoading(false);
        }
    };

    const processGamesData = (gamesData) => {
        return gamesData.map(game => {
            let homeTeam, awayTeam, homeOdds, awayOdds, underdog, underdogOdds, favorite, favoriteOdds;

            const bookmaker = game.bookmakers?.[0];

            if (bookmaker) {
                const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');

                if (h2hMarket) {
                    const outcomes = h2hMarket.outcomes;

                    homeTeam = game.home_team || outcomes[0].name;
                    awayTeam = game.away_team || outcomes[1].name;

                    homeOdds = outcomes.find(o => o.name === homeTeam)?.price;
                    awayOdds = outcomes.find(o => o.name === awayTeam)?.price;

                    if (homeOdds > awayOdds) {
                        underdog = homeTeam;
                        underdogOdds = homeOdds;
                        favorite = awayTeam;
                        favoriteOdds = awayOdds;
                    } else {
                        underdog = awayTeam;
                        underdogOdds = awayOdds;
                        favorite = homeTeam;
                        favoriteOdds = homeOdds;
                    }
                }
            }

            // Store original odds in localStorage when processing games
            const originalOddsKey = `original_odds_${game.id}`;
            localStorage.setItem(originalOddsKey, JSON.stringify({
                underdog,
                underdogOdds,
                favorite,
                favoriteOdds
            }));

            return {
                id: game.id,
                homeTeam,
                awayTeam,
                startTime: new Date(game.commence_time),
                underdog,
                underdogOdds,
                favorite,
                favoriteOdds,
                completed: game.completed || false,
                winner: game.scores ? (game.scores[0].score > game.scores[1].score ? game.scores[0].team : game.scores[1].team) : null,
            };
        }).filter(game =>
            game.underdogOdds !== undefined &&
            game.underdogOdds !== null &&
            game.favoriteOdds !== undefined &&
            game.favoriteOdds !== null
        );
    };

    useEffect(() => {
        const cachedCompletedGames = JSON.parse(localStorage.getItem(COMPLETED_GAMES_CACHE_KEY) || '[]');

        const cachedProcessedGames = cachedCompletedGames.map(game => {
            // Retrieve original odds from localStorage
            const originalOddsKey = `original_odds_${game.id}`;
            const originalOdds = JSON.parse(localStorage.getItem(originalOddsKey) || '{}');

            return {
                id: game.id,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                startTime: new Date(game.commence_time),
                completed: true,
                winner: game.scores[0].score > game.scores[1].score ? game.scores[0].name : game.scores[1].name,
                ...originalOdds  // Spread the original odds here
            };
        });

        // Combine completed games from current fetch and cached games
        const completedFromCurrentFetch = games.filter(game => game.completed);
        const allCompletedGames = [
            ...completedFromCurrentFetch.map(game => {
                // Retrieve original odds for current fetch games
                const originalOddsKey = `original_odds_${game.id}`;
                const storedOriginalOdds = JSON.parse(localStorage.getItem(originalOddsKey) || '{}');

                return {
                    ...game,
                    ...storedOriginalOdds  // Ensure original odds are used
                };
            }),
            ...cachedProcessedGames
        ];

        const filteredGames = allCompletedGames.filter(involvesTournamentTeam);
        const completedGames = filteredGames.filter(game => game.winner);

        const bettingResults = completedGames.map(game => {
            const underdogWon = game.winner === game.underdog;
            const potentialProfit = underdogWon ?
                (betAmount * (game.underdogOdds > 0 ? game.underdogOdds / 100 : 100 / Math.abs(game.underdogOdds))) :
                -betAmount;

            return {
                ...game,
                underdogWon,
                potentialProfit
            };
        });

        setResults(bettingResults);

        const totalProfitLoss = bettingResults.reduce((sum, game) => sum + game.potentialProfit, 0);
        setProfitLoss(totalProfitLoss);
    }, [games, betAmount, filterByTeams]);

    const formatOdds = (odds) => {
        if (!odds) return "N/A";
        return odds > 0 ? `+${odds}` : odds;
    };

    const calculatePotentialProfit = (odds, amount) => {
        if (!odds) return 0;
        return odds > 0 ? (amount * odds / 100) : (amount * 100 / Math.abs(odds));
    };

    if (loading) return <div>Loading data...</div>;
    if (error) return (
        <div className="error">
            <p>{error}</p>
            <p>Available sports: {availableSports.map(s => s.key).join(', ')}</p>
            <button onClick={() => {
                if (availableSports.length > 0) {
                    fetchOddsForSport(availableSports[0].key);
                }
            }}>
                Try fetching general basketball odds instead
            </button>
        </div>
    );

    // Filter games by tournament teams
    const upcomingGames = sortGames(
        games.filter(game => !game.completed).filter(involvesTournamentTeam),
        sortMethod
    );

    if (upcomingGames.length === 0 && results.length === 0) {
        return (
            <div className="underdog-tracker">
                <h1>dawg</h1>
                <div className="error">
                    <p>No tournament games data available. This could be because:</p>
                    <ul>
                        <li>The NCAA tournament games are not currently in season</li>
                        <li>The API doesn't have March Madness games in its current data</li>
                        <li>The teams in your bracket aren't found in the API data</li>
                    </ul>
                    <div className="settings">
                        <label>
                            <input
                                type="checkbox"
                                checked={filterByTeams}
                                onChange={() => setFilterByTeams(!filterByTeams)}
                            />
                            Filter by March Madness                        </label>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="underdog-tracker">
            {/* Navbar */}
            <nav className="strategy-navbar">
                <div className="strategy-navbar-content">
                    <div className="navbar-brand">
                        <h1><strong>dawg 🐶</strong></h1>
                    </div>
                    <div className="stats-navbar">
                        <div className="stats-wrapper">
                            <div className="stat">
                                <span>Bets:&nbsp; {results.length}</span>
                            </div>
                            <div className="stat">
                                <span>Wins:&nbsp; {results.filter(game => game.underdogWon).length}</span>
                            </div>
                            <div className="stat">
                        <span>Win Rate:&nbsp; {results.length > 0
                            ? `${(results.filter(game => game.underdogWon).length / results.length * 100).toFixed(1)}%`
                            : "N/A"}</span>
                            </div>
                            <div className="stat">
                                <span>
                                    P/L:&nbsp;
                                    <div className={`stat ${profitLoss > 0 ? 'profit' : profitLoss < 0 ? 'loss' : ''}`}>
                                        <span>
                                            <span
                                                className={profitLoss > 0 ? 'positive-pl' : profitLoss < 0 ? 'negative-pl' : ''}>
                                                ${profitLoss.toFixed(2)}
                                            </span>
                                        </span>
                                    </div>
                                </span>
                            </div>
                            <div className="stat">
                                <span>
                                    ROI:&nbsp;
                                    <span className={results.length > 0
                                        ? profitLoss / (betAmount * results.length) * 100 < 0
                                            ? 'negative-roi'
                                            : 'positive-roi'
                                        : ''}>
                                        {results.length > 0
                                            ? `${(profitLoss / (betAmount * results.length) * 100).toFixed(1)}%`
                                            : "N/A"}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="data-info">
                        <span>Updated: {localStorage.getItem(CACHE_TIME_KEY) ? `${localStorage.getItem(CACHE_TIME_KEY)} 1:30 AM` : 'Unknown'}</span>
                    </div>
                </div>
            </nav>

            <div className="main-content">
                <div className="settings">
                    <label>
                        Bet Amount: $
                        <input
                            type="number"
                            value={betAmount}
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                            min="1"
                        />
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={() => setShowCompleted(!showCompleted)}
                        />
                        Show Completed Games
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={filterByTeams}
                            onChange={() => setFilterByTeams(!filterByTeams)}
                        />
                        Filter by March Madness</label>
                </div>

                <div className="sort-options">
                    <label htmlFor="sort-select">Sort by: </label>
                    <select
                        id="sort-select"
                        value={sortMethod}
                        onChange={(e) => setSortMethod(e.target.value)}
                    >
                        <option value="time">Earliest Games</option>
                        <option value="timeDesc">Latest Games</option>
                        <option value="profit">Highest Profit</option>
                        <option value="profitDesc">Lowest Profit</option>
                    </select>
                </div>

                {showCompleted && results.length >= 0 && (
                    <>
                        <h2>Completed Games {filterByTeams ? '(March Madness)' : ''}</h2>
                        <div className="games-list">
                        {sortGames(results, sortMethod === 'profit' ? 'profit' : 'timeDesc')
                                .map(game => (
                                    <div key={game.id}
                                         className={`game-card completed ${game.underdogWon ? 'win' : 'loss'}`}>
                                        <div className="game-time">
                                            {game.startTime.toLocaleDateString()}
                                        </div>
                                        <div className="matchup">
                                            <div className={`team ${game.winner === game.homeTeam ? 'winner' : ''}`}>
                                                {game.homeTeam} {game.underdog === game.homeTeam}
                                            </div>
                                            <div className="vs">vs</div>
                                            <div className={`team ${game.winner === game.awayTeam ? 'winner' : ''}`}>
                                                {game.awayTeam} {game.underdog === game.awayTeam}
                                            </div>
                                        </div>
                                        <div className="result">
                                            <span>Result: </span>
                                            <span className={game.underdogWon ? 'profit' : 'loss'}>
                                              {game.underdogWon ? 'Underdog Won!' : 'Favorite Won'}
                                            </span>
                                        </div>
                                        <div className="bet-result">
                                            <span>Bet Result: </span>
                                            <span className={game.underdogWon ? 'profit' : 'loss'}>
                                              {game.underdogWon
                                                  ? `+$${game.potentialProfit.toFixed(2)}`
                                                  : `-$${betAmount.toFixed(2)}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </>
                )}

                <h2>Upcoming Games {filterByTeams ? '(March Madness)' : ''}</h2>
                {upcomingGames.length === 0 ? (
                    <p>No upcoming games found for tournament teams. Try unchecking "Filter by Tournament Teams" to see all games.</p>
                ) : (
                    <div className="games-list">
                        {upcomingGames.map(game => (
                            <div key={game.id} className="game-card">
                                <div className="game-time">
                                    {game.startTime.toLocaleDateString()} {game.startTime.toLocaleTimeString()}
                                </div>
                                <div className="matchup">
                                    <div className={`team ${game.underdog === game.homeTeam ? 'underdog' : 'favorite'}`}>
                                        {game.homeTeam} {game.underdog === game.homeTeam && '🐶'}
                                    </div>
                                    <div className="vs">vs</div>
                                    <div className={`team ${game.underdog === game.awayTeam ? 'underdog' : 'favorite'}`}>
                                        {game.awayTeam} {game.underdog === game.awayTeam && '🐶'}
                                    </div>
                                </div>
                                <div className="odds">
                                    <div>
                                        <span>Underdog: </span>
                                        <span className="underdog-odds">{formatOdds(game.underdogOdds)}</span>
                                    </div>
                                    <div>
                                        <span>Favorite: </span>
                                        <span className="favorite-odds">{formatOdds(game.favoriteOdds)}</span>
                                    </div>
                                </div>
                                <div className="potential-return">
                                    <span>Potential Profit on Underdog: </span>
                                    <span
                                        className="profit">${calculatePotentialProfit(game.underdogOdds, betAmount).toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnderdogTracker;