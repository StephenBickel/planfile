# GitHub PR Gate Example

This keeps policy simple and local:
- Require a committed plan artifact at `.plan/plan.json`
- Run `inspect-plan --json` for machine logging
- Gate PRs on `verify-plan.status === "ready"`
- Upload plan and verify report as artifacts

## Option A: Reusable Action (Fastest Adoption)

Copy this workflow into your repo:

```yaml
name: PR Planfile Gate

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  planfile-gate:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Planfile PR gate
        uses: StephenBickel/planfile/.github/actions/planfile-pr-gate@main
        with:
          plan-path: .plan/plan.json
          verify-report-path: verify-report.json
          node-version: "22"
```

Reusable action source: `.github/actions/planfile-pr-gate/action.yml`.

## Option B: Fully Inlined Workflow

If you do not want an external `uses:` dependency, copy the inlined example:
`docs/examples/github-pr-gate.inlined.yml`.

Primary example file using the reusable action:
`docs/examples/github-pr-gate.yml`.
