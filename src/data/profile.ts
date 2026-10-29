export interface SiteImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const profile = {
  name: 'Gaku Fujioka',
  japaneseName: '藤岡 楽空',
  reading: 'フジオカ ガク',
  role: 'Web開発に取り組む大学生',
  affiliation: ['電気通信大学', '情報理工学域 II類', 'セキュリティ情報学プログラム'],
  schoolYear: '大学2年生',
  introduction: '電気通信大学で情報・セキュリティを学んでいます。アイデアをサービスとして形にすることが好きで、現在はフロントエンドを中心に学習・開発しています。',
  photo: {
    src: '/images/profile.webp',
    alt: '湖と雪景色を背景に、赤い鳥居の下で両腕を広げる藤岡楽空',
    width: 384,
    height: 394,
  } as SiteImage | null,
  copyrightYear: 2026,
  socials: [
    { name: 'GitHub', url: 'https://github.com/Gaku-Fujioka' as string | null },
    { name: 'Qiita', url: null as string | null },
    { name: 'X', url: 'https://x.com/fujio_dayo' as string | null },
  ],
  biography: [
    '電気通信大学 情報理工学域 II類 セキュリティ情報学プログラムに所属する大学2年生です。',
    '大学1年の春、情報系に強い大学へ入学したことをきっかけに、プログラミングを始めました。サークルでの活動を通して、最初に制作したのはタスク管理アプリです。何を作るか考える時間や、自分のアイデアが実際に動く形になる瞬間に面白さを感じ、Web開発を続けています。',
    '現在はフロントエンドを中心に、基礎から理解を深めています。大学ではセキュリティ情報学を専攻し、セキュリティの分野にも関心を持っています。使いやすさと見た目を大切にしながら、特に実装に取り組むことが好きです。',
    '将来は、一つの専門領域を深く持ちながら、周辺分野にも幅広い知識を持つ、頼られるエンジニアを目指しています。社会の課題を解決し、人々の生活をより便利で楽しいものにできるサービスを作りたいと考えています。',
  ],
  experience: {
    name: '現論会',
    period: '2026年5月〜',
    paragraphs: [
      '現論会の開発インターンに参加しています。新規アプリではFigmaを使ったUIデザインを担当しました。現在は、参考書のPDFをOCRで解析し、情報をデータベースで扱える形に整理する処理の検証・実装に取り組んでいます。',
      '要件整理、コード生成、コードリーディングなどにAIを活用しています。生成されたコードの仕組みを理解し、自分で説明・修正できる力を深めていくことを課題としています。',
    ],
  },
  community: {
    text: '電気通信大学の開発チーム「team411」に所属し、学内ダッシュボードの開発グループに参加しています。',
    url: 'https://team411.net/',
  },
  activities: 'J:COM主催「2025年度 大学生と考えるSDGs アクション支援プロジェクト」に、2人チームで参加しました。暮らし方の診断と物件探しで空き家と人をつなぐ「いえぴた！」を企画・開発し、最終審査に進出しました。',
  skills: [
    { category: '制作で使用経験あり', items: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Supabase', 'Vercel'] },
    { category: '学習・制作中', items: ['Next.js', 'Astro', 'Docker'] },
    { category: 'ツール', items: ['Figma', 'Git', 'GitHub', 'VS Code'] },
    { category: '大学の授業で使用', items: ['C', 'Ruby'] },
    { category: '自主的に触れた経験', items: ['C++'] },
  ],
  skillsNote: 'Webアプリの制作経験を通して技術に触れ、現在はフロントエンドの基礎を体系的に学び直しています。このサイトも、Astroの仕組みやHTML・CSSを理解しながら改善していく予定です。',
  interests: '旅行、映画、音楽、おいしいものを食べることが好きです。音楽は特に邦ロックをよく聴きます。今後は、イベントに参加した記録や旅行の思い出なども、このサイトに残していきたいと考えています。',
};

export const navigation = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'Journal', href: '/journal/' },
];
