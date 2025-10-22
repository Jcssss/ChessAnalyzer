import { useState, useEffect, useRef, type ReactElement } from 'react'
import { useDelayUpdate } from "./hooks/useDelayUpdate"
import { Chess, type Piece, type Square } from 'chess.js'
import { Chessboard, type PieceDataType, type PieceDropHandlerArgs, type PieceHandlerArgs, type SquareHandlerArgs } from 'react-chessboard'
import { faArrowCircleRight, faArrowCircleLeft, faEraser, faDeleteLeft} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { GameInfo } from "./types"
import GameSelector from './GameSelector';

function App() {
  const basePosition = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  const [playerId, setPlayerId] = useState("Jcssss")
  const [displayedPlayerId, setDisplayedPlayerId] = useState("Jcssss")

  // Variables for displaying the current game
  const [games, setGames]= useState<{"pgn": string}[]>([])
  const [currentMoveSet, setCurrentMoveSet] = useState<string[]>([basePosition])
  const [originalMoveSet, setOriginalMoveSet] = useState<string[]>([])
  const [currentGame, setCurrentGame] = useState<GameInfo | undefined>()
  const [moveIndex, setMoveIndex] = useState(0)
  const [originalMoveIndex, setOriginalMoveIndex] = useState(-1)
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([])
  const [lastSquareClicked, setLastSquareClicked] = useState<string | null>("")

  // Variables for stockfish handling
  const stockfishRef = useRef<any>(null);
  const [stockfishMove, setStockfishMove] = useState("")
  const [arrows, setArrows]: [{
    startSquare: string, 
    endSquare: string, 
    color: string
  }[], Function] = useState([])

  // Variables for Evaluation Bar
  const [evaluation, setEvaluation] = useState("")
  const [barHeight, setBarHeight] = useDelayUpdate(0.5, 200)

  // Variable to store width of the screen
  const [width, setWidth] = useState(0);

  // Initialize the stockfish engine and handle responses
  useEffect(() => {
    const stockfishWorker = new Worker("/ChessAnalyzer/stockfish/stockfish.js")
    stockfishWorker.onerror = (e) => console.log("Stockfish error:", e.message);

    // Handle stockfish responses
    stockfishWorker.onmessage = (e) => {
      console.log(`Stockfish says: ${e.data}`)

      // Best move suggestion
      if (e.data.includes("bestmove")) {
        const outputList = e.data.split(" ")
        setStockfishMove(outputList[1])

      // Mate in x suggestions
      } else if (e.data.includes("info") && e.data.includes("mate")) {
        const evaluation = e.data.match(/(mate \S*)(?:\s|$)/)
        setEvaluation(evaluation[0])

      // Centipawn rating suggestions
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
    determineBarHeight(evaluation)
  }, [evaluation])

  useEffect(() => {
    window.addEventListener("resize", detectWidth);
    detectWidth();
  }, []);

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
    setArrows([])

    // Get all of the moves that were made in the game
    let chess = new Chess()
    chess.loadPgn(game.pgn)
    const moves = chess.history()
    
    // Make a list of every move and save it
    chess = new Chess()
    let fenMoveList: string[] = []
    for (const move of moves) {
      chess.move(move);
      fenMoveList.push(chess.fen())
    }

    // Update state objects with the move list
    setCurrentMoveSet(fenMoveList)
    setCurrentGame(game)
    setMoveIndex(fenMoveList.length - 1)

    // Clear any saved games
    setOriginalMoveSet([])
    setOriginalMoveIndex(-1)
  }

  // Make a new move and update the history
  const makeMove = ({sourceSquare, targetSquare}: PieceDropHandlerArgs): boolean => {
    setPossibleMoves([])

    // Load the current position andd get the list of possible moves
    let chess = new Chess()
    chess.load(currentMoveSet[moveIndex])
    let possibleMoves = chess.moves({ square: sourceSquare as Square, verbose: true })

    // If the move is valid
    if (possibleMoves.some((move) => (move.to == targetSquare as Square))) {
      setArrows([])

      // Save a history of the moves up to the current move
      let movesMade = [...currentMoveSet]
      movesMade.splice(moveIndex + 1, movesMade.length - moveIndex)

      // Add the new move to the history
      chess.move({from: sourceSquare as Square, to: targetSquare as Square})
      movesMade.push(chess.fen())

      // If the original game is not saved,
      // Save it and the move we were on
      if (originalMoveIndex == -1) {
        setOriginalMoveSet([...currentMoveSet])
        setOriginalMoveIndex(moveIndex)

      // If the original game is saved, but we make a new move
      // before the saved move, update the move we were on
      } else if (originalMoveIndex > moveIndex) {
        setOriginalMoveIndex(moveIndex)
      }

      // Update the game to include the new move
      setCurrentMoveSet(movesMade)
      setMoveIndex(movesMade.length - 1)
      return true
    } else {
      return false
    }
  }

  // Reset the board to the last saved position in the original game
  const resetToLastPosition = (moveSet: string[], moveIndex: number): void => {
    setArrows([])
    setCurrentMoveSet([...moveSet])
    setMoveIndex(moveIndex)
    setOriginalMoveSet([])
    setOriginalMoveIndex(-1)
  }

  // Reset the board to starting setup
  const resetToStartPosition = (): void => {
    setArrows([])
    setCurrentMoveSet([basePosition])
    setMoveIndex(0)
    setOriginalMoveSet([])
    setOriginalMoveIndex(-1)
  }

  // Given a square, determine the list of possible moves in the current game
  const determinePossibleMoves = (square: string | null): Square[] => {
    let chess = new Chess()
    chess.load(currentMoveSet[moveIndex])

    let possibleMoves = chess.moves({ square: square as Square, verbose: true })
    return possibleMoves.map((move) => move.to)
  }

  // Update the move that we're looking at
  const updateMoveIndex = (update: number): void => {
    setArrows([])
    setMoveIndex(curr => {
      curr = curr + update
      if (curr < 0) {
        curr = 0
      } else if (curr > currentMoveSet.length - 1) {
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

  const determineBarHeight = (evaluation: string): void => {
    let barHeight = 0
    if (currentGame) {
      const colour = currentGame.colour

      // Set the evaluation bars height based on the current evaluation
      if (evaluation.includes("mate")) {
        barHeight = (evaluation.includes("-") || evaluation.includes("0"))? -1 : 1
        barHeight *= (colour == "black")? (-1) ** (moveIndex % 2 + 1) : (-1) ** (moveIndex % 2)
      } else {
        let unbiasedEval = parseInt(evaluation)
        unbiasedEval *= (colour == "black")? (-1) ** (moveIndex % 2 + 1) : (-1) ** (moveIndex % 2)
        barHeight = 0.5 + 0.5 * (2 / (1 + Math.exp(-0.003 * unbiasedEval)) - 1)
      }
      barHeight = Math.min(barHeight, 1)
      barHeight = Math.max(barHeight, 0)
    } else {
      barHeight = 0.5
    }

    setBarHeight(barHeight)
  }

  // const attemptMove = (square: string | null, piece: PieceDataType | null, lastSquareClicked: string | null): void => {
  //   console.log(square)
  //   if (lastSquareClicked == "" && piece) {
  //     let moves = determinePossibleMoves(lastSquareClicked)
  //     if (moves.length > 0) {
  //       setLastSquareClicked(square)
  //       setPossibleMoves(moves)
  //     }
  //   } else if (lastSquareClicked != ""){
  //     makeMove({sourceSquare: lastSquareClicked, targetSquare: square} as PieceDropHandlerArgs)
  //   }
  // }

  const getSquareStyles = (squares: Square[]): Record<string, Record<string, string>> => {
    let styles: Record<string, Record<string, string>> = {}
    for (let square of squares) {
      styles[square] = {
        backgroundColor: 'rgba(255,0,0,0.2)'
      }
    }
    return styles
  }

  const createEvalBar = (): ReactElement => {
    const colour = (currentGame)? currentGame.colour : "white"
    const opponentColour = (colour == "black")? "white" : "black"

    return <>
      <div className="h-[100%] flex flex-col mr-5 border border-grey-100">
        <div className={`w-10 transition-all ease-in-out`} style={{height: `${barHeight * 100}%`, backgroundColor: opponentColour}}></div>
        <div className={`w-10 transition-all ease-in-out`} style={{height: `${100 - barHeight * 100}%`, backgroundColor: colour}}></div>
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
              squareStyles: getSquareStyles(possibleMoves),
              boardStyle: {
                width: "50%",
                height: "auto",
              },
              boardOrientation: (currentGame)? currentGame.colour : 'white',
              // onSquareClick: ({square, piece}: SquareHandlerArgs) => attemptMove(square, piece, lastSquareClicked),
              onPieceDrop: makeMove,
              // onPieceClick: ({square, piece}: PieceHandlerArgs) => attemptMove(square, piece, lastSquareClicked),
              onPieceDrag: ({square}: PieceHandlerArgs) => setPossibleMoves(determinePossibleMoves(square))
            }}/>
          </div>
        <div className="m-5 w-[55%] flex flex-row items-center justify-end text-5xl space-x-5">
          <FontAwesomeIcon className={`${(moveIndex == 0 || currentMoveSet.length == 0)? 'opacity-50': 'opacity-100 hover:opacity-75'}`} icon={faArrowCircleLeft} onClick={() => updateMoveIndex(-1)}/>
          <FontAwesomeIcon 
            className={`${(currentMoveSet.length == 1)? 'opacity-50': 'opacity-100 hover:opacity-75'}`} 
            icon={faEraser}
            onClick={() => resetToStartPosition()}
          />
          <FontAwesomeIcon 
            className={`${(originalMoveSet.length == 0)? 'opacity-50': 'opacity-100 hover:opacity-75'}`} 
            icon={faDeleteLeft}
            onClick={() => resetToLastPosition(originalMoveSet, originalMoveIndex)}
          />
          <FontAwesomeIcon className={`${(moveIndex == currentMoveSet.length - 1 || currentMoveSet.length == 0)? 'opacity-50': 'opacity-100 hover:opacity-75'}`} icon={faArrowCircleRight} onClick={() => updateMoveIndex(1)}/>
        </div>
      </div>
    </div>
  )
}

export default App
