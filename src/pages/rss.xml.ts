import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import {
  getEntryDescription,
  getEntryTags,
  getEntryTitle,
  isPublishedEntry,
  sortByPubDateDesc,
} from '../utils/content';

// Change back to uppercase GET to match what Astro is expecting in newer versions
export async function GET(context: APIContext) {
  const posts = (await getCollection('blog')).filter(isPublishedEntry);
  const site = context.site ?? new URL('http://localhost:4321');
  
  // Sort posts by date in descending order
  const sortedPosts = posts.sort(sortByPubDateDesc);
  
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site,
    items: sortedPosts.map((post) => ({
      title: getEntryTitle(post) ?? post.slug,
      pubDate: post.data.pubDate,
      description: getEntryDescription(post),
      link: `/blog/${post.slug}/`,
      // Optional: include categories/tags as array
      categories: getEntryTags(post),
    })),
  });
}
