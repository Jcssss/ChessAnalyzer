export type GameInfo = {
  "opponent": string | undefined,
  "colour": "white" | "black" | undefined, 
  "date": string | undefined,
  "pgn": string,
  "white": SideInfo,
  "black": SideInfo,
  "fen": string
  "result": string
}

export type SideInfo = {
  "rating": number,
  "result": string,
  "@id": string,
  "username": string,
  "uuid": string
}