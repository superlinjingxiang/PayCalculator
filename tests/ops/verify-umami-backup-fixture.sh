#!/usr/bin/env bash
# Prepare/run only under explicit operator control. This does not access the
# production umami database: all SQL and dumps target a newly created fixture.
# Usage: bash verify-umami-backup-fixture.sh [directory-containing-source-scripts]
set -euo pipefail
umask 077
source_dir=${1:-/usr/local/lib/paytools}
if [ "$#" -gt 1 ] || [ ! -r "$source_dir/backup-umami.sh" ] || [ ! -r "$source_dir/verify-umami-restore.sh" ]; then
    printf '%s\n' 'Readable backup-umami.sh and verify-umami-restore.sh source directory required.' >&2
    exit 2
fi
work_dir=$(mktemp -d /tmp/paytools-umami-backup-fixture.XXXXXX)
run_pid=
cleanup() {
    if [ -n "$run_pid" ]; then
        kill -TERM "$run_pid" 2>/dev/null || true
        wait "$run_pid" 2>/dev/null || true
    fi
    case "$work_dir" in
        /tmp/paytools-umami-backup-fixture.*) [ ! -d "$work_dir" ] || rm -rf -- "$work_dir" ;;
    esac
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
python3 - "$source_dir" "$work_dir" <<'PY' &
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import uuid

source_dir = Path(sys.argv[1])
work = Path(sys.argv[2])
fixture = 'paytools_backup_fixture_' + uuid.uuid4().hex[:16]
site = 'ea277992-ff17-4e77-ac2d-279289c004ec'
expected = {'websiteIds': [site], 'websites': 1, 'events': 2, 'sessions': 1}
container = ['docker', 'exec', 'paytools-umami-db']
created = False
dropped = False
active = None
checks = []
failures = []
stages = []
source_hashes = {}
stage = 'source_guards'
old_root = 'root=/srv/paytools/analytics'
old_db = "'-d','umami'"
new_db = "'-d','{}'".format(fixture)
dump_anchor = "'pg_dump','-U','paytools_dbadmin'"
schema_anchor = "'pg_dump','--schema-only','-U','paytools_dbadmin'"


def check(condition, code):
    checks.append({'check': code, 'passed': bool(condition)})
    if not condition:
        failures.append(code)
        raise RuntimeError(code)


def stop(signum, frame):
    raise SystemExit(128 + signum)


signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
signal.signal(signal.SIGHUP, stop)


def execute(command, timeout=30, input_text=None):
    return subprocess.run(command, input=input_text, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, universal_newlines=True, timeout=timeout)


def script_run(path):
    # Own process group makes interruption cleanup specific to this invocation.
    global active
    active = subprocess.Popen(['bash', str(path)], stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, universal_newlines=True,
                              start_new_session=True)
    try:
        stdout, stderr = active.communicate(timeout=750)
        return active.returncode, stdout, stderr
    finally:
        if active.poll() is None:
            os.killpg(active.pid, signal.SIGTERM)
            try:
                active.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(active.pid, signal.SIGKILL)
                active.wait(timeout=10)
        active = None


try:
    check(re.fullmatch(r'paytools_backup_fixture_[0-9a-f]{16}', fixture) is not None and fixture != 'umami', 'unique_fixture_name_is_not_production')
    check(re.fullmatch(r'/tmp/paytools-umami-backup-fixture\.[A-Za-z0-9]+', str(work)) is not None and work.is_dir(), 'private_mktemp_root_guard')
    originals = {}
    for name in ('backup-umami.sh', 'verify-umami-restore.sh'):
        raw = (source_dir / name).read_bytes()
        source_hashes[name] = hashlib.sha256(raw).hexdigest()
        source = raw.decode('utf-8')
        check(source.count(old_root) == 1, name + '_one_exact_root_replacement')
        check(site in source, name + '_expected_website_uuid_unchanged')
        originals[name] = source
    check(originals['backup-umami.sh'].count(old_db) == 2, 'backup_exactly_two_source_database_arguments')
    check(old_db not in originals['verify-umami-restore.sh'], 'restore_has_no_production_database_argument')
    check(originals['backup-umami.sh'].count(dump_anchor) == 1, 'one_exact_schema_only_mutation_anchor')
    check('Restored data differs from the consistent source snapshot' in originals['verify-umami-restore.sh'], 'restore_has_explicit_expected_counts_comparison')

    def copies(case, schema_only=False):
        root = work / case
        root.mkdir(mode=0o700)
        (root / 'backups').mkdir(mode=0o700)
        new_root = 'root=' + str(root)
        paths = {}
        for name, source in originals.items():
            modified = source.replace(old_root, new_root, 1)
            if name == 'backup-umami.sh':
                modified = modified.replace(old_db, new_db)
                if schema_only:
                    modified = modified.replace(dump_anchor, schema_anchor, 1)
            reversed_changes = modified.replace(new_root, old_root, 1)
            if name == 'backup-umami.sh':
                if schema_only:
                    reversed_changes = reversed_changes.replace(schema_anchor, dump_anchor, 1)
                reversed_changes = reversed_changes.replace(new_db, old_db)
                check(old_db not in modified, case + '_all_source_database_arguments_are_fixture')
            check(reversed_changes == source, case + '_' + name + '_only_guarded_changes')
            path = root / name
            path.write_text(modified, encoding='utf-8')
            path.chmod(0o700)
            check(execute(['bash', '-n', str(path)]).returncode == 0, case + '_' + name + '_shell_syntax')
            paths[name] = path
        return root, paths

    # Prepare all guarded copies before creating any database.
    baseline_root, baseline = copies('baseline')
    schema_root, schema_only = copies('schema_only', schema_only=True)
    latest_root, latest = copies('incomplete_latest')
    stage = 'create_fixture'
    # Connection is to maintenance DB postgres solely to check the unique name.
    exists = execute(container + ['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'paytools_dbadmin', '-d', 'postgres', '-c', "SELECT count(*) FROM pg_database WHERE datname='{}';".format(fixture)])
    check(exists.returncode == 0 and exists.stdout.strip() == '0', 'fixture_database_absent_before_creation')
    made = execute(container + ['createdb', '-U', 'paytools_dbadmin', '-T', 'template0', '-O', 'umami', fixture])
    if made.returncode == 0:
        created = True
    check(created, 'fixture_database_creation_succeeded')

    stage = 'seed_fixture'
    sql = """CREATE TABLE website (website_id uuid PRIMARY KEY);
CREATE TABLE website_event (event_id integer PRIMARY KEY, website_id uuid NOT NULL REFERENCES website);
CREATE TABLE session (session_id integer PRIMARY KEY, website_id uuid NOT NULL REFERENCES website);
INSERT INTO website VALUES ('{site}');
INSERT INTO website_event VALUES (1,'{site}'),(2,'{site}');
INSERT INTO session VALUES (1,'{site}');
""".format(site=site)
    seeded = execute(['docker', 'exec', '-i', 'paytools-umami-db', 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'paytools_dbadmin', '-d', fixture], input_text=sql)
    check(seeded.returncode == 0, 'fixture_seeded_one_website_two_events_one_session')

    def backup_case(root, paths, label):
        code, stdout, stderr = script_run(paths['backup-umami.sh'])
        check(code == 0 and 'BACKUP=success' in stdout, label + '_backup_completed')
        manifests = sorted((root / 'backups').glob('*.manifest.json'))
        check(len(manifests) == 1, label + '_one_completed_manifest')
        data = json.loads(manifests[0].read_text())
        check(data.get('expected') == expected and data.get('websiteId') == site, label + '_manifest_preserves_source_expected_counts')
        check(re.fullmatch(r'\d{8}T\d{12}Z\.dump', data['archive']) is not None, label + '_archive_name_guard')
        return data

    def restore_success(paths, manifest, label):
        code, stdout, stderr = script_run(paths['verify-umami-restore.sh'])
        wanted = 'RESTORE=verified archive={} websites=1 events=2 sessions=1'.format(manifest['archive'])
        check(code == 0 and wanted in stdout, label + '_restore_verified_expected_archive_and_two_events')
        stages.append({'case': label, 'backupExpected': expected, 'restoredEvents': 2, 'result': 'passed'})

    stage = 'baseline_roundtrip'
    manifest = backup_case(baseline_root, baseline, 'baseline')
    restore_success(baseline, manifest, 'baseline')

    stage = 'schema_only_mutation'
    mutated = backup_case(schema_root, schema_only, 'schema_only')
    code, stdout, stderr = script_run(schema_only['verify-umami-restore.sh'])
    check(code != 0 and 'Restored data differs from the consistent source snapshot' in stderr, 'schema_only_restore_fails_on_count_mismatch')
    check('RESTORE=verified' not in stdout, 'schema_only_never_reports_verified')
    check(json.loads(next((schema_root / 'backups').glob('*.manifest.json')).read_text())['expected'] == expected, 'schema_only_manifest_expected_counts_remain_two')
    stages.append({'case': 'schema_only', 'backupExpected': expected, 'restoreRejected': True, 'result': 'passed'})

    stage = 'newer_incomplete_archive'
    complete = backup_case(latest_root, latest, 'incomplete_latest')
    complete_stamp = complete['archive'][:-5]
    newer = (datetime.datetime.strptime(complete_stamp, '%Y%m%dT%H%M%S%fZ') + datetime.timedelta(seconds=60)).strftime('%Y%m%dT%H%M%S%fZ') + '.dump'
    incomplete = latest_root / 'backups' / newer
    with incomplete.open('xb') as output:
        output.write(b'controlled incomplete archive fixture\n')
    check(newer > complete['archive'] and len(list((latest_root / 'backups').glob('*.manifest.json'))) == 1, 'newer_dump_has_no_completed_manifest')
    restore_success(latest, complete, 'incomplete_latest')
except (Exception, SystemExit):
    failures.append('execution_failed_at_' + stage)
finally:
    # Drop only the exact unique DB whose createdb call returned success here.
    # Each unmodified restore copy also cleans its own newly-created restore DB.
    if created:
        try:
            if re.fullmatch(r'paytools_backup_fixture_[0-9a-f]{16}', fixture) and fixture != 'umami':
                removed = execute(container + ['dropdb', '-U', 'paytools_dbadmin', '--force', fixture])
                dropped = removed.returncode == 0
            if not dropped:
                failures.append('fixture_database_cleanup_failed')
        except Exception:
            failures.append('fixture_database_cleanup_failed')
    result = {
        'schemaVersion': 1, 'traffic': 'controlled isolated backup fixture; no production analytics writes',
        'result': 'failed' if failures else 'passed',
        'sourceSha256': source_hashes, 'fixtureCreated': created, 'fixtureDropped': dropped,
        'fixtureDatabase': fixture if created else None, 'expected': expected,
        'cases': stages, 'checks': checks, 'failures': failures,
        'sourceReplacements': {'rootAssignmentsPerCopy': 1, 'backupSourceDatabaseArguments': 2, 'schemaOnlyMutationAnchors': 1, 'reverseReplacementEqualityRequired': True},
        'productionDatabaseUsedAsSourceOrTarget': False,
        'scope': 'Existing container only; unique fixture source DB plus source-script-owned temporary restore DBs. No production backup directory, production database, service config or container data volume modified.',
    }
    print('UMAMI_BACKUP_FIXTURE_BEGIN')
    print(json.dumps(result, sort_keys=True))
    print('UMAMI_BACKUP_FIXTURE_END')
sys.exit(1 if failures else 0)
PY
run_pid=$!
exit_code=0
wait "$run_pid" || exit_code=$?
run_pid=
exit "$exit_code"
