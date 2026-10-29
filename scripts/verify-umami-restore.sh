#!/usr/bin/env bash
set -euo pipefail
umask 077
root=/srv/paytools/analytics
exec 9>"$root/backup.lock"
flock -n 9
python3 - "$root" <<'PY'
import hashlib,json,pathlib,re,subprocess,sys,uuid
folder=pathlib.Path(sys.argv[1])/'backups'
manifests=sorted(folder.glob('*.manifest.json'))
assert manifests, 'No completed backup manifest'
manifest=manifests[-1]
assert not manifest.is_symlink()
data=json.loads(manifest.read_text())
assert data['schemaVersion']==1
assert re.match(r'^\d{8}T\d{6,12}Z\.dump$',data['archive'])
archive=folder/data['archive']
assert archive.is_file() and not archive.is_symlink()
assert data['websiteId']=='ea277992-ff17-4e77-ac2d-279289c004ec'
assert data['websiteId'] in data['expected']['websiteIds']
digest=hashlib.sha256()
with archive.open('rb') as source:
    for chunk in iter(lambda:source.read(1024*1024),b''): digest.update(chunk)
assert digest.hexdigest()==data['sha256'], 'Backup checksum mismatch'
assert (folder/(archive.name+'.sha256')).read_text().strip()==data['sha256']+'  '+archive.name
verifydb='paytools_restore_'+uuid.uuid4().hex[:16]
base=['docker','exec','paytools-umami-db']
created=False
try:
    subprocess.run(base+['createdb','-U','paytools_dbadmin','-O','umami',verifydb],check=True,timeout=30)
    created=True
    with archive.open('rb') as source:
        subprocess.run(['docker','exec','-i','paytools-umami-db','pg_restore','-U','paytools_dbadmin','--exit-on-error','-d',verifydb],stdin=source,check=True,timeout=600)
    sql="""SELECT json_build_object(
    'websiteIds',(SELECT coalesce(json_agg(website_id::text ORDER BY website_id),'[]'::json) FROM website),
    'websites',(SELECT count(*) FROM website),
    'events',(SELECT count(*) FROM website_event),
    'sessions',(SELECT count(*) FROM session));"""
    actual=json.loads(subprocess.check_output(base+['psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','paytools_dbadmin','-d',verifydb,'-c',sql],timeout=30).decode())
    assert actual==data['expected'], 'Restored data differs from the consistent source snapshot'
    print('RESTORE=verified archive={} websites={} events={} sessions={}'.format(archive.name,actual['websites'],actual['events'],actual['sessions']))
finally:
    # Only a database whose creation succeeded in this process can be dropped.
    if created: subprocess.run(base+['dropdb','-U','paytools_dbadmin',verifydb],check=True,timeout=30)
PY
