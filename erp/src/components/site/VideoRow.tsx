import { Play, Share2, Youtube } from "lucide-react";
import { useOrgLogoUrl } from "@/hooks/useOrgLogoUrl";

export interface VideoRowItem {
  _id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

/** How many videos the band shows; the videos page carries the full list. */
const ROW_SIZE = 2;

/**
 * Videos band, matching the marketing site: a display heading with an
 * "Explore More" link opposite it, then the players.
 *
 * Each player is a facade rather than a live embed — the thumbnail with the
 * YouTube chrome (channel, red play button, watch badge) painted on top.
 * Loading YouTube's iframe for every visitor costs a few hundred kilobytes and
 * a third-party connection before anyone has asked to watch anything, so the
 * iframe is only created when a video is opened.
 */
export function VideoRow({
  videos,
  channelName,
  onPlay,
  onExplore,
}: {
  videos: VideoRowItem[];
  channelName: string;
  onPlay: (url: string) => void;
  onExplore: () => void;
}) {
  const logoUrl = useOrgLogoUrl();
  const items = videos.slice(0, ROW_SIZE);
  if (items.length === 0) return null;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
        <h2 className="text-[28px] sm:text-[34px] lg:text-[38px]">Videos</h2>
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

      <div className="grid gap-5 sm:grid-cols-2">
        {items.map((v) => (
          <button
            key={v._id}
            type="button"
            onClick={() => onPlay(v.videoUrl)}
            aria-label={`Play ${v.title}`}
            className="group relative block w-full overflow-hidden rounded-xl bg-black shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="block aspect-video w-full">
              {v.thumbnailUrl ? (
                <img
                  src={v.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="block h-full w-full bg-gradient-hero" />
              )}
            </span>

            {/* Channel bar, as YouTube paints it. */}
            <span className="absolute inset-x-0 top-0 flex items-center gap-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 text-left">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-6 w-6 object-contain" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-black text-black" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold leading-tight text-white">{v.title}</span>
                <span className="block truncate text-xs text-white/80">{channelName}</span>
              </span>
            </span>

            <span className="absolute left-1/2 top-1/2 flex h-[46px] w-[66px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14px] bg-[#ff0000] transition-transform duration-300 group-hover:scale-105">
              <Play className="h-6 w-6 fill-white text-white" />
            </span>

            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
              <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white/90">
                <Share2 className="h-4 w-4" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded bg-black/75 px-2 py-1 text-xs font-medium text-white">
                Watch on <Youtube className="h-4 w-4 text-[#ff0000]" /> YouTube
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
