# 運用ガイド

[READMEに戻る](../README.md)

## プロフィール・作品の更新

| 内容 | 編集箇所 |
| --- | --- |
| 氏名・所属・紹介文・活動・技術 | `src/data/profile.ts` |
| GitHub / Qiita / XのURL | 同ファイルの `socials[].url` |
| 作品の文章・担当・技術・公開状態 | `src/data/projects.ts` |
| 作品のリンク | 同ファイルの `publicUrl` / `githubUrl` / `additionalLinks` |
| 作品の画像 | 同ファイルの `image` / `logo` / `screenshots` |
| 配色・文字・余白・幅 | `src/styles/global.css` |
| ページタイトル・説明 | 各ページから `BaseLayout` に渡す値 |

URL未設定の項目は `null` にします。Homeの未設定SNSは非表示、作品の未設定リンクは「準備中」です。いこポケは `appPrivate` / `githubPrivate` により「非公開」の非リンク表示を維持します。

制作期間などの事実は、本人による最新の確認内容を基準にします。いえぴた！は企画から完成まで約2か月半（2025年8月〜10月中旬）、現論会のインターン開始は2026年5月です。

## 画像・アイコンの更新

画像の原本は `src/assets/images/`、配信用WebPは `public/images/` に保存します。

| コマンド | 用途 |
| --- | --- |
| `pnpm images:optimize` | プロフィール写真と作品画面をWebPへ変換 |
| `pnpm branding` | 共有画像とPNGファビコンを再生成 |
| `pnpm icons:sync` | Skill IconsとSNSロゴを再取得（ネット接続が必要） |

プロフィールは幅384px、いえぴた！の画面は1280px、ひといきの確認画面は390px、いこポケの画面は780pxで生成します。縦横比は維持します。小さな拡張アイコンはPNGです。画像差し替え後は、データファイルの `width` / `height` を実寸に合わせます。提供された画像のマスクは保持してください。

共有画像の編集元は `src/assets/site-og.svg`、GFファビコンは `public/gaku.svg` です。技術・SNSアイコンの取得定義は `scripts/sync-brand-assets.mjs`、対応表は `src/data/brand-assets.json` にあります。

## ローカルで記事を編集・確認する

1. `pnpm astro dev --background` で開発サーバーを起動します。
2. 別のターミナルで `pnpm journal:cms` を起動します。停止はCtrl+Cです。
3. [http://localhost:4321/admin/](http://localhost:4321/admin/) を開き、「記事の編集画面を開く」へ進みます。
4. タイトル・slug・投稿日・本文を入力し、必要に応じて概要・タグ・カバーを追加します。本文写真は「写真と説明」から追加し、altと説明を入力します。
5. プレビューで確認して保存します。保存だけでは公開ページへ反映されません。
6. 表示確認したい記事を `pnpm journal:stage 記事のslug` で選びます。
7. `.env.example` を `.env` にコピーし、`JOURNAL_SOURCE=local` に変更します。`pnpm astro dev stop` → `pnpm astro dev --background` で再起動します。

記事0件に戻すときは `JOURNAL_SOURCE=empty` に戻し、再起動・再ビルドします。元の記事は削除されません。

| 保存先 | 内容 |
| --- | --- |
| `.journal/editor/` | ローカルCMSで編集した記事と写真 |
| `.journal/source/` | 明示的に選んだ表示確認用の記事と写真 |
| `.journal/published/` | ビルド用に検証・整形した公開データ |
| `public/journal-media/` | 記事内で使う画像の生成結果 |

`.journal/` と `public/journal-media/` はGit管理対象外です。生成結果は直接編集しません。異なる記事データで検証用ビルドを行う場合は、同じ生成先を使う開発サーバーを停止してください。

ローカルCMSは `127.0.0.1` で動作するファイル保存モードです。Gitのコミットや本番公開は行いません。編集画面はDecap CMSをCDNから読み込むため、インターネット接続が必要です。

### 記事のデータ

必須項目は `title` / `slug` / `publishedAt` と本文です。任意で `updatedAt` / `description` / `tags` / `cover` / `coverAlt` / `coverCaption` を設定できます。slugとファイル名を揃え、作成後はslugを変更しません。

概要を省略すると本文冒頭を使用します。タグは備忘録・イベント・旅行。投稿日順で並び、更新日だけでは先頭へ移動しません。カバーなしの記事は画像枠を省きます。

写真はPNG / JPEG / WebP / AVIFの20MB以下に対応します。記事内で参照した写真だけを最大320 / 640 / 1280pxのWebPへ変換し、寸法・alt・説明・srcsetを生成します。本文には見出し・段落・リスト・引用・リンク・専用写真を使い、HTMLやスクリプトは含めません。

## 本番CMSの接続

サイトは記事0件で公開中です。認証用のVercel Functionsと記事の非公開保存先を用意しています。画面上の登録値と操作手順は [Journalの初回接続](journal-setup.md) を参照してください。

2026-10-29に本番の接続設定を完了しました。`JOURNAL_SOURCE=github` で非公開記事を取得するビルド、記事リポジトリのPublish JournalワークフローからDeploy Hook経由での本番ビルド、管理画面の有効化、GitHubへのログイン開始を確認済みです。本人による実際のログイン・記事保存・公開操作は初回確認が必要です。

1. 本人用の**非公開**記事リポジトリ `Gaku-Fujioka/personal-site-journal` の `main` に、`posts/` と `media/` を用意しています。サイトのコードリポジトリとは分けます。
2. GitHubのOAuthアプリを登録し、本人と記事リポジトリへのアクセスを設定します。認証は `api/auth.js` と `api/callback.js`、共通処理は `server/cms-oauth.mjs` です。
3. Vercelに以下の環境変数を設定します。トークンは秘密情報として保存し、コードやクライアント向け設定には含めません。
4. 記事リポジトリの**公開用ブランチ**への更新で、サイトを再ビルドする連携を設定します。下書きブランチの更新では公開を起動しません。
5. 本人のログイン、保存・再編集・公開、未ログイン時の拒否、下書き写真の非公開、ビルド失敗時の旧サイト維持を確認します。

| 環境変数 | 内容 |
| --- | --- |
| `JOURNAL_SOURCE` | 本番接続後は `github`。初期値は `empty` |
| `JOURNAL_REPO` | 非公開記事リポジトリの `owner/name` |
| `JOURNAL_BRANCH` | 公開用ブランチ。既定は `main` |
| `JOURNAL_TOKEN` | ビルド時に記事を取得するトークン |
| `CMS_REPO` | CMSから編集するリポジトリの `owner/name` |
| `CMS_AUTH_URL` | `/auth` とコールバックを処理するOAuthサービスのHTTPS URL |
| `CMS_SITE_URL` | 認証結果を返す管理画面のオリジン。現在は `https://gaku-fujioka.vercel.app` |
| `CMS_ALLOWED_GITHUB_LOGIN` | 編集を許可する本人のGitHubアカウント名 |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuthアプリのClient ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | GitHub OAuthアプリのClient Secret（秘密情報） |

本番CMSは下書きを作業ブランチに保存し、公開操作で公開用ブランチに反映する設定です。記事取得時は公開用ブランチの1つのコミットに固定します。接続・実動作の確認が済むまで、本番CMSを利用できる状態とは扱いません。

## Vercelでの公開と確認

公開URLは [https://gaku-fujioka.vercel.app/](https://gaku-fujioka.vercel.app/) です。GitHubの `Gaku-Fujioka/personal-site` の `main` を、Vercelの個人サイト専用プロジェクトに接続しています。

`vercel.json` でAstro・出力先 `dist/` と `pnpm build && pnpm check` を指定しています。canonical・OG URL・共有画像URLは `VERCEL_PROJECT_PRODUCTION_URL` から生成し、`SITE_URL` が設定されている場合はそちらを優先します。

CLIアップロードでは `.vercelignore` により、ローカル下書き・環境ファイル・画像の原本を除外します。GitHubリポジトリ内の画像原本と、サイトで配信する `public/images/` の画像は区別してください。

更新時には `pnpm test` → `pnpm build` → `pnpm check` を実行します。テストには記事の処理に加え、OAuthのstate・PKCE・本人制限・認証結果の送信先の確認を含みます。記事0件では空のコレクションに関する警告が出る場合がありますが、ビルドは成功します。

初回公開では主要4ページ、画像・CSSなど30ファイル、HTTPS・共有URL・404応答を確認しました。実画面でのPC・スマートフォン表示、キーボード操作、文字拡大、スクリーンリーダー、CMS画面の操作確認は引き続き必要です。
