import { defineCollection } from 'astro:content'

const blog = defineCollection({ type: 'content' })
const poetry = defineCollection({ type: 'content' })

export const collections = {
  blog,
  poetry,
}