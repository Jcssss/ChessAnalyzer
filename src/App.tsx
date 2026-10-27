import { useState, useEffect, useRef, type ReactElement } from 'react'
import { useDelayUpdate } from "./hooks/useDelayUpdate"
import { Chess, type Square } from 'chess.js'
import { Chessboard, type PieceDropHandlerArgs, type PieceHandlerArgs, type PieceDataType, type SquareHandlerArgs} from 'react-chessboard'
import { faArrowCircleRight, faArrowCircleLeft, faEraser, faDeleteLeft, faChessBoard, faBookOpen, faListUl} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { GameInfo } from "./types"
import GameSelector from './GameSelector';

function App() {
  const moveHistoryContainerRef = useRef<HTMLDivElement>(null);

  const basePosition = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  const [playerId, setPlayerId] = useState("Jcssss")
  const [displayedPlayerId, setDisplayedPlayerId] = useState("Jcssss")

  // Navigation tab state: 'board' | 'analysis' | 'games'
  const [mobileTab, setMobileTab] = useState<'board' | 'analysis' | 'games'>('board')

  // Variables for displaying the current game
  const [games, setGames]= useState<GameInfo[]>([])

  // Variables storing the current move set and history
  const [curFENMoveSet, setCurFENMoveSet] = useState<string[]>([])
  const [curSANMoveSet, setCurSANMoveSet] = useState<string[]>([])
  const [currentGame, setCurrentGame] = useState<GameInfo | undefined>()
  const [moveIndex, setMoveIndex] = useState(-1)

  // Variables storing the original move set, before custom moves
  const [originalFENMoveSet, setOriginalFENMoveSet] = useState<string[]>([])
  const [originalSANMoveSet, setOriginalSANMoveSet] = useState<string[]>([])
  const [originalMoveIndex, setOriginalMoveIndex] = useState(-1)

  // Variables for cell highlight on board
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

  // Variable to store width of the screen, for resizing
  const [width, setWidth] = useState(0);

  // Initialize the stockfish engine and handle responses
  useEffect(() => {
    const stockfishWorker = new Worker("/ChessAnalyzer/stockfish/stockfish.js")
    stockfishWorker.onerror = (e) => console.log("Stockfish error:", e.message);

    // Handle stockfish responses
    stockfishWorker.onmessage = (e) => {

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

  useEffect(() => {
    if (moveHistoryContainerRef.current) {
      // Use behavior: 'smooth' for animated scrolling, or 'instant' for a sharp jump
      moveHistoryContainerRef.current.scrollTo({
        top: moveHistoryContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [curSANMoveSet]); // Triggers whenever a new move is added

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
    requestBestMove(getCurFENPosition())
  }, [moveIndex])

  const getCurFENPosition = (): string => {
    return (moveIndex < 0)? basePosition : curFENMoveSet[moveIndex]
  }

  // Ask Stockfish for the best move
  const requestBestMove = (fen: string) => {
    const stockfish = stockfishRef.current
    if (!stockfish || curFENMoveSet.length == 0) return;

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
    setCurFENMoveSet(fenMoveList)
    setCurSANMoveSet(moves)
    
    // Split the FEN string by spaces to isolate the fields
    const fenString = game.fen
    const fields = fenString.trim().split(/\s+/);
    
    // The active color is always the second field (index 1)
    const colorChar = fields[1];
    if (colorChar === 'w') {
      game.colour = "white"
    } else if (colorChar === 'b') {
      game.colour = "black"
    }

    setCurrentGame(game)
    setMoveIndex(fenMoveList.length - 1)

    // Clear any saved games
    setOriginalFENMoveSet([])
    setOriginalSANMoveSet([])
    setOriginalMoveIndex(-1)

    setMobileTab('board')
  }

  // Make a new move and update the history
  const makeMove = ({sourceSquare, targetSquare}: PieceDropHandlerArgs): boolean => {
    setPossibleMoves([])

    // Load the current position andd get the list of possible moves
    let chess = new Chess()
    chess.load(getCurFENPosition())
    let possibleMoves = chess.moves({ square: sourceSquare as Square, verbose: true })

    // If the move is valid
    if (possibleMoves.some((move) => (move.to == targetSquare as Square))) {
      setArrows([])

      // Save a history of the moves up to the current move, we overwrite moves after
      let movesMadeFEN = [...curFENMoveSet]
      movesMadeFEN.splice(moveIndex + 1)
      let movesMadeSAN = [...curSANMoveSet]
      movesMadeSAN.splice(moveIndex + 1) // FEN is one item longer because of starting position

      // Add the new move to the history
      let moveDetails = chess.move({from: sourceSquare as Square, to: targetSquare as Square})
      movesMadeFEN.push(chess.fen())
      movesMadeSAN.push(moveDetails.san)

      // If the original game is not saved,
      // Save it and the move we were on
      if (originalMoveIndex == -1) {
        setOriginalFENMoveSet([...curFENMoveSet])
        setOriginalSANMoveSet([...curSANMoveSet])
        setOriginalMoveIndex(moveIndex)

      // If the original game is saved, but we make a new move
      // before the saved move, update the move we were on
      } else if (originalMoveIndex > moveIndex) {
        setOriginalMoveIndex(moveIndex)
      }

      // Update the game to include the new move
      setCurFENMoveSet(movesMadeFEN)
      setCurSANMoveSet(movesMadeSAN)
      setMoveIndex(ind => ind + 1)
      return true
    } else {
      return false
    }
  }

  // Reset the board to the last saved position in the original game
  const resetToLastPosition = (): void => {
    setArrows([])
    setCurFENMoveSet([...originalFENMoveSet])
    setCurSANMoveSet([...originalSANMoveSet])
    setMoveIndex(originalMoveIndex)
    setOriginalFENMoveSet([])
    setOriginalSANMoveSet([])
    setOriginalMoveIndex(-1)
  }

  // Reset the board to starting setup
  const resetToStartPosition = (): void => {
    setArrows([])
    setCurFENMoveSet([])
    setCurSANMoveSet([])
    setMoveIndex(-1)
    setOriginalFENMoveSet([])
    setOriginalSANMoveSet([])
    setOriginalMoveIndex(-1)
    setCurrentGame(undefined)
  }

  // Given a square, determine the list of possible moves in the current game
  const determinePossibleMoves = (square: string | null): Square[] => {
    let chess = new Chess()
    chess.load(getCurFENPosition())

    let possibleMoves = chess.moves({ square: square as Square, verbose: true })
    return possibleMoves.map((move) => move.to)
  }

  // Update the move that we're looking at
  const updateMoveIndex = (update: number): void => {
    console.log(update)
    setArrows([])
    setMoveIndex(curr => {
      curr = curr + update
      if (curr < 0) {
        curr = 0
      } else if (curr > curFENMoveSet.length - 1) {
        curr = curFENMoveSet.length - 1
      }

      return curr
    })
  }

  // Create the heading above each game
  const createGameHeading = (): ReactElement => {
    if (currentGame) {
      return (
        <>
          {/* Row 1: Opponent Info */}
          <div className="flex flex-col px-3 py-1 justify-center">
            <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Opponent</span>
            <span className="text-sm font-semibold text-neutral-200 truncate">{currentGame.opponent}</span>
          </div>
          
          {/* Row 2: Date Info */}
          <div className="flex flex-col px-3 py-1 justify-center">
            <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Date</span>
            <span className="text-sm text-neutral-300 font-medium">{currentGame.date}</span>
          </div>

          {/* Row 1: Opponent Info */}
          <div className="flex flex-col px-3 py-1 justify-center">
            <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Result</span>
            <span className="text-sm font-semibold text-neutral-200 truncate">{currentGame.result}</span>
          </div>
          
          {/* Row 2: Date Info */}
          <div className="flex flex-col px-3 py-1 justify-center">
            <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Colour</span>
            <span className="text-sm text-neutral-300 font-medium">{currentGame.colour}</span>
          </div>
        </>
      );
    }

    // Fallback state if no game is selected
    return (
      <div className="col-span-2 text-center text-xs text-neutral-400 italic py-6 px-4">
        Select a game to begin analysis
      </div>
    );
  };

  // Determine the height of the evaluation bar
  const determineBarHeight = (evaluation: string): void => {
    let barHeight = 0
    if (currentGame) {
      const colour = currentGame.colour

      // Set the evaluation bars height based on the current evaluation
      if (evaluation.includes("mate")) {
        barHeight = (evaluation.includes("-") || evaluation.includes("0"))? -1 : 1
        barHeight *= (colour == "black")? (-1) ** (moveIndex % 2 + 1) : (-1) ** (moveIndex % 2)
      } else {
        let unbiasedEval = parseInt(evaluation) || 0
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

  // When a square is clicked, attempt to make a move
  const attemptMove = (square: string | null, piece: PieceDataType | null, lastSquareClicked: string | null): void => {
    
    // If there's a piece on the clicked square, and no square was previously selected
    if (lastSquareClicked == "" && piece) {

      // Check if the clicked piece has any valid moves
      let moves = determinePossibleMoves(square)

      // If there are valid moves, set this piece as selected
      if (moves.length > 0) {
        setLastSquareClicked(square)
        setPossibleMoves(moves)
      }

    // If a previous square was selected
    } else if (lastSquareClicked != ""){

      // Attempt to move the piece to the clicked square
      const madeMove = makeMove({sourceSquare: lastSquareClicked, targetSquare: square} as PieceDropHandlerArgs)

      // If the move was made, reset selected piece
      if (madeMove) {
        setLastSquareClicked("")
      } else {

        // Otherwise, if the piece has any valid moves
        let moves = determinePossibleMoves(square)

        // Update the selected piece
        if (moves.length > 0) {
          setLastSquareClicked(square)
          setPossibleMoves(moves)
        }
      }
    }
  }

  // Given a square, determine the list of possible moves in the current game
  const getSquareStyles = (squares: Square[]): Record<string, Record<string, string>> => {
    let styles: Record<string, Record<string, string>> = {}

    // For each square, assign it a style
    for (let square of squares) {
      styles[square] = {
        backgroundColor: 'rgba(36, 234, 59, 0.2)'
      }
    }
    return styles
  }

  // Create the vertical evaluation bar
  const createVerticalEvalBar = (): ReactElement => {
    const colour = (currentGame)? currentGame.colour : "white"
    const opponentColour = (colour == "black")? "white" : "black"

    return (
      <div className="h-[99%] flex flex-col mr-2 sm:mr-4 border border-neutral-700 rounded overflow-hidden flex-shrink-0">
        <div className={`w-4 sm:w-6 transition-all ease-in-out`} style={{height: `${barHeight * 100}%`, backgroundColor: opponentColour}}></div>
        <div className={`w-4 sm:w-6 transition-all ease-in-out`} style={{height: `${(1 - barHeight) * 100}%`, backgroundColor: colour}}></div>
      </div>
    )
  }

  // Create the horizontal evaluation bar (for mobile)
  const createHorizontalEvalBar = (): ReactElement => {
    const colour = (currentGame)? currentGame.colour : "white"
    const opponentColour = (colour == "black")? "white" : "black"

    return (
      <div className="w-full h-3 flex flex-row border border-neutral-700 rounded overflow-hidden mb-2 flex-shrink-0">
        <div className={`h-full transition-all ease-in-out`} style={{width: `${barHeight * 100}%`, backgroundColor: opponentColour}}></div>
        <div className={`h-full transition-all ease-in-out`} style={{width: `${(1 - barHeight) * 100}%`, backgroundColor: colour}}></div>
      </div>
    )
  }

  // Board navigation controls
  const renderControls = (direction: 'horizontal' | 'vertical') => (
    <div className={`flex ${direction === 'horizontal' ? 'flex-row w-full justify-around mt-3 text-2xl sm:text-3xl' : 'flex-col xl:m-5 w-10 sm:w-12 text-3xl sm:text-5xl justify-end gap-3'} flex-shrink-0 m-5`}>
      <button className={`${(moveIndex == -1)? 'opacity-50': 'opacity-100 hover:opacity-75 active:opacity-75'}`}>
        <FontAwesomeIcon icon={faArrowCircleLeft} onClick={() => updateMoveIndex(-1)}/>
      </button>
      <button className={`${(curFENMoveSet.length == 0)? 'opacity-50': 'opacity-100 hover:opacity-75 active:opacity-75'}`}>
        <FontAwesomeIcon icon={faEraser} onClick={() => resetToStartPosition()}/>
      </button>
      <button className={`${(originalFENMoveSet.length == 0)? 'opacity-50': 'opacity-100 hover:opacity-75 active:opacity-75'}`}>
        <FontAwesomeIcon icon={faDeleteLeft} onClick={() => resetToLastPosition()}/>
      </button>
      <button className={`${(moveIndex == curFENMoveSet.length - 1 || curFENMoveSet.length == 0)? 'opacity-50': 'opacity-100 hover:opacity-75 active:opacity-75'}`}>
        <FontAwesomeIcon icon={faArrowCircleRight} onClick={() => updateMoveIndex(1)}/>
      </button>
    </div>
  )

  const isWideScreen = width >= 1350;
  const isSideControls = width >= 650;

  return (
    <div className="h-screen w-screen flex flex-row text-white bg-neutral-900 overflow-hidden">
      
      {/* Game Selector Sidebar */}
      <div className={`${isWideScreen ? 'flex' : (mobileTab === 'games' ? 'flex flex-col w-full' : 'hidden')} h-full z-40 bg-neutral-900`}>

        {/* Header */}
        <header className={`p-4 flex items-center justify-between border-b border-neutral-700 flex-shrink-0 ${isWideScreen? 'hidden' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">ChessAnalyzer.io</h1>
          </div>
        </header>

        <GameSelector
          playerId={playerId}
          displayedPlayerId={displayedPlayerId}
          games={games}
          setPlayerId={setPlayerId}
          fetchPlayersGames={fetchPlayersGames}
          convertPGNToFENSequence={convertPGNToFENSequence}
          isWideScreen={isWideScreen}
        />
      </div>

      {/* Main Analysis Area */}
      <main className={`flex-1 flex flex-col min-w-0 bg-neutral-900 h-full pb-16 ${!isWideScreen && mobileTab === 'games' ? 'hidden' : 'flex'}`}>
        
        {/* Header */}
        <header className={`p-4 flex items-center justify-between border-b border-neutral-700 flex-shrink-0 ${!isWideScreen && mobileTab === 'games' ? 'hidden' : 'flex'}`}>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">ChessAnalyzer.io</h1>
          </div>
        </header>

        {/* Content Container */}
        <div className={`flex-1 p-0 max-[1350px]:p-2 xl:p-6 flex flex-col xl:flex-row gap-0 max-[1350px]:gap-2 xl:gap-6 overflow-hidden items-center justify-center min-h-0`}>
          
          {/* Central Board Area */}
          <div className={`w-full h-full xl:w-auto xl:h-full xl:max-h-[calc(100vh-140px)] min-h-0 bg-neutral-900 xl:bg-neutral-800 p-2 xl:p-4 xl:rounded-xl xl:border xl:border-neutral-700 flex flex-col xl:flex-row items-center justify-center overflow-hidden ${!isWideScreen && mobileTab === 'analysis' ? 'hidden' : 'flex'}`}>
            
            {isSideControls ? (
              <div className="flex flex-row items-center justify-center h-full w-full min-h-0">
                {createVerticalEvalBar()}
                <div className="w-auto h-full max-h-[min(100%,75vh)] aspect-square flex items-center justify-center min-h-0">
                  <Chessboard options={{
                    arrows: arrows,
                    position: getCurFENPosition(),
                    squareStyles: getSquareStyles(possibleMoves),
                    boardStyle: {
                      width: "100%",
                      height: "100%",
                      maxHeight: "100%",
                      maxWidth: "100%",
                    },
                    allowDragging: true,
                    boardOrientation: (currentGame)? currentGame.colour : 'white',
                    onSquareClick: ({square, piece}: SquareHandlerArgs) => attemptMove(square, piece, lastSquareClicked),
                    onPieceDrop: makeMove,
                    onPieceDrag: ({square}: PieceHandlerArgs) => setPossibleMoves(determinePossibleMoves(square)),
                    lightSquareStyle: {backgroundColor: 'rgba(255, 255, 255, 1)'},
                    darkSquareStyle: {backgroundColor: 'rgba(206, 168, 85, 1)'},
                    showNotation: (width > 600)
                  }} />
                </div>
                {renderControls('vertical')}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full max-w-[min(100vw-24px,55vh)] my-auto min-h-0">
                {createHorizontalEvalBar()}
                
                {/* Board Container */}
                <div className="w-full max-w-[300px] min-[400px]:max-w-full aspect-square flex items-center justify-center">
                  <Chessboard options={{
                    arrows: arrows,
                    position: getCurFENPosition(),
                    squareStyles: getSquareStyles(possibleMoves),
                    boardStyle: {
                      width: "100%",
                      height: "100%",
                      maxHeight: "100%",
                      maxWidth: "100%",
                    },
                    allowDragging: true,
                    boardOrientation: (currentGame)? currentGame.colour : 'white',
                    onSquareClick: ({square, piece}: SquareHandlerArgs) => attemptMove(square, piece, lastSquareClicked),
                    onPieceDrop: makeMove,
                    onPieceDrag: ({square}: PieceHandlerArgs) => setPossibleMoves(determinePossibleMoves(square)),
                    lightSquareStyle: {backgroundColor: 'rgba(255, 255, 255, 1)'},
                    darkSquareStyle: {backgroundColor: 'rgba(206, 168, 85, 1)'},
                    showNotation: false
                  }} />
                </div>
                {renderControls('horizontal')}
              </div>
            )}
          </div>

          {/* Right Side Container / Analysis Section */}
          <aside className={`w-full h-full xl:w-[320px] xl:max-h-[calc(100vh-140px)] flex flex-col gap-2 xl:gap-4 min-h-0 bg-neutral-900 xl:bg-transparent p-2 xl:p-0 ${!isWideScreen && mobileTab === 'board' ? 'hidden' : 'flex'}`}>
            
            {/* Top Section: Game Info */}
            <section className="flex flex-col h-[160px] min-h-0 flex-shrink-0">
              <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 flex flex-col h-full">
                <h2 className="text-lg font-semibold text-neutral-100 mb-1">Game Info</h2>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pr-1 text-sm font-mono">
                  {createGameHeading()}
                </div>
              </div>
            </section>

            {/* Bottom Section: Move History */}
            <section className="flex flex-col flex-1 min-h-0">
              <div className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 flex flex-col h-full">
                <h2 className="text-lg font-semibold text-neutral-100 mb-2">Engine & Move History</h2>
                
                <div ref={moveHistoryContainerRef} className="grid grid-cols-2 gap-x-2 gap-y-1 overflow-y-auto pr-1 text-sm font-mono flex-1 content-start">
                  {curSANMoveSet.map((sanMove, index) => {
                    const isActive = index === moveIndex;
                    const itemStyles = `
                      px-3 py-1.5 rounded-md font-mono text-sm transition-colors cursor-pointer even:mr-2 h-8 flex items-center justify-center
                      ${isActive 
                        ? 'bg-emerald-600 text-white font-semibold' 
                        : 'hover:bg-neutral-700/30 odd:bg-neutral-400/50 odd:text-neutral-200 even:bg-neutral-700/50 even:text-neutral-400'
                      }
                    `;

                    return (
                      <div key={index} className={itemStyles} onClick={() => updateMoveIndex(index - moveIndex)}>
                        {sanMove}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

          </aside>
        </div>
      </main>

      {/* Bottom Navigation Bar for compact view (<1350px) */}
      {!isWideScreen && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-neutral-800 border-t border-neutral-700 flex items-center justify-around z-50 px-2">
          <button 
            onClick={() => setMobileTab('games')}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs gap-1 ${mobileTab === 'games' ? 'text-emerald-400 font-bold' : 'text-neutral-400'}`}
          >
            <FontAwesomeIcon icon={faBookOpen} className="text-lg" />
            <span>Games</span>
          </button>

          <button 
            onClick={() => setMobileTab('board')}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs gap-1 ${mobileTab === 'board' ? 'text-emerald-400 font-bold' : 'text-neutral-400'}`}
          >
            <FontAwesomeIcon icon={faChessBoard} className="text-lg" />
            <span>Board</span>
          </button>

          <button 
            onClick={() => setMobileTab('analysis')}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs gap-1 ${mobileTab === 'analysis' ? 'text-emerald-400 font-bold' : 'text-neutral-400'}`}
          >
            <FontAwesomeIcon icon={faListUl} className="text-lg" />
            <span>Analysis</span>
          </button>
        </nav>
      )}

    </div>
  )
}

export default App