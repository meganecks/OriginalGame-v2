# OriginalGame

Phaser 4 + TypeScript + Vite の2Dゲームプロジェクト。

## 開発コマンド

- `npm run dev` — 開発サーバー起動(HMR対応)
- `npm run build` — 型チェック(`tsc`) + 本番ビルド
- `npm run preview` — ビルド結果のプレビュー

## 構成

- `src/main.ts` — Phaserのゲーム設定・起動エントリポイント
- `src/scenes/` — Phaserシーン(`BootScene`でロード、`MainScene`から開始)
- `public/` — そのまま配信される静的アセット

シーンが増えたら `src/scenes/` に追加し、`src/main.ts` の `scene: []` 配列に登録する。

## Claude Code / ローカルLLM の役割分担

グローバル `~/.claude/CLAUDE.md` の「マシン構成とローカルLLMの使い分け」に従う(答え合わせの手段がある出力だけを任せ、レビューの指摘・判定は任せない)。
このプロジェクトで特に使える場面: 開発サーバーのログ・エラー出力の要約(`local_llm_summarize`、数値やエラー文は原文で確認する)。
