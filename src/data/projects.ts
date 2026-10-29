import type { SiteImage } from './profile';

export interface Project {
  id: 'iepita' | 'kokoiko';
  name: string;
  label: string;
  summary: string;
  description: string;
  caption: string;
  tags: string[];
  image: SiteImage | null;
  screenshots?: { image: SiteImage; caption: string }[];
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
  githubUrl: string | null;
}

export const projects: Project[] = [
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
    format: '2人チーム / 2025年9月中旬〜10月中旬（約1か月）',
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
    id: 'kokoiko', name: 'ここいこ', label: 'KOKOIKO',
    summary: '行きたい場所の提案から、お出かけの計画・記録まで。',
    description: '仲間と行きたい場所を提案し、お出かけの計画から振り返りまでまとめるWebサービス。',
    caption: '企画から実装まで個人で開発',
    tags: ['開発中', 'TypeScript', 'Next.js'], image: null,
    format: '個人開発',
    technologies: 'TypeScript / Next.js（学習しながら使用）',
    role: '企画・要件整理・UI・実装を担当。',
    featuresLabel: '開発中の機能',
    features: ['スポット検索', 'グループ', 'スポット提案', 'お出かけ予定の作成', 'お出かけ記録'],
    approach: '使いやすさを重視して開発しています。各機能の完成状況は未確認です。',
    story: {
      title: '開発のきっかけ',
      text: 'パートナーと話した「行きたい場所」をまとめて管理し、実際のお出かけや思い出として残したいと考え、開発を始めました。',
    },
    status: '開発中。友人やパートナーへの公開を予定しています。',
    result: null, publicUrl: null, githubUrl: null,
  },
];
