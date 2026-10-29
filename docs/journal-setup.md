# Journalの初回接続

普段の記事編集は [公開サイトの記事管理](https://gaku-fujioka.vercel.app/admin/) から行います。初回だけ、以下のGitHub・Vercel設定が必要です。**Client Secret・トークン・Deploy Hook URLはチャットやコードに貼らず、指定の設定画面に直接保存してください。**

記事の保存先は非公開の `Gaku-Fujioka/personal-site-journal` です。公開サイトのコードとは分けています。

**現在の状態（2026-10-29）**：手順1〜3の接続設定は完了し、`JOURNAL_SOURCE=github` での本番ビルドとDeploy Hookによる自動ビルドの起動を確認済みです。普段の執筆は「4. 接続後の使い方」から進めます。本人アカウントでの初回ログイン・保存・公開の実操作は、別途確認します。以下の初回設定手順は再設定時のために残しています。

## 1. GitHubログイン用のOAuthアプリ

[GitHubでOAuthアプリを登録](https://github.com/settings/applications/new)し、以下を入力します。

| 項目 | 値 |
| --- | --- |
| Application name | `Personal Site Journal` |
| Homepage URL | `https://gaku-fujioka.vercel.app` |
| Authorization callback URL | `https://gaku-fujioka.vercel.app/api/callback` |
| Enable Device Flow | オフのまま |

登録後にClient Secretを生成し、[Vercelの環境変数](https://vercel.com/gakupo/gaku-fujioka/settings/environment-variables)へ、**Production環境のみ**で以下を追加します。

| 環境変数 | 保存する値 |
| --- | --- |
| `GITHUB_OAUTH_CLIENT_ID` | アプリのClient ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | 生成したClient Secret。Sensitiveとして保存 |

Decap CMSのGitHubバックエンドは、非公開の記事リポジトリを編集するため `repo` スコープを要求します。OAuthアプリの権限はGitHubの認可画面で確認してください。ログイン処理ではGitHubの本人確認に加え、`Gaku-Fujioka` 以外のアカウントを拒否し、保存先が非公開で書き込み権限があることを確認します。

## 2. ビルド時の記事取得用トークン

[Fine-grained tokenを作成](https://github.com/settings/personal-access-tokens/new?name=Personal%20Site%20Journal%20Read&target_name=Gaku-Fujioka&expires_in=90&contents=read)し、次の範囲だけを指定します。

- Resource owner：`Gaku-Fujioka`
- Repository access：**Only select repositories** → `personal-site-journal` のみ
- Repository permissions：**Contents: Read-only**（MetadataのRead-onlyは自動付与）
- Expiration：例として90日。期限前に更新してください。

生成したトークンをVercelのProduction環境に `JOURNAL_TOKEN` としてSensitiveで保存します。編集用OAuthのトークンとは別で、ビルドには読み取り権限だけを渡します。

`JOURNAL_SOURCE` は接続確認が済むまで `empty` にしておきます。トークンが保存できた後、こちらで取得を確認して `github` に切り替えます。

## 3. 記事の「公開」から自動更新する

1. [VercelのGit設定](https://vercel.com/gakupo/gaku-fujioka/settings/git)を開き、**Deploy Hooks**を追加します。名前は `Journal publish`、ブランチは `main` です。
2. 発行されたURLをコピーします。
3. [記事リポジトリのActions secrets](https://github.com/Gaku-Fujioka/personal-site-journal/settings/secrets/actions)で、`VERCEL_DEPLOY_HOOK` という名前のRepository secretとして保存します。

記事リポジトリの `.github/workflows/publish-site.yml` は、`main` の `posts/`・`media/` が変わったときだけこのHookを呼び出します。下書きの作業ブランチでは呼び出しません。Hook URLを知る人はサイトの再ビルドを起動できるため、公開しないでください。

## 4. 接続後の使い方

1. `/admin/` から編集画面を開き、本人のGitHubアカウントでログインします。
2. 新しい記事を作り、タイトル・URL識別子・投稿日・本文を入力します。
3. 下書きとして保存し、プレビューのPC・スマホ幅で確認します。下書きは記事用の非公開リポジトリの作業ブランチに保存されます。
4. 写真は「写真と説明」から追加し、内容が分かるaltと説明を入力します。
5. 内容を確認して「公開」すると、記事が `main` に反映され、自動ビルドが始まります。
6. [記事側のActions](https://github.com/Gaku-Fujioka/personal-site-journal/actions)と[VercelのDeployments](https://vercel.com/gakupo/gaku-fujioka)で結果を確認します。

記事のURL識別子は作成後に変えません。投稿日が未来の記事・不正な日付・未対応のタグ・HTMLなどはビルド時に拒否されます。失敗した場合は公開済みの旧サイトが維持されます。

## 接続の確認項目

- `JOURNAL_TOKEN` で非公開の保存先を取得できる
- `/api/auth` がGitHubへリダイレクトし、stateとPKCEを使う
- `/admin/` のGitHubログインが完了する
- 保存・再編集でき、下書き本文・写真は一般のサイトから取得できない
- 公開操作でActions → Vercelの本番ビルドが起動する
- 記事本文・写真・Home最新記事が更新される

自動テストでは本人以外の拒否、stateの改ざん・期限切れの拒否、同じ管理画面だけへの認証結果の受け渡しを確認します。実際のGitHubログインと記事の保存・公開は、上記の設定後に確認します。
