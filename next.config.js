/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    api: {
        bodyParser: {
        sizeLimit: '50mb',
        },
    },
    experimental: {
        serverComponentsExternalPackages: ['@supabase/supabase-js']
    }
}

module.exports = nextConfig