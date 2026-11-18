// Packs every sheet and posts it back. Last of the files inlined into the page.
async function main() {
  const out = []
  const save = async (dest, base, { sheet, atlas }, scale) => {
    await post(dest, `${base}.png`, png(sheet)); await post(dest, `${base}.json`, JSON.stringify(atlas, null, 2))
    await post('scratch', `preview-${base}.png`, png(preview(sheet, scale)))
    out.push(`${base}: ${sheet.width}x${sheet.height}, ${Object.keys(atlas.frames).length} frames`)
  }
  const orange = [...critterFrames(critterOrange, '#d97757'), ...moreCritterFrames('#d97757', critterOrange, critterOrangeBare)]
  const gold = [...critterFrames(critterGold, '#f5c542'), ...moreCritterFrames('#f5c542', critterGold, critterGoldBare)]
  await save('sprites', 'critter', pack(orange, 230, 'critter.png'), 8)
  await save('sprites', 'critter-gold', pack(gold, 230, 'critter-gold.png'), 8)
  await save('sprites', 'marks', pack([...marks(), ...newMarks()], 90, 'marks.png'), 8)
  const furn = [...FURNITURE.map(([name, fn]) => ({ name, ...trimmed(fn) })), ...TILES]
  await save('sprites', 'furniture', pack(furn, 300, 'furniture.png'), 6)
  const costumes = costumeFrames()
  const cos = pack(costumes, 230, 'costumes.png')
  Object.assign(cos.atlas.meta, costumeMeta)
  await save('sprites', 'costumes', cos, 8)
  const byName = list => Object.fromEntries(list.map(f => [f.name, f.canvas]))
  await post('scratch', 'preview-costumes-all.png', png(costumePreview(byName(orange), byName(costumes))))
  const themes = {}
  for (const [name, t] of Object.entries(THEMES)) { themes[name] = THEME_FRAMES(t); await save('sprites', 'theme-' + name, pack(themes[name], 140, 'theme-' + name + '.png'), 8) }
  await post('scratch', 'preview-themes.png', png(themePreview(byName(orange), themes)))
  const ts = tileset()
  await post('sprites', 'tileset.png', png(ts.sheet)); await post('sprites', 'tileset.json', JSON.stringify(ts.meta, null, 2))
  await post('scratch', 'preview-tileset.png', png(preview(ts.sheet, 8)))
  out.push('tileset: ' + ts.sheet.width + 'x' + ts.sheet.height + ', ' + ts.meta.tileCount + ' tiles')
  document.title = 'done: ' + out.join(' | ')
}
main().catch(e => { document.title = 'error: ' + e.message + ' @ ' + (e.stack || '').split(String.fromCharCode(10))[1]; console.error(e) })
