import { useState, useEffect, useRef, type ReactElement } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { faMagnifyingGlass, faArrowCircleRight, faArrowCircleLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type GameInfo = {
  "opponent": string | undefined, 
  "colour": "white" | "black" | undefined, 
  "date": string | undefined,
  "pgn": string
}

function App() {
  const [playerId, setPlayerId] = useState("Jcssss")
  const [displayedPlayerId, setDisplayedPlayerId] = useState("Jcssss")
  const [games, setGames]: [{"pgn": string}[], Function] = useState([])
  const [currentMoveSet, setCurrentMoveSet]: [string[], Function] = useState([])
  const [currentGame, setCurrentGame]: [GameInfo | undefined, Function] = useState<GameInfo | undefined>()
  const [moveIndex, setMoveIndex] = useState(0)
  const [stockfishMove, setStockfishMove] = useState("")
  const [evaluation, setEvaluation] = useState(0)
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
      } else if (e.data.includes("info") && e.data.includes("cp")) {
        const evaluation = e.data.match(/cp (\S*) /)
        setEvaluation(parseInt(evaluation[1]))
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
    requestBestMove(currentMoveSet[moveIndex])
  }, [moveIndex])

  // Ask Stockfish for the best move
  const requestBestMove = (fen: string) => {
    const stockfish = stockfishRef.current
    if (!stockfish || currentMoveSet.length == 0) return;

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
      setGames(responseJson.games.reverse())
    } catch(err) {
      console.log(err)
    }
  }

  // Convert a PGN game from chess.com to FEN sequence for chessboard and stockfish use
  const convertPGNToFENSequence = (game: GameInfo): void => {
    let chess = new Chess()
    chess.loadPgn(game.pgn)
    const moves = chess.history()
    console.log(moves)
    
    chess = new Chess()
    let fenMoveList: string[] = []
    for (const move of moves) {
      chess.move(move);
      fenMoveList.push(chess.fen())
    }

    setCurrentMoveSet(fenMoveList)
    setCurrentGame(game)
    setMoveIndex(fenMoveList.length - 1)
  }

  // Update the move that we're looking at
  const updateMoveIndex = (update: number): void => {
    setMoveIndex(curr => {
      curr = curr + update
      if (curr < 0) {
        curr = 0
      } else if (curr > currentMoveSet.length - 1) {
        console.log("no")
        curr = currentMoveSet.length - 1
      }

      return curr
    })
  }

  const createGameHeading = (): ReactElement => {
    if (currentGame) {
      return <>
        <div className="text-2xl">{`Opponent: ${currentGame.opponent}`}</div>
        <div className="mb-5">{`Date: ${currentGame.date}`}</div>
        <div>{`Evaluation: ${evaluation * (-1) ** moveIndex}`}</div>
      </>
    }

    return <></>
  }

  return (
    <div className="h-screen w-screen flex flex-row">
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
              <div className={`bg-${colour?.toLowerCase()} w-10 border border-grey-100 rounded-l-2xl`}></div>
              <div className="m-2">
                <div>{`Date of Play: ${(date)? date : "Unknown"}`}</div>
                <div>{`Opponent: ${(opponent)? opponent : "Unknown"}`}</div>
              </div>
            </div>
          })}
        </div>
      </div>
      <div className="h-full w-[100%] flex flex-col items-center justify-center">
        {createGameHeading()}
        <Chessboard options={{
          arrows: arrows,
          position: currentMoveSet[moveIndex],
          boardStyle: {
            width: "50%",
            height: "auto"
          },
          boardOrientation: (currentGame)? currentGame.colour : 'white'
        }}/>
        <div className="m-5 w-[20%] flex flex-row items-center justify-between text-5xl">
          <FontAwesomeIcon className={`${(moveIndex == 0)? 'opacity-50': 'opacity-100 hover:opacity-75'}`} icon={faArrowCircleLeft} onClick={() => updateMoveIndex(-1)}/>
          <FontAwesomeIcon className={`${(moveIndex == currentMoveSet.length - 1)? 'opacity-50': 'opacity-100 hover:opacity-75'}`} icon={faArrowCircleRight} onClick={() => updateMoveIndex(1)}/>
        </div>
      </div>
    </div>
  )
}

export default App
