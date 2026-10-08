"""Field JSA browser tests - one command runs them all.

    python tests\\run.py                 every suite
    python tests\\run.py fj003-home-new-button   just these (file names in tests\\, no .js)

Modelled on app_testing\\jobhub-tests, cut down for a static single-file app. One local server (Python's http.server,
port 8797) serves this repo folder, serves jsa-walkthrough-test.html with tests\\lib.js and the suite injected, and
takes the results the page posts back. Each suite opens that page in headless Edge at phone size (390x844) with a fresh
profile, so localStorage starts empty. Headless Edge won't size a window under ~500 px wide, so the page runs in an
iframe of exactly the phone size (/__phone) inside a bigger window. Scratch files (Edge profiles, results) go to %TEMP%\\fieldjsa-tests\\<run>; the
last 3 runs are kept.

A suite is tests\\<name>.js (every .js here except lib.js), run inside the page after lib.js; it reports through ck()
and done(). A line "// @variant window=360x800" runs it once per variant. Exit code 0 = every check passed.

Nothing is left running: the runner joins a Windows job that closes everything in it when the runner ends (finished,
Ctrl+C, crashed or its window closed), and every Edge it starts belongs to that job. Each suite also closes its own
Edge as soon as it's done. On start it closes test browsers left by earlier runs, and refuses to start if another run
is in progress.
"""
import ctypes, http.server, json, os, re, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.parse
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
APP = "jsa-walkthrough-test.html"
EDGE = Path(os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")) / "Microsoft" / "Edge" / "Application" / "msedge.exe"
PORT = 8797                 # the repo folder, the injected page and the results, all on one port
PHONE = "390x844"
SCRATCH = "fieldjsa-tests"  # %TEMP%\fieldjsa-tests
KEEP_RUNS = 3
RESULTS = {}
INJECT = {}                 # run id -> the scripts to put before </body>


class Server(http.server.ThreadingHTTPServer):
    """Held exclusively: the port is also the "one run at a time" lock. (Python's HTTP server turns on address reuse,
    which on Windows lets a second run open the same port.)"""
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(REPO), **kw)

    def do_GET(self):
        u = urllib.parse.urlsplit(self.path)
        q = urllib.parse.parse_qs(u.query)
        rid = q.get("t", [""])[0]
        if u.path == "/__phone" and rid in INJECT:
            w, h = (int(x) for x in q["size"][0].split("x"))
            self.send_text(f"<!DOCTYPE html><html><body style='margin:0;background:#888'><iframe src='/{APP}?t={rid}' "
                           f"style='display:block;border:0;width:{w}px;height:{h}px;background:#fff'></iframe></body></html>")
            return
        if u.path == "/" + APP and rid in INJECT:
            html = (REPO / APP).read_text(encoding="utf-8")   # read fresh: the suite tests the file as it is on disk
            i = html.rindex("</body>")
            self.send_text(html[:i] + INJECT[rid] + html[i:])
            return
        super().do_GET()

    def send_text(self, html):
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length") or 0)).decode("utf-8")
        RESULTS[self.path.strip("/").removeprefix("__result/")] = body
        self.send_response(204)
        self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


# ------------------------------------------------------------------ nothing left running

class _IoCounters(ctypes.Structure):
    _fields_ = [(n, ctypes.c_ulonglong) for n in ("reads", "writes", "others", "read_bytes", "write_bytes", "other_bytes")]


class _BasicLimits(ctypes.Structure):
    _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64), ("LimitFlags", ctypes.c_uint32),
                ("MinimumWorkingSetSize", ctypes.c_size_t), ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", ctypes.c_uint32),
                ("Affinity", ctypes.c_size_t), ("PriorityClass", ctypes.c_uint32), ("SchedulingClass", ctypes.c_uint32)]


class _ExtendedLimits(ctypes.Structure):
    _fields_ = [("Basic", _BasicLimits), ("Io", _IoCounters), ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]


JOB = None                       # (kernel32, job handle) once the runner is in its kill-on-close job
_EXTENDED_LIMITS = 9             # JobObjectExtendedLimitInformation
_KILL_ON_JOB_CLOSE = 0x2000      # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE


def join_kill_job():
    """Put this runner in a Windows job that kills every process in it when the runner ends, however it ends. The
    Edges it starts (and their helpers) are born into the same job."""
    global JOB
    if os.name != "nt":
        return False
    k = ctypes.WinDLL("kernel32", use_last_error=True)
    k.CreateJobObjectW.restype = ctypes.c_void_p
    k.GetCurrentProcess.restype = ctypes.c_void_p
    for f in (k.SetInformationJobObject, k.AssignProcessToJobObject, k.QueryInformationJobObject):
        f.restype = ctypes.c_int
    job = k.CreateJobObjectW(None, None)
    if not job:
        return False
    info = _ExtendedLimits()
    info.Basic.LimitFlags = _KILL_ON_JOB_CLOSE
    if not k.SetInformationJobObject(ctypes.c_void_p(job), _EXTENDED_LIMITS, ctypes.byref(info), ctypes.sizeof(info)):
        return False
    if not k.AssignProcessToJobObject(ctypes.c_void_p(job), ctypes.c_void_p(k.GetCurrentProcess())):
        return False
    JOB = (k, job)
    return True


def peak_memory_mb():
    if not JOB:
        return None
    k, job = JOB
    info = _ExtendedLimits()
    if not k.QueryInformationJobObject(ctypes.c_void_p(job), _EXTENDED_LIMITS, ctypes.byref(info), ctypes.sizeof(info), None):
        return None
    return info.PeakJobMemoryUsed / 2 ** 20


def leftovers():
    """Test browsers still running (their profiles live under %TEMP%\\fieldjsa-tests)."""
    ps = ("Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { "
          f"$_.CommandLine -like '*\\{SCRATCH}\\*' }} | ForEach-Object {{ $_.ProcessId }}")
    out = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True).stdout
    return [int(x) for x in out.split() if x.isdigit() and int(x) != os.getpid()]


def close(pids):
    for pid in pids:
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True)   # the process and its helpers


def prune_runs(base, keep):
    """Delete this runner's own old dated run folders (YYYYMMDD-HHMMSS) directly inside base, keeping the newest
    `keep`. Disposable machine copies; nothing outside base, and nothing but those folders, is touched."""
    base = base.resolve()
    runs = sorted((d for d in base.iterdir() if d.is_dir() and re.fullmatch(r"\d{8}-\d{6}", d.name)), key=lambda d: d.name)
    gone = 0
    for d in runs[:max(0, len(runs) - keep)]:
        if d.resolve().parent != base:
            continue
        shutil.rmtree(d, ignore_errors=True)
        gone += not d.exists()
    return gone


# ------------------------------------------------------------------ running a suite

def run_one(name, src, variant, work, n):
    tag = name + (f" [{variant}]" if variant else "")
    run = work / f"{n:02d}-{name}"
    run.mkdir()
    rid = f"r{n}"
    size = PHONE
    flags = []
    for part in (variant or "").split(";"):
        k, _, v = part.strip().partition("=")
        if k == "window":
            size = v
        elif k == "flag":
            flags.append(v)
    w, h = (int(x) for x in size.split("x"))
    INJECT[rid] = (f"<script>const RESULT_URL='/__result/{rid}'; const WANT_VIEW=[{w},{h}];</script>"
                   f"<script>{(HERE / 'lib.js').read_text(encoding='utf-8')}</script><script>{src}</script>")
    edge = subprocess.Popen([str(EDGE), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", *flags,
                             f"--user-data-dir={run / 'edge'}", f"--window-size={max(w, 800)},{h + 200}",
                             f"http://127.0.0.1:{PORT}/__phone?t={rid}&size={w}x{h}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(120 * 4):                      # up to 2 minutes for one suite
            if rid in RESULTS:
                break
            time.sleep(0.25)
    finally:
        close([edge.pid])
    if rid not in RESULTS:
        return tag, None, "no result from the page within 2 minutes"
    (run / "result.json").write_text(RESULTS[rid], encoding="utf-8")
    return tag, json.loads(RESULTS[rid]), None


def run_all(suites, work):
    total = failed = n = 0
    for p in suites:
        src = p.read_text(encoding="utf-8")
        variants = re.findall(r"^// @variant (.+)$", src, re.M) or [""]
        for v in variants:
            n += 1
            tag, res, err = run_one(p.stem, src, v.strip(), work, n)
            if err:
                failed += 1
                total += 1
                print(f"FAIL  {tag}: {err}")
                continue
            checks = res.get("checks", [])
            bad = [c for c in checks if not c["ok"]]
            problems = ([f"page errors: {res['errs']}"] if res.get("errs") else []) + ([f"stopped: {res['fatal']}"] if res.get("fatal") else [])
            if res.get("view") and res["view"] != res.get("want"):
                problems.append(f"viewport was {res['view']}, wanted {res.get('want')}")
            total += len(checks) + len(problems)
            failed += len(bad) + len(problems)
            print(f"{'ok  ' if not bad and not problems else 'FAIL'}  {tag}: {len(checks) - len(bad)}/{len(checks)}")
            for c in bad:
                print(f"        x {c['name']}\n          got:  {json.dumps(c.get('got'))[:300]}\n          want: {json.dumps(c.get('want'))[:300]}")
            for pr in problems:
                print(f"        x {pr}")
    left = leftovers()
    close(left)
    peak = peak_memory_mb()
    print(f"\n{total - failed}/{total} checks passed" + ("" if not failed else f", {failed} FAILED") + f"   (scratch: {work})")
    print(f"peak memory {peak:,.0f} MB" if peak is not None else "peak memory: not measured",
          f"· left running: {len(left)}" + (" (closed now)" if left else ""))
    return 1 if failed else 0


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    want = [a.lower().removesuffix(".js") for a in sys.argv[1:]]
    suites = sorted(p for p in HERE.glob("*.js") if p.name != "lib.js" and (not want or p.stem.lower() in want))
    if not suites:
        sys.exit("no such suite: " + ", ".join(want) if want else "no suites in " + str(HERE))
    if not EDGE.exists():
        sys.exit(f"Edge not found at {EDGE}")
    try:
        srv = Server(("127.0.0.1", PORT), Handler)   # also the "one run at a time" lock
    except OSError:
        sys.exit(f"Another test run is in progress (port {PORT} is taken). Let it finish, or close it, then run again.")
    old = leftovers()
    if old:
        close(old)
        print(f"closed {len(old)} test browser process(es) left running by an earlier run")
    if not join_kill_job():
        print("note: couldn't set up the Windows job that closes everything on exit; each suite still closes its own")
    base = Path(tempfile.gettempdir()) / SCRATCH
    base.mkdir(exist_ok=True)
    gone = prune_runs(base, KEEP_RUNS - 1)          # with this run, the last KEEP_RUNS stay
    if gone:
        print(f"removed {gone} old scratch run folder(s) from {base}")
    work = base / datetime.now().strftime("%Y%m%d-%H%M%S")
    work.mkdir(parents=True)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        code = run_all(suites, work)
    except KeyboardInterrupt:
        print("\nstopped (Ctrl+C): closing its browser")
        close(leftovers())
        code = 130
    finally:
        srv.shutdown()
        srv.server_close()
    sys.exit(code)


if __name__ == "__main__":
    main()
