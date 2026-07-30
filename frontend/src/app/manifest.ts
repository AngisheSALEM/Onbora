import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Onbora',
    short_name: 'Onbora',
    description: 'Copilote IA de découverte B2B',
    start_url: '/client',
    display: 'standalone',
    background_color: '#1A1A1E',
    theme_color: '#FF6600',
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
