---
"puppet-teams": patch
---

The merge gate reads command substitution inside double quotes and process substitution, scans in linear time, and denies a command too long or nested too deep to read instead of letting it through.
