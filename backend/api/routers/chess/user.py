import random

import chess
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/chess/user", tags=["Chess User against User"])

active_games: dict[str, dict] = {}


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"

@router.websocket("/ws/join")
async def websocket_endpoint(
    ws: WebSocket, user_id: int, code: str | None = None
) -> None:
    await ws.accept()

    if not code:
        code = generate_code()
        active_games[code] = {"board": chess.Board(), "players": {}, "creator": user_id}

    if code not in active_games:
        await ws.send_json({"type": "error", "message": "Game not found"})
        await ws.close()
        return None

    game = active_games[code]

    if len(game["players"]) >= 2 and user_id not in game["players"]:
        await ws.send_json({"type": "error", "message": "Room is full (2/2)"})
        await ws.close()
        return None

    color = "white" if not game["players"] else "black"
    game["players"][user_id] = {"ws": ws, "color": color}

    await ws.send_json(
        {"type": "joined", "code": code, "color": color, "fen": game["board"].fen()}
    )

    if len(game["players"]) == 2:
        for player in game["players"].values():
            await player["ws"].send_json(
                {
                    "type": "start",
                    "fen": game["board"].fen(),
                    "turn": "white" if game["board"].turn == chess.WHITE else "black",
                }
            )

    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        game["players"].pop(user_id, None)
        for player in game["players"].values():
            await player["ws"].send_json({"type": "opponent_left"})

        if not game["players"]:
            active_games.pop(code, None)


@router.websocket("/ws/move")
async def ws_move(ws: WebSocket, user_id: int, code: str) -> None:
    await ws.accept()

    if code not in active_games:
        await ws.send_json({"type": "error", "message": "Game not found"})
        await ws.close()
        return None

    game = active_games[code]

    try:
        while True:
            data = await ws.receive_json()

            move_san = data.get("move")
            player_color = game["players"][user_id]["color"]
            board_turn = "white" if game["board"].turn == chess.WHITE else "black"

            if player_color != board_turn:
                await ws.send_json({"type": "error", "message": "Not your turn"})
                continue

            try:
                move = game["board"].parse_san(move)
            except BaseException:
                await ws.send_json({"type": "error", "message": "Illegal move"})
                continue

            if move not in game["board"].legal_moves:
                await ws.send_json({"type": "error", "message": "Illegal move"})
                continue

            game["board"].push(move)

            if game["board"].is_game_over(claim_draw=True):
                outcome = game["board"].outcome()
                result = game["board"].result()
                reason = outcome.termination.name if outcome else "Unknown"

                for player in game["players"].values():
                    await player["ws"].send_json(
                        {
                            "type": "game_over",
                            "fen": game["board"].fen(),
                            "result": result,
                            "reason": reason,
                        }
                    )

                active_games.pop(code, None)
                break

            for player in game["players"].values():
                await player["ws"].send_json(
                    {
                        "type": "move",
                        "fen": game["board"].fen(),
                        "turn": (
                            "white" if game["board"].turn == chess.WHITE else "black"
                        ),
                        "last_move": move_san,
                    }
                )
    except WebSocketDisconnect:
        game["players"].pop(user_id, None)
        for player in game["players"].values():
            await player["ws"].send_json({"type": "opponent_left"})

        if not game["players"]:
            active_games.pop(code, None)

@router.websocket("/ws/resign")
async def ws_resign(ws: WebSocket, user_id: int, code: str) -> None:
    await ws.accept()

    if code not in active_games:
        await ws.send_json({"type": "error", "message": "Game not found"})
        await ws.close()
        return None

    game = active_games[code]

    if user_id not in game["players"]:
        await ws.send_json({"type": "error", "message": "Not in game"})
        await ws.close()
        return None

    loser_color = game["players"][user_id]["color"]
    winner_color = "black" if loser_color == "white" else "white"

    for player in game["players"].values():
        await player["ws"].send_json({
            "type": "game_over",
            "fen": game["board"].fen(),
            "result": "1-0" if winner_color == "white" else "0-1",
            "reason": "resignation"
        })

    active_games.pop(code, None)
