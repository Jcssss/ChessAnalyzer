import { useState, useEffect, useRef } from 'react'
import { Chess } from 'chess.js'
import { Chessboard, fenStringToPositionObject } from 'react-chessboard'

function App() {
  const [playerId, setPlayerId] = useState("Jcssss")
  const [games, setGames]: [{'pgn': string}[], Function] = useState([{'pgn': ""}])
  const [currentGame, setCurrentGame]: [string[], Function] = useState([])
  const [moveIndex, setMoveIndex] = useState(0)
   const stockfishRef = useRef<any>(null);

  useEffect(() => {
    const stockfishWorker = new Worker("/stockfish/stockfish.js")
    stockfishWorker.onerror = (e) => console.log("Stockfish:", e.message);
    stockfishWorker.onmessage = (e) => console.log("Stockfish:", e.data);
    stockfishWorker.postMessage("uci");

    stockfishRef.current = stockfishWorker

    return () => stockfishWorker.terminate?.();
  }, [])

  useEffect(() => {
    requestBestMove(currentGame[moveIndex])
  }, [moveIndex])

  // Ask Stockfish for the best move
  const requestBestMove = (fen: string) => {
    const stockfish = stockfishRef.current
    console.log(stockfish)
    if (!stockfish) return;
    console.log("Stockfish move")

    stockfish.postMessage("ucinewgame");
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage("go movetime 1000"); // think for 1 second

  };

  const fetchPlayersGames = async (playerName: string) => {
    console.log(playerName)
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

  const convertPGNToFENSequence = (): void => {
    let chess = new Chess()
    chess.loadPgn(games[0].pgn)
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

  const updateMoveIndex = (update: number): void => {
    setMoveIndex(curr => {
      curr = curr + update
      if (curr < 0) {
        curr = 0
      } else if (curr > currentGame.length - 1) {
        curr = currentGame.length - 1
      }

      return curr
    })
  }

  return (
    <>
      <input
        type="text"
        onChange={(input) => setPlayerId(input.target.value)}
        placeholder='Please type the player ID of the player you wish to view...'
        value={playerId}
      ></input>
      <div onClick={() => fetchPlayersGames(playerId)}>Submit</div>
      <div onClick={() => convertPGNToFENSequence()}>Fetch Game</div>
      <Chessboard options={{
        position: currentGame[moveIndex],
        boardStyle: {
          width: "400px"
        }
      }}/>
      <div onClick={() => {
        setMoveIndex(curr => curr - 1)
      }}>Left {moveIndex}</div>
      <div onClick={() => {
        setMoveIndex(curr => curr + 1)
      }}>Right {moveIndex}</div>
    </>
  )
}

export default App
