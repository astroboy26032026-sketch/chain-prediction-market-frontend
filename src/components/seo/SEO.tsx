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

const SEO: React.FC<SEOProps> = ({ title, description, image, token }) => {
  const router = useRouter();
  const domain = process.env.NEXT_PUBLIC_DOMAIN || 'https://pumpfunclone2025.win';

  const seo = {
    title: token ? `${token.name} (${token.symbol}) - Bondle` : title || 'Bondle - Explore and Trade Tokens',
    description: token?.description || description || 'Explore, create, and trade tokens on the Bondle platform',
    image: token?.logo || image || `${domain}/default-og-image.jpg`,
    url: `${domain}${router.asPath}`,
  };

  const jsonLd = token
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: token.name,
        description: token.description,
        image: token.logo,
        url: seo.url,
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Bondle',
        description: seo.description,
        url: domain,
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
      <meta property="og:site_name" content="Bondle" />
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