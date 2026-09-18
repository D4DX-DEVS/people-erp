import { Play } from "lucide-react";

export interface GalleryAlbumSummary {
  _id: string;
  title: string;
  category?: string;
  coverImageUrl?: string;
  imageCount?: number;
  images?: string[];
}

/** How many photographs the wall shows; the gallery page carries the albums. */
const TILE_COUNT = 9;

/**
 * Gallery band, matching the marketing site: a display heading with an
 * "Explore More" link opposite it, then a wall of photographs three across.
 *
 * Tiles are taken a frame at a time from each album in turn rather than album
 * by album, so the wall reads as a spread of the organisation's work instead of
 * the first album repeated. Every tile still opens its own album.
 */
export function GalleryGrid({
  albums,
  onOpen,
  onExplore,
}: {
  albums: GalleryAlbumSummary[];
  onOpen: (albumId: string) => void;
  onExplore: () => void;
}) {
  const byAlbum = albums.map((album) => ({
    album,
    sources: album.images?.length ? album.images : album.coverImageUrl ? [album.coverImageUrl] : [],
  }));

  const tiles: Array<{ key: string; src: string; title: string; albumId: string }> = [];
  for (let depth = 0; tiles.length < TILE_COUNT; depth += 1) {
    let added = false;
    for (const entry of byAlbum) {
      if (tiles.length >= TILE_COUNT) break;
      const src = entry.sources[depth];
      if (!src) continue;
      tiles.push({
        key: `${entry.album._id}-${depth}`,
        src,
        title: entry.album.title,
        albumId: entry.album._id,
      });
      added = true;
    }
    if (!added) break;
  }

  if (tiles.length === 0) return null;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
        <h2 className="text-[28px] sm:text-[34px] lg:text-[38px]">Gallery</h2>
        <button
          type="button"
          onClick={onExplore}
          className="group inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium text-foreground transition-colors hover:text-primary"
        >
          Explore More
          <span aria-hidden className="inline-flex">
            <Play className="h-3 w-3 fill-current" />
            <Play className="-ml-1.5 h-3 w-3 fill-current" />
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => onOpen(tile.albumId)}
            className="group relative overflow-hidden rounded-xl bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="block aspect-[16/11] w-full">
              <img
                src={tile.src}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </span>
            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent p-2.5 text-left text-[11px] font-medium text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {tile.title}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
