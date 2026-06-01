import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizePoetryMarkdown } from './normalize-poetry.mjs'

test('normalizes legacy spaced poem lines and br stanza separators', () => {
  const source = `---
title: 花
pubDate: 2023-05-14
---

我记得那朵花，  

只记得

人们不舍得摘它。

<br>

我记得惨淡的日落

如何透过云翳
`

  const expected = `---
title: 花
pubDate: 2023-05-14
---

我记得那朵花，
只记得
人们不舍得摘它。

我记得惨淡的日落
如何透过云翳
`

  assert.equal(normalizePoetryMarkdown(source), expected)
})

test('keeps canonical poem line and stanza breaks stable', () => {
  const source = `---
title: 树
---

一棵树苗走进了森林。
他问泥地上的野草：
“我是谁？”

他又去问溪涧的灌木：
“我是谁？”
`

  assert.equal(normalizePoetryMarkdown(source), source)
})
