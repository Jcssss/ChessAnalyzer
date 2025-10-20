import type { GameInfo } from "./types"
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type propTypes = {
    playerId: string,
    displayedPlayerId: string,
    games: {"pgn": string}[],
    setPlayerId: Function,
    fetchPlayersGames: Function,
    convertPGNToFENSequence: Function
}

function GameSelector({
    playerId, displayedPlayerId, games, setPlayerId, fetchPlayersGames, convertPGNToFENSequence
} : propTypes) {
    return (
    <div className="w-[40%] flex flex-col items-center p-5">
        <div className="w-[80%] rounded-2xl border border-grey-100 p-3 flex flex-row items-center">
            <FontAwesomeIcon
                icon={faMagnifyingGlass}
                onClick={() => fetchPlayersGames(playerId)}
            />
            <input
                className="w-[100%] focus:outline-none ml-3"
                type="text"
                onChange={(input) => setPlayerId(input.target.value)}
                onKeyDown={(event) => {if (event.key == "Enter") fetchPlayersGames(playerId)}}
                placeholder='Enter a player to search...'
                value={playerId}
            ></input>
            </div>
            <div className="w-[80%] p-5 flex flex-col items-center overflow-y-auto overflow-x-hidden m-5">
                {games.map((game) => {
                    const dateOfPlay = game.pgn.match(/Date \"(.*)\"/)
                    const date = (dateOfPlay)? dateOfPlay[1] : undefined
                    const colourRegex = new RegExp(`\\[(.*) \\"${displayedPlayerId}\\"`)
                    const colourMatch = game.pgn.match(colourRegex)
                    const colour = (colourMatch && colourMatch[1] == "Black")? "black" : "white"
                    const opponentColour = (colour == "black")? "White" : "Black"
                    const opponentRegex = new RegExp(`\\[${opponentColour} \\"(.*)\\"`)
                    const opponentMatch = game.pgn.match(opponentRegex)
                    const opponent = (opponentMatch)? opponentMatch[1] : undefined
                    const data: GameInfo = {
                        "opponent": opponent, "colour": colour, "date": date, "pgn": game.pgn
                    }
                    return <div 
                            className="rounded-2xl border border-grey-100 m-2 flex flex-row w-[100%] hover:border-blue-800 hover:cursor-pointer"
                            key={game.pgn} 
                            onClick={() => convertPGNToFENSequence(data)}
                        >
                        <div className={`bg-${colour} w-10 border border-grey-100 rounded-l-2xl`}></div>
                        <div className="m-2">
                            <div>{`Date of Play: ${(date)? date : "Unknown"}`}</div>
                            <div>{`Opponent: ${(opponent)? opponent : "Unknown"}`}</div>
                        </div>
                    </div>
                })}
            </div>
        </div>
    )
}

export default GameSelector