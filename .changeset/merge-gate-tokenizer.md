---
"puppet-teams": patch
---

The merge gate splits shell text the way the shell does: a quoted # or a quoted option value no longer hides a push to main, and only text a shell runs (bash -c, eval) is read again as commands.
