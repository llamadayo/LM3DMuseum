export interface Exhibit {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string[];
  order: number;
  model: string;
  poster: string;
  alt: string;
  cameraOrbit?: string;
  cameraTarget?: string;
  fieldOfView?: string;
  creator: string;
  source: string;
  license: string;
  licenseUrl?: string;
  sample: boolean;
}
