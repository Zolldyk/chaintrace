/**
 * ChainTrace homepage - Entry point for supply chain verification
 *
 * @returns Homepage component with navigation to verification flows
 */
export default function HomePage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='container mx-auto px-4 py-16'>
        <div className='text-center'>
          <h1 className='mb-6 text-5xl font-bold text-gray-900'>ChainTrace</h1>
          <p className='mx-auto mb-8 max-w-2xl text-xl text-gray-600'>
            Blockchain-powered supply chain verification platform using Hedera
          </p>
          <div className='mx-auto max-w-md rounded-lg bg-white p-8 shadow-lg'>
            <h2 className='mb-4 text-2xl font-semibold text-gray-800'>
              Welcome to ChainTrace
            </h2>
            <p className='mb-6 text-gray-600'>
              Verify product authenticity and trace supply chain journeys with
              blockchain transparency powered by Hedera.
            </p>
            <div className='space-y-4'>
              <div className='rounded-lg border border-gray-200 p-4'>
                <h3 className='font-medium text-gray-800'>🔍 Consumer</h3>
                <p className='text-sm text-gray-600'>
                  Verify product authenticity
                </p>
              </div>
              <div className='rounded-lg border border-gray-200 p-4'>
                <h3 className='font-medium text-gray-800'>🏭 Manager</h3>
                <p className='text-sm text-gray-600'>Manage product batches</p>
              </div>
              <div className='rounded-lg border border-gray-200 p-4'>
                <h3 className='font-medium text-gray-800'>📊 Regulatory</h3>
                <p className='text-sm text-gray-600'>Monitor compliance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
