import { useState } from 'react';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function GameSelector() {
    const [playerId, setPlayerId] = useState("Jcssss")
    const [games, setGames]: [{'pgn': string}[], Function] = useState([{'pgn': ""}])
    const [currentGame, setCurrentGame]: [string[], Function] = useState([])
    const [moveIndex, setMoveIndex] = useState(0)

    return <>
        <input
            type="text"
            onChange={(input) => setPlayerId(input.target.value)}
            placeholder='Please type the player ID of the player you wish to view...'
            value={playerId}
        ></input>
        <div onClick={() => fetchPlayersGames(playerId)}>Submit</div>
        <div onClick={() => convertPGNToFENSequence(1)}>Fetch Game</div>
    </>
}

export default GameSelector;