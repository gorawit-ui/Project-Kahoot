"""Bounded 45-player HTTP rehearsal against an explicitly prepared QA room.

Usage: python3 scripts/load-event.py join|ready|poll|rejoin|answer
Requires qa/.cache/load-config.json with room and base; cookies stay in .cache.
Never creates/deletes a room or touches the Host controls itself.
"""
import concurrent.futures, http.cookies, json, statistics, sys, threading, time
import urllib.error, urllib.request
from pathlib import Path

phase = sys.argv[1]
config_path = Path("qa/.cache/load-config.json")
config = json.loads(config_path.read_text())
base = config.get("base", "https://jixgo-magical-24.vercel.app")
room = config["room"]
count = config.get("players", 45)
assert 1 <= count <= 45
sessions_path = Path("qa/.cache/load-sessions.json")
sessions = json.loads(sessions_path.read_text()) if sessions_path.exists() else {}
barrier = threading.Barrier(count)

def request_player(i):
    name = f"LOAD_{i:02d}"
    cookie = sessions.get(name, "")
    path = "/api/game/state?room=" + room
    body = None
    if phase in ("join", "rejoin"):
        path, body = "/api/game/join", {"room": room, "nickname": name}
    elif phase == "ready":
        path, body = "/api/game/ready", {"room": room}
    elif phase == "answer":
        path, body = "/api/game/answer", {"room": room, "questionId": config["questionId"], "response": {"option": "correct"}}
    elif phase == "baseline":
        path = "/api/game/state"
    else:
        assert phase in ("poll", "recover")
    headers = {"Content-Type": "application/json"}
    if cookie:
        headers["Cookie"] = "jixgo_player_token=" + cookie
    request = urllib.request.Request(base + path, data=json.dumps(body).encode() if body is not None else None, headers=headers)
    barrier.wait(timeout=10)
    start = time.perf_counter()
    status, payload, new_cookie = 0, {}, ""
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            status = response.status
            payload = json.load(response)
            parsed = http.cookies.SimpleCookie()
            for value in response.headers.get_all("Set-Cookie", []): parsed.load(value)
            if "jixgo_player_token" in parsed: new_cookie = parsed["jixgo_player_token"].value
    except urllib.error.HTTPError as error:
        status = error.code
        try: payload = json.load(error)
        except Exception: payload = {"error": "NON_JSON_RESPONSE"}
    except Exception as error:
        payload = {"error": type(error).__name__ + ": " + str(error)}
    seconds = time.perf_counter() - start
    ok = status == 200
    if phase == "baseline": ok = status == 400 and payload.get("error") == "ROOM_REQUIRED"
    if phase == "poll": ok = ok and payload.get("summary", {}).get("player", {}).get("nickname") == name
    if phase == "recover": ok = ok and payload.get("summary", {}).get("player", {}).get("nickname") == name and payload.get("summary", {}).get("currentResponse", {}).get("option") == "correct"
    if phase == "rejoin": ok = ok and payload.get("rejoined") is True
    if phase == "answer": ok = ok and payload.get("accepted") is True
    row = {"player": name, "status": status, "seconds": round(seconds, 3), "ok": ok}
    if not ok: row["error"] = payload.get("error", payload.get("summaryError", "UNEXPECTED_RESPONSE"))
    return row, new_cookie

start = time.perf_counter()
with concurrent.futures.ThreadPoolExecutor(max_workers=count) as pool:
    results = list(pool.map(request_player, range(1, count + 1)))
for row, cookie in results:
    if cookie: sessions[row["player"]] = cookie
sessions_path.write_text(json.dumps(sessions))
rows = [r for r, _ in results]
times = sorted(r["seconds"] for r in rows)
report = {"phase": phase, "players": count, "base": base, "room": room,
    "success": sum(r["ok"] for r in rows), "errors": sum(not r["ok"] for r in rows),
    "p50": statistics.median(times), "p95": times[min(len(times)-1, int(len(times)*.95))],
    "max": max(times), "wallSeconds": round(time.perf_counter()-start, 3), "requests": rows}
out = Path("qa/load-results-20261021.json")
history = json.loads(out.read_text()) if out.exists() else []
history.append(report); out.write_text(json.dumps(history, indent=2))
print(json.dumps({k:v for k,v in report.items() if k != "requests"}, ensure_ascii=False))
for row in rows:
    if not row["ok"]: print(json.dumps(row, ensure_ascii=False))
