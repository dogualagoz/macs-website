"""Optional CPU sample after the gate; never run concurrently with gate measurements."""
import os, subprocess, time, urllib.request, signal, json
from pathlib import Path
root = Path(__file__).resolve().parents[3]
evidence = Path(__file__).resolve().parent
env = {**os.environ, 'DATABASE_URL': os.environ['BENCH_DATABASE_URL'],
       'JWT_SECRET_KEY': 'contract-secret-key-that-is-long-enough', 'PORT': '18021',
       'NODE_ENV': 'production', 'RATELIMIT_ENABLED': 'false',
       'RESPONSE_CACHE': 'true', 'RUN_MIGRATIONS': 'false'}
with (evidence/'cpu-profile-server.log').open('w') as out:
    server = subprocess.Popen(['bun', '--no-env-file', '--cpu-prof',
        '--cpu-prof-name=members.cpuprofile', '--cpu-prof-dir='+str(evidence),
        'src/server.ts'], cwd=root/'backend-ts', env=env, stdout=out, stderr=out)
    try:
        for _ in range(100):
            try:
                with urllib.request.urlopen('http://127.0.0.1:18021/members') as r:
                    r.read()
                    if r.status == 200: break
            except Exception: time.sleep(.1)
        else: raise RuntimeError('profile server not ready')
        subprocess.run(['oha', '-c', '50', '-z', '5s', '--no-tui',
                        'http://127.0.0.1:18021/members'], stdout=subprocess.DEVNULL, check=True)
        with (evidence/'cpu-profile-oha.json').open('w') as measured:
            subprocess.run(['oha', '-c', '50', '-z', '20s', '--no-tui', '--output-format', 'json',
                            'http://127.0.0.1:18021/members'], stdout=measured, check=True)
    finally:
        server.send_signal(signal.SIGTERM)
        try: server.wait(timeout=15)
        except subprocess.TimeoutExpired: server.kill(); server.wait()
        print('CPU profile server exit', server.returncode)
