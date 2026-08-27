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

- 設計判断・実際のコード編集・実行・テスト・最終レビュー承認は Claude Code が担当する。
- ローカルLLM(`local-coding-agent` subagent、Qwen3-8B)には以下を委譲してよい:
  - 差分やコードの一次レビュー(見落とし・スタイルの指摘出し。最終判断はしない)
  - 開発サーバーのログ・エラー出力の要約
- ローカルLLMはread-only。ファイル編集・実行は行わせない。出力は「候補」として扱い、採用可否はClaude Codeが判断する。
