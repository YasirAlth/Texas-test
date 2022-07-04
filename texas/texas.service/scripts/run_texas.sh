#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Needs the HTTP Port Open for WS establishment
# TODO Need to pull over the Properties files
$DAF_ROOT/bin/TAFServer -TAFServices $SCRIPT_DIR/../test.conf:texas -ACEDebug
