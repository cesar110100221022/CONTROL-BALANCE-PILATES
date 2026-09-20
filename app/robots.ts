import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dashboard/'], // Protegemos las áreas privadas
    },
    sitemap: 'https://controlbalancestudio.com/sitemap.xml',
  }
}