/* Decap is loaded only on this author-only entry page; public pages need no CMS JS. */
(async () => {
  const status = document.getElementById('admin-status');
  const button = document.getElementById('open-cms');
  try {
    const response = await fetch('/admin/settings.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('管理画面の設定を読み込めませんでした。');
    const settings = await response.json();
    if (!settings.configured) {
      status.textContent = '記事管理は準備中です。本人用の保存先とログイン設定が完了すると利用できます。';
      return;
    }
    const local = settings.mode === 'local';
    document.getElementById('local-notice').hidden = !local;
    if (local && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw new Error('ローカル編集はこのPCからのみ利用できます。');
    status.textContent = local
      ? 'ローカル確認用です。保存した記事・写真はこのPCにだけ保存され、サイトには公開されません。先に pnpm journal:cms を起動してください。'
      : '本人のGitHubアカウントでログインし、下書き保存・確認・公開を行います。';
    button.hidden = false;
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        if (local) {
          const proxy = await fetch('http://127.0.0.1:8081/api/v1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'info' }) });
          if (!proxy.ok) throw new Error('ローカル保存サーバーを確認してください。');
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/decap-cms@3.17.1/dist/decap-cms.js';
        await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = () => reject(new Error('編集画面を読み込めませんでした。インターネット接続を確認してください。')); document.head.append(script); });
        const CMS = window.CMS;
        const h = window.h;
        const photoPattern = /^!\[([^\]\n]*)\]\((media\/[^\s)"\n]+)\s+"([^"\n]*)"\)$/m;
        const safeText = value => String(value ?? '').replace(/[\[\]"<>\n]/g, '');
        CMS.registerEditorComponent({
          id: 'journal-photo', label: '写真と説明',
          fields: [
            { name: 'image', label: '写真', widget: 'image', allow_multiple: false },
            { name: 'alt', label: '写真の内容（alt）', widget: 'string' },
            { name: 'caption', label: '表示する短い説明', widget: 'string' },
          ],
          pattern: photoPattern,
          fromBlock: match => ({ image: match[2], alt: match[1], caption: match[3] }),
          toBlock: data => `![${safeText(data.alt)}](${encodeURI(decodeURIComponent(data.image))} "${safeText(data.caption)}")`,
          toPreview: data => `<figure data-journal-photo="${safeText(data.image)}"><img alt="${safeText(data.alt)}"><figcaption>${safeText(data.caption)}</figcaption></figure>`,
        });
        CMS.registerPreviewStyle('/admin/preview.css');
        const Preview = window.createClass({
          getInitialState() { return { mobile: false }; },
          updatePhotos() {
            this.props.document.querySelectorAll('figure[data-journal-photo]').forEach(figure => {
              const asset = this.props.getAsset(decodeURIComponent(figure.getAttribute('data-journal-photo')));
              if (asset) figure.querySelector('img').src = asset.toString();
            });
          },
          componentDidMount() {
            this.observer = new this.props.window.MutationObserver(() => this.updatePhotos());
            this.observer.observe(this.props.document.body, { childList: true, subtree: true });
            this.updatePhotos();
          },
          componentDidUpdate() { this.updatePhotos(); },
          componentWillUnmount() { this.observer.disconnect(); },
          render() {
            const data = this.props.entry.get('data');
            const cover = data.get('cover');
            const asset = cover ? this.props.getAsset(cover) : null;
            return h('div', { className: 'preview-shell' },
              h('button', { type: 'button', onClick: () => this.setState({ mobile: !this.state.mobile }) }, this.state.mobile ? 'PC幅で確認' : 'スマホ幅で確認'),
              h('article', { className: this.state.mobile ? 'preview-article mobile' : 'preview-article' },
                h('p', { className: 'preview-label' }, local ? 'ローカルの編集内容・未公開' : '下書きの確認'),
                h('h1', {}, data.get('title') || '記事タイトル'),
                h('p', { className: 'preview-date' }, data.get('publishedAt') || ''),
                data.get('description') && h('p', {}, data.get('description')),
                asset && h('figure', {}, h('img', { src: asset.toString(), alt: data.get('coverAlt') || '' }), h('figcaption', {}, data.get('coverCaption') || '')),
                h('div', { className: 'article-body' }, this.props.widgetFor('body'))));
          },
        });
        CMS.registerPreviewTemplate('journal', Preview);
        CMS.registerEventListener({ name: 'preSave', handler: ({ entry }) => {
          const data = entry.get('data');
          const slug = data.get('slug');
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '') || ['tags', 'index'].includes(slug)) throw new Error('URL識別子は半角英小文字・数字・ハイフンで指定してください。');
          if (entry.get('path') && entry.get('path') !== `posts/${slug}.md`) throw new Error('作成済み記事のURL識別子は変更しないでください。');
          return data;
        } });
        const optional = { required: false };
        // Decap's pinned auth client compares the popup origin to base_url.
        // Keep /api in auth_endpoint so that the origin comparison succeeds.
        const authBase = local ? null : new URL(settings.auth);
        const config = {
          load_config_file: false,
          backend: local ? { name: 'git-gateway' } : { name: 'github', repo: settings.repo, branch: settings.branch, base_url: authBase.origin, auth_endpoint: `${authBase.pathname.replace(/\/+$/, '')}/auth`.replace(/^\/+/, ''), squash_merges: true, open_authoring: false },
          ...(local ? { local_backend: { url: 'http://127.0.0.1:8081/api/v1' } } : { publish_mode: 'editorial_workflow' }),
          show_preview_links: false,
          media_folder: 'media', public_folder: 'media', locale: 'ja',
          collections: [{
            name: 'journal', label: 'Journal', label_singular: '記事', folder: 'posts', create: true,
            identifier_field: 'slug', slug: '{{slug}}', extension: 'md', format: 'yaml-frontmatter',
            summary: '{{title}} — {{publishedAt}}', sortable_fields: ['publishedAt', 'title'],
            fields: [
              { name: 'title', label: 'タイトル', widget: 'string' },
              { name: 'slug', label: 'URL識別子（作成後は固定）', widget: 'string', pattern: ['^[a-z0-9]+(-[a-z0-9]+)*$', '半角英小文字・数字・ハイフン'] },
              { name: 'publishedAt', label: '投稿日（公開前に確認）', widget: 'datetime', default: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date()), date_format: 'YYYY-MM-DD', time_format: false, format: 'YYYY-MM-DD', picker_utc: true },
              { name: 'updatedAt', label: '更新日（YYYY-MM-DD・変更したときだけ）', widget: 'string', pattern: ['^$|^\\d{4}-\\d{2}-\\d{2}$', 'YYYY-MM-DDの形で入力'], ...optional },
              { name: 'description', label: '概要（省略時は本文冒頭を使用）', widget: 'text', ...optional },
              { name: 'tags', label: 'タグ', widget: 'select', multiple: true, options: [{ label: '備忘録', value: 'memo' }, { label: 'イベント', value: 'events' }, { label: '旅行', value: 'travel' }], ...optional },
              { name: 'cover', label: 'カバー写真', widget: 'image', allow_multiple: false, ...optional },
              { name: 'coverAlt', label: 'カバー写真の内容（写真がある場合）', widget: 'string', ...optional },
              { name: 'coverCaption', label: 'カバー写真の短い説明（写真がある場合）', widget: 'string', ...optional },
              { name: 'body', label: '本文', widget: 'richtext', modes: ['rich_text'], buttons: ['bold', 'italic', 'link', 'heading-two', 'heading-three', 'quote', 'bulleted-list', 'numbered-list'], editor_components: ['journal-photo'], sanitize_preview: true },
            ],
          }],
        };
        CMS.init({ config });
        document.getElementById('admin-intro').hidden = true;
      } catch (error) { status.textContent = error.message; button.disabled = false; }
    });
  } catch (error) { status.textContent = error.message; }
})();
