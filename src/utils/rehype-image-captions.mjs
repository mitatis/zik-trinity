const isWhitespaceText = (node) => node?.type === 'text' && !node.value?.trim()

const getImageNode = (node) => {
  if (node?.type !== 'element') return null
  if (node.tagName === 'img') return node

  if (node.tagName !== 'a') return null

  const visibleChildren = (node.children || []).filter((child) => !isWhitespaceText(child))
  if (visibleChildren.length !== 1) return null

  return visibleChildren[0]?.tagName === 'img' ? visibleChildren[0] : null
}

const toCaption = (node) => {
  const image = getImageNode(node)
  const alt = image?.properties?.alt

  return typeof alt === 'string' ? alt.trim() : ''
}

const visitChildren = (node) => {
  if (!Array.isArray(node?.children)) return

  node.children = node.children.map((child) => {
    if (child?.type === 'element' && child.tagName === 'p') {
      const visibleChildren = (child.children || []).filter((item) => !isWhitespaceText(item))

      if (visibleChildren.length === 1) {
        const caption = toCaption(visibleChildren[0])

        if (caption) {
          return {
            type: 'element',
            tagName: 'figure',
            properties: {
              className: ['image-caption-figure'],
            },
            children: [
              visibleChildren[0],
              {
                type: 'element',
                tagName: 'figcaption',
                properties: {},
                children: [{ type: 'text', value: caption }],
              },
            ],
            position: child.position,
          }
        }
      }
    }

    visitChildren(child)
    return child
  })
}

export default function rehypeImageCaptions() {
  return (tree) => {
    visitChildren(tree)
  }
}
