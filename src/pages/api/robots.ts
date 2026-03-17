import { NextApiRequest, NextApiResponse } from 'next';

export const maxAge = 24 * 60 * 60;
export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    const domain = process.env.NEXT_PUBLIC_DOMAIN || 'https://pumpfunclone.com';
    res.status(200).send(`User-agent: *
Sitemap: ${domain}/sitemap.xml
Disallow: /admin
Disallow: /api/
`);
}