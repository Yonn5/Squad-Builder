# PlayStyle icons

Custom icon set — one PNG per PlayStyle+, named as the kebab-case of the
style name. Lookups go through `ICON_IMAGES` in
`src/constants/playstyleIcons.ts`; to swap an icon, overwrite the file and
keep the filename.

```
Scoring:       finesse.png power-shot.png chip-shot.png dead-ball.png
               low-driven.png precision-header.png gamechanger.png acrobatic.png
Passing:       incisive.png pinged-pass.png long-ball.png tiki-taka.png
               whipped-pass.png inventive.png
Ball Control:  first-touch.png press-proven.png rapid.png technical.png trickster.png
Defending:     aerial-fortress.png block.png intercept.png jockey.png
               slide-tackle.png anticipate.png
Physical:      bruiser.png enforcer.png quick-step.png relentless.png long-throw.png
Goalkeeper:    far-throw.png footwork.png cross-claimer.png rush-out.png
               far-reach.png deflector.png
```

When adding a NEW playstyle: add the PNG here, an entry in
`src/constants/playstyles.ts`, and a `require` in
`src/constants/playstyleIcons.ts`.
