@echo off
cd /d "c:\Users\micha\Downloads\Antigravity AI\Employee Work Hours Dahboard"
node scripts/backup-db.js >> backups\backup.log 2>&1
