# Textures de la cave

Créées le 18 octobre 2026 avec l’outil intégré **imagegen**, sans API ni script de génération externe. Les sorties PNG ont été réencodées en WebP à qualité 0,86, sans recadrage ni redimensionnement, avec le canevas du navigateur. Fichiers utilisés : `tapis.webp`, `bois.webp`, `pierre.webp` (environ 1,65 Mo au total).

Ces images sont des couleurs de surface, appliquées aux maillages réels de la cave et accompagnées d’un relief léger. Aucune image de pièce ne sert de fond. Géométrie, éclairages, objets, occultation et interactions restent en Three.js. Les sources générées originales restent dans le répertoire de génération de Codex ; le jeu utilise uniquement les trois fichiers locaux de ce dossier, inclus dans le build.
La boutique publique d’Azur réutilise les matériaux de bois et le tapis, avec des teintes et un relief adaptés. Sa patine, ses grilles, afficheurs et documents sont dessinés sur des surfaces locales par le code ; aucun nouvel asset généré ni image de boutique projetée.
La réserve et l’atelier caché réutilisent également ce bois et ce tapis. Câblages, mécanisme, verrière du Duplicateur, appareils et composants sont des maillages ; schémas, étiquettes et écrans statiques sont des textures de texte sur leurs supports 3D. Aucune nouvelle image générée pour cette extension.

## Prompt du tapis

```text
Use case: stylized-concept. Asset type: a game-ready albedo texture for a rectangular old Persian rug in a cozy 3D chalet basement. Generate ONLY the flat woven rug surface, perfectly orthographic top-down, no perspective, no room, no furniture, no floor, no shadows, no lighting gradients. The entire canvas must be occupied edge-to-edge by the rectangular rug with all four thin decorative borders visible exactly at the image edges. Landscape 3:2 proportion. Finely detailed antique Persian/Heriz textile: faded brick red field, intricate small ivory/sand and muted forest green floral geometric weaving, two ornate pointed eight-petalled medallions along the long horizontal axis, narrow nested borders of tiny interlocking flowers and vines. Rich irregular handwoven wool fibers, small worn areas, subtle faded patches, softened edges of motifs, earthy palette, a lovingly worn warm rug. Polished stylized 3D game material realism with crisp textile detail but no oversharpening. Uniform neutral diffuse lighting: colors should remain natural and relatively muted, not orange color-graded. No text, no letters, no logo, no watermark, no fringe outside the rectangle, no background margin.
```

## Prompt du bois

```text
Use case: stylized-concept. Asset type: seamless PBR albedo texture for wooden beams and hand-built pine furniture in a cozy 3D chalet basement game. Generate ONLY the flat wood surface, image fully covered edge-to-edge. Straight wood grain running vertically from top to bottom. Warm natural medium-light honey pine with rich fine growth rings, a few small organic knots, occasional old shallow scratches and subtle wear, smooth hand-worn yet rustic texture. High resolution fine wood fibers visible, softly stylized realism like a polished handcrafted 3D diorama. Single continuous board surface: NO assembled planks, NO gaps, NO seams, NO nails, NO objects. Uniform neutral diffuse lighting, no shadows, no highlight, no baked perspective or lighting gradients. Tileable on all sides. Natural mid-light tan and muted golden brown, no orange filter, no dark burnt patches, no text, no logo, no watermark.
```

## Prompt de la pierre

```text
Use case: stylized-concept. Asset type: seamless PBR albedo texture of ONE rock face, for individually modeled irregular stone blocks in a cozy 3D chalet basement wall. Generate ONLY a continuous rough aged stone surface, perfectly flat orthographic straight on, fills the entire square. Natural medium neutral gray with slight warm taupe mineral mottling, sandy weathered limestone and granite texture, tiny pits, subtle chipped mineral facets, occasional fine short fissures. Finely detailed surface texture, subtly stylized realism appropriate to a handcrafted high quality 3D diorama. NOT a brick wall, NOT multiple stones, no mortar, no outlines around individual stones, no shadows or crevices implying multiple objects, no moss or foliage. Uniform neutral diffuse lighting with no gradients, no directional highlights, no baked perspective or cast shadow. Midtone albedo, not dark. Seamless tileable edges. No text, no watermark.
```
