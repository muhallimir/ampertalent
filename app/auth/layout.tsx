import Image from 'next/image'

export default function AuthLayout(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-[180px] h-20 relative">
            <Image
              fill
              src="/logo/logo.png"
              alt="AmperTalent Logo"
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white py-6 px-6 shadow-sm sm:rounded-xl sm:px-10 border border-gray-100 clerk-auth-card">
          {props.children}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            The trusted platform for remote work opportunities
          </p>
        </div>
      </div>
    </div>
  )
}
