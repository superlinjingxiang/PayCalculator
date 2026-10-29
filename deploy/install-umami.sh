#!/usr/bin/env bash
set -euo pipefail
umask 077
exec 8>/var/lock/paytools-umami-install.lock
flock -n 8 || { echo 'Another analytics installation is active' >&2; exit 1; }
root=/srv/paytools/analytics
app_image=docker.umami.is/umami-software/umami@sha256:e69d1a7932e9dab0fc523edc7be1f3a53f3c261f57856fc2167ae74a8fc022e8
db_image=public.ecr.aws/docker/library/postgres@sha256:54e0dd8e8cddcdbb9156c2486eed5a43eccb7214d7c6828097d41ce049fb3984
unit_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ops_dir=$(cd -- "$unit_dir/../scripts" && pwd)
test -s "$unit_dir/paytools-umami.socket"
test -s "$unit_dir/paytools-umami.service"
test -s "$unit_dir/paytools-umami-backup.cron"
test -s "$ops_dir/backup-umami.sh"
test -s "$ops_dir/verify-umami-restore.sh"
test ! -e /etc/cron.d/paytools-umami-backup
test -x /usr/lib/systemd/systemd-socket-proxyd
test ! -e /etc/systemd/system/paytools-umami.socket
test ! -e /etc/systemd/system/paytools-umami.service
python3 - <<'PY'
import ipaddress,json,subprocess
target=ipaddress.ip_network('172.19.0.0/16')
routes=json.loads(subprocess.check_output(['ip','-j','-4','route','show']).decode())
for route in routes:
    destination=route.get('dst','default')
    if destination=='default': continue
    if target.overlaps(ipaddress.ip_network(destination,strict=False)):
        raise RuntimeError('Analytics subnet overlaps an existing host route; inspect before deployment')
PY
test ! -e "$root/secrets.json"
for existing in "$root/database.env" "$root/app.env" "$root/admin-login.json" "$root/relay.env"; do
    test ! -e "$existing" || { echo 'Existing analytics state requires recovery, not initialization' >&2; exit 1; }
done
if docker volume inspect paytools-umami-db-data >/dev/null 2>&1; then echo 'Existing database volume requires recovery' >&2; exit 1; fi
if docker network inspect paytools-analytics >/dev/null 2>&1; then echo 'Existing analytics network requires inspection' >&2; exit 1; fi
for owned_container in paytools-umami paytools-umami-db; do
    if docker container inspect "$owned_container" >/dev/null 2>&1; then echo 'Existing analytics container requires inspection' >&2; exit 1; fi
done
docker image inspect "$app_image" >/dev/null
docker image inspect --format '{{json .RepoDigests}}' "$app_image" | grep -Fq "$app_image"
docker image inspect "$db_image" >/dev/null
test -z "$(ss -Hltn 'sport = :3001')"
install -d -m 0700 "$root" "$root/backups"
backup_cron_installed=0
stop_failed_install() {
    local status=$?
    trap - ERR
    systemctl stop paytools-umami.socket paytools-umami.service >/dev/null 2>&1 || true
    docker stop paytools-umami paytools-umami-db >/dev/null 2>&1 || true
    if [ "$backup_cron_installed" = 1 ]; then mv /etc/cron.d/paytools-umami-backup "$root/backup-install-failed.cron" || true; fi
    echo 'UMAMI_INSTALL=failed; only new analytics containers stopped; private data retained for inspection' >&2
    exit "$status"
}
trap stop_failed_install ERR
umask 077
python3 - <<'PY'
import json,os,secrets
root='/srv/paytools/analytics'
data={name:secrets.token_hex(32) for name in ('database_admin','database_app','app_secret','two_factor')}
data['admin_password']=secrets.token_urlsafe(27)
data['website_id']='ea277992-ff17-4e77-ac2d-279289c004ec'
with open(root+'/secrets.json','w') as out: json.dump(data,out)
with open(root+'/database.env','w') as out:
    out.write('POSTGRES_USER=paytools_dbadmin\nPOSTGRES_DB=postgres\nPOSTGRES_PASSWORD='+data['database_admin']+'\n')
with open(root+'/app.env','w') as out:
    out.write('DATABASE_URL=postgresql://umami:'+data['database_app']+'@paytools-umami-db:5432/umami\n')
    out.write('APP_SECRET='+data['app_secret']+'\nTWO_FACTOR_ENCRYPTION_KEY='+data['two_factor']+'\n')
    out.write('PRIVATE_MODE=1\nDISABLE_TELEMETRY=1\nDISABLE_UPDATES=1\nCLIENT_IP_HEADER=x-real-ip\nSKIP_LOCATION_HEADERS=1\nNODE_OPTIONS=--max-old-space-size=384\nHOSTNAME=0.0.0.0\nPORT=3000\n')
for name in ('secrets.json','database.env','app.env'): os.chmod(root+'/'+name,0o600)
PY
# Explicit private subnet provides stable addresses for the native loopback relay.
# Docker rejects overlap with existing Docker networks rather than replacing one.
docker network create --internal --subnet 172.19.0.0/16 --gateway 172.19.0.1 paytools-analytics >/dev/null
docker volume create paytools-umami-db-data >/dev/null
docker run -d --name paytools-umami-db --network paytools-analytics --ip 172.19.0.2 --restart unless-stopped \
    --memory 256m --cpus 0.5 --pids-limit 128 --security-opt no-new-privileges:true \
    --env-file "$root/database.env" -v paytools-umami-db-data:/var/lib/postgresql/data "$db_image" \
    -c timezone=UTC -c max_connections=20 -c shared_buffers=32MB -c work_mem=2MB
for attempt in $(seq 1 40); do
    if docker exec paytools-umami-db pg_isready -U paytools_dbadmin -d postgres >/dev/null 2>&1; then break; fi
    sleep 1
done
docker exec paytools-umami-db pg_isready -U paytools_dbadmin -d postgres
python3 - <<'PY'
import json,subprocess
data=json.load(open('/srv/paytools/analytics/secrets.json'))
sql="CREATE USER umami WITH PASSWORD '{}';\nCREATE DATABASE umami OWNER umami;\n".format(data['database_app'])
subprocess.run(['docker','exec','-i','paytools-umami-db','psql','-v','ON_ERROR_STOP=1','-U','paytools_dbadmin','-d','postgres'],input=sql,universal_newlines=True,check=True,stdout=subprocess.DEVNULL)
PY
docker run -d --name paytools-umami --network paytools-analytics --ip 172.19.0.3 --restart unless-stopped \
    --init --memory 512m --cpus 1 --pids-limit 256 --security-opt no-new-privileges:true \
    --env-file "$root/app.env" "$app_image"
for attempt in $(seq 1 90); do
    if curl -sf --max-time 2 http://172.19.0.3:3000/api/heartbeat >/dev/null; then break; fi
    sleep 1
done
curl -sf --max-time 3 http://172.19.0.3:3000/api/heartbeat >/dev/null
printf 'UMAMI_UPSTREAM=172.19.0.3:3000\n' > "$root/relay.env"
install -m 0644 "$unit_dir/paytools-umami.socket" /etc/systemd/system/paytools-umami.socket
install -m 0644 "$unit_dir/paytools-umami.service" /etc/systemd/system/paytools-umami.service
systemctl daemon-reload
systemctl enable --now paytools-umami.socket
curl -sf --max-time 5 http://127.0.0.1:3001/api/heartbeat >/dev/null
python3 - <<'PY'
import json,urllib.request,os
root='/srv/paytools/analytics'
data=json.load(open(root+'/secrets.json'))
def request(path,body,token=None):
    headers={'Content-Type':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    req=urllib.request.Request('http://127.0.0.1:3001'+path,data=json.dumps(body).encode(),headers=headers,method='POST')
    with urllib.request.urlopen(req,timeout=15) as response: return json.load(response)
login=request('/api/auth/login',{'username':'admin','password':'umami'})
request('/api/users/'+login['user']['id'],{'password':data['admin_password']},login['token'])
login=request('/api/auth/login',{'username':'admin','password':data['admin_password']})
site=request('/api/websites',{'id':data['website_id'],'name':'PayTools 预览','domain':'47.102.112.21'},login['token'])
assert site['id']==data['website_id']
with open(root+'/admin-login.json','w') as out:
    json.dump({'username':'admin','password':data['admin_password'],'website_id':site['id'],'dashboard':'http://127.0.0.1:18081'},out)
os.chmod(root+'/admin-login.json',0o600)
with open(root+'/public.json','w') as out:
    json.dump({'website_id':site['id'],'version':'3.4.1','private_port':3001,'public_admin':False},out)
print('UMAMI_BOOTSTRAP=passed; default password replaced; website='+site['id'])
PY
docker image inspect --format '{{json .RepoDigests}}' "$db_image" > "$root/database-image.json"
docker image inspect --format '{{json .RepoDigests}}' "$app_image" > "$root/app-image.json"
install -d -m 0755 /usr/local/lib/paytools
install -m 0700 "$ops_dir/backup-umami.sh" /usr/local/lib/paytools/backup-umami.sh
install -m 0700 "$ops_dir/verify-umami-restore.sh" /usr/local/lib/paytools/verify-umami-restore.sh
touch "$root/backup.log"
chmod 0600 "$root/backup.log"
install -m 0644 "$unit_dir/paytools-umami-backup.cron" /etc/cron.d/paytools-umami-backup
backup_cron_installed=1
/usr/local/lib/paytools/backup-umami.sh
/usr/local/lib/paytools/verify-umami-restore.sh
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' paytools-umami paytools-umami-db cqp-monitoring
printf 'LISTENER\n'
ss -Hltn 'sport = :3001'
trap - ERR
printf 'UMAMI=ready-private; SessionManager enablement still required for the owner dashboard\n'
