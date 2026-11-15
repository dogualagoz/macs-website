"""Binding spec gate: cached p95 only, uncached p95 and throughput."""
import json
from pathlib import Path
d = Path(__file__).resolve().parent
bench = d.parent
output = {}
for mode in ['uncached', 'cached']:
    old = json.loads((bench/f'result-task13b-express-{mode}.json').read_text())
    new = json.loads((bench/f'result-task13b-v2-{mode}.json').read_text())
    assert old['meta']['cacheObserved'] == new['meta']['cacheObserved'] == (mode == 'cached')
    assert old['results'].keys() == new['results'].keys()
    rows = []
    for path, baseline in old['results'].items():
        candidate = new['results'][path]
        assert baseline['successRate'] >= .999 and candidate['successRate'] >= .999
        rows.append(dict(path=path, p95Express=baseline['p95'], p95V2=candidate['p95'],
                         gapMs=candidate['p95']-baseline['p95'],
                         gapPercent=100*(candidate['p95']/baseline['p95']-1),
                         rpsExpress=baseline['rps'], rpsV2=candidate['rps'],
                         passed=candidate['p95'] <= baseline['p95'] and
                         (mode == 'cached' or candidate['rps'] >= baseline['rps'])))
    output[mode] = dict(passed=all(r['passed'] for r in rows), rows=rows)
(d/'gates.json').write_text(json.dumps(output, indent=2)+'\n')
print(json.dumps(output, indent=2))
