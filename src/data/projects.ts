import type { SiteImage } from './profile';

export interface Project {
  id: 'hitoiki' | 'iepita' | 'ikopoke';
  legacyId?: string;
  name: string;
  label: string;
  summary: string;
  description: string;
  caption: string;
  tags: string[];
  image: SiteImage | null;
  logo?: SiteImage;
  screenshots?: { image: SiteImage; caption: string }[];
  previewScreenshots?: boolean;
  format: string;
  technologies: string;
  role: string;
  featuresLabel: string;
  features: string[];
  approach: string;
  story: { title: string; text: string };
  status: string;
  result: string | null;
  publicUrl: string | null;
  publicLabel?: string;
  appPrivate?: boolean;
  githubUrl: string | null;
  githubPrivate?: boolean;
  additionalLinks?: { label: string; url: string }[];
}

export const projects: Project[] = [
  {
    id: 'hitoiki', name: 'ひといき', label: 'HITOIKI',
    summary: 'AIとの作業ログから負担の目安を推定し、作業の区切りで休憩を提案。',
    description: 'AIと一緒に開発する人に向けたChrome・VS Code拡張。読む量や判断、確認・検証などの作業ログから負担の目安を推定し、時間だけに頼らず、作業の区切りでひといきつくタイミングを提案します。',
    caption: 'JPHACKS 2026 / Chrome・VS Code拡張',
    tags: ['チーム制作', 'TypeScript', 'React'],
    image: null,
    logo: { src: '/images/projects/hitoiki/icon.png', alt: 'ひといきの拡張機能アイコン', width: 128, height: 128 },
    screenshots: [
      {
        image: { src: '/images/projects/hitoiki/break-confirm.webp', alt: 'ひといきの休憩画面。小さい画面でも中央に表示される「休憩を終えますか？」の確認ダイアログ。', width: 390, height: 500 },
        caption: '低い画面でも操作できるように改善した、休憩終了の確認画面。',
      },
    ],
    format: 'JPHACKS 2026 東京B / チーム開発',
    technologies: 'TypeScript / React / WXT / Claude API / Cloudflare Workers・Durable Objects / VS Code Extension API / Vitest',
    role: '作業モニターUIと休憩導線の改善、APIキーなしで会話分類を使える中継処理と同意画面、休憩中のピクトグラムの動き、実機検証・ログ確認を担当しました。',
    featuresLabel: '主な機能',
    features: [
      'ChatGPT・Claude・GeminiとVS Codeで、作業に応じた負担の目安を表示',
      '読む量・判断・確認／検証・切替・作業時間の5要素と、その内訳を可視化',
      'AIの生成中や入力中を避けて休憩を提案し、本人の操作で開始',
      '休憩タイマー、動きのあるピクトグラム、作業に戻るための1行メモ',
      '同意後に会話を分類する共有中継と、APIを使わないローカル計測',
    ],
    approach: '作業を遮らず、自分で休むタイミングを選べることを大切にしました。負担の計算とLLMによる出来事の分類を分け、なぜ休憩を勧めたかを内訳から確認できるようにしています。',
    story: {
      title: '開発のきっかけ',
      text: 'AIでコードを書く速度が上がる一方で、出力を読み、確かめ、判断する作業が続く負担に着目しました。同じ作業時間でも中身によって負担は変わると考え、時間で一律に区切るのではなく、作業内容に合わせた休憩を提案する拡張機能を制作しました。',
    },
    status: 'Chrome版はGitHub Releasesで配布し、VS Code版はMarketplaceで公開しています。表示する負担は作業ログから推定した目安で、疲労の実測値ではありません。',
    result: null,
    publicLabel: '配布ページ',
    publicUrl: 'https://jphacks.github.io/tkb_2603-demo/',
    githubUrl: 'https://github.com/jphacks/tkb_2603',
    additionalLinks: [
      { label: 'VS Code版', url: 'https://marketplace.visualstudio.com/items?itemName=koubeyapurin.hitoiki' },
      { label: 'デモ動画', url: 'https://www.youtube.com/watch?v=dvJNsERvyCA' },
    ],
  },
  {
    id: 'iepita', name: 'いえぴた！', label: 'IEPITA',
    summary: '暮らし方の診断とスワイプで、自分に合う空き家探し。',
    description: '空き家の活用と、入居後の暮らしのミスマッチを減らすことを目指したWebアプリ。調布市の空き家探しをコンセプトに、自然のある暮らしや創作活動などの希望を、診断を通じて物件選びにつなげます。',
    caption: '2人で企画・開発 / SDGsプロジェクト最終審査進出',
    tags: ['チーム制作', 'JavaScript'],
    image: {
      src: '/images/projects/iepita/home.webp',
      alt: 'いえぴた！の診断結果画面。ライフスタイルタイプと、マッチ度付きの物件候補を表示。',
      width: 1280, height: 752,
    },
    screenshots: [
      {
        image: { src: '/images/projects/iepita/start.webp', alt: '暮らし方診断の流れを案内する、いえぴた！のスタート画面。', width: 1280, height: 752 },
        caption: '10問の診断から、理想の暮らし方を探す。',
      },
      {
        image: { src: '/images/projects/iepita/match.webp', alt: '物件カードをスワイプして候補を分類するマッチング画面。', width: 1280, height: 752 },
        caption: 'スワイプやボタンで、気になる物件を選ぶ。',
      },
    ],
    format: '2人チーム / 企画から完成まで約2か月半（2025年8月〜10月中旬）',
    technologies: 'HTML / CSS / JavaScript（Vanilla JS）/ Tailwind CSS / Leaflet・OpenStreetMap / Web Storage / GitHub Pages',
    role: '固定の役割分担は設けず、2人で企画・開発全般に幅広く携わりました。',
    featuresLabel: '主な機能',
    features: [
      '10問の暮らし方診断で8種類のタイプを判定し、物件とのマッチ度を表示',
      'スワイプやボタンで、お気に入り・スター・興味なしに分類',
      '地域・賃料・築年数・タグで絞り込み、マッチ度や距離で並び替え',
      '地図での位置確認、写真ギャラリー、共通タグによる類似物件の表示',
      '検討リストをブラウザに保存し、再訪時に復元',
    ],
    approach: '診断の回答と物件をタグでつなぎ、暮らし方の希望をおすすめ順に反映する仕組みを実装しました。スマートフォンでも少ない操作で候補を選べるよう、スワイプとボタンの両方に対応し、初回ガイドや効果音で操作を伝えています。',
    story: {
      title: '制作を通しての学び',
      text: '初めて取り組む規模の開発で、AIを活用した実装とエラー対応に苦労しました。今後はコードを読み直し、仕組みを理解したうえで改善や運用につなげていきたいと考えています。',
    },
    status: '29件のサンプル物件で動作する公開プロトタイプです。問い合わせの外部送信・登録物件のサーバー保存・ユーザー認証は未実装です。',
    result: 'J:COM主催「2025年度 大学生と考えるSDGs アクション支援プロジェクト」への参加をきっかけに制作し、最終審査に進出しました。',
    publicUrl: 'https://gaku-fujioka.github.io/iepita/',
    githubUrl: 'https://github.com/Gaku-Fujioka/iepita',
  },
  {
    id: 'ikopoke', legacyId: 'kokoiko', name: 'いこポケ', label: 'IKOPOKE',
    summary: '行きたい場所の提案から、お出かけの計画・記録まで。',
    description: '行きたい候補を仲間と共有し、おでかけの計画から訪問記録、思い出の整理までつなげるWebアプリ。行きたい場所も、一緒に過ごした記録も、グループのポケットにまとめます。',
    caption: '身内向けの非公開アプリ / 個人開発',
    tags: ['非公開', '開発中', 'TypeScript', 'Next.js'], image: null,
    logo: { src: '/images/projects/ikopoke/logo.svg', alt: 'ポケットをモチーフにした、いこポケの正式ロゴ', width: 512, height: 512 },
    previewScreenshots: true,
    screenshots: [
      {
        image: { src: '/images/projects/ikopoke/home.webp', alt: 'いこポケのスマートフォン版ホーム。参加グループと次のおでかけ予定をまとめて表示。', width: 780, height: 1691 },
        caption: 'ホームで、一緒に楽しむグループと次の予定を確認。',
      },
      {
        image: { src: '/images/projects/ikopoke/candidates.webp', alt: '行きたい候補の一覧画面。名前での検索、絞り込み、リアクション、計画に使う候補の選択に対応。', width: 780, height: 1691 },
        caption: '行きたい候補を集め、みんなの反応を見ながら計画へ。',
      },
      {
        image: { src: '/images/projects/ikopoke/outing.webp', alt: 'おでかけの計画画面。日程、参加者、メモをまとめ、日ごとに予定を整理できる。', width: 780, height: 1689 },
        caption: '日程・参加者・メモをひとまとめにして、おでかけを計画。',
      },
    ],
    format: '個人開発',
    technologies: 'TypeScript / Next.js / React / Supabase / Tailwind CSS / shadcn/ui / Vercel',
    role: '企画・要件整理・UI・実装を担当。',
    featuresLabel: '主な機能',
    features: ['グループの作成・招待', '行きたい候補の共有・リアクション・コメント', '地図でのスポット検索・候補の保存', 'おでかけ計画とカレンダー', '写真付きの訪問記録・思い出の本'],
    approach: '候補を集めて終わりにせず、計画を立て、実際に出かけ、思い出として残すまでを一つの流れにすることを重視しています。スマートフォンからも使いやすい画面を目指して改善しています。',
    story: {
      title: '開発のきっかけ',
      text: 'パートナーと話した「行きたい場所」をまとめて管理し、実際のお出かけや思い出として残したいと考え、開発を始めました。',
    },
    status: '家族や親しい人との利用を目的とした非公開アプリです。個人開発として改善を続けています。ソースコードも非公開です。',
    result: null,
    publicLabel: 'アプリ', appPrivate: true,
    publicUrl: null,
    githubUrl: null, githubPrivate: true,
  },
];
