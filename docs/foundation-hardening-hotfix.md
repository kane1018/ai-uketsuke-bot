# Foundation hardening hotfix

`202609170001_foundation_hardening.sql` を適用した環境では、続けて
`202609180001_fix_foundation_hardening_review_findings.sql` を適用してください。

この追補migrationは次の2点を修正します。

1. `consume_rate_limit` 内の `reset_at` 列参照を修飾し、PL/pgSQLのOUTパラメータとの曖昧性を解消する。
2. `replace_bot_questions` で、省略された `opening_message` / `completion_message` / `cta_message` を空文字で上書きせず既存値を保持する。

本番DBにはこの追補migrationをアプリの本番切替前に適用します。
