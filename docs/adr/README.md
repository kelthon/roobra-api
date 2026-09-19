# Architecture Decision Records

Decisions that shape `roobra-api` and are costly to reverse. An ADR records **what was decided and
why at a point in time**; it is not a description of how the system works today (that belongs in
[reference](../reference/)) and not a procedure (that belongs in [guides](../guides/)).

Decisions that affect more than one repository belong in `roobra-docs`, not here.

## File Naming

`YYYY-MM-DD-<slug>.md`, dated with the day the decision was made. Dates avoid the number
collisions that sequential IDs cause when several pull requests add ADRs at once. Refer to an ADR
by its file name.

Start from [_template.md](./_template.md).

## Lifecycle

| Status | Meaning | Editable |
| --- | --- | --- |
| `Draft` | Written but not merged into `main`. | Yes |
| `Proposed` | Merged, decision still open. | Yes |
| `Accepted` | Merged and in force. | No, except typo fixes |
| `Rejected` | Merged and explicitly not adopted. | No |
| `Superseded` | Replaced by a newer ADR (`superseded-by` points to it). | No |

To change an accepted decision, write a new ADR with `supersedes: <old file>` and mark the old one
`Superseded`. Never rewrite history in an accepted ADR.

### Draft Until Merge

Every ADR carries two fields while its pull request is open:

- `status: Draft` — always, even when the decision is already in force in the code.
- `intended-status` — what the status becomes on merge (`Accepted`, `Rejected`, `Proposed`).

When the pull request merges into `main`, `status` takes the value of `intended-status` and
`accepted-at` records the merge date. Decisions that were made before they were written down keep
their real decision date in `date`, and the day they were documented goes in `recorded-at`.

## Where Does A Decision Go

| Question | Destination |
| --- | --- |
| Does it record why we chose X at a moment in time? | ADR |
| Does it describe how something works today? | [reference](../reference/) |
| Does someone follow it step by step? | [guides](../guides/) |
| Does another repository need to know? | `roobra-docs` |
