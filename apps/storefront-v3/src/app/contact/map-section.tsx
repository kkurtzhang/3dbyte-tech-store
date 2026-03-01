import { ExternalLink } from "lucide-react";

export function MapSection() {
  // Using OpenStreetMap embed (free, no API key required)
  const mapUrl = "https://www.openstreetmap.org/export/embed.html?bbox=147.32%2C-42.90%2C147.34%2C-42.88&layer=mapnik&marker=-42.8833%2C147.325";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold">Find Us</h2>
        <a
          href="https://www.openstreetmap.org/?mlat=-42.8833&mlon=147.325#map=15/-42.8833/147.325"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          Open in Maps
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="relative aspect-[4/3] w-full bg-muted">
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0, position: "absolute", inset: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="3D Byte Tech Location"
        />
      </div>
    </div>
  );
}
