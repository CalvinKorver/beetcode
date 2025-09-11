export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900 text-white">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="text-center">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium">
              🚀 Track Your Coding Journey
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="block">Master LeetCode</span>
            <span className="block bg-gradient-to-r from-primary-400 to-orange-400 bg-clip-text text-transparent">
              Track Your Progress
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-xl sm:text-2xl text-gray-300 mb-10">
            A powerful Chrome extension that transforms your LeetCode experience with 
            detailed progress tracking, analytics, and insights to accelerate your coding journey.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href="#download"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Add to Chrome - Free
            </a>
            
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-lg border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-semibold text-lg transition-colors duration-200"
            >
              Learn More
            </a>
          </div>
          
          <div className="flex items-center justify-center text-sm text-gray-400">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                Free Forever
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Privacy First
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                Open Source
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}