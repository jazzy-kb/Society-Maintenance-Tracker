#!/usr/bin/env bash
# Render build script for backend
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Seed database with default data if it doesn't exist
python seed.py
