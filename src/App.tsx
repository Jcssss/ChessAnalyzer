import { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { faMagnifyingGlass, faArrowCircleRight, faArrowCircleLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function App() {
  const [playerId, setPlayerId] = useState("Jcssss")
  const [displayedPlayerId, setDisplayedPlayerId] = useState("Jcssss")
  const [games, setGames]: [{'pgn': string}[], Function] = useState([{'pgn': ""}])
  const [currentGame, setCurrentGame]: [string[], Function] = useState([])
  const [moveIndex, setMoveIndex] = useState(0)
  const [stockfishMove, setStockfishMove] = useState("")
  const [arrows, setArrows]: [{
    startSquare: string, 
    endSquare: string, 
    color: string
  }[], Function] = useState([])
  const stockfishRef = useRef<any>(null);

  // Initialize the stockfish engine and handle responses
  useEffect(() => {
    const stockfishWorker = new Worker("/stockfish/stockfish.js")
    stockfishWorker.onerror = (e) => console.log("Stockfish error:", e.message);
    stockfishWorker.onmessage = (e) => {
      if (e.data.includes("bestmove")) {
        const outputList = e.data.split(" ")
        setStockfishMove(outputList[1])
        console.log(`Stockfish move: ${outputList[1]}`)
      } else if (e.data.includes("info")) {
        console.log(`Stockfish move: ${e.data}`)
      }
    }
    stockfishWorker.postMessage("uci");
    stockfishRef.current = stockfishWorker

    fetchPlayersGames("Jcssss")

    return () => stockfishWorker.terminate?.();
  }, [])

  // When stockfish gives a new move, update the arrow
  useEffect(() => {
    if (stockfishMove != "") {
      setArrows(() => [{
        startSquare: stockfishMove.substring(0, 2),
        endSquare: stockfishMove.substring(2, 4),
        color: "blue"
      }])
    }
  }, [stockfishMove])

  // When we update the move being considered, ask stockfish to find the best move
  useEffect(() => {
    requestBestMove(currentGame[moveIndex])
  }, [moveIndex])

  // Ask Stockfish for the best move
  const requestBestMove = (fen: string) => {
    const stockfish = stockfishRef.current
    if (!stockfish || currentGame.length == 0) return;

    stockfish.postMessage("ucinewgame");
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage("go movetime 1000"); // think for 1 second

  };

  // Given a player name find there games from the past month
  const fetchPlayersGames = async (playerName: string) => {
    setDisplayedPlayerId(playerName)
    const url = `https://api.chess.com/pub/player/${playerName}/games/2025/10`;
    // For time control https://api.chess.com/pub/player/${playerId}/games/live/${timeSeconds}/${incrementSeconds}
    // For date https://api.chess.com/pub/player/${playerId}/games/${year}/${month}

    try {
      const response = await fetch(url)
      const responseJson = await response.json()
      console.log(responseJson.games)
      setGames(responseJson.games)
    } catch(err) {
      console.log(err)
    }
  }

  // Convert a PGN game from chess.com to FEN sequence for chessboard and stockfish use
  const convertPGNToFENSequence = (pgn: string): void => {
    let chess = new Chess()
    chess.loadPgn(pgn)
    const moves = chess.history()
    console.log(moves)
    
    chess = new Chess()
    let fenMoveList: string[] = []
    for (const move of moves) {
      chess.move(move);
      fenMoveList.push(chess.fen())
    }

    setCurrentGame(fenMoveList)
    setMoveIndex(fenMoveList.length - 1)
  }

  // Update the move that we're looking at
  const updateMoveIndex = (update: number): void => {
    setMoveIndex(curr => {
      curr = curr + update
      if (curr < 0) {
        curr = 0
      } else if (curr > currentGame.length - 1) {
        console.log("no")
        curr = currentGame.length - 1
      }

      return curr
    })
  }

  return (
    <div className="h-screen w-screen flex flex-row">
      <div className="w-[40%] flex flex-col items-center p-5">
        <div className="w-[80%] rounded-2xl border border-grey-100 p-3 flex flex-row items-center">
          <input
            className="w-[100%] focus:outline-none"
            type="text"
            onChange={(input) => setPlayerId(input.target.value)}
            onKeyDown={(event) => {if (event.key == "Enter") fetchPlayersGames(playerId)}}
            placeholder='Please type the player ID of the player you wish to view...'
            value={playerId}
          ></input>
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            onClick={() => fetchPlayersGames(playerId)}
          />
        </div>
        <div className="p-5 flex flex-col items-center overflow-y-auto m-5">
          {games.map((game) => {
            const dateOfPlay = game.pgn.match(/Date \"(.*)\"/)
            const colourRegex = new RegExp(`\\[(.*) \\"${displayedPlayerId}\\"`)
            const colourMatch = game.pgn.match(colourRegex)
            const colour = colourMatch && colourMatch[1]
            const opponentColour = (colour == "Black")? "White" : "Black"
            const opponentRegex = new RegExp(`\\[${opponentColour} \\"(.*)\\"`)
            const opponent = game.pgn.match(opponentRegex)
            return <div 
              className="rounded-2xl border border-grey-100 m-2 flex flex-row w-[100%]" 
              key={game.pgn} 
              onClick={() => convertPGNToFENSequence(game.pgn)}
            >
              <div className={`bg-${colour?.toLowerCase()} w-10 border border-grey-100 rounded-l-2xl`}></div>
              <div className="m-2">
                <div>{`Date of Play: ${(dateOfPlay)? dateOfPlay[1] : "Unknown"}`}</div>
                <div>{`Opponent: ${(opponent)? opponent[1] : "Unknown"}`}</div>
              </div>
            </div>
          })}
        </div>
      </div>
      <div className="h-full w-[100%] flex flex-col items-center justify-center">
        <Chessboard options={{
          arrows: arrows,
          position: currentGame[moveIndex],
          boardStyle: {
            width: "50%",
            height: "auto"
          }
        }}/>
        <div className="m-5 w-[20%] flex flex-row items-center justify-between text-5xl">
          <FontAwesomeIcon icon={faArrowCircleLeft} onClick={() => updateMoveIndex(-1)}/>
          <FontAwesomeIcon icon={faArrowCircleRight} onClick={() => updateMoveIndex(1)}/>
        </div>
      </div>
    </div>
  )
}

export default App
