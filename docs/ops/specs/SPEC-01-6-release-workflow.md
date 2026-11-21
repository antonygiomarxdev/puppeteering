# SPEC-01-6: The release workflow with changesets/action

Status: Draft
Rests on: ../../requests/REQ-11-changesets-and-scriptorium-install.md

## Summary

A GitHub Actions workflow on push to main using the official `changesets/action` v2: it opens or updates a "Version Packages" pull request, and when that merges it tags `puppet-teams@X.Y.Z` and creates a GitHub release. No npm publish. Second of two release runs.

Last change: 2026-11-21, drafted

One spec is one agent run: at most 80 lines, 3 files and one done command. Too big: split it into another spec, never add context. A spec decides nothing new.

## Rows
Quoted from: ../../DECISIONS.md

| D-32 | 2026-11-21 | puppet-teams is released through GitHub Actions with the official changesets/action: a "Version Packages" pull request, and merging it bumps versions, writes the CHANGELOG, tags `puppet-teams@X.Y.Z` and creates a GitHub release. No npm publish: plugins are not on npm Source: owner, 2026-11-21. | `docs/ops/specs/SPEC-01-5-*`, `SPEC-01-6-*`; `.github/workflows/release.yml` |

## Files
| Path | Create or change | Holds |
|---|---|---|
| `.github/workflows/release.yml` | Create | The workflow (the repo has no workflow and no self-hosted runner; `ubuntu-latest`) |

## Reuses
Nothing to reuse: the repo has no `.github/workflows` directory (ls). The LESSONS mention of a self-hosted runner is from another project.

## Tests first
D-32, by the tester, in `mods/puppet-teams/hooks/release-workflow.test.js` (carries `covers: ops/REQ-11/D-32`), reading the YAML as text (no parser in node core). Cases: the file exists; `uses: changesets/action@v2`; trigger `push` to `main`; `permissions` has `contents: write` and `pull-requests: write`; `version-script: npm run release:version`; `publish-script:` contains `changeset git-tag`; `create-github-releases: true`; `node-version: 22` or higher; `npm ci` runs before the action; the text has no `npm publish` and no `NPM_TOKEN`.

## Build
Steps: `actions/checkout`, `actions/setup-node` (node 22, `cache: npm`), `npm ci`, then `changesets/action@v2` with `version-script: npm run release:version`, `publish-script: npx changeset git-tag`, `create-github-releases: true`. Why this works, from the sources: the action README, "Needs repo checked out and `@changesets/cli` installed", job permissions "`contents: write`: to commit version changes" and "`pull-requests: write`: to create pull request"; inputs `version-script` ("Default to `changeset version`"), `publish-script` ("The command to use to build and publish packages"), `create-github-releases`, `push-git-tags` (always true when releases are created) (https://github.com/changesets/action). The action runs the publish script with `CHANGESETS_OUTPUT` set, reads the events the CLI writes, then pushes each tag and creates a release (action `src/run.ts`). `changeset git-tag` creates the tags and, for a private package, only when `privatePackages. cli 3 deprecates `tag` in favour of `git-tag` (cli `dist/index.mjs`:87).tag` is true (SPEC-01-5). The tag is `puppet-teams@X.Y.Z` in a workspace repo, by the CLI source; not run live. Not verified: a live run of the action, and that the action commits the `plugin.json` the version script writes. Preconditions for the owner, not Done: repository setting Actions > General > "Allow GitHub Actions to create and approve pull requests"; SPEC-01-5 done.

## Done when
`node --test mods/puppet-teams/hooks/release-workflow.test.js`

## Out of scope
cli 3 and the version script (SPEC-01-5). Publishing to npm. A live run of the workflow: it first runs when this reaches main, so the first release is the live check.

## Open questions
None.
