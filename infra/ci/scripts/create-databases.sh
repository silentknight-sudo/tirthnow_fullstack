#!/usr/bin/env bash
# Create the test and shadow databases next to the main one (CI service containers
# cannot run init scripts). Idempotent.
set -euo pipefail

: "${PGHOST:=localhost}" "${PGPORT:=5432}" "${PGUSER:=tirthnow}" "${PGPASSWORD:=tirthnow}"
export PGHOST PGPORT PGUSER PGPASSWORD

for db in tirthnow_test tirthnow_shadow; do
  if ! psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'" | grep -q 1; then
    psql -d postgres -c "CREATE DATABASE ${db} OWNER ${PGUSER}"
  fi
done
