import { pagination } from './Pagination';
const calendar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 2v6m10-6v6M3 11h18"/></svg>';
const book = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M8 17h12"/></svg>';
const hash = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m10 3-4 18M18 3l-4 18M4 9h17M3 15h17"/></svg>';
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
export const posts = `
<section id="posts" aria-label="文章列表"><div class="section-head"><h2>最新文章</h2><span th:text="|共 \${posts.total} 篇 · 第 \${posts.page} 页|"></span></div>
<div class="post-list"><article class="post-card" th:each="post : \${posts.items}">
<a class="post-card-link" th:classappend="\${#strings.isEmpty(post.spec.cover) ? 'post-no-cover' : ''}" th:href="\${post.status.permalink}" th:attr="aria-label=\${'阅读文章：' + post.spec.title}">
<div class="post-copy"><h3 th:text="\${post.spec.title}"></h3><div class="meta"><span class="date-chip">${calendar}<time th:text="\${#dates.format(post.spec.publishTime,'yyyy-MM-dd')}"></time></span><span class="taxonomy-chip category-chip" th:if="\${not #lists.isEmpty(post.categories)}">${book}<span class="taxonomy-values"><span th:each="category : \${post.categories}" th:text="\${category.spec.displayName}"></span></span></span><span class="taxonomy-chip tags-chip" th:if="\${theme.config.listing.show_tags != false and not #lists.isEmpty(post.tags)}">${hash}<span class="taxonomy-values"><span th:each="tag : \${post.tags}" th:text="\${tag.spec.displayName}"></span></span></span></div><p th:text="\${#strings.isEmpty(post.status.excerpt) ? '打开文章，继续阅读。' : post.status.excerpt}"></p></div>
<div class="post-visual" th:if="\${not #strings.isEmpty(post.spec.cover)}"><img class="cover" th:src="\${post.spec.cover}" alt="" loading="lazy" decoding="async" width="640" height="480"/></div><span class="post-no-cover-arrow" aria-hidden="true">${arrow}</span>
</a></article></div><p th:if="\${#lists.isEmpty(posts.items)}" class="empty">这里还没有文章，慢慢记录就好。</p>
${pagination()}</section>`;
