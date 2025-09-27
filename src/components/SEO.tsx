import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string; // absolute or root-relative
  type?: 'website' | 'article' | 'profile' | string;
  url?: string; // canonical URL; if omitted, built from location
  themeColor?: string;
}

function setMetaTag(attr: 'name' | 'property', key: string, content?: string) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function SEO({
  title,
  description,
  image,
  type = 'website',
  url,
  themeColor,
}: SEOProps) {
  useEffect(() => {
    const loc = window.location;
    const origin = loc?.origin || '';
    const canonical = url || (origin ? origin + loc.pathname + loc.search : undefined);
    const siteName = 'CHESS Quest';
    const finalTitle = title ? `${title} • ${siteName}` : siteName;
    const finalImage = image?.startsWith('http') ? image : image ? `${origin}${image}` : undefined;

    // Title
    document.title = finalTitle;

    // Canonical
    if (canonical) setLinkTag('canonical', canonical);

    // Basic
    if (description) setMetaTag('name', 'description', description);
    if (themeColor) setMetaTag('name', 'theme-color', themeColor);

    // Open Graph
    setMetaTag('property', 'og:site_name', siteName);
    setMetaTag('property', 'og:type', type);
    if (canonical) setMetaTag('property', 'og:url', canonical);
    if (finalTitle) setMetaTag('property', 'og:title', finalTitle);
    if (description) setMetaTag('property', 'og:description', description);
    if (finalImage) setMetaTag('property', 'og:image', finalImage);

    // Twitter
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    // Optionally set twitter:site if you have a handle
    // setMetaTag('name', 'twitter:site', '@chesscompanions');
    if (finalTitle) setMetaTag('name', 'twitter:title', finalTitle);
    if (description) setMetaTag('name', 'twitter:description', description);
    if (finalImage) setMetaTag('name', 'twitter:image', finalImage);
  }, [title, description, image, type, url, themeColor]);

  return null;
}
