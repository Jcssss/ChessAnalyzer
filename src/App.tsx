import { useState, useEffect, useRef, type ReactElement } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { faMagnifyingGlass, faArrowCircleRight, faArrowCircleLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { GameInfo } from "./types"
import GameSelector from './GameSelector';

function App() {
  const [playerId, setPlayerId] = useState("Jcssss")
  const [displayedPlayerId, setDisplayedPlayerId] = useState("Jcssss")
  const [games, setGames]: [{"pgn": string}[], Function] = useState([])
  const [currentMoveSet, setCurrentMoveSet]: [string[], Function] = useState([])
  const [currentGame, setCurrentGame]: [GameInfo | undefined, Function] = useState<GameInfo | undefined>()
  const [moveIndex, setMoveIndex] = useState(0)
  const [stockfishMove, setStockfishMove] = useState("")
  const [evaluation, setEvaluation] = useState("")
  const [width, setWidth] = useState(0);
  const [arrows, setArrows]: [{
    startSquare: string, 
    endSquare: string, 
    color: string
  }[], Function] = useState([])
  const stockfishRef = useRef<any>(null);

  // Initialize the stockfish engine and handle responses
  useEffect(() => {
    const stockfishWorker = new Worker("/ChessAnalyzer/stockfish/stockfish.js")
    stockfishWorker.onerror = (e) => console.log("Stockfish error:", e.message);
    stockfishWorker.onmessage = (e) => {
      console.log(`Stockfish says: ${e.data}`)
      if (e.data.includes("bestmove")) {
        const outputList = e.data.split(" ")
        setStockfishMove(outputList[1])
      } else if (e.data.includes("info") && e.data.includes("mate")) {
        const evaluation = e.data.match(/(mate \S*)(?:\s|$)/)
        setEvaluation(evaluation[0])
      } else if (e.data.includes("info") && e.data.includes("cp")) {
        const evaluation = e.data.match(/cp (\S*)[\s\b]/)
        setEvaluation(evaluation[1])
      }
    }
    stockfishWorker.postMessage("uci");
    stockfishRef.current = stockfishWorker

    fetchPlayersGames("Jcssss")

    return () => stockfishWorker.terminate?.();
  }, [])

  useEffect(() => {
    window.addEventListener("resize", detectWidth);
    detectWidth();
  });

  const detectWidth = () => {
    setWidth(window.innerWidth);
  }

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
      </>
    }

    return <><div className="mb-5">Select a game to begin analysis</div></>
  }

  const createEvalBar = (): ReactElement => {
    if (currentGame) {
      const colour = currentGame.colour
      const opponentColour = (currentGame.colour == "black")? "white" : "black"

      // Set the evaluation bars height based on the current evaluation
      let barHeight = 0
      if (evaluation.includes("mate")) {
        barHeight = (evaluation.includes("-") || evaluation.includes("0"))? -1 : 1
        barHeight *= (colour == "black")? (-1) ** (moveIndex % 2 + 1) : (-1) ** (moveIndex % 2)
      } else {
        let unbiasedEval = parseInt(evaluation)
        unbiasedEval *= (colour == "black")? (-1) ** (moveIndex % 2 + 1) : (-1) ** (moveIndex % 2)
        barHeight = 0.5 + 0.5 * (2 / (1 + Math.exp(-0.003 * unbiasedEval)) - 1)
        console.log(barHeight)
      }
      barHeight = Math.min(barHeight, 1)
      barHeight = Math.max(barHeight, 0)

      return <>
        <div className="h-[100%] flex flex-col mr-5 border border-grey-100">
          <div className={`w-10 bg-${opponentColour} transition-all ease-in-out`} style={{height: `${barHeight * 100}%`}}></div>
          <div className={`w-10 bg-${colour} transition-all ease-in-out`} style={{height: `${100 - barHeight * 100}%`}}></div>
        </div>
      </>
    }
    return <>
      <div className="h-[100%] flex flex-col mr-5 border border-grey-100">
        <div className={`w-10 flex-5 bg-white`}></div>
        <div className={`w-10 flex-5 bg-black`}></div>
      </div>
    </>
  }

  return (
    <div className="h-screen w-screen flex flex-row">
      <GameSelector
        playerId={playerId}
        displayedPlayerId={displayedPlayerId}
        games={games}
        setPlayerId={setPlayerId}
        fetchPlayersGames={fetchPlayersGames}
        convertPGNToFENSequence={convertPGNToFENSequence}
      />
      <div className="h-full w-[100%] flex flex-col items-center justify-center">
        {createGameHeading()}
        <div className="flex flex-row justify-center">
          {createEvalBar()}
            <Chessboard options={{
            arrows: arrows,
            position: currentMoveSet[moveIndex],
            boardStyle: {
              width: "50%",
              height: "auto",
            },
            boardOrientation: (currentGame)? currentGame.colour : 'white'
          }}/>
        </div>
        <div className="m-5 w-[20%] flex flex-row items-center justify-between text-5xl">
          <FontAwesomeIcon className={`${(moveIndex == 0)? 'opacity-50': 'opacity-100 hover:opacity-75'}`} icon={faArrowCircleLeft} onClick={() => updateMoveIndex(-1)}/>
          <FontAwesomeIcon className={`${(moveIndex == currentMoveSet.length - 1)? 'opacity-50': 'opacity-100 hover:opacity-75'}`} icon={faArrowCircleRight} onClick={() => updateMoveIndex(1)}/>
        </div>
      </div>
    </div>
  )
}

export default App
