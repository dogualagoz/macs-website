import os, subprocess, time, urllib.request, json, signal
from pathlib import Path
root=Path(__file__).resolve().parents[3]
evidence=root/'backend-ts/bench/task13b-evidence'
paths=['/events?limit=100','/events/featured','/projects?limit=100','/projects/featured','/members/leaderboard','/members','/sponsors/']
def observe(log, server):
    log.write(subprocess.check_output(['uptime'],text=True))
    log.write(subprocess.check_output(['ps','-p',str(server.pid),'-o','pid,pcpu,pmem,etime,comm'],text=True))
    rows=subprocess.check_output(['ps','-axo','pid,pcpu,pmem,comm'],text=True).splitlines()
    log.write('\n'.join(sorted(rows[1:],key=lambda x:float(x.split()[1]),reverse=True)[:10])+'\n')
    log.flush()
for flavor,cwd,port in [('express',Path('/tmp/macs-task13b-express/backend-ts'),18020),('v2',root/'backend-ts',18021)]:
    for cache in [False,True]:
        label=flavor+('-cached' if cache else '-uncached')
        env={**os.environ,'DATABASE_URL':os.environ['BENCH_DATABASE_URL'],'JWT_SECRET_KEY':'contract-secret-key-that-is-long-enough','PORT':str(port),'NODE_ENV':'production','RATELIMIT_ENABLED':'false','RESPONSE_CACHE':str(cache).lower(),'RUN_MIGRATIONS':'false'}
        with open(evidence/(label+'-server.log'),'w') as slog,open(evidence/(label+'-cpu.log'),'w') as cpu,open(evidence/(label+'-bench.log'),'w') as blog:
            server=subprocess.Popen(['bun','--no-env-file','src/server.ts'],cwd=cwd,env=env,stdout=slog,stderr=slog)
            try:
                for i in range(100):
                    try:
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}/health/ready',timeout=1) as r:
                            if r.status==200: break
                    except Exception: time.sleep(.1)
                else: raise RuntimeError(label+' readiness failed')
                probes={}
                for path in paths:
                    observations=[]
                    for _ in range(2):
                        with urllib.request.urlopen(f'http://127.0.0.1:{port}'+path) as r:
                            r.read(); observations.append(r.headers.get('x-cache'))
                    probes[path]=observations
                (evidence/(label+'-probes.json')).write_text(json.dumps(probes,indent=2)+'\n')
                observe(cpu,server)
                bench=subprocess.Popen(['bun','bench/run.ts','--target',f'http://127.0.0.1:{port}','--out',str(root/'backend-ts/bench'/('result-task13b-'+label+'.json')),'--label',label],cwd=cwd,env=env,stdout=blog,stderr=blog)
                while bench.poll() is None:
                    time.sleep(10); observe(cpu,server)
                if bench.returncode: raise RuntimeError(label+' benchmark failed')
                print(label+' complete',flush=True)
            finally:
                server.send_signal(signal.SIGTERM)
                try: server.wait(timeout=15)
                except subprocess.TimeoutExpired: server.kill(); server.wait()
                print(label+' server exit '+str(server.returncode),flush=True)