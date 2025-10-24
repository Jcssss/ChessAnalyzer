import { useState } from 'react'
import type { GameInfo } from "./types"
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type propTypes = {
    playerId: string,
    displayedPlayerId: string,
    games: {"pgn": string}[],
    setPlayerId: Function,
    fetchPlayersGames: Function,
    convertPGNToFENSequence: Function,
    width: number
}

function GameSelector({
    playerId, displayedPlayerId, games, setPlayerId, fetchPlayersGames, convertPGNToFENSequence, width
} : propTypes) {
    const [menuOpen, setMenuOpen] = useState(false)

    const getGameSelector = () => {
        return (
            <>
                <div className="w-[100%] rounded-2xl border border-grey-100 p-3 flex flex-row items-center bg-white text-black">
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
                                className="bg-white text-black rounded-3xl border border-grey-300 m-2 flex flex-row w-[100%] active:bg-blue-100 hover:bg-blue-100 hover:cursor-pointer"
                                key={game.pgn} 
                                onClick={() => {
                                    setMenuOpen(false)
                                    convertPGNToFENSequence(data)
                                }}
                            >
                            <div className={`w-10 border border-grey-100 rounded-l-2xl`} style={{backgroundColor: colour}}></div>
                            <div className="m-2 text-sm">
                                <div>{`Date of Play: ${(date)? date : "Unknown"}`}</div>
                                <div>{`Opponent: ${(opponent)? opponent : "Unknown"}`}</div>
                            </div>
                        </div>
                    })}
                </div>
            </>
        )    
    }

    if (width > 900) {
        return <div className="w-[40%] flex flex-col items-center p-5">
            {getGameSelector()}
        </div>
    } else {
        return <div className={`w-[100%] flex flex-col justify-center items-center fixed z-200 top-0 left-0 ${(menuOpen)? "backdrop-blur-sm h-full" : ""}`}>
            <div className="w-[100%] ">
                <FontAwesomeIcon
                    icon={(menuOpen)? faXmark : faMagnifyingGlass}
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className={`top-0 left-0 mt-5 ml-5 p-2 w-auto h-20 rounded-full bg-black text-white`}
                />
            </div>
            <div className={`w-[80%] h-[90%] flex flex-col items-center justify-start pt-10 text-white ${(menuOpen)? "" : "hidden"}`}>
                {getGameSelector()}   
            </div>
        </div>
    }
}

export default GameSelector