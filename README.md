# Set cache cleanup cronjobs

Edit your crontab

crontab -e

This opens your user's crontab in the default editor. Add a line and save.

Crontab syntax

┌───────── minute (0-59)
│ ┌─────── hour (0-23)
│ │ ┌───── day of month (1-31)
│ │ │ ┌─── month (1-12)
│ │ │ │ ┌─ day of week (0-6, 0=Sunday)
│ │ │ │ │

- - - - - command

Common schedules

┌──────────────────────┬──────────────┐
│ Schedule │ Expression │
├──────────────────────┼──────────────┤
│ Every day at 3 AM │ 0 3 \* \* _ │
├──────────────────────┼──────────────┤
│ Every Sunday at 3 AM │ 0 3 _ _ 0 │
├──────────────────────┼──────────────┤
│ Every hour │ 0 _ \* \* _ │
├──────────────────────┼──────────────┤
│ Every 15 minutes │ _/15 \* \* \* _ │
├──────────────────────┼──────────────┤
│ Mon-Fri at 9 AM │ 0 9 _ \* 1-5 │
└──────────────────────┴──────────────┘

For your cleanup script

# 1. Open crontab

crontab -e

# 2. Add this line (adjust the path to your project):

```
0 3 * * * ~/b2b-portal/scripts/cleanup-cache.sh >> /var/log/b2b-cache-cleanup.log 2>&1
```

# 3. Save and exit (:wq in vim, Ctrl+O then Ctrl+X in nano)

Useful commands

crontab -l # List your current cron jobs
crontab -e # Edit your cron jobs
crontab -r # Remove ALL your cron jobs (careful!)
sudo crontab -e # Edit root's cron jobs

Gotchas

- PATH is minimal — cron runs with a limited PATH. Use full paths to commands (/usr/bin/find
  instead of find), or add PATH=/usr/local/bin:/usr/bin:/bin at the top of your crontab
- No environment — your .bashrc/.profile is not loaded. If the script needs env vars, set them
  in the crontab or source them in the script
- Log output — always redirect output with >> /path/to/log 2>&1, otherwise cron sends it as
  email (which usually goes nowhere)
- Permissions — the script must be executable (chmod +x script.sh)

Verify it's running

# Check cron service is active

systemctl status cron # Debian/Ubuntu
systemctl status crond # RHEL/CentOS

# Check cron logs

grep CRON /var/log/syslog # Debian/Ubuntu
grep CRON /var/log/cron # RHEL/CentOS
