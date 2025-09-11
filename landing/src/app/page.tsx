import HeroSection from '@/components/HeroSection'
import FeaturesSection from '@/components/FeaturesSection'
import DownloadSection from '@/components/DownloadSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <DownloadSection />
      <Footer />
    </main>
  )
}