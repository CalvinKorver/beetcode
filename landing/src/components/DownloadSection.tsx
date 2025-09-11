export default function DownloadSection() {
  return (
    <section id="download" className="py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-orange-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to supercharge your coding journey?
          </h2>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            Join thousands of developers who are already using Beetcode to track their progress and ace their coding interviews.
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex-1 text-left">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Install in seconds</h3>
                  <p className="text-primary-100 text-sm">Quick setup, immediate benefits</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 text-left">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">5-star rated</h3>
                  <p className="text-primary-100 text-sm">Loved by developers worldwide</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 text-left">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Privacy focused</h3>
                  <p className="text-primary-100 text-sm">Your data stays on your device</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-10 py-4 bg-white text-primary-700 font-bold text-lg rounded-xl hover:bg-gray-100 transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L20 8l-9 9z"/>
            </svg>
            Add to Chrome - It's Free!
          </a>
          
          <div className="text-primary-100 text-sm">
            Compatible with Chrome, Edge, and other Chromium browsers
          </div>
        </div>
        
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-white mb-1">10k+</div>
            <div className="text-primary-200 text-sm">Active Users</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-white mb-1">50k+</div>
            <div className="text-primary-200 text-sm">Problems Tracked</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-2xl font-bold text-white mb-1">4.9★</div>
            <div className="text-primary-200 text-sm">User Rating</div>
          </div>
        </div>
      </div>
    </section>
  )
}