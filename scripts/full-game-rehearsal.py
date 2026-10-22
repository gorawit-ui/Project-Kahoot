"""Advance only an explicitly configured synthetic room through the public RPC.

Uses the public anon key and a fixture-only Host token. Browser confirmations
come from actual CUA UI actions through a shared, non-secret observation file.
Never use this harness with an event room or a production Host credential.
"""
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

config = json.loads(Path("qa/.cache/preview-rehearsal-config.json").read_text())
assert config["fixture"] == "84c9b2" and config["room"] == "768791"
assert config["qa_host_token"] == "qa-preview-84c9b2-host"
progress = Path("/workspace/scratch/jixgo-qa-browser-progress-84c9b2.json")
stage_path = Path("qa/.cache/current-qa-stage.json")
observations = []

def stage(position, status):
    stage_path.write_text(json.dumps({"position": position, "status": status}))
    print(json.dumps({"position": position, "status": status}), flush=True)

def host(position, status):
    payload = {"p_code": config["room"], "p_host_token": config["qa_host_token"],
               "p_position": position, "p_status": status}
    req = urllib.request.Request(config["supabase_url"] + "/rest/v1/rpc/host_set_question",
        data=json.dumps(payload).encode(), headers={"Content-Type": "application/json",
        "apikey": config["public_anon_key"], "Authorization": "Bearer " + config["public_anon_key"]})
    with urllib.request.urlopen(req, timeout=25) as response:
        data = json.load(response)
    assert data["room"]["code"] == config["room"]
    assert data["room"]["currentPosition"] == position and data["room"]["status"] == status
    observations.append({"position": position, "hostStatus": status, "ok": True})
    stage(position, status)

def phase(name):
    result = subprocess.run([sys.executable, "scripts/preview-rehearsal.py", name], capture_output=True, text=True, timeout=100)
    # Only the first summary line; request URLs and cookie jars are never logged.
    if result.returncode:
        raise RuntimeError("QA protocol process failed: " + name)
    summary = json.loads(result.stdout.splitlines()[0])
    print(json.dumps(summary), flush=True)
    assert summary["errors"] == 0, "QA protocol failures in " + name

def browser(position, status):
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        try:
            signal = json.loads(progress.read_text())
            if signal.get("position") == position and signal.get("status") == status:
                observations.append({"position": position, "browserStatus": status, "ok": True})
                return
        except (FileNotFoundError, ValueError):
            pass
        time.sleep(.25)
    raise TimeoutError(f"No browser confirmation for {position}/{status}")

try:
    phase("ready")
    for position in range(1, 21):
        host(position, "question")
        if position == 10:
            phase("monitor")
        phase("answer")
        if position == 2:
            phase("duplicate")
        if position == 8:
            phase("recover")
        if position == 10:
            phase("rejoin")
        browser(position, "submitted" if position != 3 else "intentionally_unanswered")
        host(position, "reveal")
        phase("state")
        browser(position, "reveal")
    host(20, "q20_summary")
    phase("state")
    browser(20, "q20_summary")
    host(20, "finished")
    phase("state")
    browser(20, "finished")
    stage(20, "complete")
except Exception as error:
    observations.append({"ok": False, "errorType": type(error).__name__, "detail": str(error)[:100]})
    stage(0, "stopped")
    raise
finally:
    Path("qa/full-game-controller-20261022.json").write_text(json.dumps(observations, indent=2))
