---
"puppet-teams": patch
---

The merge gate also catches a push to main or master wrapped in bash -c, a subshell, backticks or a redirection, and no longer denies a push whose later line or comment names main.
