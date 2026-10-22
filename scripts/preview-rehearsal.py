"""Bounded protocol rehearsal for an authorized, protected QA preview.

Private config/cookie jars stay in ignored qa/.cache. This script neither creates
rooms nor advances Host state; the operator scopes those actions to QA fixtures.
It uses independent HTTP sessions, not independent browser engines.
"""
import concurrent.futures
import http.cookiejar
import json
import math
import re
import statistics
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

phase = sys.argv[1]
config = json.loads(Path("qa/.cache/preview-rehearsal-config.json").read_text())
base, room, count = config["base"], config["room"], config["players"]
assert 1 <= count <= 45
assert phase in ("join", "ready", "state", "answer", "recover", "rejoin", "duplicate", "stale", "monitor")
barrier = threading.Barrier(count)
cache = Path("qa/.cache/preview-sessions")
cache.mkdir(parents=True, exist_ok=True)

# Use the current public question after the operator advances the scoped QA room.
# This never retrieves the private answer key or Host credentials.
if phase == "answer":
    probe_jar = http.cookiejar.MozillaCookieJar(str(cache / "01.cookies"))
    probe_jar.load(ignore_discard=True, ignore_expires=True)
    probe = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(probe_jar))
    with probe.open(base + "/api/game/state?room=" + room, timeout=25) as response:
        public_state = json.load(response)
    assert public_state["room"]["status"] == "question", "QA room must be accepting answers"
    question = public_state["question"]
    config["previousQuestionId"] = config.get("questionId")
    config["questionId"] = question["id"]
    config["response"] = ({"option": question["options"][0]} if question["kind"] == "choice"
                          else {"answers": [f"QA song {index + 1}" for index in range(10)]})
    Path("qa/.cache/preview-rehearsal-config.json").write_text(json.dumps(config))

def run_player(index):
    nickname = f"QA_HTTP_{index:02d}_{config['fixture']}"
    cookie_path = cache / f"{index:02d}.cookies"
    jar = http.cookiejar.MozillaCookieJar(str(cookie_path))
    if cookie_path.exists():
        jar.load(ignore_discard=True, ignore_expires=True)
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    def request(path, body=None):
        headers = {"Content-Type": "application/json"}
        req = urllib.request.Request(base + path, data=None if body is None else json.dumps(body).encode(), headers=headers)
        try:
            with opener.open(req, timeout=25) as response:
                data = response.read()
                if response.headers.get("content-type", "").startswith("application/json"):
                    payload = json.loads(data)
                    timing = re.search(r"(?:^|,)\s*app;dur=([\d.]+)", response.headers.get("Server-Timing", ""))
                    if timing:
                        payload["_qa_app_ms"] = float(timing.group(1))
                    return response.status, payload
                return response.status, {"html": True}
        except urllib.error.HTTPError as error:
            try:
                return error.code, json.load(error)
            except (ValueError, OSError):
                return error.code, {"error": "NON_JSON_RESPONSE"}
        except Exception as error:
            # Exception text may contain request URLs; never log it.
            return 0, {"error": type(error).__name__}

    rows = []
    if phase == "join" and not cookie_path.exists():
        status, _ = request("/?" + urllib.parse.urlencode({"_vercel_share": config["share"]}))
        if status != 200:
            return [{"player": nickname, "ok": False, "status": status, "seconds": 0, "error": "PREVIEW_ACCESS_FAILED"}]
        status, payload = request("/api/game/session")
        jar.save(ignore_discard=True, ignore_expires=True)
        if status != 200 or payload.get("ok") is not True:
            return [{"player": nickname, "ok": False, "status": status, "seconds": 0, "error": "SESSION_BOOTSTRAP_FAILED"}]
    barrier.wait(timeout=90)
    started = time.perf_counter()
    iterations = 0
    while True:
        path, body = "/api/game/state?room=" + room, None
        if phase in ("join", "rejoin"):
            path, body = "/api/game/join", {"room": room, "nickname": nickname}
        elif phase == "ready":
            path, body = "/api/game/ready", {"room": room}
        elif phase in ("answer", "duplicate", "stale"):
            question_id = config["previousQuestionId"] if phase == "stale" else config["questionId"]
            path, body = "/api/game/answer", {"room": room, "questionId": question_id, "response": config["response"]}
        before = time.perf_counter()
        status, payload = request(path, body)
        elapsed = time.perf_counter() - before
        ok = status == 200
        summary = payload.get("summary") or {}
        if phase in ("state", "recover", "monitor"):
            ok = ok and (summary.get("player") or {}).get("nickname") == nickname
        if phase == "recover":
            ok = ok and summary.get("currentResponse") == config["response"]
        if phase == "rejoin":
            ok = ok and payload.get("rejoined") is True
        if phase == "answer":
            ok = ok and payload.get("accepted") is True
        if phase == "duplicate":
            ok = status == 409 and payload.get("error") == "ALREADY_ANSWERED"
        if phase == "stale":
            ok = status == 409 and payload.get("error") == "QUESTION_CHANGED"
        row = {"player": nickname, "status": status, "seconds": round(elapsed, 3), "ok": ok}
        if "_qa_app_ms" in payload:
            row["serverAppMs"] = payload["_qa_app_ms"]
        if not ok:
            row["error"] = str(payload.get("error", payload.get("summaryError", "UNEXPECTED_RESPONSE")))[:100]
        if phase in ("state", "monitor"):
            row["position"] = (payload.get("room") or {}).get("currentPosition")
            row["roomStatus"] = (payload.get("room") or {}).get("status")
        rows.append(row)
        iterations += 1
        if phase != "monitor" or time.perf_counter() - started >= 30 or iterations >= 30:
            break
        time.sleep(1)
    jar.save(ignore_discard=True, ignore_expires=True)
    return rows

before = time.perf_counter()
with concurrent.futures.ThreadPoolExecutor(max_workers=count) as pool:
    rows = [row for player_rows in pool.map(run_player, range(1, count + 1)) for row in player_rows]
times = sorted(row["seconds"] for row in rows)
report = {"phase": phase, "players": count, "requests": len(rows), "success": sum(row["ok"] for row in rows),
          "atUTC": datetime.now(timezone.utc).isoformat(),
          "errors": sum(not row["ok"] for row in rows), "p50": round(statistics.median(times), 3),
          "p95": times[max(0, math.ceil(len(times) * .95) - 1)], "max": max(times),
          "wallSeconds": round(time.perf_counter() - before, 3), "room": room, "base": base,
          "questionId": config.get("questionId"), "rows": rows}
output = Path(config["report"])
history = json.loads(output.read_text()) if output.exists() else []
history.append(report)
output.write_text(json.dumps(history, indent=2))
print(json.dumps({key: value for key, value in report.items() if key not in ("rows", "base", "questionId")}))
for row in rows:
    if not row["ok"]:
        print(json.dumps(row))
