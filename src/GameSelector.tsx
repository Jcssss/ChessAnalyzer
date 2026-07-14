import { useToggle } from "./hooks/useToggle"
import type { GameInfo } from "./types"
import { faMagnifyingGlass, faLongArrowAltLeft, faLongArrowAltRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type propTypes = {
    playerId: string,
    displayedPlayerId: string,
    games: GameInfo[],
    setPlayerId: Function,
    fetchPlayersGames: Function,
    convertPGNToFENSequence: Function,
}

function GameSelector({
    playerId, games, setPlayerId, fetchPlayersGames, convertPGNToFENSequence
} : propTypes) {

    const [selectorOpen, toggleSelectorOpen] = useToggle(true)

    // Returns an object containing the identified player name and the opponent's name.
    const getPlayerAndOpponent = (game: GameInfo, playerId: string) => {
        const whiteName = game.white.username;
        const blackName = game.black.username;
        const target = playerId.toLowerCase();

        // Check if player is white or black
        if (whiteName.toLowerCase() === target) {
            return {
                playerName: whiteName,
                opponent: blackName
            };
        } else {
            return {
                playerName: blackName,
                opponent: whiteName
            };
        }
    }

    const getGameDate = (game: any) => {
        if (!game || !game.end_time) return "N/A";
        
        // Convert Unix timestamp (seconds) to milliseconds
        const date = new Date(game.end_time * 1000);
        
        // Extracts the 'YYYY-MM-DD' portion of the ISO string
        return date.toISOString().split('T')[0];
    }

    const getGameOutcome = (game: any, playerId: string): string => {
        const isWhite = game.white.username.toLowerCase() === playerId.toLowerCase();
        const player = isWhite ? game.white : game.black;

        // Case 1: Player won
        if (player.result === "win") {
            return "Win";
        }

        // Case 2: Draw scenarios
        const drawResults = ["draw", "stalemate", "insufficient", "repetition", "50move"];
        if (drawResults.includes(player.result)) {
            return "Draw";
        }

        // Case 3: Player lost
        // The result field for the loser usually indicates HOW they lost (e.g., "resigned")
        return "Loss";
    };

    return (
        // Sidebar Container: Matches the mock's dark theme
        <div className="flex flex-row h-full bg-neutral-900 border-r border-neutral-700 p-4">
            <div className={`flex flex-col h-full bg-neutral-900 p-4 ${(selectorOpen)? '' : 'hidden'}`}>
                <h2 className="text-lg font-semibold text-neutral-100 mb-4">Game Database</h2>
            
                {/* Search Input: Styled as a dark-mode input field */}
                <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-2 flex items-center text-neutral-300 mb-4">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-3 ml-1" />
                    <input
                        className="bg-transparent w-full focus:outline-none text-sm placeholder-neutral-500"
                        type="text"
                        onChange={(input) => setPlayerId(input.target.value)}
                        onKeyDown={(event) => {if (event.key == "Enter") fetchPlayersGames(playerId)}}
                        placeholder='Search Player Games (e.g., Jcssss)'
                        value={playerId}
                    />
                </div>

                {/* Scrollable Game List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {games.map((game) => {
                        // Logic for metadata extraction...
                        const date = getGameDate(game)
                        const opponent = getPlayerAndOpponent(game, playerId).opponent
                        const result = getGameOutcome(game, playerId)

                        game.date = date
                        game.opponent = opponent
                        game.result = result

                        return (
                            <div 
                                className="bg-neutral-800 rounded-lg p-3 border border-neutral-700 hover:border-blue-500 hover:bg-neutral-700 transition-colors cursor-pointer group mr-1"
                                key={game.pgn} 
                                onClick={() => convertPGNToFENSequence(game)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium text-neutral-100">
                                        {`${playerId} vs ${opponent}`}
                                    </div>
                                    <div className="text-xs text-neutral-400">{result}</div>
                                </div>
                                <div className="text-xs text-neutral-500 mt-1">{date}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
            <div className="pt-2" onClick={() => toggleSelectorOpen()}>
                <FontAwesomeIcon className="text-white-950 hover:text-gray-300" icon={(selectorOpen)? faLongArrowAltLeft : faLongArrowAltRight}/>
            </div>
        </div>
    )    
}

export default GameSelector