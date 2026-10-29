#!/usr/bin/env bash
set -euo pipefail
umask 077
root=/srv/paytools/analytics
test -d "$root/backups"
test "$(stat -c %a "$root/backups")" = 700
exec 9>"$root/backup.lock"
flock -n 9 || exit 0
python3 - "$root" <<'PY'
import datetime,hashlib,json,os,pathlib,re,subprocess,sys,time
root=pathlib.Path(sys.argv[1])
folder=root/'backups'
stamp=datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%S%fZ')
archive=folder/(stamp+'.dump')
manifest=folder/(stamp+'.manifest.json')
pending=folder/(stamp+'.dump.partial')
site='ea277992-ff17-4e77-ac2d-279289c004ec'
sql="""SELECT json_build_object(
'websiteIds',(SELECT coalesce(json_agg(website_id::text ORDER BY website_id),'[]'::json) FROM website),
'websites',(SELECT count(*) FROM website),
'events',(SELECT count(*) FROM website_event),
'sessions',(SELECT count(*) FROM session));"""
psql=subprocess.Popen(['docker','exec','-i','-e','PGCONNECT_TIMEOUT=10','paytools-umami-db','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','paytools_dbadmin','-d','umami'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,universal_newlines=True)
try:
    psql.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n'+sql+'\n')
    psql.stdin.flush()
    snapshot=psql.stdout.readline().strip()
    assert re.match(r'^[0-9A-Fa-f-]+$',snapshot), 'Snapshot export failed'
    expected=json.loads(psql.stdout.readline())
    assert site in expected['websiteIds'], 'Expected website is missing'
    with pending.open('xb') as out:
        subprocess.run(['docker','exec','paytools-umami-db','pg_dump','-U','paytools_dbadmin','-d','umami','-Fc','--snapshot='+snapshot],stdout=out,check=True,timeout=600)
        out.flush(); os.fsync(out.fileno())
    psql.stdin.write('COMMIT;\n\\q\n'); psql.stdin.flush()
    psql.communicate(timeout=20)
    assert psql.returncode==0, 'Snapshot transaction failed'
    assert pending.stat().st_size>0
    with pending.open('rb') as source:
        subprocess.run(['docker','exec','-i','paytools-umami-db','pg_restore','--list'],stdin=source,stdout=subprocess.DEVNULL,check=True,timeout=30)
    digest=hashlib.sha256()
    with pending.open('rb') as source:
        for chunk in iter(lambda:source.read(1024*1024),b''): digest.update(chunk)
    value=digest.hexdigest()
    os.replace(str(pending),str(archive))
    with (folder/(stamp+'.dump.sha256')).open('x') as out:
        out.write(value+'  '+archive.name+'\n'); out.flush(); os.fsync(out.fileno())
    data={'schemaVersion':1,'archive':archive.name,'sha256':value,'websiteId':site,'expected':expected}
    metadata=folder/(stamp+'.manifest.json.partial')
    with metadata.open('x') as out:
        json.dump(data,out,sort_keys=True); out.flush(); os.fsync(out.fileno())
    directory=os.open(str(folder),os.O_DIRECTORY)
    try:
        os.fsync(directory)
        # Only the final manifest makes this archive selectable by restoration.
        os.replace(str(metadata),str(manifest)); os.fsync(directory)
    finally: os.close(directory)
    (root/'backup-last-success').write_text(datetime.datetime.utcnow().isoformat()+'Z\n')
    for path in folder.iterdir():
        if re.match(r'^\d{8}T\d{6,12}Z\.(dump(\.sha256)?|manifest\.json)(\.partial)?$',path.name) and not path.name.startswith(stamp+'.') and time.time()-path.stat().st_mtime>14*86400:
            path.unlink()
    print('BACKUP=success bytes={} manifest=published snapshot=consistent'.format(archive.stat().st_size))
finally:
    if psql.poll() is None:
        psql.terminate()
        try: psql.wait(timeout=5)
        except subprocess.TimeoutExpired: psql.kill(); psql.wait()
    if pending.exists(): pending.unlink()
PY
