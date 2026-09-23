import { ArrowUpRight } from "lucide-react";
import { assetUrl, exhibitHref, number } from "../lib";
import type { Exhibit } from "../types";

export default function ExhibitCard({
  exhibit,
  index,
}: {
  exhibit: Exhibit;
  index: number;
}) {
  return (
    <a className="exhibit-card" href={exhibitHref(exhibit.id)}>
      <div className="card-image">
        <span className="card-number">{number(index + 1)}</span>
        <img
          src={assetUrl(exhibit.poster)}
          alt={exhibit.alt}
          loading="lazy"
          width="1000"
          height="1000"
        />
        <span className="card-arrow">
          <ArrowUpRight size={22} />
        </span>
      </div>
      <div className="card-title">
        <h3>{exhibit.title}</h3>
        <span>3D</span>
      </div>
      <p className="english-label">{exhibit.subtitle}</p>
      <p className="card-summary">{exhibit.summary}</p>
    </a>
  );
}
