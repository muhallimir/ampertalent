import Image from "next/image";

export default function Layout(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/logo/ampertalent.png"
            alt="AmperTalent Logo"
            width={160}
            height={0}
            style={{ height: 'auto' }}
            className="h-auto"
            priority
          />
        </div>
        
        {/* Auth Card */}
        <div className="bg-white py-6 px-6 shadow-sm sm:rounded-xl sm:px-10 border border-gray-100 stack-auth-override">
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