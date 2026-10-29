# Gaku Fujioka — 個人ポートフォリオ

藤岡楽空のHome / About / Projects / Journalを掲載する静的サイトです。Astro 7.3.8 + TypeScript + 通常のCSSを使用します。内容の基準は[確定仕様書](docs/personal-site-spec.md)、見た目の参考は[A2 Blue](docs/design/home-a2-reference.png)です。

## 起動・ビルド

Node.js 22.12.0以上とpnpmを使用します。初回は `pnpm install --frozen-lockfile`。

| コマンド | 用途 |
| --- | --- |
| `pnpm astro dev --background` | 開発サーバー起動（通常 http://localhost:4321） |
| `pnpm astro dev status` / `pnpm astro dev logs` / `pnpm astro dev stop` | 状態確認・ログ・停止 |
| `pnpm build` | `dist/` に静的HTMLを生成（標準は記事0件） |
| `pnpm preview` | ビルド済みサイトを確認 |
| `pnpm journal:cms` | このPC専用のCMS保存サーバーを起動。停止はCtrl+C |
| `pnpm journal:stage 記事のslug` | CMSで保存した1記事をローカル表示確認用にコピー |
| `pnpm branding` | 共有画像とPNGファビコンを元のSVGから再生成 |
| `pnpm images:optimize` | プロフィール写真・作品画像を元のPNGから軽量WebPへ再生成 |
| `pnpm icons:sync` | Skill Icons・SNSロゴのSVGを取得してローカル保存（初回・更新時のみネット接続） |
| `pnpm test` | 記事データ・画像処理・未公開データ分離のテスト |
| `pnpm check` | build後のHTML・見出し・画像altと寸法・内部リンクを検証 |

AGENTS.mdに従い、開発サーバーはバックグラウンドで管理します。追加依存はローカルCMS用の `decap-server`、設定解析の `yaml`、画像処理の `sharp`。公開ページにCMSやReactのJavaScriptは配信しません。CMS編集画面だけが固定バージョンのDecap CMS 3.17.1をCDNから読み込むため、編集画面の初回表示にはインターネット接続が必要です。

## ファイル構成と読む順番

```text
src/pages/index.astro                 Home（代表作品→Journal最新2件→Learning）
src/pages/about.astro                 About（PCは2列、スマホは1列）
src/pages/projects.astro              ひといき・いえぴた！・いこポケの3作品を紹介
src/pages/journal/index.astro         Journal一覧
src/pages/journal/[slug].astro        記事本文
src/pages/journal/tags/[tag].astro     タグ別一覧（JavaScript不要）
src/pages/404.astro                   専用404
src/pages/admin/index.astro           本人用CMSの入口
src/pages/admin/settings.json.ts      開発用／本番用の公開可能なCMS設定
src/layouts/BaseLayout.astro          共通head・ヘッダー・フッター・共有情報
src/components/JournalEntry.astro     Homeと一覧の記事紹介
src/components/JournalFilters.astro   使用中のタグと「すべて」
src/components/ResourceLink.astro     URL未設定時の非リンク表示
src/content.config.ts                公開記事の型と読み込み
src/lib/journal.ts                   日付表示・並び順・タグ
src/data/profile.ts                  プロフィール・About本文・SNS・ナビ
src/data/projects.ts                 作品の文章・画像・URL
src/data/journal-tags.json           タグの識別子と表示名
src/styles/global.css                配色・余白・レスポンシブ・CSSの動き
src/assets/site-og.svg               共通共有画像の編集元
public/gaku.svg                      GFファビコンの編集元
public/admin/                        Decap CMSのJS・CSS・プレビュー
scripts/prepare-journal.mjs           公開記事と参照画像だけを取り込む
scripts/journal-core.mjs              日付・slug・本文・画像参照の検証
scripts/journal-integration.mjs       Astro起動/build時の準備
scripts/start-cms.mjs                 ローカル専用CMS保存サーバー
scripts/stage-journal.mjs             ローカルで選択した記事だけ表示確認へ移す
scripts/check-build.mjs               build結果の静的な確認
.journal/                            記事・元写真・生成データ（Git管理・公開対象外）
```

最初は `index.astro` → `JournalEntry.astro` → `src/lib/journal.ts` → `global.css` の順に読むと、データから画面を作る流れが追えます。次に `prepare-journal.mjs` で非公開の入力と公開出力の境界を確認してください。

## 文章・色・写真・URLの編集

| 内容 | 編集箇所 |
| --- | --- |
| 氏名・所属・学年・紹介・About本文・技術 | `src/data/profile.ts` |
| GitHub / Qiita / X | 同ファイルの `socials[].url`。LearningもQiitaに連動 |
| 作品の説明・担当・現状・タグ | `src/data/projects.ts` |
| 作品のURL | 同ファイルの `publicUrl` / `githubUrl` |
| 本人写真 | `profile.photo` のsrc・alt・width・height |
| 作品の実画像 | 各作品の `image` のsrc・alt・width・height |
| 色・文字・余白・幅 | `src/styles/global.css` の `:root` と各クラス |
| ページタイトル・説明 | 各ページのBaseLayoutへ渡す値 |
| GF / 共有画像 | `public/gaku.svg` / `src/assets/site-og.svg` を編集後、`pnpm branding` |

「いえぴた！」の機能・制作期間・担当・コンテスト名・公開URLは、[リポジトリのREADME](https://github.com/Gaku-Fujioka/iepita/blob/main/README.md)をもとに2026-10-29に更新しました（参照blob: `2a30d6b9e43d799905e025e166becc7d56f5dc19`）。本人の制作を通した学びは既存の文章を引き継いでいます。
画面画像の元データは同リポジトリの `docs/screenshots/iepita-{home,start,match}.png` です。`src/assets/images/projects/iepita/` に保存し、公開用には軽量WebPを生成しています。実物件の掲載や問い合わせの送信を行う運用サービスとしては紹介せず、サンプルデータで動くプロトタイプと明記しています。

「ひといき」は[JPHACKSのリポジトリ](https://github.com/jphacks/tkb_2603)のREADME（参照blob: `2973b8e99d3c80b9b97ee5fe5fa73a2d87543867`）とpackage.jsonをもとに2026-10-29に追加しました。担当はGaku-Fujiokaによる公開PR #1・#13・#17・#18・#19・#23を参照しています。開発人数・期間は本人からの追加情報があるまで記載しません。拡張アイコンは `public/icon/128.png`、終了確認の実装画面は `docs/design/break-close/after-short.png` が出典です。同リポジトリのほかの参照デザイン画像は、実画面として転載していません。

「いこポケ」は旧名称「ここいこ」から2026-10-29に表記を更新しました。提供された `Gaku-Fujioka/ikopoke` は非公開リポジトリです。READMEはスターターの内容が残っているため、package.json・アプリのmetadata・manifest・機能の構成・公開手順の記録を参照しました。ロゴは同リポジトリの `public/brand/ikopoke.svg` が出典です。本人の最新の方針により、いこポケは家族や親しい人向けの非公開アプリとして紹介します。アプリのURLは掲載せず、アプリ・GitHubとも「非公開」の非リンク表示にします。作品説明と提供された画面画像は掲載し、旧アンカー `#kokoiko` は新しい紹介への入口として維持します。

プロフィール写真と作品画面の元のPNG・JPEGは `src/assets/images/` に保管します。`pnpm images:optimize` で `public/images/` にWebPを生成します。プロフィール写真は幅384px、いえぴたの画面は幅1280px、ひといきの終了確認画面は幅390px、いこポケのスマートフォン画面は幅780pxで、縦横比を維持します。元の画面画像は公開フォルダに置かず、配信するのはWebPのみです。小さな拡張アイコンはPNGのまま保存します。差し替え後はデータファイルのwidth・heightを生成画像の実寸に合わせてください。

技術一覧と作品の技術タグには[Skill Icons](https://github.com/tandpfun/skill-icons)のロゴと技術名を表示します。GitHub・X・Qiitaのリンクは、[Shields.io](https://shields.io/badges/static-badge)経由で取得したロゴとHTMLのサービス名を並べます。HomeではURLが設定されたSNSだけを表示し、枠やバッジ背景は付けません。SVGは `public/icons/` に保存し、ビルドや閲覧時の外部通信は不要です。追加・再取得は `scripts/sync-brand-assets.mjs` の定義を編集して `pnpm icons:sync` を実行します。生成された対応表は `src/data/brand-assets.json`、Skill IconsのMITライセンスは `public/icons/skills/LICENSE.txt` に保存しています。技術の経験区分は引き続き `src/data/profile.ts` で編集します。

未提供の写真・作品画像・URLは `null` のままにします。顔はGの仮表示、作品は図形と「画像準備中」、未設定URLは「準備中」の非リンクです。空hrefや `#` を入れないでください。本人・作品の実画像は適切な大きさにしたWebP等を `public/images/` に置き、実寸を指定します。円形／16:9の切り抜きも確認してください。Journal写真は以下の取り込み時に自動で最適化します。

## ローカルで記事を書いて確認する

1. `pnpm astro dev --background` を起動し、別のターミナルで `pnpm journal:cms` を起動します。
2. http://localhost:4321/admin/ を開き、「記事の編集画面を開く」へ進みます。
3. タイトル・slug・投稿日・本文を入力。任意で概要・タグ・カバーを追加します。本文写真は「写真と説明」から追加し、altと短い説明を入力します。
4. プレビューのPC／スマホ幅切替で確認し、保存します。保存先は `.journal/editor/posts/` と `.journal/editor/media/` で、保存だけでは公開ページへ反映しません。
5. 公開ページで表示を確認したい記事だけ `pnpm journal:stage 記事のslug` で `.journal/source/` へ移します。
6. `.env.example` を `.env` にコピーし、`JOURNAL_SOURCE=local` に変更します。サーバーをstop→background起動し直します。記事・タグ・Home最新2件へ反映されます。
7. 記事0件に戻すには `.env` の `JOURNAL_SOURCE=empty` とし、再起動・再ビルドします。元記事は削除されません。

Decapのローカルファイルモードは本番の下書き→公開フローを扱いません。ローカル保存・画像追加・プレビュー用です。GitHubのログインや本番の公開反映とは区別してください。この保存サーバーは127.0.0.1だけで待ち受け、ファイルモードを固定し、Gitのコミットは行いません。開発URLはlocalhost:4321を使います。

`.journal/editor` は下書き用、`.journal/source` は明示的に選択したローカル表示確認用、`.journal/published` と `public/journal-media` は生成結果です。生成結果は直接編集しません。CMS設定は開発用と本番用を分けて生成し、トークンを出力しません。異なる記事データを使う検証用ビルド中は、同じ生成データを使う開発サーバーを停止してください。

## Vercelでの公開

初回は独自ドメインを取得せず、Vercelの `*.vercel.app` URLを使います。GitHubの `Gaku-Fujioka/personal-site` を個人サイト専用のVercelプロジェクトに接続し、Production Branchは `main` にします。リポジトリは非公開のまま、生成したサイトを一般公開できます。

`vercel.json` でAstro・出力先 `dist/` と、`pnpm build && pnpm check` を指定しています。canonical・OG URL・共有画像URLはVercelの本番URLから生成し、`SITE_URL` があればそちらを優先します。CLIアップロードでは `.vercelignore` でローカル下書き・環境ファイル・画像の原本を除外します。公開用画像は `public/images/` にあります。

初回公開は `JOURNAL_SOURCE=empty`（既定値）の記事0件で行います。記事管理のGitHub認証・非公開記事取得・記事公開後の自動反映は、以下の別途設定が必要です。

## 本番の記事管理を接続する手順（記事投稿の開始前TODO）

ここは未接続です。外部アカウント・リポジトリ・ドメインは、この実装では作成していません。

1. 本人用の**非公開**記事リポジトリを用意し、公開確定した記事を置くブランチ（通常main）、`posts/` と `media/` を準備します。公開コードのリポジトリとは分けます。
2. 無料枠・利用条件を確認して公開先とOAuthの処理先を決め、本人のGitHubログインと対象リポジトリへのアクセスを設定します。CMSには編集用、ビルドには記事取得用の権限が必要です。
3. 公開環境に `CMS_REPO`、`CMS_AUTH_URL`、`JOURNAL_REPO`、`JOURNAL_BRANCH`、`JOURNAL_TOKEN`、`JOURNAL_SOURCE=github` を設定します。トークンはサーバー側の秘密情報に保存します。`CMS_AUTH_URL` は `/auth` とコールバックを処理するOAuthサービスの実URLです。
4. CMSは下書きを作業ブランチに保存し、公開操作で公開用ブランチへ確定する設定です。管理画面内だけでプレビューし、一般公開の下書きURLは生成しません。
5. **記事側の公開用ブランチへの更新で、サイトのビルド・公開を起動する連携**を公開サービスに合わせて設定します。下書きブランチの更新では公開を起動しません。実行結果を確認できるURL・場所を本人用手順に追記します。
6. 未ログイン時のアクセス拒否、下書き写真の非公開、保存・再編集・公開、ビルド失敗時の旧サイト維持まで実際に確認します。この接続が済むまで、本番CMSの動作確認済みとは扱いません。

公開記事の取得は公開用ブランチの1つのコミットに固定します。参照された写真だけを最大320/640/1280pxのWebPへ変換し、srcset・寸法・alt・説明を出力します。元写真は非公開の保存先に残します。写真はPNG/JPEG/WebP/AVIF、20MB以下を目安にしてください。本文にはh2以下の見出し・段落・リスト・引用・リンク・専用写真を使い、HTMLやスクリプトは含めません。

記事情報はtitle・slug・publishedAt・任意updatedAt・任意description・tags・任意cover/coverAlt/coverCaptionと本文です。slugとファイル名を揃え、作成後はslugを変更しません。概要を省くと本文冒頭を使います。タグは備忘録・イベント・旅行。投稿日順で、更新日だけでは先頭へ移動しません。カバーなしでは画像枠を省き、記事0件では「Journalを準備中です。」と表示します。

## 今回の検証記録

- 記事0件の通常ビルド、表示確認用の1件・3件を使ったビルドが成功しました。検証用記事を通常の公開成果物には残していません。
- 3件のビルドで最新2件・投稿日順・タグ別一覧・更新日・縦写真・本文見出し・画像説明を確認しました。写真とタグがない短文1件の構造も確認しました。
- `pnpm test` で不正な日付・slug・タグ・画像参照・HTMLを拒否することと、参照画像だけの生成・未公開データ分離を確認しました。
- `pnpm check` で通常の5ページと内部リンク67件、検証用記事ありの10ページと167件を確認しました。これは生成HTMLの検証で、実際のキーボード操作の確認とは別です。
- ローカルCMS保存APIで記事の保存・再読込・一覧取得、写真の保存・再読込を確認しました。管理画面のJavaScript構文と共有PNG画像も確認しました。
- **未確認**：320 / 375 / 768 / 1280pxの実画面、実キーボード操作、スクリーンリーダー、CMS編集画面の実操作。ブラウザ接続を利用できなかったためです。
- **未接続**：本番GitHubログイン・非公開記事リポジトリ・記事公開から自動ビルド／公開への連携・ドメイン。設定後に実動作の確認が必要です。
- 記事0件ではAstroから空のコレクションに関する警告が出る場合がありますが、ビルドは成功します。

## 公開前TODO

- [ ] 本人写真・各作品の実画面・SNSと作品URLの差し替え。
- [ ] コンテスト正式名称・時期、担当範囲、公開時点の所属・学年・活動状況を確認。
- [ ] 最初の公開記事と写真を用意（0件での公開も可能）。
- [ ] 上記の非公開保存先・OAuth・記事更新からビルドへの連携を設定し、実動作を確認。
- [ ] GitHub学生特典が反映された後、対象ドメイン・空き・初年度料金・更新料金・自動更新を確認。初年度無料を永久無料とは扱わない。
- [ ] 初回から使う独自ドメインと公開先を確定し、`SITE_URL` を実URLに設定。canonical・OG URL・共有画像URLはこれに連動。現状は架空ドメインを設定していません。
- [ ] 初版のリンクはドメイン直下を前提にしています。サブパス公開を選ぶ場合はbaseとリンク・画像・CMSパスを調整。
- [ ] 公開環境の404ステータス・HTTPS・共有画像・下書きへのアクセス拒否を確認。
- [ ] PC・スマホの実画面、Tab / Shift+Tab / Enter、フォーカス、文字拡大、動きを減らす設定を確認。
- [ ] 本人がコードと投稿手順を読み、自分で変更・検証する。AI実装だけで学習課題を合格扱いにしない。

commit / push / デプロイ / ドメイン取得は別途依頼を受けて行います。ローカル表示の完成と、本番CMS接続・公開の完了は区別します。

3Dモードは2026-10-29の本人依頼で削除しました。変更前の実装はコミット `2192b81` に保存されています。

いこポケのホーム・行きたい候補・おでかけ計画の3画面は、本人提供の `ikopoke1.jpg`・`ikopoke2.jpg`・`ikopoke3.jpg` を使用しています。元画像は `src/assets/images/projects/ikopoke/`、公開用WebPは `public/images/projects/ikopoke/` に保存します。Homeの作品カードとProjectsの概要では3画面を並べ、詳細には説明付きの画像と拡大リンクを表示します。元画像のマスクも保持しています。
