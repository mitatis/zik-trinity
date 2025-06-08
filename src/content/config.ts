import { defineCollection } from 'astro:content';

const essays = defineCollection({ type: 'content' });
const poetry = defineCollection({ type: 'content' });

export const collections = { essays, poetry };

