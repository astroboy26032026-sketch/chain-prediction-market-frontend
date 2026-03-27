import Head from 'next/head';
import { useRouter } from 'next/router';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  token?: {
    name: string;
    symbol: string;
    description: string;
    logo: string;
  };
}

const SITE_NAME = 'Zugar';
const DEFAULT_DESCRIPTION = 'Trade on prediction markets — sports, crypto, politics and more.';

const SEO: React.FC<SEOProps> = ({ title, description, image, token }) => {
  const router = useRouter();
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'https://zugar.app';

  const seo = {
    title: token
      ? `${token.name} — ${SITE_NAME}`
      : title || `${SITE_NAME} — Prediction Markets`,
    description: token?.description || description || DEFAULT_DESCRIPTION,
    image: token?.logo || image || `${domain}/logo.png`,
    url: `${domain}${router.asPath}`,
  };

  const jsonLd = token
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: token.name,
        description: token.description,
        image: token.logo,
        url: seo.url,
        organizer: { '@type': 'Organization', name: SITE_NAME, url: domain },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: SITE_NAME,
        description: seo.description,
        url: domain,
        applicationCategory: 'FinanceApplication',
      };

  return (
    <Head>
      <title>{seo.title}</title>
      <meta name="description" content={seo.description} />
      <link rel="canonical" href={seo.url} />
      <meta property="og:title" content={seo.title} />
      <meta property="og:description" content={seo.description} />
      <meta property="og:image" content={seo.image} />
      <meta property="og:url" content={seo.url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      <meta name="twitter:description" content={seo.description} />
      <meta name="twitter:image" content={seo.image} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
};

export default SEO;
